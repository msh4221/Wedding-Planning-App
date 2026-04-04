"""
Wedding Email Agent
-------------------
Reads wedding-related emails from Gmail, uses Claude to extract to-do items,
and inserts them into Supabase. Run manually or on a schedule.

First-time setup:
1. Enable Gmail API at console.cloud.google.com
2. Download OAuth credentials as credentials.json into this folder
3. Run once — a browser window will open for Google sign-in
4. Copy .env.example to .env and fill in values
5. Run: python agent.py
"""

import os
import json
import base64
import re
from datetime import datetime, date
from pathlib import Path

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import anthropic
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / '.env')

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
PROCESSED_LABEL = 'wedding-synced'
SEARCH_QUERY = 'label:wedding OR subject:(vendor OR quote OR proposal OR reservation OR wedding) -label:wedding-synced'
CREDENTIALS_FILE = Path(__file__).parent / 'credentials.json'
TOKEN_FILE = Path(__file__).parent / 'token.json'

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']
ANTHROPIC_API_KEY = os.environ['ANTHROPIC_API_KEY']


def get_gmail_service():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        TOKEN_FILE.write_text(creds.to_json())
    return build('gmail', 'v1', credentials=creds)


def get_or_create_label(service, label_name):
    labels = service.users().labels().list(userId='me').execute().get('labels', [])
    for label in labels:
        if label['name'] == label_name:
            return label['id']
    new_label = service.users().labels().create(userId='me', body={'name': label_name}).execute()
    return new_label['id']


def get_email_body(msg):
    """Extract plain text body from a Gmail message."""
    payload = msg.get('payload', {})

    def extract_text(parts):
        for part in parts:
            mime = part.get('mimeType', '')
            if mime == 'text/plain':
                data = part.get('body', {}).get('data', '')
                if data:
                    return base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
            if 'parts' in part:
                result = extract_text(part['parts'])
                if result:
                    return result
        return ''

    if 'parts' in payload:
        return extract_text(payload['parts'])

    body_data = payload.get('body', {}).get('data', '')
    if body_data:
        return base64.urlsafe_b64decode(body_data).decode('utf-8', errors='replace')
    return ''


def parse_todos_with_claude(subject, sender, body, client):
    """Ask Claude to extract wedding to-do items from an email."""
    today = date.today().isoformat()
    prompt = f"""You are a wedding planning assistant. Extract any action items or to-dos from this email.

Email subject: {subject}
From: {sender}
Date received: {today}

Email body:
{body[:3000]}

Return a JSON array of to-do items. Each item should have:
- description: clear action for Matt or Emily to take (string)
- due_date: YYYY-MM-DD format if a deadline is mentioned, otherwise null
- priority: "high" if urgent/deadline-driven, "medium" if important, "low" otherwise
- notes: any relevant details from the email (string)

Return ONLY valid JSON, no explanation. Example:
[{{"description": "Confirm final headcount with caterer", "due_date": "2026-10-14", "priority": "high", "notes": "Sammi Jones requested final count by Oct 14"}}]

If there are no actionable to-dos, return an empty array: []"""

    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}]
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    text = re.sub(r'^```(?:json)?\n?', '', text)
    text = re.sub(r'\n?```$', '', text)
    return json.loads(text)


def next_todo_id(state):
    """Get the next available integer id for a new todo."""
    existing_ids = [t.get('id', 0) for t in state.get('todos', []) if isinstance(t.get('id'), int)]
    return max(existing_ids, default=0) + 1


def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Wedding email agent starting...")

    gmail = get_gmail_service()
    processed_label_id = get_or_create_label(gmail, PROCESSED_LABEL)

    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # Load current Supabase state
    result = db.table('wedding_data').select('data').eq('id', 'main').single().execute()
    if not result.data:
        print("No wedding_data found in Supabase. Run the app first to initialize.")
        return
    state = result.data['data']

    # Search Gmail
    messages_result = gmail.users().messages().list(userId='me', q=SEARCH_QUERY, maxResults=20).execute()
    messages = messages_result.get('messages', [])
    print(f"Found {len(messages)} unprocessed email(s) to check.")

    new_todos = []
    for msg_ref in messages:
        msg = gmail.users().messages().get(userId='me', id=msg_ref['id'], format='full').execute()
        headers = {h['name']: h['value'] for h in msg.get('payload', {}).get('headers', [])}
        subject = headers.get('Subject', '(no subject)')
        sender = headers.get('From', 'unknown')
        body = get_email_body(msg)

        print(f"  Parsing: {subject[:60]}...")
        try:
            todos = parse_todos_with_claude(subject, sender, body, claude)
        except (json.JSONDecodeError, Exception) as e:
            print(f"  Error parsing: {e}")
            todos = []

        for todo in todos:
            next_id = next_todo_id(state)
            month = todo.get('due_date', '')[:7] if todo.get('due_date') else ''
            item = {
                'id': next_id,
                'description': todo['description'],
                'month': month or '2026-04',
                'startDate': date.today().isoformat(),
                'dueDate': todo.get('due_date') or '',
                'status': 'pending',
                'priority': todo.get('priority', 'medium'),
                'notes': f"source: \"{subject}\" from {sender}\n{todo.get('notes', '')}".strip()
            }
            state['todos'].append(item)
            new_todos.append(item['description'])
            print(f"  + Added todo: {item['description'][:60]}")

        # Mark email as processed
        gmail.users().messages().modify(
            userId='me', id=msg_ref['id'],
            body={'addLabelIds': [processed_label_id]}
        ).execute()

    if new_todos:
        db.table('wedding_data').upsert({
            'id': 'main',
            'data': state,
            'updated_at': datetime.utcnow().isoformat()
        }).execute()
        print(f"\nDone. Added {len(new_todos)} new to-do(s) to Supabase.")
    else:
        print("No new to-dos found.")


if __name__ == '__main__':
    main()
