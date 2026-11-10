import { findBusiness } from "../businesses.mjs";
import { nowIn, addDays, weekday, niceDate, findService, dateProblem } from "../booking/calendar.mjs";
import { availability, getBooking } from "../booking/store.mjs";
import { json, publicTimes } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

const DEFAULT_BUSINESS = "glow-studio";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const MAX_MESSAGES = 20;     // conversation turns kept per request
const MAX_CHARS = 800;       // longest message a visitor can send
const MAX_TOOL_ROUNDS = 3;   // availability look-ups per visitor message

function nextDays(b) {
  const now = nowIn(b.timezone);
  return Array.from({ length: 8 }, (_, i) => {
    const d = addDays(now.date, i);
    const label = i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : "";
    return `${niceDate(d)} = ${d}${label}${b.booking?.schedule[weekday(d)] ? "" : " CLOSED"}`;
  }).join("\n");
}

// Bookings this visitor made in this chat, checked against the calendar.
async function verifiedBookings(key, input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const item of input.slice(0, 5)) {
    const id = String(item?.ref || ""), date = String(item?.date || "");
    if (!/^[A-Z0-9]{6}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const bk = await getBooking(key, date, id);
    if (bk) out.push(bk);
  }
  return out;
}

function bookingsNote(list) {
  if (!list.length) return "";
  const lines = list.map(b => `- ${b.service}, ${niceDate(b.date)} at ${b.time}, for ${b.name}, ref ${b.id}: ${b.status === "cancelled" ? "CANCELLED by the salon" : "CONFIRMED"}`);
  return `
Bookings this customer made in this chat (checked in the booking calendar just now, so they are real):
${lines.join("\n")}
The customer made these by tapping a time and confirming in the booking form, not through you. Never say a booking was not made or that a confirmation was a mistake. If they say "no", "thanks" or similar after booking, close warmly and briefly.
`;
}

function systemPrompt(b, booked = [], lang = "en") {
  const services = b.services.map(s => `- ${s.name}${s.name_ar ? ` (Arabic: ${s.name_ar})` : ""}: ${s.price}, ${s.duration}`).join("\n");
  const language = lang === "ar"
    ? `Language: the customer has chosen Arabic. Reply in clear, friendly Modern Standard Arabic${b.ar?.greeting ? " (match the tone of: \"" + b.ar.greeting + "\")" : ""}. Use the Arabic service names above, write prices like "250 درهم", and write times like "11:00 صباحًا" or "2:30 مساءً". If the customer switches to English, reply in English.`
    : `Language: reply in the language of the customer's latest message (English or Arabic). When replying in Arabic, use the Arabic service names above, prices like "250 درهم", and times like "11:00 صباحًا".`;
  const now = nowIn(b.timezone);
  const clock = `${String(Math.floor(now.minutes / 60)).padStart(2, "0")}:${String(now.minutes % 60).padStart(2, "0")}`;
  const booking = b.booking ? `
Booking:
- You can see real availability with the check_availability tool. Never guess or promise a time without it.
- When a customer wants to book, find out the service and the day (ask if missing), then call check_availability.
- The free times appear to the customer as buttons under your message. Reply briefly, mention at most 3 times (written like "11:00 am" or "2:30 pm"), and tell them to tap a time to book. Do not ask for their name or number: the booking form asks after they tap.
- If they ask for a specific time, check it and say whether it is free; if not, suggest the nearest free times.
- If the day is full or closed, use next_available from the tool to suggest other days.
- To cancel or change a booking, ask them to contact the team: ${b.handoff}` : `
Booking:
- Online booking is not available. For appointments: ${b.handoff}`;

  return `You are the online assistant for ${b.name}, a ${b.type} in ${b.location}.
Now: ${niceDate(now.date)}, ${clock} (${b.timezone} time).

Your job: answer questions about the business and help customers book. Be warm, brief and clear, like a friendly receptionist on WhatsApp. Keep replies to 1 to 4 short sentences. Use plain text only, no markdown, no bullet symbols, no emojis unless the customer uses them. ${language}

Next days (use these exact dates):
${nextDays(b)}

Opening hours:
${b.hours.join("\n")}

Services and prices:
${services}

Policies:
${b.policies.map(p => "- " + p).join("\n")}
${booking}
${bookingsNote(booked)}
Rules:
- Only use the information above and tool results. Never invent services, prices, offers or availability.
- If asked something you cannot answer from this information, or anything unrelated to the business, say so politely and give this: ${b.handoff}${b.prospect ? `
- This is a demo made by RHKLytics to show ${b.name} what an assistant could do. Details may be out of date, and bookings made here are not sent to ${b.name}.` : ""}`;
}

function tools(b) {
  if (!b.booking) return [];
  return [{
    name: "check_availability",
    description: "Get the free start times for one service on one date, from the live booking calendar. Also returns the next days with free times if that date is full or closed.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", enum: b.services.map(s => s.name), description: "Exact service name" },
        date: { type: "string", description: "Date as YYYY-MM-DD" },
      },
      required: ["service", "date"],
    },
  }];
}

// Runs the tool; returns what the AI sees and what the chat widget shows.
async function checkAvailability(key, b, input) {
  const service = findService(b, input?.service);
  if (!service) return { forAI: { error: "Unknown service. Use one of the listed services." } };
  const now = nowIn(b.timezone);
  const date = String(input?.date || "");
  const problem = dateProblem(b, date, now);
  const free = problem ? [] : publicTimes(await availability(key, b, service, date, now));
  const result = { service: service.name, date, day: problem ? null : niceDate(date), problem, free_times: free };

  if (!free.length) {
    // Look ahead up to 7 days for the next days with space.
    const next = [];
    for (let i = 1; i <= 7 && next.length < 3; i++) {
      const d = addDays(/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= now.date ? date : now.date, i);
      if (dateProblem(b, d, now)) continue;
      const t = publicTimes(await availability(key, b, service, d, now));
      if (t.length) next.push({ date: d, day: niceDate(d), first_times: t.slice(0, 3) });
    }
    result.next_available = next;
  }
  return { forAI: result, slots: free.length ? { service: service.name, serviceAr: service.name_ar || null, date, times: free } : null };
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const msgs = [];
  for (const m of input) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === m.role) last.content += "\n" + content;   // keep turns alternating
    else msgs.push({ role: m.role, content });
  }
  const recent = msgs.slice(-MAX_MESSAGES);
  // The conversation must start with the visitor and end with the visitor.
  while (recent.length && recent[0].role !== "user") recent.shift();
  if (!recent.length || recent[recent.length - 1].role !== "user") return null;
  return recent;
}

// Calls Claude, retrying briefly on temporary errors (rate limit, overloaded, network),
// so a passing hiccup doesn't reach the visitor as "busy".
const RETRY_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callClaude(apiKey, body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error(`AI API network error (attempt ${attempt})`, err?.message || err);
      if (attempt < 3) { await sleep(600 * attempt); continue; }
      return null;
    }
    if (res.ok) return res.json();
    const detail = await res.text().catch(() => "");
    console.error(`AI API error ${res.status} (attempt ${attempt})`, detail.slice(0, 500));
    if (!RETRY_STATUS.has(res.status) || attempt === 3) return null;
    const wait = Math.min(Number(res.headers.get("retry-after")) * 1000 || 700 * attempt, 2500);
    await sleep(wait);
  }
  return null;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "The assistant is not set up yet (missing API key)." });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  const key = String(body?.business || DEFAULT_BUSINESS).toLowerCase();
  const business = findBusiness(key);
  const lang = langOf(body?.lang);
  if (!business) return json(404, { error: "Unknown business." });

  const messages = cleanMessages(body?.messages);
  if (!messages) return json(400, { error: "Invalid conversation." });

  try {
    const system = systemPrompt(business, await verifiedBookings(key, body?.bookings), lang);
    const toolList = tools(business);
    let slots = null;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const data = await callClaude(apiKey, {
        model: MODEL, max_tokens: 500, system, messages,
        ...(toolList.length && round < MAX_TOOL_ROUNDS ? { tools: toolList } : {}),
      });
      if (!data) return json(502, { error: t(lang, "busy") });

      const uses = (data.content || []).filter(c => c.type === "tool_use");
      if (data.stop_reason !== "tool_use" || !uses.length) {
        const reply = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
        return json(200, { reply: reply || "Sorry, could you say that again?", slots });
      }

      messages.push({ role: "assistant", content: data.content });
      const results = [];
      for (const use of uses) {
        const out = use.name === "check_availability"
          ? await checkAvailability(key, business, use.input)
          : { forAI: { error: "Unknown tool." } };
        if (out.slots) slots = out.slots;
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out.forAI) });
      }
      messages.push({ role: "user", content: results });
    }
    return json(502, { error: t(lang, "busy") });
  } catch (err) {
    console.error(err);
    return json(502, { error: t(lang, "busy") });
  }
};

export const config = { path: "/api/chat" };
