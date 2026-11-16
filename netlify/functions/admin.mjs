// Owner bookings screen (public/admin.html) talks to this.
// Protected by the BOOKINGS_ADMIN_KEY environment variable.
import { timingSafeEqual, createHash } from "node:crypto";
import { businesses, findBusiness } from "../businesses.mjs";
import { findService, isTime, isDate, nowIn, dateProblem, addDays, staffList, findStylist } from "../booking/calendar.mjs";
import {
  listBookings, cancelBooking, createBooking, availability, getBooking, getPhoto, listIssues, updateIssue, updateBooking,
} from "../booking/store.mjs";
import { json, cleanCustomer, cleanNotes } from "../booking/http.mjs";
import { sendLateNotice } from "../whatsapp/followups.mjs";
import { whatsappReady } from "../whatsapp/meta.mjs";

function authorised(req) {
  const expected = process.env.BOOKINGS_ADMIN_KEY || "";
  const given = req.headers.get("x-admin-key") || "";
  if (expected.length < 8) return false;
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(expected), h(given));
}

const isRef = (s) => /^[A-Z0-9]{6}$/.test(String(s || ""));

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
            services: b.services.map(s => s.name), staffLabel: b.booking.staffLabel || "Staff",
            staffNames: staffList(b).map(s => s.name), named: !!b.booking.stylists?.length,
            lateAlerts: !!b.followups?.templates?.late && whatsappReady() })),
      });
    }
    const key = url.searchParams.get("business") || "";
    const business = findBusiness(key);

    // A customer's reference photo, e.g. ?business=glow-studio&photo=K7M2QX&n=1
    const photoRef = url.searchParams.get("photo");
    if (photoRef) {
      const n = Number(url.searchParams.get("n") || 1);
      const p = business && isRef(photoRef) && n >= 1 && n <= 3 ? await getPhoto(key, photoRef, n) : null;
      if (!p) return json(404, { error: "Photo not found." });
      return new Response(p.bytes, { status: 200, headers: { "content-type": p.type, "cache-control": "no-store", "x-content-type-options": "nosniff" } });
    }

    const from = url.searchParams.get("from"), to = url.searchParams.get("to");
    if (from || to) {
      // Date range, for the Excel export (up to 92 days).
      if (!business?.booking || !isDate(from) || !isDate(to) || to < from || to > addDays(from, 92)) {
        return json(400, { error: "Choose a range of up to 3 months." });
      }
      const all = [];
      for (let d = from; d <= to; d = addDays(d, 1)) all.push(...await listBookings(key, d));
      return json(200, { bookings: all });
    }
    const date = url.searchParams.get("date") || "";
    if (!business?.booking || !isDate(date)) return json(400, { error: "Choose a business and date." });
    return json(200, { bookings: await listBookings(key, date), issues: await listIssues(key, date) });
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }
    const key = String(body?.business || "");
    const business = findBusiness(key);
    if (!business?.booking) return json(400, { error: "Unknown business." });

    if (body.action === "cancel") {
      if (!isDate(body.date) || !isRef(body.id)) return json(400, { error: "Invalid booking." });
      const b = await cancelBooking(key, body.date, body.id, "salon");
      return b ? json(200, { booking: b }) : json(404, { error: "Booking not found." });
    }

    if (body.action === "late") {
      const minutes = Number(body.minutes);
      if (!isDate(body.date) || !isRef(body.id) || !Number.isInteger(minutes) || minutes < 5 || minutes > 120) return json(400, { error: "Invalid request." });
      const bk = await getBooking(key, body.date, body.id);
      if (!bk) return json(404, { error: "Booking not found." });
      const r = await sendLateNotice(key, bk, minutes);
      return r.ok ? json(200, { sent: true }) : json(409, { error: r.error });
    }

    if (body.action === "notes") {
      if (!isDate(body.date) || !isRef(body.id)) return json(400, { error: "Invalid booking." });
      const b = await updateBooking(key, body.date, body.id, { notes: cleanNotes(body.notes) });
      return b ? json(200, { booking: b }) : json(404, { error: "Booking not found." });
    }

    if (body.action === "resolveIssue") {
      if (!isDate(body.date) || !/^I[A-Z0-9]{6}$/.test(String(body.id || ""))) return json(400, { error: "Invalid issue." });
      const i = await updateIssue(key, body.date, body.id, { status: "resolved", resolvedAt: new Date().toISOString() });
      return i ? json(200, { issue: i }) : json(404, { error: "Issue not found." });
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
      const stylist = body.stylist ? findStylist(business, body.stylist) : -1;
      // Owners may book earlier than the online lead time, but never over another booking.
      const free = await availability(key, { ...business, booking: { ...business.booking, leadMinutes: -1440 } },
        service, body.date, now, stylist);
      if (!free.some(f => f.time === body.time)) return json(409, { error: stylist >= 0 ? "That stylist is busy then, or doesn't do this service." : "That time is already booked." });
      const b = await createBooking(key, business, service, body.date, body.time, customer, "owner",
        { stylist, notes: cleanNotes(body.notes), whatsappOk: !!body.whatsappOk });
      return b ? json(200, { booking: b }) : json(409, { error: "That time is already booked." });
    }
    return json(400, { error: "Unknown action." });
  }
  return json(405, { error: "Use GET or POST." });
};

export const config = { path: "/api/admin" };
