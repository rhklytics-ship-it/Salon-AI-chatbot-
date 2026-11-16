// Lets a customer cancel their own booking from the website chat.
// They give the booking reference and the mobile number they booked with;
// no AI is involved, and the business's cancellation cut-off is enforced.
// (Moving a booking goes through /api/book with "replaces".)
import { findBusiness } from "../businesses.mjs";
import { nowIn } from "../booking/calendar.mjs";
import { cancelByCustomer } from "../booking/actions.mjs";
import { json } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
  const lang = langOf(body?.lang);
  const key = String(body?.business || "glow-studio").toLowerCase();
  const business = findBusiness(key);
  if (!business?.booking) return json(404, { error: t(lang, "notAvailable") });

  if (body.action !== "cancel") return json(400, { error: t(lang, "invalid") });
  const r = await cancelByCustomer(key, business, body.ref, body.phone, nowIn(business.timezone), lang);
  if (!r.ok) return json(r.status, { error: r.error });
  return json(200, { cancelled: { ref: r.booking.id, service: r.booking.service, date: r.booking.date, time: r.booking.time }, message: t(lang, "cancelledOk", { ref: r.booking.id }) });
};

export const config = { path: "/api/manage" };
