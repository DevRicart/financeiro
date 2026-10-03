import hashlib

from rest_framework.throttling import SimpleRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    """Counts requests per client IP. Not AnonRateThrottle on purpose: that one
    reads request.user, which would run JWT authentication (and 401 on a stale
    token) on endpoints that are meant to be public."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class RegisterThrottle(IPRateThrottle):
    scope = "register"


class EmailSendThrottle(IPRateThrottle):
    scope = "email_send"


class EmailAddressThrottle(SimpleRateThrottle):
    """Counts e-mails requested *for* an address, whatever IP asks. Without it,
    rotating IPs would let someone mail-bomb a third party through us. It keys
    on the posted address whether or not an account exists, so hitting the
    limit reveals nothing about who is registered."""

    scope = "email_address"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return None
        digest = hashlib.sha256(email.encode()).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": digest}
