import time
from contextlib import contextmanager

import requests
from django.conf import settings
from rest_framework.exceptions import APIException

# Thin wrapper around the Pluggy API (https://docs.pluggy.ai).
# Field names below follow Pluggy's documented schema as of this writing;
# double-check them against the current docs / sandbox once you have real
# credentials, since third-party APIs evolve.

_cached_api_key = {"value": None, "expires_at": 0.0}


class PluggyUnavailable(APIException):
    status_code = 503
    default_detail = (
        "Não foi possível falar com o Pluggy (Open Finance). Verifique se "
        "PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET estão configurados corretamente no .env."
    )
    default_code = "pluggy_unavailable"


@contextmanager
def pluggy_error_handling():
    """Converts any network/HTTP failure talking to Pluggy into a clean 503
    instead of an unhandled 500 — expected on first run, before real Pluggy
    credentials are configured."""
    try:
        yield
    except requests.exceptions.RequestException as exc:
        raise PluggyUnavailable() from exc


class PluggyClient:
    def __init__(self):
        self.base_url = settings.PLUGGY_BASE_URL.rstrip("/")
        self.client_id = settings.PLUGGY_CLIENT_ID
        self.client_secret = settings.PLUGGY_CLIENT_SECRET

    def _get_api_key(self):
        if _cached_api_key["value"] and _cached_api_key["expires_at"] > time.time():
            return _cached_api_key["value"]

        response = requests.post(
            f"{self.base_url}/auth",
            json={"clientId": self.client_id, "clientSecret": self.client_secret},
            timeout=15,
        )
        response.raise_for_status()
        api_key = response.json()["apiKey"]

        _cached_api_key["value"] = api_key
        _cached_api_key["expires_at"] = time.time() + 60 * 100  # refresh before ~2h expiry
        return api_key

    def _headers(self):
        return {"X-API-KEY": self._get_api_key()}

    def create_connect_token(self, item_id=None):
        payload = {"itemId": item_id} if item_id else {}
        response = requests.post(
            f"{self.base_url}/connect_token",
            json=payload,
            headers=self._headers(),
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["accessToken"]

    def get_item(self, item_id):
        response = requests.get(
            f"{self.base_url}/items/{item_id}", headers=self._headers(), timeout=15
        )
        response.raise_for_status()
        return response.json()

    def list_accounts(self, item_id):
        response = requests.get(
            f"{self.base_url}/accounts",
            params={"itemId": item_id},
            headers=self._headers(),
            timeout=15,
        )
        response.raise_for_status()
        return response.json().get("results", [])

    def list_transactions(self, account_id, from_date=None):
        params = {"accountId": account_id, "pageSize": 500}
        if from_date:
            params["from"] = from_date.isoformat()
        response = requests.get(
            f"{self.base_url}/transactions",
            params=params,
            headers=self._headers(),
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get("results", [])


pluggy_client = PluggyClient()
