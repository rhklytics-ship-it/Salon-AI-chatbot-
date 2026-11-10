// Books the time a patient picked (from the chat or the live schedule).
// No AI involved: the time is checked against the calendar and claimed atomically.
import { findBusiness } from "../businesses.mjs";
import { findService, isTime, nowIn, dateProblem, staffFor } from "../booking/calendar.mjs";
import { availability, createBooking, listBookings } from "../booking/store.mjs";
import { json, cleanCustomer, publicTimes } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

const MAX_PER_PHONE_PER_DAY = 2;

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  const lang = langOf(body?.lang);
  const key = String(body?.business || "carefirst-clinic").toLowerCase();
  const business = findBusiness(key);
  if (!business?.booking) return json(404, { error: t(lang, "notAvailable") });

  const service = findService(business, body.service);
  if (!service) return json(400, { error: t(lang, "chooseService") });
  const { date, time } = body;
  const now = nowIn(business.timezone);
  const problem = dateProblem(business, date, now, lang);
  if (problem) return json(400, { error: problem });
  if (!isTime(time)) return json(400, { error: t(lang, "chooseTime") });

  // Optional: a specific doctor, when the patient picked from that doctor's schedule.
  let onlyStaff = null;
  if (body.staff !== undefined && body.staff !== null && body.staff !== "") {
    onlyStaff = Number(body.staff);
    if (!staffFor(business.booking, service).some(s => s.index === onlyStaff)) {
      return json(400, { error: t(lang, "wrongDoctor") });
    }
  }

  const customer = cleanCustomer(body, lang);
  if (customer.error) return json(400, { error: customer.error });

  const sameDay = await listBookings(key, date);
  const mine = sameDay.filter(b => b.status === "confirmed" && b.phone === customer.phone);
  if (mine.length >= MAX_PER_PHONE_PER_DAY) {
    return json(429, { error: t(lang, "tooMany", { n: mine.length }) });
  }

  const free = await availability(key, business, service, date, now, onlyStaff);
  const taken = () => json(409, {
    error: t(lang, "taken"),
    slots: { service: service.name, serviceAr: service.name_ar, date, times: publicTimes(free.filter(f => f.time !== time)) },
  });
  const slot = free.find(f => f.time === time);
  if (!slot) return taken();

  const booking = await createBooking(key, business, service, date, time, customer, "chat", slot.staff);
  if (!booking) return taken();

  return json(200, {
    booking: { ref: booking.id, service: booking.service, serviceAr: service.name_ar,
      doctor: booking.staffName, doctorAr: business.booking.staff[booking.staff]?.name_ar, date, time,
      name: booking.name, phone: booking.phone, price: service.price },
    sample: !!business.sample,
  });
};

export const config = { path: "/api/book" };
