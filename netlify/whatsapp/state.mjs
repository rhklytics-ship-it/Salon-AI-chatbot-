// Remembers each WhatsApp conversation between messages (Netlify Blobs).
// Kept in its own store, separate from the bookings themselves.
import { getStore } from "@netlify/blobs";

let testStore = null;
export function useWhatsAppStoreForTests(s) { testStore = s; }
const store = () => testStore || getStore({ name: "whatsapp", consistency: "strong" });

const DAY = 24 * 60 * 60 * 1000;
// pending: a time the customer tapped, waiting for their name (or "move" confirmation)
// offered: the times last shown.  noteFor / issueFor: the next message is saved as booking notes / a complaint.
const fresh = () => ({ history: [], lang: "en", bookings: [], pending: null, offered: null, noteFor: null, issueFor: null, hits: [], at: 0 });

export async function loadChat(biz, phone) {
  const s = (await store().get(`chat/${biz}/${phone}`, { type: "json" })) || fresh();
  // A new day is a new conversation; bookings made earlier are still remembered.
  if (s.at && Date.now() - s.at > DAY) { s.history = []; s.pending = null; s.offered = null; s.noteFor = null; }
  return { ...fresh(), ...s };
}

export async function saveChat(biz, phone, s) {
  s.at = Date.now();
  s.history = s.history.slice(-20);
  s.bookings = s.bookings.slice(-5);
  await store().setJSON(`chat/${biz}/${phone}`, s);
}

// Meta re-sends a message if we are slow to answer. Only the first copy is handled.
export async function firstTimeSeen(messageId) {
  const res = await store().set(`seen/${messageId}`, String(Date.now()), { onlyIfNew: true });
  return !(res && res.modified === false);
}
