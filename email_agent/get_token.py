"""
One-time Gmail OAuth token generator.

Run this script once to get a refresh token, then paste it into
Supabase Edge Function secrets as GMAIL_REFRESH_TOKEN.

Requirements: pip install google-auth-oauthlib

Setup:
1. Go to console.cloud.google.com
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download as credentials.json into this folder
5. Run: python get_token.py
"""

import json
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
CREDENTIALS_FILE = Path(__file__).parent / 'credentials.json'

def main():
    if not CREDENTIALS_FILE.exists():
        print("ERROR: credentials.json not found.")
        print("Download it from console.cloud.google.com > APIs & Services > Credentials")
        return

    flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
    creds = flow.run_local_server(port=0)

    client_info = json.loads(CREDENTIALS_FILE.read_text())
    client_data = client_info.get('installed') or client_info.get('web', {})

    print("\n--- Copy these into Supabase Edge Function Secrets ---")
    print(f"GMAIL_CLIENT_ID     = {client_data.get('client_id')}")
    print(f"GMAIL_CLIENT_SECRET = {client_data.get('client_secret')}")
    print(f"GMAIL_REFRESH_TOKEN = {creds.refresh_token}")
    print("------------------------------------------------------\n")

if __name__ == '__main__':
    main()
