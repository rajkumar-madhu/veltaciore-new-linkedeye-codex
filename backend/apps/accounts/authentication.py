"""Keycloak JWT authentication for DRF.

Verifies RS256 tokens against the realm's JWKS when KEYCLOAK_SERVER_URL is
configured. In dev (no Keycloak configured) requests fall through to
AnonymousUser so the API stays exercisable; OPA/permission classes then apply
their own dev defaults.
"""
from __future__ import annotations

import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None and settings.KEYCLOAK_SERVER_URL:
        url = (
            f"{settings.KEYCLOAK_SERVER_URL.rstrip('/')}/realms/"
            f"{settings.KEYCLOAK_REALM}/protocol/openid-connect/certs"
        )
        _jwks_client = jwt.PyJWKClient(url)
    return _jwks_client


class KeycloakUser(AnonymousUser):
    """Authenticated principal carrying Keycloak claims (no DB row needed)."""

    def __init__(self, claims: dict):
        super().__init__()
        self.claims = claims
        self.username = claims.get("preferred_username", "")
        self.email = claims.get("email", "")
        self.groups_list = claims.get("groups", []) or claims.get(
            "realm_access", {}
        ).get("roles", [])

    @property
    def is_authenticated(self):  # type: ignore[override]
        return True

    @property
    def is_anonymous(self):  # type: ignore[override]
        return False


class KeycloakJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        token = header.split(" ", 1)[1]
        client = _get_jwks_client()
        if client is None:
            # Keycloak not configured (dev): ignore bearer tokens.
            return None
        try:
            signing_key = client.get_signing_key_from_jwt(token)
            options = {"verify_aud": settings.KEYCLOAK_VERIFY_AUD}
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.KEYCLOAK_CLIENT_ID,
                options=options,
            )
        except jwt.PyJWTError as exc:
            raise exceptions.AuthenticationFailed(f"Invalid token: {exc}") from exc
        return (KeycloakUser(claims), token)
