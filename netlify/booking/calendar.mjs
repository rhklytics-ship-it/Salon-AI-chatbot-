// Calendar maths: which start times are free for a service on a date.
// Pure functions, no storage, so they are easy to test.

import { t, langOf } from "./i18n.mjs";

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + "T00:00:00Z"));
export const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
export function fromMin(n) {
  return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}

export function addDays(date, n) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(date) {
  return DAY_KEYS[new Date(date + "T00:00:00Z").getUTCDay()];
}
export function niceDate(date) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB",
    { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// Today's date and the minutes past midnight, in the business's time zone.
export function nowIn(tz, at = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(at).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function serviceMinutes(service) {
  if (Number.isFinite(service.minutes)) return service.minutes;
  const n = parseInt(String(service.duration || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function findService(business, name) {
  const want = String(name || "").trim().toLowerCase();
  return business.services.find(s => s.name.toLowerCase() === want) || null;
}

// The people (or chairs, rooms) who take bookings. A business can list named
// stylists with the services each one does; otherwise there are `staff`
// interchangeable places called "Stylist 1", "Stylist 2", ...
export function staffList(business) {
  const cfg = business.booking || {};
  if (Array.isArray(cfg.stylists) && cfg.stylists.length) return cfg.stylists;
  const label = cfg.staffLabel || "Staff";
  return Array.from({ length: cfg.staff || 1 }, (_, i) => ({ name: `${label} ${i + 1}` }));
}

export const staffName = (business, index) => staffList(business)[index]?.name || `${business.booking?.staffLabel || "Staff"} ${Number(index) + 1}`;

// Indexes of the staff who do this service (all of them if no list is given).
export function staffFor(business, service) {
  return staffList(business)
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !Array.isArray(s.services) || s.services.some(n => n.toLowerCase() === service.name.toLowerCase()))
    .map(({ i }) => i);
}

// Index of a named stylist, or -1. Matches "sara", "Sara", "Sara K".
export function findStylist(business, name) {
  const want = String(name || "").trim().toLowerCase();
  if (!want) return -1;
  return staffList(business).findIndex(s => s.name.toLowerCase() === want || s.name.toLowerCase().split(" ")[0] === want.split(" ")[0]);
}

// Minutes since 1970-01-01 00:00 in the business's own clock. Lets us compare a
// booking's date + time with "now" without any time-zone maths.
export const localMinutes = (date, minutes) => Math.round(Date.parse(date + "T00:00:00Z") / 60000) + minutes;
export const nowMinutes = (now) => localMinutes(now.date, now.minutes);
export const startMinutes = (booking) => localMinutes(booking.date, toMin(booking.time));

// Can the customer still cancel or move this booking themselves?
export function changeAllowed(business, booking, now) {
  if (!booking || booking.status !== "confirmed") return false;
  const hours = Number(business.booking?.cancelHours ?? 0);
  return startMinutes(booking) - nowMinutes(now) >= hours * 60;
}

// UAE numbers written as 05X XXX XXXX, 9715X..., +9715X... or 009715X... all match.
export function phoneKey(phone, countryCode = "971") {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length >= 9 && d.length <= 10) d = countryCode + d.slice(1);
  return d;
}

// The 15-minute (slotMinutes) blocks a booking occupies.
export function units(startMin, minutes, step) {
  const out = [];
  for (let t = startMin; t < startMin + minutes; t += step) out.push(fromMin(t));
  return out;
}

// Is this date one customers may book, and if not, why? (lang: "en" or "ar")
export function dateProblem(business, date, now, lang = "en") {
  const cfg = business.booking;
  if (!isDate(date)) return t(lang, "badDate");
  if (date < now.date) return t(lang, "past");
  if (date > addDays(now.date, cfg.daysAhead)) return t(lang, "tooFar", { n: cfg.daysAhead });
  if (!cfg.schedule[weekday(date)]) {
    const day = langOf(lang) === "ar"
      ? new Date(date + "T00:00:00Z").toLocaleDateString("ar-AE", { weekday: "long", timeZone: "UTC" })
      : niceDate(date).split(" ")[0];
    return t(lang, "closed", { name: business.name, day });
  }
  return null;
}

// taken: Set of "staffIndex|HH:MM" blocks already booked on that date.
// stylist: optional staff index; only that person's free times are returned.
// Returns [{ time: "HH:MM", staff: [free staff indexes] }] in time order.
export function freeStarts(business, service, date, taken, now, stylist = -1) {
  const cfg = business.booking;
  if (dateProblem(business, date, now)) return [];
  const [open, close] = cfg.schedule[weekday(date)].map(toMin);
  const len = serviceMinutes(service);
  const step = cfg.slotMinutes;
  const earliest = date === now.date ? now.minutes + cfg.leadMinutes : -1;
  const who = staffFor(business, service).filter(s => stylist < 0 || s === stylist);
  const out = [];
  for (let start = open; start + len <= close; start += step) {
    if (start < earliest) continue;
    const blocks = units(start, len, step);
    const free = who.filter(s => blocks.every(t => !taken.has(`${s}|${t}`)));
    if (free.length) out.push({ time: fromMin(start), staff: free });
  }
  return out;
}
