from django.contrib.auth import get_user_model
from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    if isinstance(exc, ProtectedError):
        # Raised by on_delete=PROTECT — a plain Python exception DRF doesn't
        # know about by default, so it would otherwise surface as a 500.
        return Response(
            {"detail": "Não é possível excluir: existem outros registros que dependem deste."},
            status=status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, get_user_model().DoesNotExist):
        # SimpleJWT's TokenRefreshSerializer looks up the user encoded in the
        # token and doesn't catch this itself: a refresh token that outlives
        # its account (e.g. the account was deleted from another device)
        # would otherwise 500 instead of just looking like an invalid session.
        return Response({"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED)

    return drf_exception_handler(exc, context)
