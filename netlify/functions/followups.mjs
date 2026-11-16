// Scheduled function: Netlify runs this every hour.
// Sends WhatsApp reminders and visit check-ins (see netlify/whatsapp/followups.mjs).
// Does nothing unless the WhatsApp add-on is set up.
import { runFollowups } from "../whatsapp/followups.mjs";
import { whatsappReady } from "../whatsapp/meta.mjs";

export default async () => {
  if (!whatsappReady()) return new Response("WhatsApp not set up");
  const key = String(process.env.WHATSAPP_BUSINESS || "glow-studio").toLowerCase();
  const counts = await runFollowups(key);
  console.log("followups", key, counts);
  return new Response(JSON.stringify(counts));
};

export const config = { schedule: "@hourly" };
