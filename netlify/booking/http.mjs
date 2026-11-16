// Small helpers shared by the booking functions.

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

import { t } from "./i18n.mjs";

export function cleanCustomer(input, lang = "en") {
  const name = String(input?.name || "").replace(/\s+/g, " ").trim();
  const phone = String(input?.phone || "").replace(/[^\d+]/g, "");
  const digits = phone.replace(/\D/g, "");
  if (name.length < 2 || name.length > 60) return { error: t(lang, "enterName") };
  if (digits.length < 7 || digits.length > 15) return { error: t(lang, "enterPhone") };
  return { name, phone };
}

// Times to show the customer, with staff details removed.
export const publicTimes = (starts) => starts.map(s => s.time);

// Notes for the stylist: what they want, allergies, past treatments.
export const MAX_NOTES = 500;
export const cleanNotes = (s) => String(s || "").replace(/[\u0000-\u0009\u000B-\u001F]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_NOTES);

// A reference photo sent from the chat as a data URL. The widget shrinks photos
// before sending, so anything over 1.5 MB is refused.
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function parsePhoto(dataUrl) {
  if (!dataUrl) return null;
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m || !PHOTO_TYPES.has(m[1])) return { error: "badPhoto" };
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return { error: "bigPhoto" };
  // Check the file really is the image type it claims to be.
  const sig = bytes.subarray(0, 12);
  const real = sig[0] === 0xFF && sig[1] === 0xD8 ? "image/jpeg"
    : sig[0] === 0x89 && sig[1] === 0x50 ? "image/png"
    : sig.subarray(0, 4).toString() === "RIFF" && sig.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
  if (real !== m[1]) return { error: "badPhoto" };
  return { bytes, type: m[1] };
}

// What the customer may see about a booking (no other customer's details).
export function publicBooking(b, business, staffName) {
  return {
    ref: b.id, service: b.service, date: b.date, time: b.time, status: b.status, price: b.price || "",
    stylist: business.booking?.stylists?.length ? staffName : null,
  };
}
