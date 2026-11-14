// Talks to Meta's WhatsApp Business Platform (Cloud API).
import { createHmac, timingSafeEqual } from "node:crypto";

const VERSION = process.env.WHATSAPP_API_VERSION || "v26.0";

// Every message Meta sends us is signed with the app secret. Anything else is rejected.
export function signatureIsValid(rawBody, header, secret) {
  if (!secret || typeof header !== "string" || !header.startsWith("sha256=")) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return want.length === got.length && timingSafeEqual(want, got);
}

async function send(payload) {
  const url = `https://graph.facebook.com/${VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!res.ok) console.error("WhatsApp send failed", res.status, (await res.text().catch(() => "")).slice(0, 400));
    return res.ok;
  } catch (err) {
    console.error("WhatsApp send network error", err?.message || err);
    return false;
  }
}

const cut = (s, n) => { s = String(s); return s.length <= n ? s : s.slice(0, n - 1) + "…"; };

export const sendText = (to, text) =>
  send({ to, type: "text", text: { body: cut(text, 4096) } });

// A message with one button that opens a list of up to 10 choices.
// rows: [{ id, title, description? }]
export const sendList = (to, { header, body, button, section, rows }) =>
  send({
    to, type: "interactive",
    interactive: {
      type: "list",
      ...(header ? { header: { type: "text", text: cut(header, 60) } } : {}),
      body: { text: cut(body, 1024) },
      action: {
        button: cut(button, 20),
        sections: [{ title: cut(section, 24), rows: rows.slice(0, 10).map(r => ({
          id: cut(r.id, 200), title: cut(r.title, 24), ...(r.description ? { description: cut(r.description, 72) } : {}),
        })) }],
      },
    },
  });

// A message with up to 3 quick-reply buttons. buttons: [{ id, title }]
export const sendButtons = (to, { body, buttons }) =>
  send({
    to, type: "interactive",
    interactive: {
      type: "button",
      body: { text: cut(body, 1024) },
      action: { buttons: buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: cut(b.id, 256), title: cut(b.title, 20) } })) },
    },
  });

export const markRead = (messageId) => send({ status: "read", message_id: messageId });
