// What happens when a customer sends a WhatsApp message.
//
// Questions go to the same AI assistant as the website chat. When it finds free
// times, the customer gets a tappable list. Tapping a time asks for a name, then
// books through the same calendar as the website, so a time can never be taken twice.

import chat from "../functions/chat.mjs";
import { findBusiness } from "../businesses.mjs";
import { findService, isDate, isTime, nowIn, dateProblem } from "../booking/calendar.mjs";
import { availability, createBooking, listBookings } from "../booking/store.mjs";
import { cleanCustomer, publicTimes } from "../booking/http.mjs";
import { t as say, serviceLabel } from "../booking/i18n.mjs";
import { loadChat, saveChat } from "./state.mjs";
import { sendText, sendList, sendButtons } from "./meta.mjs";

const PAGE = 9;                   // times per list (WhatsApp allows 10 rows; one is kept for "More times")
const MAX_PER_HOUR = 40;          // messages one number can send per hour before we stop answering
const MAX_PER_PHONE_PER_DAY = 2;  // same limit as the website

const W = {
  en: {
    chooseTime: "Choose a time", moreTimes: "More times", moreDesc: "Show other times",
    listBody: (s, d) => `Free times for ${s} on ${d}. Tap the button to pick one.`,
    askName: (s, d, tm) => `${s}\n${d} at ${tm}\n\nWhat name should I put the booking under? Tap your name or type a different one.`,
    askNameTyped: (s, d, tm) => `${s}\n${d} at ${tm}\n\nWhat name should I put the booking under?`,
    cancel: "Cancel", cancelled: "No problem, nothing was booked. Anything else I can help with?",
    booked: (b) => `Booked ✓\n\n${b.service}\n${b.day} at ${b.time}\nName: ${b.name}\nReference: ${b.ref}\n\nTo change or cancel, ${b.handoff}`,
    demoNote: (n) => `\n\nThis is a demo by RHKLytics, so this booking is not sent to ${n}.`,
    textOnly: "Sorry, I can only read text messages here. Please type your question.",
    slowDown: "You've sent a lot of messages in a short time. Please try again in an hour, or contact us directly.",
    goneTime: "That time is no longer on offer. Tell me the day you'd like and I'll check again.",
  },
  ar: {
    chooseTime: "اختر الوقت", moreTimes: "أوقات أخرى", moreDesc: "عرض أوقات أخرى",
    listBody: (s, d) => `الأوقات المتاحة لخدمة ${s} يوم ${d}. اضغط الزر لاختيار الوقت.`,
    askName: (s, d, tm) => `${s}\n${d} الساعة ${tm}\n\nبأي اسم أسجّل الحجز؟ اضغط على اسمك أو اكتب اسمًا آخر.`,
    askNameTyped: (s, d, tm) => `${s}\n${d} الساعة ${tm}\n\nبأي اسم أسجّل الحجز؟`,
    cancel: "إلغاء", cancelled: "لا مشكلة، لم يتم حجز أي موعد. هل أساعدك في شيء آخر؟",
    booked: (b) => `تم الحجز ✓\n\n${b.service}\n${b.day} الساعة ${b.time}\nالاسم: ${b.name}\nرقم الحجز: ${b.ref}\n\nللتعديل أو الإلغاء: ${b.handoff}`,
    demoNote: (n) => `\n\nهذه نسخة تجريبية من RHKLytics، لذلك لا يُرسل هذا الحجز إلى ${n}.`,
    textOnly: "عذرًا، أستطيع قراءة الرسائل النصية فقط. يرجى كتابة سؤالك.",
    slowDown: "أرسلت رسائل كثيرة خلال وقت قصير. يرجى المحاولة بعد ساعة أو التواصل معنا مباشرة.",
    goneTime: "هذا الوقت لم يعد متاحًا. أخبرني باليوم المناسب وسأتحقق من جديد.",
  },
};

const pad = (n) => String(n).padStart(2, "0");
const niceTime = (hhmm, lang) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${lang === "ar" ? (h < 12 ? "ص" : "م") : (h < 12 ? "am" : "pm")}`;
};
const niceDay = (date, lang, short = false) =>
  new Date(date + "T00:00:00Z").toLocaleDateString(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB",
    { weekday: short ? "short" : "long", day: "numeric", month: short ? "short" : "long", timeZone: "UTC" });

// If the AI's reply names a time ("5:00 pm"), the list starts there instead of at opening
// time; earlier times follow at the end, so every free time can still be reached.
function fromNamedTime(reply, times) {
  const m = String(reply || "").match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm|ص|م|صباح|مساء)?/i);
  if (!m) return times;
  let h = Number(m[1]); const min = Number(m[2]); const half = (m[3] || "").toLowerCase();
  if (/pm|م|مساء/.test(half) && h < 12) h += 12;
  if (/am|ص|صباح/.test(half) && h === 12) h = 0;
  const i = times.indexOf(`${pad(h)}:${pad(min)}`);
  return i <= 0 ? times : [...times.slice(i), ...times.slice(0, i)];
}

async function sendTimes(to, business, lang, offer, from = 0) {
  const w = W[lang];
  const service = findService(business, offer.service);
  const label = serviceLabel(service, lang);
  const page = offer.times.slice(from, from + PAGE);
  const rows = page.map(tm => ({ id: `slot|${offer.date}|${tm}`, title: niceTime(tm, lang), description: `${label} · ${service.price}` }));
  if (from + PAGE < offer.times.length) rows.push({ id: `more|${from + PAGE}`, title: w.moreTimes, description: w.moreDesc });
  return sendList(to, {
    header: label, body: w.listBody(label, niceDay(offer.date, lang)),
    button: w.chooseTime, section: niceDay(offer.date, lang, true), rows,
  });
}

// A short reply with no question in it, while we are waiting for a name, is taken as the name.
const looksLikeName = (text) =>
  text.length >= 2 && text.length <= 60 && !/[\d?؟!]/.test(text) && text.trim().split(/\s+/).length <= 5;

async function book(key, business, to, state, name) {
  const lang = state.lang, w = W[lang], p = state.pending;
  state.pending = null;
  const service = findService(business, p.service);
  const now = nowIn(business.timezone);
  const problem = !service ? say(lang, "chooseService") : dateProblem(business, p.date, now, lang);
  if (problem) return sendText(to, problem);

  const customer = cleanCustomer({ name, phone: "+" + to }, lang);
  if (customer.error) { state.pending = p; return sendText(to, customer.error); }

  const mine = (await listBookings(key, p.date)).filter(b => b.status === "confirmed" && b.phone === customer.phone);
  if (mine.length >= MAX_PER_PHONE_PER_DAY) return sendText(to, say(lang, "tooMany", { n: mine.length }));

  const free = await availability(key, business, service, p.date, now);
  const booking = free.some(f => f.time === p.time)
    ? await createBooking(key, business, service, p.date, p.time, customer, "whatsapp")
    : null;

  if (!booking) {   // someone else took it a moment ago: offer what is still free
    await sendText(to, say(lang, "taken"));
    const left = publicTimes(await availability(key, business, service, p.date, now));
    if (left.length) { state.offered = { service: service.name, date: p.date, times: left }; await sendTimes(to, business, lang, state.offered); }
    return;
  }

  state.bookings.push({ ref: booking.id, date: booking.date });
  state.offered = null;
  const text = w.booked({
    service: serviceLabel(service, lang), day: niceDay(booking.date, lang), time: niceTime(booking.time, lang),
    name: booking.name, ref: booking.id, handoff: business.handoff,
  }) + (business.prospect ? w.demoNote(business.name) : "");
  state.history.push({ role: "assistant", content: text });
  return sendText(to, text);
}

async function askAI(key, business, to, state, text) {
  const lang = state.lang;
  state.history.push({ role: "user", content: text.slice(0, 800) });
  const res = await chat(new Request("https://internal/api/chat", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ business: key, lang, messages: state.history, bookings: state.bookings }),
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.reply) {
    state.history.pop();
    return sendText(to, data.error || say(lang, "busy"));
  }
  state.history.push({ role: "assistant", content: data.reply });
  await sendText(to, data.reply);
  if (data.slots?.times?.length) {
    state.offered = { service: data.slots.service, date: data.slots.date, times: fromNamedTime(data.reply, data.slots.times) };
    await sendTimes(to, business, lang, state.offered);
  }
}

// message: one entry of Meta's "messages" list. profileName: the customer's WhatsApp display name.
export async function handleMessage(key, message, profileName) {
  const business = findBusiness(key);
  const to = String(message?.from || "").replace(/\D/g, "");
  if (!business || !to) return;

  const state = await loadChat(key, to);
  try {
    // Simple protection against a number flooding the assistant (each AI reply costs money).
    const hourAgo = Date.now() - 60 * 60 * 1000;
    state.hits = state.hits.filter(x => x > hourAgo);
    state.hits.push(Date.now());
    if (state.hits.length > MAX_PER_HOUR) {
      if (state.hits.length === MAX_PER_HOUR + 1) await sendText(to, W[state.lang].slowDown);
      return;
    }

    const typed = message.type === "text" ? String(message.text?.body || "").trim() : "";
    const tapped = message.type === "interactive"
      ? String(message.interactive?.list_reply?.id || message.interactive?.button_reply?.id || "") : "";

    if (typed) state.lang = /[؀-ۿ]/.test(typed) ? "ar" : /[a-z]/i.test(typed) ? "en" : state.lang;
    const lang = state.lang, w = W[lang];

    if (!typed && !tapped) return void await sendText(to, w.textOnly);

    if (tapped.startsWith("slot|")) {
      const [, date, time] = tapped.split("|");
      const offer = state.offered;
      if (!offer || offer.date !== date || !offer.times.includes(time) || !isDate(date) || !isTime(time)) {
        return void await sendText(to, w.goneTime);
      }
      state.pending = { service: offer.service, date, time };
      const label = serviceLabel(findService(business, offer.service), lang);
      const name = String(profileName || "").replace(/\s+/g, " ").trim();
      const usable = name.length >= 2 && name.length <= 20;
      return void await sendButtons(to, {
        body: (usable ? w.askName : w.askNameTyped)(label, niceDay(date, lang), niceTime(time, lang)),
        buttons: [...(usable ? [{ id: "name|" + name, title: name }] : []), { id: "cancel", title: w.cancel }],
      });
    }
    if (tapped.startsWith("more|")) {
      if (!state.offered) return void await sendText(to, w.goneTime);
      return void await sendTimes(to, business, lang, state.offered, Number(tapped.split("|")[1]) || 0);
    }
    if (tapped === "cancel") { state.pending = null; return void await sendText(to, w.cancelled); }
    if (tapped.startsWith("name|")) {
      if (!state.pending) return void await sendText(to, w.goneTime);
      return void await book(key, business, to, state, tapped.slice(5));
    }

    if (typed && state.pending && looksLikeName(typed)) return void await book(key, business, to, state, typed);

    // Anything else is a normal message for the AI. A half-finished booking is dropped.
    state.pending = null;
    if (typed) await askAI(key, business, to, state, typed);
  } finally {
    await saveChat(key, to, state);
  }
}
