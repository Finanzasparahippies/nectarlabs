from pathlib import Path
import environ
import os
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
# Look for the correct env file based on environment
env_name = ".env.prod" if os.environ.get("ENVIRONMENT") == "production" else ".env.staging"
env_path = os.path.join(BASE_DIR.parent, env_name)
if not os.path.exists(env_path):
    env_path = os.path.join(BASE_DIR.parent, ".env.local")
environ.Env.read_env(env_path)

# Quick-start development settings - unsuitable for production
ENVIRONMENT = env("ENVIRONMENT", default="local")
DEBUG = env.bool("DEBUG", default=(ENVIRONMENT == "local"))
SECRET_KEY = env("SECRET_KEY", default="django-insecure-default-key")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*", "localhost", "127.0.0.1", "backend"])
# Automatically allow all customer subdomains in local, staging, and production environments
if ".nectarlabs.dev" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".nectarlabs.dev")
if ".staging.nectarlabs.dev" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".staging.nectarlabs.dev")
if ".localhost" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(".localhost")

# Production Security Settings (inspired by OG Barberia)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = True
    USE_X_FORWARDED_HOST = True
    USE_X_FORWARDED_PORT = True
    SECURE_HSTS_SECONDS = 31536000 # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "cloudinary_storage",
    "cloudinary",
    "django_ckeditor_5",
    
    # Local apps (prefixed with apps. for modularity)
    "apps.users",
    "apps.blog",
    "apps.newsletter",
    "apps.shop",
    "apps.dashboard",
    "apps.tickets",
    "apps.performance",
    "apps.tenants",
    "apps.bookings",
    "apps.delivery",
    "apps.sponsorship",
    "apps.billing",
]

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.performance.middleware.PerformanceMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# Use Supabase/Postgres by default if configured, fallback to sqlite
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}
if not env("DATABASE_URL", default=None):
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="postgres"),
        "USER": env("DB_USER", default="postgres"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }

# Force using SQLite when running tests to avoid Supabase connection pooler conflicts
import sys
if 'test' in sys.argv:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
    # Override storage during tests to avoid Cloudinary HTTP requests
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Auth settings
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / "staticfiles"
# Storages (Django 5.0 style)
if 'test' in sys.argv:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage" if DEBUG else "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    WHITENOISE_MANIFEST_STRICT = False

# Media files & Cloudinary
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}

# Email / SMTP
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.zoho.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Nectar Labs <soporte@nectarlabs.dev>")

# Nectar Labs Organizational Email Aliases
EMAIL_SUPPORT = env("EMAIL_SUPPORT", default="Nectar Labs Soporte <soporte@nectarlabs.dev>")
EMAIL_NEWSLETTER = env("EMAIL_NEWSLETTER", default="Nectar Labs <hola@nectarlabs.dev>")
EMAIL_CONTACT = env("EMAIL_CONTACT", default="Nectar Labs <contacto@nectarlabs.dev>")
EMAIL_BILLING = env("EMAIL_BILLING", default="Nectar Labs Facturación <facturacion@nectarlabs.dev>")

# SMTP Brevo (Plan Gratuito)
BREVO_EMAIL_HOST = env("BREVO_EMAIL_HOST", default="smtp-relay.brevo.com")
BREVO_EMAIL_PORT = env.int("BREVO_EMAIL_PORT", default=587)
BREVO_EMAIL_USE_TLS = env.bool("BREVO_EMAIL_USE_TLS", default=True)
BREVO_EMAIL_HOST_USER = env("BREVO_EMAIL_HOST_USER", default="")
BREVO_EMAIL_HOST_PASSWORD = env("BREVO_EMAIL_HOST_PASSWORD", default="")
BREVO_DEFAULT_FROM_EMAIL = env("BREVO_DEFAULT_FROM_EMAIL", default="Nectar Labs <no-reply@nectarlabs.dev>")

# SMTP Amazon SES (Plan de Pago)
SES_EMAIL_HOST = env("SES_EMAIL_HOST", default="email-smtp.us-east-1.amazonaws.com")
SES_EMAIL_PORT = env.int("SES_EMAIL_PORT", default=587)
SES_EMAIL_USE_TLS = env.bool("SES_EMAIL_USE_TLS", default=True)
SES_EMAIL_HOST_USER = env("SES_EMAIL_HOST_USER", default="")
SES_EMAIL_HOST_PASSWORD = env("SES_EMAIL_HOST_PASSWORD", default="")
SES_DEFAULT_FROM_EMAIL = env("SES_DEFAULT_FROM_EMAIL", default="Nectar Labs <no-reply@nectarlabs.dev>")


# Stripe
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

# Groq AI (Support Chat Assistant)
GROQ_API_KEY = env("GROQ_API_KEY", default="")


# CORS / CSRF
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Automatically allow staging and production domains in CSRF trusted origins
for domain in [".nectarlabs.dev", ".staging.nectarlabs.dev"]:
    for proto in ["http://", "https://"]:
        origin = f"{proto}{domain}"
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)
        # Also include the bare domains
        bare_origin = f"{proto}{domain.lstrip('.')}"
        if bare_origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(bare_origin)


if DEBUG:
    dev_origins = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8080",
        "http://*.localhost",
        "http://*.nectarlabs.localhost",
        "https://*.github.dev",
        "https://*.app.github.dev",
    ]
    for origin in dev_origins:
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)

# CKEditor 5
CKEDITOR_5_CONFIGS = {
    'default': {
        'toolbar': ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'imageUpload', ],
    },
}
CKEDITOR_5_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cloudflare R2 / S3 Storage Options
R2_STORAGE_OPTIONS = {
    'access_key': env('R2_ACCESS_KEY_ID', default=''),
    'secret_key': env('R2_SECRET_ACCESS_KEY', default=''),
    'bucket_name': env('R2_BUCKET_NAME', default=''),
    'endpoint_url': env('R2_S3_ENDPOINT_URL', default=''),
}

# Cache Configuration
if 'test' in sys.argv:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "nectar-labs-test-cache",
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": env("REDIS_URL", default="redis://redis:6379/1"),
            "TIMEOUT": 3600,
        }
    }

# Logging configuration to display logs in console during test/run
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[\033[94m%(asctime)s\033[0m] %(levelname)s [%(name)s] %(message)s',
            'datefmt': '%H:%M:%S'
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'tests': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}



