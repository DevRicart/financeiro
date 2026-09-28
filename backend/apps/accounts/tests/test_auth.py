import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_register_returns_tokens():
    client = APIClient()
    response = client.post(
        reverse("auth-register"),
        {
            "email": "ana@example.com",
            "password": "SenhaForte123",
            "preferred_name": "Ana",
        },
    )
    assert response.status_code == 201
    assert "access" in response.data
    assert response.data["user"]["email"] == "ana@example.com"


@pytest.mark.django_db
def test_register_generates_a_unique_username_from_the_email():
    client = APIClient()
    client.post(
        reverse("auth-register"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )
    second = client.post(
        reverse("auth-register"),
        {"email": "ana@outro.com", "password": "SenhaForte123"},
    )

    assert second.status_code == 201
    usernames = set(User.objects.values_list("username", flat=True))
    assert usernames == {"ana", "ana2"}


@pytest.mark.django_db
def test_login_with_email():
    client = APIClient()
    client.post(
        reverse("auth-register"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )

    response = client.post(
        reverse("auth-login"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db
def test_me_requires_authentication():
    client = APIClient()
    response = client.get(reverse("auth-me"))
    assert response.status_code == 401
