// WhatsApp follow-ups, run every hour by netlify/functions/followups.mjs. Sends:
//   - a reminder before each appointment  (template followups.templates.reminder)
//   - a "how was your visit?" check-in after it, with the Google review link for every client
//     (template followups.templates.checkin; not only to happy clients, as Google's rules require)
// Only to customers who booked on WhatsApp or ticked the WhatsApp box on the website,
// and never to anyone who replied STOP. Each message is sent once per booking.
// Does nothing unless the WhatsApp add-on is set up and the business has `followups`.
import { findBusiness } from "../businesses.mjs";
import { nowIn, addDays, niceDate, nowMinutes, startMinutes } from "../booking/calendar.mjs";
import { listBookings, updateBooking, isOptedOut } from "../booking/store.mjs";
import { sendTemplate, whatsappReady } from "./meta.mjs";

const time12 = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const CHECKIN_WINDOW = 12 * 60;     // minutes; a missed check-in older than this is skipped, not sent late

export const canMessage = async (key, bk) =>
  bk.status === "confirmed" && bk.phone && (bk.source === "whatsapp" || bk.whatsappOk) && !(await isOptedOut(key, bk.phone));

export async function runFollowups(key, at = new Date(), send = sendTemplate) {
  const b = findBusiness(key);
  const f = b?.followups;
  if (!b?.booking || !f?.templates) return { reminders: 0, checkins: 0 };
  const now = nowIn(b.timezone, at);
  const nowM = nowMinutes(now);
  const lang = f.templates.language || "en";
  const counts = { reminders: 0, checkins: 0 };

  for (let d = -2; d <= 2; d++) {
    const date = addDays(now.date, d);
    for (const bk of await listBookings(key, date)) {
      const start = startMinutes(bk), end = start + bk.minutes;
      const to = String(bk.phone).replace(/\D/g, "");

      // Reminder: within reminderHours before the start, but not for last-minute bookings.
      const H = Number(f.reminderHours || 0);
      if (H > 0 && f.templates.reminder && !bk.reminderSentAt && start - nowM <= H * 60 && start - nowM > 60
          && at.getTime() - Date.parse(bk.createdAt) > 2 * 3600e3 && await canMessage(key, bk)) {
        const ok = await send(to, {
          name: f.templates.reminder, language: lang,
          params: [bk.name, bk.service, niceDate(bk.date), time12(bk.time)],
          buttons: [`rm|change|${bk.id}`],
        });
        if (ok) { await updateBooking(key, bk.date, bk.id, { reminderSentAt: at.toISOString() }); counts.reminders++; }
      }

      // Check-in: checkinAfterHours after the visit ends.
      const C = Number(f.checkinAfterHours || 0);
      if (C > 0 && f.templates.checkin && !bk.checkinSentAt && nowM >= end + C * 60 && nowM <= end + C * 60 + CHECKIN_WINDOW
          && await canMessage(key, bk)) {
        const review = b.reviewLink ? `If you have a minute, a Google review helps us a lot: ${b.reviewLink}` : "We'd love to see you again.";
        const ok = await send(to, {
          name: f.templates.checkin, language: lang,
          params: [bk.name, b.name, bk.service, review],
          buttons: [`ci|ok|${bk.id}`, `ci|bad|${bk.id}`],
        });
        if (ok) { await updateBooking(key, bk.date, bk.id, { checkinSentAt: at.toISOString() }); counts.checkins++; }
      }
    }
  }
  return counts;
}

// "Running late" from the bookings screen.
export async function sendLateNotice(key, bk, minutes, send = sendTemplate) {
  const b = findBusiness(key);
  const name = b?.followups?.templates?.late;
  if (!name) return { ok: false, error: "No running-late template is set for this business." };
  if (!whatsappReady() && send === sendTemplate) return { ok: false, error: "WhatsApp is not set up on this site." };
  if (!(await canMessage(key, bk))) return { ok: false, error: "This customer hasn't agreed to WhatsApp messages (or replied STOP). Please call them." };
  const ok = await send(String(bk.phone).replace(/\D/g, ""), {
    name, language: b.followups.templates.language || "en",
    params: [bk.name, String(minutes), bk.service, time12(bk.time)],
  });
  if (!ok) return { ok: false, error: "WhatsApp didn't accept the message. Check the template name and the Netlify logs." };
  await updateBooking(key, bk.date, bk.id, { lateNotice: { minutes, at: new Date().toISOString() } });
  return { ok: true };
}
