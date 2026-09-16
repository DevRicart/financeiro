from .base import *  # noqa: F401,F403
from .base import BASE_DIR, env

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Uses PostgreSQL automatically when DATABASE_HOST is set (e.g. via Docker
# Compose). Falls back to SQLite so the backend runs with zero extra
# installs while Docker isn't set up yet.
if env("DATABASE_HOST", default=""):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("DATABASE_NAME", default="financeiro"),
            "USER": env("DATABASE_USER", default="financeiro"),
            "PASSWORD": env("DATABASE_PASSWORD", default="financeiro"),
            "HOST": env("DATABASE_HOST"),
            "PORT": env("DATABASE_PORT", default="5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CORS_ALLOW_ALL_ORIGINS = True
