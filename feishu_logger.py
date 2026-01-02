import os
import requests
import json
from datetime import datetime
from dateutil import parser
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")
BTABLE_APP_TOKEN = os.getenv("FEISHU_TABLE_APP_TOKEN")
BTABLE_TABLE_ID = os.getenv("FEISHU_TABLE_ID")

def get_tenant_access_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = { "Content-Type": "application/json" }
    data = { "app_id": APP_ID, "app_secret": APP_SECRET }

    response = requests.post(url, json=data, headers=headers)
    res_json = response.json()
    if "tenant_access_token" in res_json:
        return res_json["tenant_access_token"]
    else:
        print("Failed to get tenant access token:", res_json)
        raise ValueError("Failed to get tenant access token. Check app credentials and .env setup.")

def upsert_log_to_bitable(user_id, intent, message, timestamp, url, summary, full_convo):
    token = get_tenant_access_token()
    base_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{BTABLE_APP_TOKEN}/tables/{BTABLE_TABLE_ID}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    query_url = f"{base_url}/records?filter=CurrentValue.[User ID]=\"{user_id}\""
    res = requests.get(query_url, headers=headers)
    records = res.json().get("data", {}).get("items", [])

    try:
        formatted_full_convo = json.dumps(json.loads(full_convo), indent=2, ensure_ascii=False)
    except Exception as e:
        print("full_convo parse error:", full_convo)
        print("Exception:", e)
        raise


    payload = {
        "fields": {
            "User ID": user_id,
            "User Intent": intent,
            "Last Message": message,
            "Timestamp": int(parser.isoparse(timestamp).timestamp()) * 1000,
            "Page URL": url,
            "Full Conversation": formatted_full_convo,
            "Conversation Summary": summary
        }
    }

    if records:
        record_id = records[0]["record_id"]
        update_url = f"{base_url}/records/{record_id}"
        response = requests.put(update_url, headers=headers, json=payload)
    else:
        create_url = f"{base_url}/records"
        response = requests.post(create_url, headers=headers, json=payload)

    print("Feishu payload:", json.dumps(payload, indent=2, ensure_ascii=False))
    print("Feishu response:", response.json())
    return response.json()
