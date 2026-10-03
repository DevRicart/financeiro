import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_action_email(
    *,
    to,
    subject,
    heading,
    paragraphs,
    action_label,
    action_url,
    preheader="",
    footnote="",
):
    """Sends a branded e-mail (HTML + plain text) with a single call-to-action button.

    Returns False instead of raising when delivery fails: the SMTP provider
    being down must not turn a sign-up or a password-reset request into a 500.
    The failure is logged, so it shows up in `docker compose logs backend`.
    """
    context = {
        "logo_url": f"{settings.FRONTEND_URL.rstrip('/')}/lumi-logo-email.png",
        "heading": heading,
        "paragraphs": paragraphs,
        "action_label": action_label,
        "action_url": action_url,
        "preheader": preheader,
        "footnote": footnote,
    }
    message = EmailMultiAlternatives(
        subject=subject,
        body=render_to_string("emails/action.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to],
    )
    message.attach_alternative(render_to_string("emails/action.html", context), "text/html")

    try:
        message.send()
    except Exception:
        logger.exception("Falha ao enviar o e-mail '%s'", subject)
        return False
    return True
