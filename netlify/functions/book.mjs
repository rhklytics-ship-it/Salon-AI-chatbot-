// Books a slot the customer picked in the chat, or moves an existing booking to it.
// No AI involved here: the slot is checked against the calendar and claimed atomically.
import { findBusiness } from "../businesses.mjs";
import { nowIn } from "../booking/calendar.mjs";
import { savePhoto } from "../booking/store.mjs";
import { placeBooking } from "../booking/actions.mjs";
import { json, parsePhoto } from "../booking/http.mjs";
import { t, langOf } from "../booking/i18n.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
  const lang = langOf(body?.lang);

  const key = String(body?.business || "glow-studio").toLowerCase();
  const business = findBusiness(key);
  if (!business?.booking) return json(404, { error: t(lang, "notAvailable") });

  // Check the photo before booking, so a bad file never leaves a half-made booking.
  const photo = parsePhoto(body.photo);
  if (photo?.error) return json(400, { error: t(lang, photo.error) });

  const now = nowIn(business.timezone);
  const r = await placeBooking(key, business, {
    service: body.service, date: body.date, time: body.time, name: body.name, phone: body.phone,
    stylist: body.stylist, notes: body.notes, whatsappOk: !!body.whatsappOk,
    replaces: body.replaces || null, redoOf: body.redoOf || null, source: "chat",
  }, now, lang);
  if (!r.ok) return json(r.status, { error: r.error, ...(r.slots ? { slots: r.slots } : {}) });

  let booking = r.booking;
  if (photo) booking = (await savePhoto(key, booking, photo.bytes, photo.type)) || booking;

  return json(200, {
    booking: {
      ref: booking.id, service: booking.service, serviceAr: r.service.name_ar || null, date: booking.date, time: booking.time,
      name: booking.name, phone: booking.phone, price: booking.price,
      stylist: business.booking.stylists?.length ? r.stylistName : null,
      notes: !!booking.notes, photos: booking.photos || 0, replaced: r.replaced?.id || null,
    },
    demo: !!business.prospect,
  });
};

export const config = { path: "/api/book" };
