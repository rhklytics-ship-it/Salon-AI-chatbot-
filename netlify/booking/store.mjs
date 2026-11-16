// Booking storage on Netlify Blobs (free, no database to set up).
//
// Keys:
//   lock/<business>/<date>/<staff>/<HH:MM>   one per 15-minute block, value = booking id
//   bk/<business>/<date>/<id>                the booking itself (JSON)
//   ref/<business>/<id>                      the booking's date, to find a booking from its reference
//   ph/<business>/<phone>/<date>/<id>        index of a customer's bookings by mobile number
//   photo/<business>/<id>/<n>                reference photos the customer sent for the stylist
//   issue/<business>/<date>/<id>             complaints and problems the assistant logged for the manager
//   optout/<business>/<phone>                customer replied STOP: no reminders or check-ins
// A block is claimed with "write only if new", so two customers can never
// get the same block: the second write fails and that customer is offered
// other times. This is what prevents double booking.

import { getStore } from "@netlify/blobs";
import { units, toMin, serviceMinutes, freeStarts, staffFor, phoneKey } from "./calendar.mjs";

let testStore = null;
export function useStoreForTests(s) { testStore = s; }
const store = () => testStore || getStore({ name: "bookings", consistency: "strong" });

const lockPrefix = (biz, date) => `lock/${biz}/${date}/`;
const lockKey = (biz, date, staff, time) => `lock/${biz}/${date}/${staff}/${time}`;
const bookingKey = (biz, date, id) => `bk/${biz}/${date}/${id}`;
const refKey = (biz, id) => `ref/${biz}/${id}`;
const phonePrefix = (biz, phone) => `ph/${biz}/${phoneKey(phone)}/`;

export async function takenBlocks(biz, date) {
  const { blobs } = await store().list({ prefix: lockPrefix(biz, date) });
  return new Set(blobs.map(b => {
    const [, , , staff, time] = b.key.split("/");
    return `${staff}|${time}`;
  }));
}

export async function listBookings(biz, date) {
  const { blobs } = await store().list({ prefix: `bk/${biz}/${date}/` });
  const items = await Promise.all(blobs.map(b => store().get(b.key, { type: "json" })));
  return items.filter(Boolean).sort((a, b) => a.time.localeCompare(b.time) || a.staff - b.staff);
}

function newId(prefix = "") {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = prefix;
  for (let i = 0; i < 6; i++) id += abc[Math.floor(Math.random() * abc.length)];
  return id;
}

// Claims every block of the booking for one staff member, or none.
// extra: { stylist (staff index or -1 for anyone), notes, price, whatsappOk, redoOf, rescheduledFrom }
export async function createBooking(biz, business, service, date, time, customer, source = "chat", extra = {}) {
  const cfg = business.booking;
  const minutes = serviceMinutes(service);
  const blocks = units(toMin(time), minutes, cfg.slotMinutes);
  const id = newId();
  const want = Number.isInteger(extra.stylist) ? extra.stylist : -1;
  const candidates = staffFor(business, service).filter(s => want < 0 || s === want);

  for (const staff of candidates) {
    const claimed = [];
    let ok = true;
    for (const t of blocks) {
      const key = lockKey(biz, date, staff, t);
      const res = await store().set(key, id, { onlyIfNew: true });
      if (res && res.modified === false) { ok = false; break; }
      claimed.push(key);
    }
    if (ok) {
      const booking = {
        id, business: biz, service: service.name, minutes, date, time, staff,
        name: customer.name, phone: customer.phone, status: "confirmed", source,
        price: extra.price ?? service.price ?? "",
        notes: extra.notes || "",
        whatsappOk: source === "whatsapp" || !!extra.whatsappOk,
        ...(extra.redoOf ? { redoOf: extra.redoOf } : {}),
        ...(extra.rescheduledFrom ? { rescheduledFrom: extra.rescheduledFrom } : {}),
        photos: 0,
        createdAt: new Date().toISOString(),
      };
      await store().setJSON(bookingKey(biz, date, id), booking);
      await store().set(refKey(biz, id), date);
      await store().set(`${phonePrefix(biz, customer.phone)}${date}/${id}`, "1");
      return booking;
    }
    // Someone else holds part of this slot: give back what we took, try the next staff member.
    await Promise.all(claimed.map(k => store().delete(k)));
  }
  return null;
}

export async function getBooking(biz, date, id) {
  return store().get(bookingKey(biz, date, id), { type: "json" });
}

// Finds a booking from its 6-character reference alone.
export async function findBookingByRef(biz, id) {
  const ref = String(id || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(ref)) return null;
  const date = await store().get(refKey(biz, ref));
  return date ? getBooking(biz, date, ref) : null;
}

// A customer's bookings from a given date on, newest last.
export async function bookingsForPhone(biz, phone, fromDate = "0000-00-00") {
  if (!phoneKey(phone)) return [];
  const { blobs } = await store().list({ prefix: phonePrefix(biz, phone) });
  const keys = blobs.map(b => b.key.split("/")).filter(p => p[3] >= fromDate);
  const items = await Promise.all(keys.map(p => getBooking(biz, p[3], p[4])));
  return items.filter(Boolean).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// Merges changes into a booking (notes, photo count, reminder flags...).
export async function updateBooking(biz, date, id, patch) {
  const key = bookingKey(biz, date, id);
  const booking = await store().get(key, { type: "json" });
  if (!booking) return null;
  const next = typeof patch === "function" ? patch(booking) : { ...booking, ...patch };
  await store().setJSON(key, next);
  return next;
}

export async function cancelBooking(biz, date, id, by = "salon") {
  const key = bookingKey(biz, date, id);
  const booking = await store().get(key, { type: "json" });
  if (!booking || booking.status === "cancelled") return booking;
  const { blobs } = await store().list({ prefix: `lock/${biz}/${date}/${booking.staff}/` });
  // Free only the blocks that belong to this booking.
  await Promise.all(blobs.map(async b => {
    const holder = await store().get(b.key);
    if (holder === id) await store().delete(b.key);
  }));
  booking.status = "cancelled";
  booking.cancelledBy = by;
  booking.cancelledAt = new Date().toISOString();
  await store().setJSON(key, booking);
  return booking;
}

// Free start times for a service on a date, straight from storage.
export async function availability(biz, business, service, date, now, stylist = -1) {
  const taken = await takenBlocks(biz, date);
  return freeStarts(business, service, date, taken, now, stylist);
}

// ---------- Reference photos ----------
export const MAX_PHOTOS = 3;

export async function savePhoto(biz, booking, bytes, contentType) {
  if (!booking || (booking.photos || 0) >= MAX_PHOTOS) return null;
  const n = (booking.photos || 0) + 1;
  await store().set(`photo/${biz}/${booking.id}/${n}`, bytes, { metadata: { type: contentType } });
  return updateBooking(biz, booking.date, booking.id, { photos: n });
}

export async function getPhoto(biz, id, n) {
  const res = await store().getWithMetadata(`photo/${biz}/${id}/${n}`, { type: "arrayBuffer" });
  return res ? { bytes: res.data, type: res.metadata?.type || "image/jpeg" } : null;
}

// ---------- Issues for the manager ----------
// issue: { date (YYYY-MM-DD, today in the business), summary, name?, phone?, ref?, wantsFix?, source }
export async function addIssue(biz, issue) {
  const id = newId("I");
  const item = { id, status: "open", createdAt: new Date().toISOString(), ...issue, summary: String(issue.summary || "").slice(0, 600) };
  await store().setJSON(`issue/${biz}/${item.date}/${id}`, item);
  return item;
}

export async function listIssues(biz, date) {
  const { blobs } = await store().list({ prefix: `issue/${biz}/${date}/` });
  const items = await Promise.all(blobs.map(b => store().get(b.key, { type: "json" })));
  return items.filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function updateIssue(biz, date, id, patch) {
  const key = `issue/${biz}/${date}/${id}`;
  const item = await store().get(key, { type: "json" });
  if (!item) return null;
  const next = { ...item, ...patch };
  await store().setJSON(key, next);
  return next;
}

// ---------- WhatsApp opt-out (STOP / START) ----------
export async function setOptOut(biz, phone, out) {
  const key = `optout/${biz}/${phoneKey(phone)}`;
  if (out) await store().set(key, new Date().toISOString());
  else await store().delete(key);
}

export async function isOptedOut(biz, phone) {
  return !!(await store().get(`optout/${biz}/${phoneKey(phone)}`));
}
