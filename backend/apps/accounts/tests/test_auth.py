import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_register_creates_an_unverified_account_and_returns_no_tokens():
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
    assert "access" not in response.data
    assert "refresh" not in response.data
    assert response.data == {"email": "ana@example.com"}
    assert User.objects.get(email="ana@example.com").email_verified_at is None


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
def test_login_with_email_once_verified():
    User.objects.create_user(
        email="ana@example.com",
        username="ana",
        password="SenhaForte123",
        email_verified_at=timezone.now(),
    )

    response = APIClient().post(
        reverse("auth-login"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )
    assert response.status_code == 200
    assert "access" in response.data
    assert response.data["user"]["email"] == "ana@example.com"


@pytest.mark.django_db
def test_login_is_refused_until_the_email_is_verified():
    client = APIClient()
    client.post(
        reverse("auth-register"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )

    response = client.post(
        reverse("auth-login"),
        {"email": "ana@example.com", "password": "SenhaForte123"},
    )

    assert response.status_code == 403
    assert response.data["code"] == "email_not_verified"
    assert "access" not in response.data
    # A refused attempt must not leave a session behind.
    assert User.objects.get(email="ana@example.com").last_login is None


@pytest.mark.django_db
def test_wrong_password_on_an_unverified_account_does_not_reveal_it_is_unverified():
    User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")

    response = APIClient().post(
        reverse("auth-login"),
        {"email": "ana@example.com", "password": "senha-errada"},
    )

    assert response.status_code == 401
    assert response.data.get("code") != "email_not_verified"
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_me_requires_authentication():
    client = APIClient()
    response = client.get(reverse("auth-me"))
    assert response.status_code == 401
