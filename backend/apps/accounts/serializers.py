import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


def _generate_username(email):
    """Deriva um username único a partir do e-mail — o campo não é mais
    pedido no cadastro (login já é só por e-mail), mas o AbstractUser do
    Django ainda exige um valor não vazio e único internamente."""
    base = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0]).lower() or "usuario"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "preferred_name",
            "avatar",
            "currency",
            "timezone",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["id", "email", "preferred_name", "password"]

    def create(self, validated_data):
        validated_data["username"] = _generate_username(validated_data["email"])
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
