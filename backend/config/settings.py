"""
Django settings for the Veltacore ITSM platform backend.

Environment-driven: SQLite by default for local dev, PostgreSQL 16 in
production via DATABASE_URL-style env vars. Redis backs cache + Celery.
Keycloak JWT auth and OPA PBAC are enabled when the corresponding env vars
are set; in dev they fall back to permissive defaults so the API is
exercisable without the full identity stack.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-key-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "django_filters",
    "corsheaders",
    # Veltacore apps
    "apps.accounts",
    "apps.tenants",
    "apps.sites",
    "apps.cmdb",
    "apps.infra",
    "apps.monitoring",
    "apps.incidents",
    "apps.problems",
    "apps.changes",
    "apps.alerts",
    "apps.apm",
    "apps.audit",
    "apps.integrations",
    "apps.policy",
    "apps.trading",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.tenants.middleware.TenantMiddleware",
    "apps.audit.middleware.AuditMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if os.environ.get("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ.get("POSTGRES_USER", "veltacore"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS (frontend dev server) ──────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type",
    "origin", "user-agent", "x-csrftoken", "x-requested-with", "x-tenant-id",
]

# ── DRF ─────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.KeycloakJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "apps.tenants.permissions.TenantScopePermission",
        "apps.policy.permissions.OpaPermission",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

# ── Cache / Redis ───────────────────────────────────────────────────────────
REDIS_URL = os.environ.get("REDIS_URL", "")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }

# ── Celery ──────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL or "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
CELERY_TASK_ALWAYS_EAGER = os.environ.get("CELERY_TASK_ALWAYS_EAGER", "1" if DEBUG else "0") == "1"
CELERY_TIMEZONE = "UTC"

# ── Keycloak ────────────────────────────────────────────────────────────────
KEYCLOAK_SERVER_URL = os.environ.get("KEYCLOAK_SERVER_URL", "")
KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "veltacore")
KEYCLOAK_CLIENT_ID = os.environ.get("KEYCLOAK_CLIENT_ID", "veltacore-api")
KEYCLOAK_VERIFY_AUD = os.environ.get("KEYCLOAK_VERIFY_AUD", "0") == "1"

# ── OPA ─────────────────────────────────────────────────────────────────────
OPA_URL = os.environ.get("OPA_URL", "")  # e.g. http://opa:8181/v1/data/veltacore/authz/allow
OPA_FAIL_OPEN = os.environ.get("OPA_FAIL_OPEN", "1" if DEBUG else "0") == "1"

# ── Tenancy ─────────────────────────────────────────────────────────────────
# Strict: querying a tenant-scoped model with no tenant scope raises instead of
# returning every tenant's rows (see apps/tenants/context.py).
TENANT_STRICT = os.environ.get("TENANT_STRICT", "1") == "1"


# ── Logging ─────────────────────────────────────────────────────────────────
# Audit events (apps.audit.events) go to stdout as one JSON object per line,
# for Filebeat to ship to Loki. Other loggers keep Django's defaults.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"raw": {"format": "%(message)s"}},
    "handlers": {"audit_stdout": {"class": "logging.StreamHandler", "formatter": "raw"}},
    "loggers": {
        "linkedeye.audit": {"handlers": ["audit_stdout"], "level": "INFO", "propagate": False},
    },
}

# ── Prometheus (device metrics) ─────────────────────────────────────────────
# Metrics are read from the provisioned Prometheus, not stored locally.
PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "")  # e.g. https://fs-le-dev-prometheus.finspot.in
PROMETHEUS_TOKEN = os.environ.get("PROMETHEUS_TOKEN", "")
PROMETHEUS_TENANT_LABEL = os.environ.get("PROMETHEUS_TENANT_LABEL", "")
PROMETHEUS_TIMEOUT = float(os.environ.get("PROMETHEUS_TIMEOUT", "10"))
