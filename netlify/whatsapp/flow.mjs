// What happens when a customer sends a WhatsApp message.
//
// Questions go to the same AI assistant as the website chat. When it finds free
// times, the customer gets a tappable list. Tapping a time asks for a name, then
// books through the same calendar as the website, so a time can never be taken twice.
// Customers can also move or cancel bookings, send a reference photo for their
// stylist, reply to visit check-ins, and send STOP to turn off reminders.

import { runChat } from "../functions/chat.mjs";
import { findBusiness } from "../businesses.mjs";
import { findService, isDate, isTime, nowIn } from "../booking/calendar.mjs";
import { findBookingByRef, updateBooking, savePhoto, addIssue, setOptOut, bookingsForPhone, MAX_PHOTOS } from "../booking/store.mjs";
import { placeBooking, cancelByCustomer } from "../booking/actions.mjs";
import { cleanNotes, parsePhoto } from "../booking/http.mjs";
import { t as say, serviceLabel } from "../booking/i18n.mjs";
import { loadChat, saveChat } from "./state.mjs";
import { sendText, sendList, sendButtons, getMedia } from "./meta.mjs";

const PAGE = 9;                   // times per list (WhatsApp allows 10 rows; one is kept for "More times")
const MAX_PER_HOUR = 40;          // messages one number can send per hour before we stop answering

const W = {
  en: {
    chooseTime: "Choose a time", moreTimes: "More times", moreDesc: "Show other times",
    listBody: (s, d) => `Free times for ${s} on ${d}. Tap the button to pick one.`,
    askName: (s, d, tm) => `${s}\n${d} at ${tm}\n\nWhat name should I put the booking under? Tap your name or type a different one.`,
    askNameTyped: (s, d, tm) => `${s}\n${d} at ${tm}\n\nWhat name should I put the booking under?`,
    askMove: (ref, s, d, tm) => `Move booking ${ref} to:\n${s}\n${d} at ${tm}?`,
    moveBtn: "Move it", keepBtn: "Keep current",
    cancel: "Cancel", cancelled: "No problem, nothing was booked. Anything else I can help with?",
    booked: (b) => `Booked ✓\n\n${b.service}${b.stylist ? ` with ${b.stylist}` : ""}\n${b.day} at ${b.time}\nPrice: ${b.price}\nName: ${b.name}\nReference: ${b.ref}\n\nTo change or cancel, just message me here${b.hours ? ` (up to ${b.hours} hours before)` : ""}.`,
    movedNote: (old) => `\nYour old booking ${old} is cancelled.`,
    demoNote: (n) => `\n\nThis is a demo by RHKLytics, so this booking is not sent to ${n}.`,
    askNotes: "Is there anything your stylist should know? Send a reference photo, or type what you'd like and any allergies or past treatments.",
    skip: "Skip", skipped: "No problem. You can send a photo or notes here any time before your visit.",
    notesSaved: (ref) => `Thanks, saved to booking ${ref} for your stylist.`,
    photoSaved: (ref) => `Photo saved to booking ${ref} for your stylist. Anything else they should know? Just type it here.`,
    photoFull: "I've already saved the most photos I can for this booking.",
    photoFail: "Sorry, I couldn't save that photo. Please try sending it again.",
    textOnly: "Sorry, I can only read text messages and photos here. Please type your question.",
    photoNoBooking: "Thanks for the photo. Book first and then send it here, and I'll save it for your stylist.",
    slowDown: "You've sent a lot of messages in a short time. Please try again in an hour, or contact us directly.",
    goneTime: "That time is no longer on offer. Tell me the day you'd like and I'll check again.",
    confirmCancel: (ref, s, d, tm) => `Cancel booking ${ref}?\n${s}\n${d} at ${tm}`,
    yesCancel: "Yes, cancel", keepIt: "Keep it", kept: "No problem, your booking stays as it is.",
    stopped: "Done. You won't get reminders or check-ins from us any more. Reply START to turn them back on. You can still message us any time.",
    started: "Reminders and check-ins are back on. Reply STOP any time to turn them off.",
    thanksVisit: "Thank you, we're so glad! See you next time.",
    askIssue: (fix) => `We're sorry to hear that. What wasn't right? Your message goes straight to the manager, who will contact you today.${fix ? `\n\n${fix}` : ""}`,
    issueLogged: "Thank you for telling us. I've passed this to the manager, who will contact you today.",
  },
  ar: {
    chooseTime: "اختر الوقت", moreTimes: "أوقات أخرى", moreDesc: "عرض أوقات أخرى",
    listBody: (s, d) => `الأوقات المتاحة لخدمة ${s} يوم ${d}. اضغط الزر لاختيار الوقت.`,
    askName: (s, d, tm) => `${s}\n${d} الساعة ${tm}\n\nبأي اسم أسجّل الحجز؟ اضغط على اسمك أو اكتب اسمًا آخر.`,
    askNameTyped: (s, d, tm) => `${s}\n${d} الساعة ${tm}\n\nبأي اسم أسجّل الحجز؟`,
    askMove: (ref, s, d, tm) => `نقل الحجز ${ref} إلى:\n${s}\n${d} الساعة ${tm}؟`,
    moveBtn: "نقل الحجز", keepBtn: "إبقاء الحالي",
    cancel: "إلغاء", cancelled: "لا مشكلة، لم يتم حجز أي موعد. هل أساعدك في شيء آخر؟",
    booked: (b) => `تم الحجز ✓\n\n${b.service}${b.stylist ? ` مع ${b.stylist}` : ""}\n${b.day} الساعة ${b.time}\nالسعر: ${b.price}\nالاسم: ${b.name}\nرقم الحجز: ${b.ref}\n\nللتعديل أو الإلغاء، راسلني هنا${b.hours ? ` (حتى ${b.hours} ساعات قبل الموعد)` : ""}.`,
    movedNote: (old) => `\nتم إلغاء حجزك السابق ${old}.`,
    demoNote: (n) => `\n\nهذه نسخة تجريبية من RHKLytics، لذلك لا يُرسل هذا الحجز إلى ${n}.`,
    askNotes: "هل هناك ما يجب أن تعرفه المصففة؟ أرسلي صورة مرجعية، أو اكتبي ما تريدينه وأي حساسية أو علاجات سابقة.",
    skip: "تخطي", skipped: "لا مشكلة. يمكنك إرسال صورة أو ملاحظات هنا في أي وقت قبل موعدك.",
    notesSaved: (ref) => `شكرًا، تم الحفظ في الحجز ${ref} للمصففة.`,
    photoSaved: (ref) => `تم حفظ الصورة في الحجز ${ref} للمصففة. هل هناك شيء آخر؟ اكتبيه هنا.`,
    photoFull: "حفظت أقصى عدد من الصور لهذا الحجز.",
    photoFail: "عذرًا، تعذّر حفظ الصورة. يرجى إرسالها مرة أخرى.",
    textOnly: "عذرًا، أستطيع قراءة الرسائل النصية والصور فقط. يرجى كتابة سؤالك.",
    photoNoBooking: "شكرًا على الصورة. احجزي أولًا ثم أرسليها هنا وسأحفظها للمصففة.",
    slowDown: "أرسلت رسائل كثيرة خلال وقت قصير. يرجى المحاولة بعد ساعة أو التواصل معنا مباشرة.",
    goneTime: "هذا الوقت لم يعد متاحًا. أخبرني باليوم المناسب وسأتحقق من جديد.",
    confirmCancel: (ref, s, d, tm) => `إلغاء الحجز ${ref}؟\n${s}\n${d} الساعة ${tm}`,
    yesCancel: "نعم، ألغِ الحجز", keepIt: "الإبقاء عليه", kept: "لا مشكلة، حجزك باقٍ كما هو.",
    stopped: "تم. لن تصلك تذكيرات أو رسائل متابعة منا بعد الآن. أرسل START لإعادة تشغيلها. يمكنك مراسلتنا في أي وقت.",
    started: "تمت إعادة تشغيل التذكيرات والمتابعة. أرسل STOP في أي وقت لإيقافها.",
    thanksVisit: "شكرًا لك، يسعدنا ذلك! نراك في المرة القادمة.",
    askIssue: (fix) => `نأسف لسماع ذلك. ما الذي لم يكن جيدًا؟ رسالتك تصل مباشرة إلى المدير، وسيتواصل معك اليوم.${fix ? `\n\n${fix}` : ""}`,
    issueLogged: "شكرًا لإخبارنا. نقلت الأمر إلى المدير، وسيتواصل معك اليوم.",
  },
};

const STOP_WORDS = /^(stop|unsubscribe|إيقاف|ايقاف|توقف)$/i;
const START_WORDS = /^(start|subscribe|تشغيل|ابدأ)$/i;

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
  const price = offer.redoOf ? "Free" : service.price;
  const desc = [label, offer.stylist, price].filter(Boolean).join(" · ");
  const rows = page.map(tm => ({ id: `slot|${offer.date}|${tm}`, title: niceTime(tm, lang), description: desc }));
  if (from + PAGE < offer.times.length) rows.push({ id: `more|${from + PAGE}`, title: w.moreTimes, description: w.moreDesc });
  return sendList(to, {
    header: label, body: w.listBody(label, niceDay(offer.date, lang)),
    button: w.chooseTime, section: niceDay(offer.date, lang, true), rows,
  });
}

// A short reply with no question in it, while we are waiting for a name, is taken as the name.
const looksLikeName = (text) =>
  text.length >= 2 && text.length <= 60 && !/[\d?؟!]/.test(text) && text.trim().split(/\s+/).length <= 5;
const isQuestion = (text) => /[?؟]\s*$/.test(text);

async function book(key, business, to, state, name) {
  const lang = state.lang, w = W[lang], p = state.pending;
  state.pending = null;
  const now = nowIn(business.timezone);
  const r = await placeBooking(key, business, {
    service: p.service, date: p.date, time: p.time, name, phone: "+" + to, source: "whatsapp",
    stylist: p.stylist, replaces: p.replaces, redoOf: p.redoOf,
  }, now, lang);

  if (!r.ok) {
    if (r.error === say(lang, "enterName") && !p.replaces) state.pending = p;   // ask for the name again
    await sendText(to, r.error);
    if (r.slots?.times?.length) { state.offered = r.slots; await sendTimes(to, business, lang, state.offered); }
    return;
  }

  const booking = r.booking, service = r.service;
  state.bookings.push({ ref: booking.id, date: booking.date });
  state.offered = null;
  const text = w.booked({
    service: serviceLabel(service, lang), day: niceDay(booking.date, lang), time: niceTime(booking.time, lang),
    name: booking.name, ref: booking.id, price: booking.price || service.price,
    stylist: business.booking.stylists?.length ? r.stylistName : "", hours: business.booking.cancelHours,
  }) + (r.replaced ? w.movedNote(r.replaced.id) : "") + (business.prospect ? w.demoNote(business.name) : "");
  state.history.push({ role: "assistant", content: text });
  await sendText(to, text);

  // Consultation services: ask for a reference photo and notes for the stylist.
  if (service.consult && !r.replaced) {
    state.noteFor = { ref: booking.id, date: booking.date };
    await sendButtons(to, { body: w.askNotes, buttons: [{ id: "skipnote", title: w.skip }] });
  }
}

async function askAI(key, business, to, state, text) {
  const lang = state.lang, w = W[lang];
  state.history.push({ role: "user", content: text.slice(0, 800) });
  const res = await runChat({ key, lang, messages: state.history, bookings: state.bookings, channel: "whatsapp", phone: "+" + to });
  const data = res.body || {};
  if (res.status !== 200 || !data.reply) {
    state.history.pop();
    return sendText(to, data.error || say(lang, "busy"));
  }
  state.history.push({ role: "assistant", content: data.reply });
  await sendText(to, data.reply);
  if (data.slots?.times?.length) {
    state.offered = { ...data.slots, times: fromNamedTime(data.reply, data.slots.times) };
    await sendTimes(to, business, lang, state.offered);
  }
  if (data.manage?.action === "cancel") {
    const m = data.manage;
    const label = serviceLabel(findService(business, m.service) || { name: m.service }, lang);
    await sendButtons(to, {
      body: w.confirmCancel(m.ref, label, niceDay(m.date, lang), niceTime(m.time, lang)),
      buttons: [{ id: "cancelbk|" + m.ref, title: w.yesCancel }, { id: "keep", title: w.keepIt }],
    });
  }
}

// The booking a photo or note belongs to: the one we just asked about, else the customer's next visit.
async function noteTarget(key, business, to, state) {
  if (state.noteFor) return findBookingByRef(key, state.noteFor.ref);
  const now = nowIn(business.timezone);
  const upcoming = (await bookingsForPhone(key, "+" + to, now.date)).filter(b => b.status === "confirmed");
  return upcoming[0] || null;
}

async function savePhotoFrom(key, business, to, state, message) {
  const w = W[state.lang];
  const target = await noteTarget(key, business, to, state);
  if (!target) return sendText(to, w.photoNoBooking);
  if ((target.photos || 0) >= MAX_PHOTOS) return sendText(to, w.photoFull);
  const media = await getMedia(message.image?.id);
  // Re-check the file the same way as website uploads (real image type, size limit).
  const checked = media && parsePhoto(`data:${media.type};base64,${media.bytes.toString("base64")}`);
  if (!checked || checked.error) return sendText(to, w.photoFail);
  await savePhoto(key, target, checked.bytes, checked.type);
  const caption = cleanNotes(message.image?.caption);
  if (caption) await updateBooking(key, target.date, target.id, b => ({ ...b, notes: cleanNotes([b.notes, caption].filter(Boolean).join("\n")) }));
  state.noteFor = { ref: target.id, date: target.date };
  return sendText(to, w.photoSaved(target.id));
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
      ? String(message.interactive?.list_reply?.id || message.interactive?.button_reply?.id || "")
      : message.type === "button" ? String(message.button?.payload || "") : "";   // "button" = a template's quick reply

    if (typed) state.lang = /[؀-ۿ]/.test(typed) ? "ar" : /[a-z]/i.test(typed) ? "en" : state.lang;
    const lang = state.lang, w = W[lang];

    // STOP / START: reminders and check-ins off or on.
    if (typed && STOP_WORDS.test(typed)) { await setOptOut(key, "+" + to, true); return void await sendText(to, w.stopped); }
    if (typed && START_WORDS.test(typed)) { await setOptOut(key, "+" + to, false); return void await sendText(to, w.started); }

    if (message.type === "image") return void await savePhotoFrom(key, business, to, state, message);
    if (!typed && !tapped) return void await sendText(to, w.textOnly);

    // ---- Taps ----
    if (tapped.startsWith("slot|")) {
      const [, date, time] = tapped.split("|");
      const offer = state.offered;
      if (!offer || offer.date !== date || !offer.times.includes(time) || !isDate(date) || !isTime(time)) {
        return void await sendText(to, w.goneTime);
      }
      state.pending = { service: offer.service, date, time, stylist: offer.stylist || null, replaces: offer.replaces || null, redoOf: offer.redoOf || null };
      const label = serviceLabel(findService(business, offer.service), lang);
      if (offer.replaces) {
        return void await sendButtons(to, {
          body: w.askMove(offer.replaces, label, niceDay(date, lang), niceTime(time, lang)),
          buttons: [{ id: "move", title: w.moveBtn }, { id: "keep", title: w.keepBtn }],
        });
      }
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
    if (tapped === "keep") { state.pending = null; return void await sendText(to, w.kept); }
    if (tapped === "move") {
      if (!state.pending?.replaces) return void await sendText(to, w.goneTime);
      return void await book(key, business, to, state, null);
    }
    if (tapped.startsWith("name|")) {
      if (!state.pending) return void await sendText(to, w.goneTime);
      return void await book(key, business, to, state, tapped.slice(5));
    }
    if (tapped.startsWith("cancelbk|")) {
      const r = await cancelByCustomer(key, business, tapped.slice(9), "+" + to, nowIn(business.timezone), lang);
      const msg = r.ok ? say(lang, "cancelledOk", { ref: r.booking.id }) : r.error;
      state.history.push({ role: "assistant", content: msg });
      return void await sendText(to, msg);
    }
    if (tapped === "skipnote") { state.noteFor = null; return void await sendText(to, w.skipped); }

    // Template quick replies. Check-in: ci|ok|REF or ci|bad|REF. Reminder: rm|change|REF.
    if (tapped.startsWith("ci|ok|")) return void await sendText(to, w.thanksVisit);
    if (tapped.startsWith("ci|bad|")) {
      state.issueFor = { ref: tapped.slice(7, 13) };
      return void await sendText(to, w.askIssue(business.redo?.text || ""));
    }
    if (tapped.startsWith("rm|change|")) {
      return void await askAI(key, business, to, state, `I need to change or cancel my booking ${tapped.slice(10, 16)}.`);
    }

    // ---- Typed text ----
    if (typed && state.issueFor) {
      const ref = state.issueFor.ref;
      state.issueFor = null;
      await addIssue(key, { date: nowIn(business.timezone).date, summary: typed, phone: "+" + to, ref, source: "whatsapp check-in" });
      state.history.push({ role: "assistant", content: w.issueLogged });
      return void await sendText(to, w.issueLogged);
    }
    if (typed && state.noteFor && !isQuestion(typed)) {
      const { ref, date } = state.noteFor;
      state.noteFor = null;
      await updateBooking(key, date, ref, b => ({ ...b, notes: cleanNotes([b.notes, typed].filter(Boolean).join("\n")) }));
      return void await sendText(to, w.notesSaved(ref));
    }
    state.noteFor = null;

    if (typed && state.pending && !state.pending.replaces && looksLikeName(typed)) return void await book(key, business, to, state, typed);

    // Anything else is a normal message for the AI. A half-finished booking is dropped.
    state.pending = null;
    if (typed) await askAI(key, business, to, state, typed);
  } finally {
    await saveChat(key, to, state);
  }
}
