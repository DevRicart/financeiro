from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing

from apps.common.emailing import send_action_email

VERIFICATION_SALT = "accounts.email-verification"
VERIFICATION_MAX_AGE_SECONDS = 60 * 60 * 48
VERIFICATION_VALID_HOURS = VERIFICATION_MAX_AGE_SECONDS // 3600


def make_verification_token(user):
    # The e-mail is part of the signed payload, so a token stops working if the
    # address it was issued for ever changes.
    return signing.dumps({"uid": user.pk, "email": user.email}, salt=VERIFICATION_SALT)


def user_from_verification_token(token):
    """Returns the user a valid, unexpired token was issued for, or None."""
    try:
        payload = signing.loads(token, salt=VERIFICATION_SALT, max_age=VERIFICATION_MAX_AGE_SECONDS)
    except signing.BadSignature:  # also covers SignatureExpired
        return None
    if not isinstance(payload, dict):
        return None
    return get_user_model().objects.filter(pk=payload.get("uid"), email=payload.get("email")).first()


def send_verification_email(user):
    token = quote(make_verification_token(user), safe="")
    link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    greeting = f"Olá, {user.preferred_name}!" if user.preferred_name else "Olá!"

    return send_action_email(
        to=user.email,
        subject="Confirme seu e-mail — Lumi Finance",
        heading="Confirme seu e-mail",
        paragraphs=[
            f"{greeting} Falta só confirmar seu e-mail para começar a usar o Lumi Finance.",
            f"O link vale por {VERIFICATION_VALID_HOURS} horas.",
        ],
        action_label="Confirmar e-mail",
        action_url=link,
        preheader="Falta só um clique para ativar sua conta.",
        footnote="Se você não criou uma conta no Lumi Finance, é só ignorar este e-mail.",
    )
