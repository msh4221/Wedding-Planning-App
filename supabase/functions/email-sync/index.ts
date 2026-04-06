/**
 * Supabase Edge Function: email-sync
 *
 * Called from the "Sync Emails" button in the wedding planner app.
 * Reads unprocessed wedding emails from Gmail, extracts todos via Claude,
 * and writes new items into the wedding_data table.
 *
 * Required secrets (set in Supabase dashboard > Edge Functions > Secrets):
 *   ANTHROPIC_API_KEY
 *   GMAIL_CLIENT_ID
 *   GMAIL_CLIENT_SECRET
 *   GMAIL_REFRESH_TOKEN
 *   SUPABASE_SERVICE_ROLE_KEY   (from Settings > API > service_role key)
 *   SUPABASE_URL                (auto-available in Edge Functions)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PROCESSED_LABEL = 'wedding-synced';
const SEARCH_QUERY = 'label:wedding OR subject:(vendor OR quote OR proposal OR reservation OR wedding) -label:wedding-synced';

async function getGmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GMAIL_CLIENT_ID')!,
      client_secret: Deno.env.get('GMAIL_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GMAIL_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Gmail token refresh failed: ' + JSON.stringify(json));
  return json.access_token;
}

async function getOrCreateLabel(token: string, labelName: string): Promise<string> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { labels } = await res.json();
  const existing = labels?.find((l: { name: string; id: string }) => l.name === labelName);
  if (existing) return existing.id;

  const created = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: labelName }),
  });
  const label = await created.json();
  return label.id;
}

async function getEmailBody(token: string, messageId: string): Promise<{ subject: string; from: string; body: string }> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const msg = await res.json();
  const headers: Record<string, string> = {};
  for (const h of msg.payload?.headers ?? []) headers[h.name] = h.value;

  function extractText(parts: { mimeType: string; body?: { data?: string }; parts?: unknown[] }[]): string {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
      if (part.parts) {
        const result = extractText(part.parts as typeof parts);
        if (result) return result;
      }
    }
    return '';
  }

  let body = '';
  if (msg.payload?.parts) {
    body = extractText(msg.payload.parts);
  } else if (msg.payload?.body?.data) {
    body = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }

  return {
    subject: headers['Subject'] ?? '(no subject)',
    from: headers['From'] ?? 'unknown',
    body: body.slice(0, 3000),
  };
}

async function parseEmailWithClaude(subject: string, from: string, body: string): Promise<{
  description: string; due_date: string | null; priority: string; notes: string;
}[]> {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a wedding planning assistant. Extract action items from this email.

Email subject: ${subject}
From: ${from}
Date: ${today}

Body:
${body}

Return a JSON array. Each item: { "description": string, "due_date": "YYYY-MM-DD" or null, "priority": "high"|"medium"|"low", "notes": string }
If no action items, return []. Return ONLY valid JSON.`,
      }],
    }),
  });
  const json = await res.json();
  const text = json.content?.[0]?.text?.trim() ?? '[]';
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

async function markProcessed(token: string, messageId: string, labelId: string) {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

Deno.serve(async (req) => {
  // Allow CORS from Vercel / browser
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceKey);

    // Load current state
    const { data: row, error: loadErr } = await db
      .from('wedding_data').select('data').eq('id', 'main').single();
    if (loadErr || !row) throw new Error('Could not load wedding_data from Supabase');
    const state = row.data;

    // Gmail
    const token = await getGmailAccessToken();
    const processedLabelId = await getOrCreateLabel(token, PROCESSED_LABEL);

    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(SEARCH_QUERY)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { messages = [] } = await searchRes.json();

    const newTodos: unknown[] = [];
    const existingIds: Set<number> = new Set(state.todos.map((t: { id: number }) => t.id));
    let nextId = Math.max(0, ...state.todos.map((t: { id: number }) => t.id)) + 1;

    for (const msgRef of messages) {
      const { subject, from, body } = await getEmailBody(token, msgRef.id);
      let parsed: Awaited<ReturnType<typeof parseEmailWithClaude>> = [];
      try { parsed = await parseEmailWithClaude(subject, from, body); } catch { /* skip */ }

      for (const item of parsed) {
        const todo = {
          id: nextId++,
          description: item.description,
          month: item.due_date?.slice(0, 7) ?? '2026-04',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: item.due_date ?? '',
          status: 'pending',
          priority: item.priority ?? 'medium',
          notes: `source: "${subject}" from ${from}\n${item.notes ?? ''}`.trim(),
        };
        if (!existingIds.has(todo.id)) {
          state.todos.push(todo);
          newTodos.push(todo);
          existingIds.add(todo.id);
        }
      }

      await markProcessed(token, msgRef.id, processedLabelId);
    }

    if (newTodos.length > 0) {
      await db.from('wedding_data').upsert({
        id: 'main', data: state, updated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ added: newTodos.length, todos: newTodos }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
