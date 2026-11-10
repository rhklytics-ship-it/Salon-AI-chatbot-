// Patients cancel with their booking reference AND the mobile number they booked with,
// so nobody can cancel someone else's appointment by guessing a reference.
import { findBusiness } from "../businesses.mjs";
import { nowIn, niceDate } from "../booking/calendar.mjs";
import { findByRef, cancelBooking } from "../booking/store.mjs";
import { json } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

const lastDigits = (s) => String(s || "").replace(/\D/g, "").slice(-9);

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  const lang = langOf(body?.lang);
  const key = String(body?.business || "carefirst-clinic").toLowerCase();
  const business = findBusiness(key);
  if (!business?.booking) return json(404, { error: t(lang, "unknownClinic") });

  const ref = String(body.ref || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const phone = lastDigits(body.phone);
  if (!/^[A-Z0-9]{6}$/.test(ref) || phone.length < 7) {
    return json(400, { error: t(lang, "enterRef") });
  }

  const booking = await findByRef(key, ref);
  // Same answer for "no such booking" and "wrong number", so references can't be probed.
  if (!booking || lastDigits(booking.phone) !== phone) {
    return json(404, { error: t(lang, "notFound") });
  }
  if (booking.status === "cancelled") return json(200, { cancelled: true, already: true, booking: summary(booking, business) });

  const now = nowIn(business.timezone);
  if (booking.date < now.date) return json(400, { error: t(lang, "passed") });

  const done = await cancelBooking(key, booking.date, booking.id, "patient");
  return json(200, { cancelled: true, booking: summary(done, business) });
};

const summary = (b, business) => ({
  ref: b.id, service: b.service, serviceAr: business.services.find(s => s.name === b.service)?.name_ar,
  doctor: b.staffName, doctorAr: business.booking.staff[b.staff]?.name_ar,
  date: b.date, day: niceDate(b.date), time: b.time,
});

export const config = { path: "/api/cancel" };
