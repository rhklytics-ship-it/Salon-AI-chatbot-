// Booking rules shared by the website (book.mjs, manage.mjs) and WhatsApp (flow.mjs):
// place a booking, move it to a new time, cancel it, or book a free fix.
// No AI is involved here: every change is checked against the calendar and policy.

import { findService, isTime, dateProblem, findStylist, changeAllowed, phoneKey, addDays, staffName } from "./calendar.mjs";
import { availability, createBooking, listBookings, findBookingByRef, cancelBooking, updateBooking } from "./store.mjs";
import { cleanCustomer, cleanNotes, publicTimes } from "./http.mjs";
import { t } from "./i18n.mjs";

export const MAX_PER_PHONE_PER_DAY = 2;

const fail = (status, error, more = {}) => ({ ok: false, status, error, ...more });
const samePhone = (a, b) => phoneKey(a) && phoneKey(a) === phoneKey(b);

// Is `ref` a past booking by this phone that still qualifies for a free fix today?
// phone = null skips the phone check (the website checks it later, when the customer books).
export async function redoCheck(key, business, ref, phone, service, now) {
  const days = Number(business.redo?.days || 0);
  if (!days || !business.redo?.text) return null;
  const old = await findBookingByRef(key, ref);
  if (!old || old.status !== "confirmed" || (phone !== null && !samePhone(old.phone, phone))) return null;
  if (old.redoOf) return null;                                 // a free fix can't itself be fixed for free
  if (old.date > now.date || now.date > addDays(old.date, days)) return null;
  if (service && old.service !== service.name) return null;
  return old;
}

// input: { service, date, time, name, phone, source, stylist, notes, whatsappOk, replaces, redoOf }
export async function placeBooking(key, business, input, now, lang = "en") {
  const service = findService(business, input.service);
  if (!service) return fail(400, t(lang, "chooseService"));
  const { date, time } = input;
  const problem = dateProblem(business, date, now, lang);
  if (problem) return fail(400, problem);
  if (!isTime(time)) return fail(400, t(lang, "chooseTime"));

  // Moving an existing booking: the mobile number must match, and it must be early enough.
  let old = null;
  if (input.replaces) {
    old = await findBookingByRef(key, input.replaces);
    if (!old || !samePhone(old.phone, input.phone)) return fail(404, t(lang, "notFound"));
    if (old.status !== "confirmed") return fail(409, t(lang, "alreadyCancelled"));
    if (!changeAllowed(business, old, now)) {
      return fail(409, t(lang, "tooLate", { h: business.booking.cancelHours, handoff: business.handoff }));
    }
  }

  const customer = cleanCustomer({ name: input.name || old?.name, phone: input.phone }, lang);
  if (customer.error) return fail(400, customer.error);

  let price = service.price || "";
  let redoOf = null;
  if (input.redoOf) {
    const orig = await redoCheck(key, business, input.redoOf, customer.phone, service, now);
    if (!orig) return fail(409, t(lang, "redoNotAllowed", { handoff: business.handoff }));
    redoOf = orig.id;
    price = `Free (fix for ${orig.id})`;
  }

  const sameDay = await listBookings(key, date);
  const mine = sameDay.filter(b => b.status === "confirmed" && samePhone(b.phone, customer.phone) && b.id !== old?.id);
  if (mine.length >= MAX_PER_PHONE_PER_DAY) return fail(429, t(lang, "tooMany", { n: mine.length }));

  const stylist = findStylist(business, input.stylist);
  const free = await availability(key, business, service, date, now, stylist);
  const taken = () => fail(409, t(lang, "taken"), {
    slots: {
      service: service.name, serviceAr: service.name_ar || null, date, times: publicTimes(free.filter(f => f.time !== time)),
      stylist: stylist >= 0 ? staffName(business, stylist) : null, replaces: old?.id || null, redoOf,
    },
  });
  if (!free.some(f => f.time === time)) return taken();

  const booking = await createBooking(key, business, service, date, time, customer, input.source || "chat", {
    stylist, notes: cleanNotes(input.notes || old?.notes), price, whatsappOk: input.whatsappOk ?? old?.whatsappOk,
    redoOf, rescheduledFrom: old?.id,
  });
  if (!booking) return taken();

  if (old) {
    await cancelBooking(key, old.date, old.id, "customer (moved)");
    await updateBooking(key, old.date, old.id, { movedTo: booking.id });
  }
  return { ok: true, booking, service, stylistName: staffName(business, booking.staff), replaced: old };
}

// The customer cancels their own booking: reference + the mobile number used to book.
export async function cancelByCustomer(key, business, ref, phone, now, lang = "en") {
  const booking = await findBookingByRef(key, ref);
  if (!booking || !samePhone(booking.phone, phone)) return fail(404, t(lang, "notFound"));
  if (booking.status !== "confirmed") return fail(409, t(lang, "alreadyCancelled"));
  if (!changeAllowed(business, booking, now)) {
    return fail(409, t(lang, "tooLate", { h: business.booking.cancelHours, handoff: business.handoff }));
  }
  const done = await cancelBooking(key, booking.date, booking.id, "customer");
  return { ok: true, booking: done };
}
