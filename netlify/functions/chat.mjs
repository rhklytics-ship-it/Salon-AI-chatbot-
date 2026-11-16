import { findBusiness } from "../businesses.mjs";
import {
  nowIn, addDays, weekday, niceDate, findService, dateProblem, staffList, staffFor, findStylist, staffName,
  changeAllowed, phoneKey,
} from "../booking/calendar.mjs";
import { availability, getBooking, findBookingByRef, bookingsForPhone, addIssue } from "../booking/store.mjs";
import { redoCheck } from "../booking/actions.mjs";
import { json, publicTimes, publicBooking } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

const DEFAULT_BUSINESS = "glow-studio";

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const MAX_MESSAGES = 20;     // conversation turns kept per request
const MAX_CHARS = 800;       // longest message a visitor can send
const MAX_TOOL_ROUNDS = 3;   // tool look-ups per visitor message
// Room for each AI answer. The model may think before answering, and that thinking counts
// here too, so this is well above the length of a reply. A cut-off answer is retried once with more.
const MAX_TOKENS = 2000;
const MAX_TOKENS_RETRY = 4000;

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

const statusWord = (b) => b.status === "cancelled" ? (String(b.cancelledBy || "").startsWith("customer") ? "CANCELLED by the customer" : "CANCELLED by the salon") : "CONFIRMED";

function bookingsNote(list, business) {
  if (!list.length) return "";
  const lines = list.map(b => `- ${b.service}, ${niceDate(b.date)} at ${b.time}${business.booking?.stylists?.length ? ` with ${staffName(business, b.staff)}` : ""}, ref ${b.id}, price ${b.price || "as listed"}: ${statusWord(b)}`);
  return `
Bookings this customer made in this chat (checked in the booking calendar just now, so they are real):
${lines.join("\n")}
The customer made these by tapping a time and confirming in the booking form, not through you. Never say a booking was not made or that a confirmation was a mistake. If they say "no", "thanks" or similar after booking, close warmly and briefly.
`;
}

// On WhatsApp we know the customer's number, so we can remember their past visits.
function historyNote(list, business, now) {
  if (!list.length) return "";
  const lines = list.slice(-6).map(b => `- ${b.service}, ${niceDate(b.date)} at ${b.time}${business.booking?.stylists?.length ? ` with ${staffName(business, b.staff)}` : ""}, ref ${b.id}: ${b.date < now.date ? (b.status === "confirmed" ? "PAST VISIT" : statusWord(b)) : statusWord(b)}`);
  return `
This customer's bookings with us (from their WhatsApp number; real):
${lines.join("\n")}
Use this to help: for example offer their usual stylist when they book the same service again. Mention past visits only when it helps.
`;
}

function servicesText(b) {
  return b.services.map(s => {
    let line = `- ${s.name}${s.name_ar ? ` (Arabic: ${s.name_ar})` : ""}: ${s.price}, ${s.duration}`;
    if (s.includes?.length) line += `. PACKAGE, includes exactly: ${s.includes.join("; ")}`;
    if (s.priceNote) line += `. Price note: ${s.priceNote}`;
    if (s.consult) line += `. Consultation service`;
    return line;
  }).join("\n");
}

function stylistsText(b) {
  if (!b.booking?.stylists?.length) return "";
  const list = staffList(b).map(s => `- ${s.name}${s.gender ? ` (${s.gender})` : ""}: ${Array.isArray(s.services) ? s.services.join(", ") : "all services"}`);
  return `
${b.booking.staffLabel || "Stylist"}s (customers may ask for one by name; pass the name to check_availability):
${list.join("\n")}
`;
}

function systemPrompt(b, ctx) {
  const { booked = [], past = [], lang = "en", channel = "web" } = ctx;
  const language = lang === "ar"
    ? `Language: the customer has chosen Arabic. Reply in clear, friendly Modern Standard Arabic${b.ar?.greeting ? " (match the tone of: \"" + b.ar.greeting + "\")" : ""}. Use the Arabic service names above, write prices like "250 درهم", and write times like "11:00 صباحًا" or "2:30 مساءً". If the customer switches to English, reply in English.`
    : `Language: reply in the language of the customer's latest message (English or Arabic). When replying in Arabic, use the Arabic service names above, prices like "250 درهم", and times like "11:00 صباحًا".`;
  const now = nowIn(b.timezone);
  const clock = `${String(Math.floor(now.minutes / 60)).padStart(2, "0")}:${String(now.minutes % 60).padStart(2, "0")}`;
  const web = channel !== "whatsapp";
  const cutoff = b.booking?.cancelHours ?? 0;

  const booking = b.booking ? `
Booking:
- You can see real availability with the check_availability tool. Never guess or promise a time without it.
- Only call check_availability when the customer's LATEST message asks to book, asks which times are free, or answers your question about the service, day or stylist. If their latest message is about anything else (a question, a complaint, cancelling, allergies, a thank-you), answer only that. Do not mention free times, do not repeat earlier offers, and do not nudge them to book.
- When a customer wants to book, find out the service and the day (ask if missing), then call check_availability.
- The free times appear to the customer as buttons under your message. Reply briefly, mention at most 3 times (written like "11:00 am" or "2:30 pm"), and tell them to tap a time to book.${web ? " Do not ask for their name or number: the booking form asks after they tap." : " After they tap, they are asked for their name."}
- If they ask for a specific time, check it and say whether it is free; if not, suggest the nearest free times.
- If the day is full or closed, use next_available from the tool to suggest other days.
- If they ask for a stylist by name, pass it as "stylist". If that stylist is busy, say so and offer the stylist's next free times or another stylist; never book someone else without saying so.
- For consultation services (cut, colour), still check availability straight away when you know the service and day; in that same reply, ask in one short sentence what they would like.${web ? " Tell them the booking form has a notes box and a reference-photo button for their stylist." : " Tell them they can send a reference photo here after booking, and it is saved for their stylist."}
- Prices: quote only the listed price. For "from" prices, explain the price note. For packages, list exactly what is included and nothing else. The booking confirmation shows the price.

Changing or cancelling a booking (the customer does it here, you never cancel or move anything yourself):
- Customers can cancel or move a booking free of charge up to ${cutoff} hours before it starts. Closer than that, give: ${b.handoff}
- First get the booking: use the reference from this chat${web ? ", or ask for their 6-character booking reference and call find_booking" : ", or call my_bookings"}.
- To cancel: call offer_cancel with the reference. A confirm button appears for the customer. Say only what the tool result tells you about confirming.
- To move: ask for the new day (and time), then call check_availability with reschedule_ref set to the reference. When they tap a new time, the old booking is cancelled automatically.` : `
Booking:
- Online booking is not available. For appointments: ${b.handoff}`;

  const care = b.care?.length ? `
Allergies, sensitive skin and safety (share these when relevant):
${b.care.map(c => "- " + c).join("\n")}
- Never give medical advice, never say a product or treatment is safe for a specific condition. Share the information above, suggest they add details to their booking notes, and for anything medical say to check with their doctor.
` : `
Allergies and safety: you have no information on this. Never give medical advice. Suggest they tell the team before booking: ${b.handoff}
`;

  const complaints = `
When a customer is unhappy with a visit:
- Apologise once, sincerely and briefly. Do not argue, blame the customer, or defend the salon.
- If unclear, ask what went wrong and which booking (reference or date).
${b.redo?.text ? `- Fix policy: ${b.redo.text} If it applies, offer to book the free fix: call check_availability with redo_of set to the original booking reference and the same service.\n` : ""}- Log it with report_issue so the manager follows up today, once per complaint: if this conversation shows it was already logged, don't log it again.${web ? " On the website, ask for the mobile number they booked with before logging, so the manager can call them." : ""}
- Never promise refunds, discounts or compensation beyond the policy above.
`;

  return `You are the online assistant for ${b.name}, a ${b.type} in ${b.location}.
Now: ${niceDate(now.date)}, ${clock} (${b.timezone} time).
Channel: ${web ? "website chat" : "WhatsApp"}.

Your job: answer questions about the business and help customers book, change or cancel. Be warm, brief and clear, like a friendly receptionist on WhatsApp. Keep replies to 1 to 4 short sentences. Use plain text only, no markdown, no bullet symbols, no emojis unless the customer uses them. ${language}

Next days (use these exact dates):
${nextDays(b)}

Opening hours:
${b.hours.join("\n")}

Services and prices:
${servicesText(b)}
${stylistsText(b)}
Policies:
${b.policies.map(p => "- " + p).join("\n")}
${booking}
${care}${complaints}${bookingsNote(booked, b)}${historyNote(past, b, now)}
Rules:
- Only use the information above and tool results. Never invent services, prices, offers, packages or availability.
- If asked something you cannot answer from this information, or anything unrelated to the business, say so politely and give this: ${b.handoff}${b.prospect ? `
- This is a demo made by RHKLytics to show ${b.name} what an assistant could do. Details may be out of date, and bookings made here are not sent to ${b.name}.` : ""}`;
}

function tools(b, channel) {
  if (!b.booking) return [];
  const ref = { type: "string", description: "6-character booking reference, e.g. K7M2QX" };
  const list = [{
    name: "check_availability",
    description: "Get the free start times for one service on one date, from the live booking calendar. Also returns the next days with free times if that date is full or closed. Use reschedule_ref to move an existing booking, or redo_of to book a free fix.",
    input_schema: {
      type: "object",
      properties: {
        service: { type: "string", enum: b.services.map(s => s.name), description: "Exact service name" },
        date: { type: "string", description: "Date as YYYY-MM-DD" },
        ...(b.booking.stylists?.length ? { stylist: { type: "string", enum: staffList(b).map(s => s.name), description: "Only if the customer asked for this stylist" } } : {}),
        reschedule_ref: { ...ref, description: "Reference of the booking the customer wants to move" },
        redo_of: { ...ref, description: "Reference of the past booking that needs a free fix under the fix policy" },
      },
      required: ["service", "date"],
    },
  }, {
    name: "find_booking",
    description: "Look up a booking by its reference: service, date, time, status, and whether it can still be changed online.",
    input_schema: { type: "object", properties: { ref }, required: ["ref"] },
  }, {
    name: "offer_cancel",
    description: "Show the customer a button to confirm cancelling this booking. Nothing is cancelled until they confirm.",
    input_schema: { type: "object", properties: { ref }, required: ["ref"] },
  }, {
    name: "report_issue",
    description: "Log a complaint or problem for the manager to follow up today.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "What went wrong, in one or two sentences, in English" },
        ref: { ...ref, description: "Booking reference, if known" },
        ...(channel === "whatsapp" ? {} : { phone: { type: "string", description: "The customer's mobile number" } }),
        wants_fix: { type: "boolean", description: "True if they want the free fix" },
      },
      required: ["summary"],
    },
  }];
  if (channel === "whatsapp") list.push({
    name: "my_bookings",
    description: "List this customer's upcoming and recent bookings (found from their WhatsApp number).",
    input_schema: { type: "object", properties: {} },
  });
  return list;
}

// Runs one tool. Returns what the AI sees, and optionally slots / manage for the chat to show.
async function runTool(name, input, ctx) {
  const { key, business: b, now, channel, phone, booked } = ctx;
  const trusted = (bk) => channel === "whatsapp" ? phoneKey(bk.phone) === phoneKey(phone) : true;

  if (name === "check_availability") {
    const service = findService(b, input?.service);
    if (!service) return { forAI: { error: "Unknown service. Use one of the listed services." } };
    let stylist = -1;
    if (input?.stylist) {
      stylist = findStylist(b, input.stylist);
      if (stylist < 0) return { forAI: { error: `No stylist called ${input.stylist}.` } };
      if (!staffFor(b, service).includes(stylist)) return { forAI: { error: `${staffName(b, stylist)} does not do ${service.name}. Who does: ${staffFor(b, service).map(i => staffName(b, i)).join(", ")}.` } };
    }
    let replaces = null, redoOf = null;
    if (input?.reschedule_ref) {
      const old = await findBookingByRef(key, input.reschedule_ref);
      if (!old || !trusted(old)) return { forAI: { error: "No booking with that reference." } };
      if (old.status !== "confirmed") return { forAI: { error: "That booking is already cancelled." } };
      if (!changeAllowed(b, old, now)) return { forAI: { error: `Too close to the appointment to move online (less than ${b.booking.cancelHours} hours). Give the contact details.` } };
      replaces = old.id;
    }
    if (input?.redo_of) {
      const orig = await redoCheck(key, b, input.redo_of, channel === "whatsapp" ? phone : null, service, now);
      if (!orig) return { forAI: { error: "That booking does not qualify for a free fix online (wrong reference, different service, or outside the fix window). Log the issue with report_issue and give the contact details." } };
      redoOf = orig.id;
    }
    const date = String(input?.date || "");
    const problem = dateProblem(b, date, now);
    const free = problem ? [] : publicTimes(await availability(key, b, service, date, now, stylist));
    const result = {
      service: service.name, date, day: problem ? null : niceDate(date), problem, free_times: free,
      price: redoOf ? "Free (fix)" : service.price, ...(stylist >= 0 ? { stylist: staffName(b, stylist) } : {}),
      ...(replaces ? { moving_booking: replaces } : {}),
    };
    if (!free.length) {
      const next = [];
      for (let i = 1; i <= 7 && next.length < 3; i++) {
        const d = addDays(/^\d{4}-\d{2}-\d{2}$/.test(date) && date >= now.date ? date : now.date, i);
        if (dateProblem(b, d, now)) continue;
        const tm = publicTimes(await availability(key, b, service, d, now, stylist));
        if (tm.length) next.push({ date: d, day: niceDate(d), first_times: tm.slice(0, 3) });
      }
      result.next_available = next;
    }
    return {
      forAI: result,
      slots: free.length ? {
        service: service.name, serviceAr: service.name_ar || null, date, times: free, price: result.price,
        consult: !!service.consult, stylist: stylist >= 0 ? staffName(b, stylist) : null, replaces, redoOf,
      } : null,
    };
  }

  if (name === "find_booking") {
    const bk = await findBookingByRef(key, input?.ref);
    if (!bk || !trusted(bk)) return { forAI: { error: "No booking with that reference. Ask them to check it." } };
    return { forAI: { ...publicBooking(bk, b, staffName(b, bk.staff)), day: niceDate(bk.date),
      can_change_online: changeAllowed(b, bk, now), cutoff_hours: b.booking.cancelHours ?? 0 } };
  }

  if (name === "my_bookings" && channel === "whatsapp") {
    const list = await bookingsForPhone(key, phone, addDays(now.date, -30));
    return { forAI: { bookings: list.map(bk => ({ ...publicBooking(bk, b, staffName(b, bk.staff)), day: niceDate(bk.date), can_change_online: changeAllowed(b, bk, now) })) } };
  }

  if (name === "offer_cancel") {
    const bk = await findBookingByRef(key, input?.ref);
    if (!bk || !trusted(bk)) return { forAI: { error: "No booking with that reference." } };
    if (bk.status !== "confirmed") return { forAI: { error: "That booking is already cancelled." } };
    if (!changeAllowed(b, bk, now)) return { forAI: { error: `Too close to the appointment to cancel online (less than ${b.booking.cancelHours} hours). Give the contact details.` } };
    const known = booked.find(x => x.id === bk.id);
    return {
      forAI: { shown: known
        ? "A confirm-cancel button is now shown. Their mobile number is already known, so they just tap Cancel booking."
        : "A confirm-cancel button is now shown, with a box for the mobile number they booked with. Tell them to confirm below." },
      manage: { action: "cancel", ref: bk.id, service: bk.service, serviceAr: findService(b, bk.service)?.name_ar || null, date: bk.date, time: bk.time, knownPhone: !!known },
    };
  }

  if (name === "report_issue") {
    if (ctx.issueLogged) return { forAI: { logged: true, note: "Already logged in this message." } };
    const contact = channel === "whatsapp" ? "+" + phoneKey(phone) : String(input?.phone || "").replace(/[^\d+]/g, "");
    if (channel !== "whatsapp" && contact.replace(/\D/g, "").length < 7) return { forAI: { error: "Ask for the mobile number they booked with first." } };
    const issue = await addIssue(key, {
      date: now.date, summary: String(input?.summary || ""), phone: contact, ref: String(input?.ref || "").toUpperCase().slice(0, 6) || null,
      wantsFix: !!input?.wants_fix, source: channel,
    });
    ctx.issueLogged = true;
    return { forAI: { logged: true, issue: issue.id, next: "Tell them the manager will contact them today." } };
  }
  return { forAI: { error: "Unknown tool." } };
}

// What to say if the AI gives no words after using a tool.
function fallbackReply(lastTool, lang, slots, manage) {
  const r = lastTool?.result || {};
  if (lastTool?.name === "report_issue") return t(lang, r.logged ? "issueLogged" : r.error ? "askPhoneIssue" : "sayAgain");
  if (manage) return t(lang, "confirmBelow");
  if (slots) return t(lang, "tapTime");
  return t(lang, "sayAgain");
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

let callForTests = null;
export function useClaudeForTests(fn) { callForTests = fn; }

async function callClaude(apiKey, body) {
  if (callForTests) return callForTests(body);
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

// One assistant turn. Used by the website (below) and by WhatsApp (flow.mjs).
// phone is only passed by WhatsApp, where Meta has verified the number; the website never sends one.
// Returns { status, body: { reply, slots, manage } | { error } }.
export async function runChat({ key, lang = "en", messages: rawMessages, bookings, channel = "web", phone = null }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !callForTests) return { status: 500, body: { error: "The assistant is not set up yet (missing API key)." } };
  const business = findBusiness(key);
  if (!business) return { status: 404, body: { error: "Unknown business." } };
  lang = langOf(lang);

  const messages = cleanMessages(rawMessages);
  if (!messages) return { status: 400, body: { error: "Invalid conversation." } };

  try {
    const now = nowIn(business.timezone);
    const booked = await verifiedBookings(key, bookings);
    const past = channel === "whatsapp" && phone && business.booking ? await bookingsForPhone(key, phone, addDays(now.date, -180)) : [];
    const system = systemPrompt(business, { booked, past, lang, channel });
    const toolList = tools(business, channel);
    const ctx = { key, business, now, channel, phone, booked: [...booked, ...past], issueLogged: false };
    let slots = null, manage = null;
    const said = [];   // text the AI writes in every round: it often answers *before* calling a tool
    let lastTool = null;  // { name, result } of the most recent tool, for a fallback reply
    let nudged = false;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const ask = (maxTokens) => callClaude(apiKey, {
        model: MODEL, max_tokens: maxTokens, system, messages,
        ...(toolList.length && round < MAX_TOOL_ROUNDS ? { tools: toolList } : {}),
      });
      let data = await ask(MAX_TOKENS);
      if (data?.stop_reason === "max_tokens") {
        console.warn("AI answer was cut off; retrying with more room", JSON.stringify({ blocks: (data.content || []).map(c => c.type), round }));
        data = await ask(MAX_TOKENS_RETRY);
      }
      if (!data) return { status: 502, body: { error: t(lang, "busy") } };

      const uses = (data.content || []).filter(c => c.type === "tool_use");
      const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
      if (text && !said.includes(text)) said.push(text);
      if (data.stop_reason !== "tool_use" || !uses.length) {
        const reply = said.join("\n\n").trim();
        if (reply) return { status: 200, body: { reply, slots, manage } };
        // The AI sometimes ends its turn with no words after a tool (seen after report_issue).
        // Ask once more; if it is still silent, use a fixed reply that fits the tool.
        console.warn("AI returned an empty reply", JSON.stringify({ stop: data.stop_reason, blocks: (data.content || []).map(c => c.type), lastTool: lastTool?.name, round }));
        if (lastTool && !nudged && round < MAX_TOOL_ROUNDS) {
          nudged = true;
          messages[messages.length - 1].content.push({ type: "text", text: "(Now write your reply to the customer.)" });
          continue;
        }
        return { status: 200, body: { reply: fallbackReply(lastTool, lang, slots, manage), slots, manage } };
      }

      messages.push({ role: "assistant", content: data.content });
      const results = [];
      for (const use of uses) {
        const out = await runTool(use.name, use.input, ctx);
        if (out.slots) slots = out.slots;
        if (out.manage) manage = out.manage;
        lastTool = { name: use.name, result: out.forAI };
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(out.forAI) });
      }
      messages.push({ role: "user", content: results });
    }
    return { status: 502, body: { error: t(lang, "busy") } };
  } catch (err) {
    console.error(err);
    return { status: 502, body: { error: t(lang, "busy") } };
  }
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
  // Website visitors: channel is always "web" and no phone is trusted from the browser.
  const r = await runChat({
    key: String(body?.business || DEFAULT_BUSINESS).toLowerCase(), lang: body?.lang,
    messages: body?.messages, bookings: body?.bookings, channel: "web",
  });
  return json(r.status, r.body);
};

export const config = { path: "/api/chat" };
