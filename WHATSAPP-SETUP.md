# WhatsApp add-on (optional)

Lets customers chat with the same AI assistant and book on WhatsApp. It uses the
same booking calendar as the website, so a time can never be booked twice.

It is switched off until the five settings below are added on Netlify. A client
who only wants the website option needs none of this.

It also adds follow-ups, sent by WhatsApp:
- a reminder before each appointment, with a "Need to change" button
- a "how was your visit?" check-in after it. "Something wasn't right" goes straight to the
  manager as an issue on the bookings screen. Every client gets the Google review link,
  not only happy ones, because Google's rules forbid asking only satisfied customers.
- a "running late" message, sent from the bookings screen with one tap

## Files in this add-on

    netlify/functions/whatsapp.mjs    the address Meta sends messages to (/api/whatsapp)
    netlify/whatsapp/flow.mjs         the conversation: questions, time list, name, booking
    netlify/whatsapp/meta.mjs         sending messages through Meta
    netlify/whatsapp/state.mjs        remembers each conversation
    netlify/whatsapp/followups.mjs    reminders, visit check-ins and running-late messages
    netlify/functions/followups.mjs   runs the follow-ups every hour (a Netlify scheduled function)

    public/admin.html                 bookings screen, now labels WhatsApp bookings
    public/bookings-export.js         Excel download, now labels WhatsApp bookings

To add it to a client's project: copy these into the project (same folders) and push.
To remove it: delete `netlify/whatsapp/flow.mjs`, `netlify/whatsapp/state.mjs` and
`netlify/functions/whatsapp.mjs`. Keep `meta.mjs` and `followups.mjs` in `netlify/whatsapp`:
the bookings screen uses them, and they do nothing without the WhatsApp settings.

## What the customer sees

1. They message the business number. The AI answers in English or Arabic.
2. When they ask to book, they get a "Choose a time" button with the free times.
3. They tap a time, then tap their name (or type another).
4. They get a confirmation with a reference. The booking shows on the bookings
   screen and in the Excel download like any other, labelled "WhatsApp".

Their mobile number is taken from WhatsApp, so they are never asked for it.

5. For a cut or colour (`consult: true`), they are asked for a reference photo and notes.
   Photos and notes are saved to the booking for the stylist, and show on the bookings screen.
   A photo sent later is saved to their next booking.
6. To change or cancel, they just ask. Cancelling is one tap on "Yes, cancel"; moving shows
   the free times, and the old booking is cancelled when they confirm the new one.
7. Replying STOP turns off reminders and check-ins; START turns them back on.

The assistant also remembers their past visits (from their number), so it can offer their
usual stylist.

## Test setup (free, no client needed)

Menu names on Meta's site change from time to time; look for the nearest match.

1. Go to developers.facebook.com, log in, and create an app. Choose the WhatsApp
   use case and connect (or create) a Meta business portfolio for RHKLytics.
2. In the app, open WhatsApp > API Setup. Meta gives you a free test number.
   - Copy the **Phone number ID** (not the phone number itself).
   - Add your own mobile under "To" as an allowed recipient (up to 5 numbers).
   - Copy the **temporary access token** (it lasts about 24 hours).
3. Open App settings > Basic and copy the **App secret**.
4. On Netlify: Site configuration > Environment variables. Add:

   | Name | Value |
   |---|---|
   | `WHATSAPP_TOKEN` | the access token from step 2 |
   | `WHATSAPP_PHONE_ID` | the Phone number ID from step 2 |
   | `WHATSAPP_APP_SECRET` | the App secret from step 3 |
   | `WHATSAPP_VERIFY_TOKEN` | any phrase you invent, e.g. `glow-2026-check` |
   | `WHATSAPP_BUSINESS` | the business key from `businesses.mjs`, e.g. `glow-studio` |

   Then trigger a new deploy (Deploys > Trigger deploy), because settings only
   apply to new deploys.
5. Back on Meta: WhatsApp > Configuration > Webhook.
   - Callback URL: `https://YOUR-SITE.netlify.app/api/whatsapp`
   - Verify token: the same phrase as `WHATSAPP_VERIFY_TOKEN`
   - Click Verify and save, then subscribe to the **messages** field.
6. From your mobile, send "Hi" to the test number. The assistant should reply.

Never put these values in the code or in `.env` on GitHub. They belong only in
Netlify's environment variables, like the Anthropic key.

## Going live for a real client

- Use the client's own Meta business portfolio and their business number. The
  number must be registered on Meta's business platform; a number already on
  the WhatsApp Business app has to be moved or linked first.
- Meta verifies the business (trade licence). Start this on day 1; it can take days.
- Replace the temporary token with a permanent one (a "system user" token in
  Meta Business settings), or the assistant stops after 24 hours.
- Add a payment method on Meta. Replies to customers who message first are free;
  messages the business sends first (reminders, offers) are charged by Meta.

## Good to know

- If the function is slow, Meta sends the message again. Each message is
  answered once only.
- One number can send up to 40 messages an hour before the assistant pauses,
  to protect the AI budget.
- Photos are saved for the stylist (up to 3 per booking). Voice notes get a "text only" reply.
- If nothing happens: Netlify > Logs > Functions > whatsapp shows the reason
  (wrong token, wrong Phone number ID, expired access token).

## Follow-up templates (reminders, check-ins, running late)

A business may only message a customer first with a template that Meta has approved.
Create these three in Meta's WhatsApp Manager > Message templates, category **Utility**,
language English. The names must match `followups.templates` in `businesses.mjs`.
Meta may move the check-in to the Marketing category because of the review link; it
still works, it just costs a little more.

| Name | Body | Quick-reply buttons |
|---|---|---|
| `booking_reminder` | Hi {{1}}, a reminder of your {{2}} on {{3}} at {{4}}. See you soon! | Need to change |
| `visit_checkin` | Hi {{1}}, thank you for visiting {{2}} for your {{3}}. How was everything? {{4}} | All good · Something wasn't right |
| `running_late` | Hi {{1}}, sorry, we're running about {{2}} minutes late for your {{3}} at {{4}}. Reply here if you'd like a different time. | (none) |

Keep the buttons in that order: the code relies on it. For an Arabic version, create the same
templates in Arabic and set `language: "ar"`.

Who gets them:
- Customers who booked on WhatsApp, or ticked "Send me a reminder and a follow-up on
  WhatsApp" in the website booking form. Website bookings without the tick get nothing.
- Never anyone who replied STOP.
- Each message is sent once per booking. Reminders go `reminderHours` before the visit (not for
  bookings made in the last 2 hours); check-ins go `checkinAfterHours` after it ends.
  Set either to 0 to turn it off.

Cost: Meta charges for each template message (they are business-initiated). Replies to
customers who message first stay free.

The hourly job runs on its own once deployed (Netlify > Logs > Functions > followups).
Scheduled functions only run on the published deploy, not on deploy previews.

