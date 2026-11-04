import { business } from "./business.mjs";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const MAX_MESSAGES = 20;     // conversation turns kept per request
const MAX_CHARS = 800;       // longest message a visitor can send

function todayIn(tz) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());
}

function systemPrompt() {
  const b = business;
  const services = b.services.map(s => `- ${s.name}: ${s.price}, ${s.duration}`).join("\n");
  return `You are the online assistant for ${b.name}, a ${b.type} in ${b.location}.
Today is ${todayIn(b.timezone)} (${b.timezone} time).

Your job: answer questions about the business and book appointments. Be warm, brief and clear, like a friendly receptionist on WhatsApp. Keep replies to 1 to 4 short sentences. Use plain text only, no markdown, no bullet symbols, no emojis unless the customer uses them. You can reply in ${b.languages}; answer in the customer's language.

Opening hours:
${b.hours.join("\n")}

Services and prices:
${services}

Policies:
${b.policies.map(p => "- " + p).join("\n")}

Rules:
- Only use the information above. Never invent services, prices, offers or availability rules.
- If asked something you cannot answer from this information, or anything unrelated to the business, say so politely and give this: ${b.handoff}
- Only offer times inside opening hours. Do not claim a slot is taken; assume requested times inside opening hours are available.
- To book, you need: service, date, time, the customer's name and mobile number. Ask for missing details one or two at a time.
- Before booking, repeat the details back and ask the customer to confirm.
- Only after the customer clearly confirms, reply with a short confirmation and then, on a new final line, exactly this tag with the details filled in (date as YYYY-MM-DD, time as HH:MM 24-hour):
<booking>{"service":"","date":"","time":"","name":"","phone":""}</booking>
- Never output the booking tag before the customer confirms, and never mention the tag.`;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const msgs = input
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
    .filter(m => m.content.length > 0)
    .slice(-MAX_MESSAGES);
  // The conversation must start with the visitor and end with the visitor.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

export function extractBooking(text) {
  const match = text.match(/<booking>([\s\S]*?)<\/booking>/);
  if (!match) return { reply: text.trim(), booking: null };
  const reply = text.replace(match[0], "").trim();
  try {
    const data = JSON.parse(match[1]);
    const fields = ["service", "date", "time", "name", "phone"];
    if (fields.every(f => typeof data[f] === "string" && data[f].trim())) {
      return { reply, booking: Object.fromEntries(fields.map(f => [f, data[f].trim()])) };
    }
  } catch {}
  return { reply, booking: null };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "The assistant is not set up yet (missing API key)." });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  const messages = cleanMessages(body?.messages);
  if (!messages) return json(400, { error: "Invalid conversation." });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: systemPrompt(), messages }),
    });

    if (!res.ok) {
      console.error("AI API error", res.status, await res.text());
      return json(502, { error: "The assistant is busy. Please try again in a moment." });
    }

    const data = await res.json();
    const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    return json(200, extractBooking(text));
  } catch (err) {
    console.error(err);
    return json(502, { error: "The assistant is busy. Please try again in a moment." });
  }
};

export const config = { path: "/api/chat" };
