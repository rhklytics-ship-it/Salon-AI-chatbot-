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
// Returns [{ time: "HH:MM", staff: [free staff indexes] }] in time order.
export function freeStarts(business, service, date, taken, now) {
  const cfg = business.booking;
  if (dateProblem(business, date, now)) return [];
  const [open, close] = cfg.schedule[weekday(date)].map(toMin);
  const len = serviceMinutes(service);
  const step = cfg.slotMinutes;
  const earliest = date === now.date ? now.minutes + cfg.leadMinutes : -1;
  const out = [];
  for (let start = open; start + len <= close; start += step) {
    if (start < earliest) continue;
    const blocks = units(start, len, step);
    const free = [];
    for (let s = 0; s < cfg.staff; s++) {
      if (blocks.every(t => !taken.has(`${s}|${t}`))) free.push(s);
    }
    if (free.length) out.push({ time: fromMin(start), staff: free });
  }
  return out;
}
