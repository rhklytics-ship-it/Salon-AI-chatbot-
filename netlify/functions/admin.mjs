// Owner bookings screen (public/admin.html) talks to this.
// Protected by the BOOKINGS_ADMIN_KEY environment variable.
import { timingSafeEqual, createHash } from "node:crypto";
import { businesses, findBusiness } from "../businesses.mjs";
import { findService, isTime, isDate, nowIn, dateProblem } from "../booking/calendar.mjs";
import { listBookings, cancelBooking, createBooking, availability } from "../booking/store.mjs";
import { json, cleanCustomer } from "../booking/http.mjs";

function authorised(req) {
  const expected = process.env.BOOKINGS_ADMIN_KEY || "";
  const given = req.headers.get("x-admin-key") || "";
  if (expected.length < 8) return false;
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(expected), h(given));
}

export default async (req) => {
  if ((process.env.BOOKINGS_ADMIN_KEY || "").length < 8) {
    return json(503, { error: "Set BOOKINGS_ADMIN_KEY (at least 8 characters) in Netlify to use this screen." });
  }
  if (!authorised(req)) return json(401, { error: "Wrong password." });

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("list") === "businesses") {
      return json(200, {
        businesses: Object.entries(businesses).filter(([, b]) => b.booking)
          .map(([key, b]) => ({ key, name: b.name, timezone: b.timezone, today: nowIn(b.timezone).date,
            services: b.services.map(s => s.name), staff: b.booking.staff, staffLabel: b.booking.staffLabel || "Staff" })),
      });
    }
    const key = url.searchParams.get("business") || "";
    const date = url.searchParams.get("date") || "";
    if (!findBusiness(key)?.booking || !isDate(date)) return json(400, { error: "Choose a business and date." });
    return json(200, { bookings: await listBookings(key, date) });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
    const key = String(body?.business || "");
    const business = findBusiness(key);
    if (!business?.booking) return json(400, { error: "Unknown business." });

    if (body.action === "cancel") {
      if (!isDate(body.date) || !/^[A-Z0-9]{6}$/.test(body.id || "")) return json(400, { error: "Invalid booking." });
      const b = await cancelBooking(key, body.date, body.id);
      return b ? json(200, { booking: b }) : json(404, { error: "Booking not found." });
    }

    if (body.action === "add") {
      // Phone or walk-in bookings, so the calendar stays the single source of truth.
      const service = findService(business, body.service);
      if (!service) return json(400, { error: "Choose a service." });
      const now = nowIn(business.timezone);
      const problem = dateProblem(business, body.date, { ...now, minutes: 0 });
      if (problem) return json(400, { error: problem });
      if (!isTime(body.time)) return json(400, { error: "Choose a time." });
      const customer = cleanCustomer(body);
      if (customer.error) return json(400, { error: customer.error });
      // Owners may book earlier than the online lead time, but never over another booking.
      const free = await availability(key, { ...business, booking: { ...business.booking, leadMinutes: -1440 } },
        service, body.date, now);
      if (!free.some(f => f.time === body.time)) return json(409, { error: "That time is already booked." });
      const b = await createBooking(key, business, service, body.date, body.time, customer, "owner");
      return b ? json(200, { booking: b }) : json(409, { error: "That time is already booked." });
    }
    return json(400, { error: "Unknown action." });
  }
  return json(405, { error: "Use GET or POST." });
};

export const config = { path: "/api/admin" };
