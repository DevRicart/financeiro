import importlib
import re
import time
from unittest import mock
from urllib.parse import unquote

import pytest
from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.verification import make_verification_token

User = get_user_model()


def register(client, email="ana@example.com", name="Ana"):
    return client.post(
        reverse("auth-register"),
        {"email": email, "password": "SenhaForte123", "preferred_name": name},
    )


def token_from_email(message):
    match = re.search(r"verify-email\?token=([^\s\"<]+)", message.body)
    assert match, f"no verification link in: {message.body}"
    return unquote(match.group(1))


# --- registration sends the link -------------------------------------------------


@pytest.mark.django_db
def test_register_sends_a_branded_verification_email():
    register(APIClient())

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["ana@example.com"]
    assert message.subject == "Confirme seu e-mail — Lumi Finance"
    assert "Olá, Ana!" in message.body
    assert "/verify-email?token=" in message.body
    html, mimetype = message.alternatives[0]
    assert mimetype == "text/html"
    assert "Confirmar e-mail" in html
    assert "#1D4A40" in html


@pytest.mark.django_db
def test_plain_text_email_keeps_urls_unescaped():
    # An autoescaped "&amp;" in the text part would break password-reset links.
    User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    APIClient().post(reverse("auth-password-reset"), {"email": "ana@example.com"})

    body = mail.outbox[0].body
    assert "&amp;" not in body
    assert re.search(r"/reset-password\?uid=\S+&token=\S+", body)


@pytest.mark.django_db
def test_register_still_succeeds_when_the_email_provider_is_down(caplog):
    with mock.patch("django.core.mail.EmailMultiAlternatives.send", side_effect=OSError("smtp down")):
        response = register(APIClient())

    assert response.status_code == 201
    assert User.objects.filter(email="ana@example.com").exists()
    assert "Falha ao enviar o e-mail" in caplog.text


# --- confirming ------------------------------------------------------------------


@pytest.mark.django_db
def test_following_the_link_verifies_the_account_and_unlocks_login():
    client = APIClient()
    register(client)
    token = token_from_email(mail.outbox[0])

    response = client.post(reverse("auth-verify-email"), {"token": token})

    assert response.status_code == 204
    assert User.objects.get(email="ana@example.com").email_verified_at is not None
    login = client.post(reverse("auth-login"), {"email": "ana@example.com", "password": "SenhaForte123"})
    assert login.status_code == 200


@pytest.mark.django_db
def test_confirming_twice_is_harmless():
    client = APIClient()
    register(client)
    token = token_from_email(mail.outbox[0])

    first = client.post(reverse("auth-verify-email"), {"token": token})
    verified_at = User.objects.get(email="ana@example.com").email_verified_at
    second = client.post(reverse("auth-verify-email"), {"token": token})

    assert first.status_code == second.status_code == 204
    assert User.objects.get(email="ana@example.com").email_verified_at == verified_at


@pytest.mark.django_db
@pytest.mark.parametrize("token", ["lixo", "abc:def:ghi", ""])
def test_garbage_tokens_are_rejected(token):
    response = APIClient().post(reverse("auth-verify-email"), {"token": token})
    assert response.status_code == 400


@pytest.mark.django_db
def test_tampered_token_is_rejected():
    register(APIClient())
    token = token_from_email(mail.outbox[0])
    tampered = token[:-3] + ("aaa" if not token.endswith("aaa") else "bbb")

    response = APIClient().post(reverse("auth-verify-email"), {"token": tampered})

    assert response.status_code == 400
    assert User.objects.get(email="ana@example.com").email_verified_at is None


@pytest.mark.django_db
def test_expired_token_is_rejected():
    user = User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    with mock.patch("django.core.signing.time.time", return_value=time.time() - 49 * 3600):
        token = make_verification_token(user)

    response = APIClient().post(reverse("auth-verify-email"), {"token": token})

    assert response.status_code == 400
    assert response.data["detail"] == "Link inválido ou expirado."


@pytest.mark.django_db
def test_token_stops_working_if_the_account_email_changed():
    user = User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    token = make_verification_token(user)
    user.email = "outra@example.com"
    user.save()

    response = APIClient().post(reverse("auth-verify-email"), {"token": token})

    assert response.status_code == 400


# --- resending -------------------------------------------------------------------


@pytest.mark.django_db
def test_resend_sends_a_fresh_link_to_an_unverified_account():
    client = APIClient()
    register(client)
    mail.outbox.clear()

    response = client.post(reverse("auth-resend-verification"), {"email": "ANA@example.com"})

    assert response.status_code == 204
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["ana@example.com"]


@pytest.mark.django_db
def test_resend_stays_silent_for_unknown_and_already_verified_addresses():
    from django.utils import timezone

    User.objects.create_user(
        email="ana@example.com", username="ana", password="SenhaForte123", email_verified_at=timezone.now()
    )
    client = APIClient()

    unknown = client.post(reverse("auth-resend-verification"), {"email": "ninguem@example.com"})
    verified = client.post(reverse("auth-resend-verification"), {"email": "ana@example.com"})

    # Same answer either way, so the endpoint can't be used to probe who has an account.
    assert unknown.status_code == verified.status_code == 204
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_resend_is_limited_per_address_even_across_different_ips():
    User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    statuses = []
    for attempt in range(7):
        client = APIClient()
        statuses.append(
            client.post(
                reverse("auth-resend-verification"),
                {"email": "ana@example.com"},
                REMOTE_ADDR=f"10.0.0.{attempt}",
            ).status_code
        )

    assert statuses == [204] * 5 + [429] * 2
    assert len(mail.outbox) == 5


@pytest.mark.django_db
def test_resend_is_limited_per_ip():
    client = APIClient()
    statuses = [
        client.post(reverse("auth-resend-verification"), {"email": f"pessoa{n}@example.com"}).status_code
        for n in range(22)
    ]

    assert statuses[:20] == [204] * 20
    assert statuses[20:] == [429, 429]


@pytest.mark.django_db
def test_registration_is_limited_per_ip():
    client = APIClient()
    statuses = [register(client, email=f"pessoa{n}@example.com").status_code for n in range(12)]

    assert statuses[:10] == [201] * 10
    assert statuses[10:] == [429, 429]


@pytest.mark.django_db
def test_a_forged_forwarded_for_header_cannot_dodge_the_ip_limit_behind_nginx(settings):
    # nginx appends the real client address to whatever the client sent, so with
    # one trusted proxy the *last* entry is the one to believe.
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
    client = APIClient()
    statuses = [
        client.post(
            reverse("auth-register"),
            {"email": f"pessoa{n}@example.com", "password": "SenhaForte123"},
            HTTP_X_FORWARDED_FOR=f"forjado-{n}, 203.0.113.7",
        ).status_code
        for n in range(12)
    ]

    assert statuses[:10] == [201] * 10
    assert statuses[10:] == [429, 429]


# --- password reset --------------------------------------------------------------


@pytest.mark.django_db
def test_password_reset_email_is_branded_and_goes_to_the_account_address():
    User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")

    response = APIClient().post(reverse("auth-password-reset"), {"email": "Ana@Example.com"})

    assert response.status_code == 204
    message = mail.outbox[0]
    assert message.to == ["ana@example.com"]
    assert message.subject == "Redefinição de senha — Lumi Finance"
    assert "Redefinir senha" in message.alternatives[0][0]


@pytest.mark.django_db
def test_password_reset_for_unknown_address_answers_the_same_and_sends_nothing():
    response = APIClient().post(reverse("auth-password-reset"), {"email": "ninguem@example.com"})

    assert response.status_code == 204
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_password_reset_requests_are_limited_per_address():
    User.objects.create_user(email="ana@example.com", username="ana", password="SenhaForte123")
    statuses = [
        APIClient().post(
            reverse("auth-password-reset"), {"email": "ana@example.com"}, REMOTE_ADDR=f"10.0.1.{n}"
        ).status_code
        for n in range(6)
    ]

    assert statuses == [204] * 5 + [429]


@pytest.mark.django_db
def test_completing_a_password_reset_also_confirms_the_email():
    client = APIClient()
    register(client)
    mail.outbox.clear()
    client.post(reverse("auth-password-reset"), {"email": "ana@example.com"})
    match = re.search(r"reset-password\?uid=(\S+)&token=(\S+)", mail.outbox[0].body)
    uid, token = match.group(1), match.group(2)

    confirm = client.post(
        reverse("auth-password-reset-confirm"),
        {"uid": uid, "token": token, "new_password": "OutraSenha456"},
    )

    assert confirm.status_code == 204
    assert User.objects.get(email="ana@example.com").email_verified_at is not None
    login = client.post(reverse("auth-login"), {"email": "ana@example.com", "password": "OutraSenha456"})
    assert login.status_code == 200


# --- existing accounts -----------------------------------------------------------


@pytest.mark.django_db
def test_migration_marks_accounts_that_existed_before_verification_as_verified():
    # This is the safeguard against locking out everyone who signed up before
    # the feature shipped (including the owner's own account).
    migration = importlib.import_module("apps.accounts.migrations.0002_user_email_verified_at")
    old_user = User.objects.create_user(email="antiga@example.com", username="antiga", password="SenhaForte123")
    assert old_user.email_verified_at is None

    migration.mark_existing_users_as_verified(django_apps, None)

    old_user.refresh_from_db()
    assert old_user.email_verified_at is not None
