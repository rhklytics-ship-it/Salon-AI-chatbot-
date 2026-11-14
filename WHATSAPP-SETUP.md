# WhatsApp add-on (optional)

Lets customers chat with the same AI assistant and book on WhatsApp. It uses the
same booking calendar as the website, so a time can never be booked twice.

It is switched off until the five settings below are added on Netlify. A client
who only wants the website option needs none of this.

## Files in this add-on

    netlify/functions/whatsapp.mjs    the address Meta sends messages to (/api/whatsapp)
    netlify/whatsapp/flow.mjs         the conversation: questions, time list, name, booking
    netlify/whatsapp/meta.mjs         sending messages through Meta
    netlify/whatsapp/state.mjs        remembers each conversation

    public/admin.html                 bookings screen, now labels WhatsApp bookings
    public/bookings-export.js         Excel download, now labels WhatsApp bookings

To add it to a client's project: copy these into the project (same folders) and push.
To remove it: delete the `netlify/whatsapp` folder and `netlify/functions/whatsapp.mjs`.
The two `public` files work the same with or without WhatsApp.

## What the customer sees

1. They message the business number. The AI answers in English or Arabic.
2. When they ask to book, they get a "Choose a time" button with the free times.
3. They tap a time, then tap their name (or type another).
4. They get a confirmation with a reference. The booking shows on the bookings
   screen and in the Excel download like any other, labelled "WhatsApp".

Their mobile number is taken from WhatsApp, so they are never asked for it.

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
- Voice notes and photos get a "text only" reply.
- If nothing happens: Netlify > Logs > Functions > whatsapp shows the reason
  (wrong token, wrong Phone number ID, expired access token).
