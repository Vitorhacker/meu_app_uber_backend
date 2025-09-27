import requests
import base64
import datetime
from config.settings import PICPAY_CLIENT_ID, PICPAY_CLIENT_SECRET, PICPAY_CALLBACK_URL, PICPAY_RETURN_URL

def get_access_token():
    auth = base64.b64encode(f"{PICPAY_CLIENT_ID}:{PICPAY_CLIENT_SECRET}".encode()).decode()
    resp = requests.post(
        "https://api.picpay.com/oauth/token",
        headers={"Authorization": f"Basic {auth}"},
        data={"grant_type": "client_credentials"}
    )
    resp.raise_for_status()
    return resp.json().get("access_token")

def create_charge(reference_id, value):
    token = get_access_token()
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(minutes=30)).isoformat()
    payload = {
        "referenceId": reference_id,
        "callbackUrl": PICPAY_CALLBACK_URL,
        "returnUrl": PICPAY_RETURN_URL,
        "value": value,
        "expiresAt": expires_at
    }
    resp = requests.post(
        "https://api.picpay.com/payments",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    resp.raise_for_status()
    return resp.json()
