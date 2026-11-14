// WhatsApp add-on (optional). Meta calls this address when a customer messages
// the business on WhatsApp. It does nothing unless the WHATSAPP_* settings are
// filled in on Netlify, so it is safe to leave in a project that doesn't use it.
// Setup steps: see WHATSAPP-SETUP.md.
import { signatureIsValid, markRead } from "../whatsapp/meta.mjs";
import { handleMessage } from "../whatsapp/flow.mjs";
import { firstTimeSeen } from "../whatsapp/state.mjs";

const text = (status, body) => new Response(body, { status, headers: { "content-type": "text/plain", "cache-control": "no-store" } });

export default async (req) => {
  const env = process.env;
  const ready = env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID && env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET;
  if (!ready) return text(404, "WhatsApp is not set up for this site.");

  // One-time check Meta makes when you connect this address in the Meta dashboard.
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;
    const ok = q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === env.WHATSAPP_VERIFY_TOKEN;
    return ok ? text(200, q.get("hub.challenge") || "") : text(403, "Wrong verify token.");
  }
  if (req.method !== "POST") return text(405, "Use POST.");

  const raw = await req.text();
  if (!signatureIsValid(raw, req.headers.get("x-hub-signature-256"), env.WHATSAPP_APP_SECRET)) return text(401, "Bad signature.");

  let body;
  try { body = JSON.parse(raw); } catch { return text(400, "Invalid JSON."); }
  const business = String(env.WHATSAPP_BUSINESS || "glow-studio").toLowerCase();

  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      if (change?.field !== "messages" || value?.metadata?.phone_number_id !== env.WHATSAPP_PHONE_ID) continue;
      for (const message of value.messages || []) {      // delivery receipts ("statuses") are ignored
        try {
          if (!message?.id || !(await firstTimeSeen(message.id))) continue;
          const who = (value.contacts || []).find(c => c.wa_id === message.from) || value.contacts?.[0];
          markRead(message.id);
          await handleMessage(business, message, who?.profile?.name);
        } catch (err) {
          console.error("WhatsApp message failed", err);
        }
      }
    }
  }
  return text(200, "ok");   // always acknowledge, or Meta keeps re-sending
};

export const config = { path: "/api/whatsapp" };
