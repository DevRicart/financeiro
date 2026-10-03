from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.conf import settings
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.emailing import send_action_email

from .serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .throttles import EmailAddressThrottle, EmailSendThrottle, RegisterThrottle
from .verification import send_verification_email, user_from_verification_token

User = get_user_model()
token_generator = PasswordResetTokenGenerator()


class EmailNotVerified(APIException):
    status_code = status.HTTP_403_FORBIDDEN

    def __init__(self):
        # The machine-readable `code` lets the frontend offer "resend the
        # e-mail" instead of just showing a dead-end error.
        super().__init__(
            detail={
                "detail": "Confirme seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.",
                "code": "email_not_verified",
            }
        )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        # Runs only after the password was accepted, so "not verified" is never
        # revealed to someone who doesn't know it — and it runs before any
        # token or last_login update exists for the rejected attempt.
        if not user.is_email_verified:
            raise EmailNotVerified()
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # No tokens here: the account only works after the e-mail is confirmed.
        # If delivery fails it is logged, and the person can ask for a new link.
        send_verification_email(user)
        return Response({"email": user.email}, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = user_from_verification_token(serializer.validated_data["token"])
        if user is None:
            return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        # Idempotent: opening the same link twice (or a mail client pre-fetching
        # it) must not turn a successful confirmation into an error.
        if not user.is_email_verified:
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailSendThrottle, EmailAddressThrottle]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = User.objects.filter(email__iexact=serializer.validated_data["email"]).first()
        if user and user.is_active and not user.is_email_verified:
            send_verification_email(user)
        # Always 204, so this can't be used to find out which e-mails are registered.
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            return Response({"detail": "Senha incorreta."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.transactions.models import RecurrenceRule, Transaction

        user = request.user
        # Deleted in this order, ahead of the final user.delete() cascade:
        # Transaction.category and RecurrenceRule.category are PROTECT (so a
        # category in use can't be casually deleted via its own endpoint),
        # but Django's on_delete=PROTECT raises the instant *any* row
        # references the target — even one that's about to be deleted in
        # this very same cascade — so we clear the referencing rows first.
        RecurrenceRule.objects.filter(owner=user).delete()
        Transaction.objects.filter(owner=user).delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailSendThrottle, EmailAddressThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
            send_action_email(
                to=user.email,
                subject="Redefinição de senha — Lumi Finance",
                heading="Redefinir senha",
                paragraphs=[
                    "Recebemos um pedido para redefinir a senha da sua conta no Lumi Finance.",
                    "O link expira em breve e só pode ser usado uma vez.",
                ],
                action_label="Redefinir senha",
                action_url=reset_link,
                preheader="Use o link para escolher uma nova senha.",
                footnote="Se não foi você, é só ignorar este e-mail — sua senha continua a mesma.",
            )
        # Always return 204 so we don't leak which e-mails are registered.
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Link inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if not token_generator.check_token(user, data["token"]):
            return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data["new_password"])
        update_fields = ["password"]
        # The reset link only ever reached the inbox, so using it proves the
        # address is theirs — no reason to also make them confirm it again.
        if not user.is_email_verified:
            user.email_verified_at = timezone.now()
            update_fields.append("email_verified_at")
        user.save(update_fields=update_fields)
        return Response(status=status.HTTP_204_NO_CONTENT)
