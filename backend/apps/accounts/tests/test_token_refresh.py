import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.mark.django_db
def test_refresh_with_deleted_users_token_returns_401_not_500():
    user = User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    refresh = RefreshToken.for_user(user)
    user.delete()

    client = APIClient()
    response = client.post("/api/auth/token/refresh/", {"refresh": str(refresh)})

    assert response.status_code == 401
    assert response.data["detail"] == "Sessão inválida."
