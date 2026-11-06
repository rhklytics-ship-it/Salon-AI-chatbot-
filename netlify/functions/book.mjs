// Books a slot the customer picked in the chat. No AI involved here:
// the slot is checked against the calendar and claimed atomically.
import { findBusiness } from "../businesses.mjs";
import { findService, isTime, nowIn, dateProblem } from "../booking/calendar.mjs";
import { availability, createBooking, listBookings } from "../booking/store.mjs";
import { json, cleanCustomer, publicTimes } from "../booking/http.mjs";

const MAX_PER_PHONE_PER_DAY = 2;

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request." }); }

  const key = String(body?.business || "glow-studio").toLowerCase();
  const business = findBusiness(key);
  if (!business?.booking) return json(404, { error: "Online booking is not available here." });

  const service = findService(business, body.service);
  if (!service) return json(400, { error: "Please choose a service." });
  const { date, time } = body;
  const now = nowIn(business.timezone);
  const problem = dateProblem(business, date, now);
  if (problem) return json(400, { error: problem });
  if (!isTime(time)) return json(400, { error: "Please choose a time." });

  const customer = cleanCustomer(body);
  if (customer.error) return json(400, { error: customer.error });

  const sameDay = await listBookings(key, date);
  const mine = sameDay.filter(b => b.status === "confirmed" && b.phone === customer.phone);
  if (mine.length >= MAX_PER_PHONE_PER_DAY) {
    return json(429, { error: `You already have ${mine.length} bookings on this day. Please contact us to book more.` });
  }

  const free = await availability(key, business, service, date, now);
  const taken = () => json(409, {
    error: "Sorry, that time was just taken. Here are the times still free.",
    slots: { service: service.name, date, times: publicTimes(free.filter(f => f.time !== time)) },
  });
  if (!free.some(f => f.time === time)) return taken();

  const booking = await createBooking(key, business, service, date, time, customer);
  if (!booking) return taken();

  return json(200, {
    booking: { ref: booking.id, service: booking.service, date, time, name: booking.name, phone: booking.phone },
    demo: !!business.prospect,
  });
};

export const config = { path: "/api/book" };
