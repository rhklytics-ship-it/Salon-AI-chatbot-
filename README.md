# RHKLytics AI booking assistant: Glow Studio demo

A demo salon website with a working AI chat assistant that answers questions
and books appointments from a live calendar. The AI only offers times that are
really free, the customer taps a time to book, and the same time can never be
booked twice. The salon manages bookings on a password-protected screen.

## What's inside

| File | What it does |
|---|---|
| `public/index.html` | The demo salon website (Glow Studio, fictional) |
| `public/widget.js` | The chat widget. One script tag adds it to any website |
| `netlify/functions/chat.mjs` | Server code that talks to the AI. Keeps the API key secret. Gives the AI a tool to check the calendar |
| `netlify/functions/book.mjs` | Books the time a customer taps (no AI involved), and refuses taken times |
| `netlify/functions/admin.mjs` + `public/admin.html` | The salon's bookings screen at `/admin.html` |
| `netlify/booking/` | Calendar rules (`calendar.mjs`) and booking storage on Netlify Blobs (`store.mjs`) |
| `netlify/businesses.mjs` | **Every business profile** (Glow Studio, Core Pilates and your prospects). Each one gets its own demo page |
| `netlify/functions/profile.mjs` | Sends a business's public details to its demo page |
| `public/demo.html` | The demo page used for every business at `/demo/<key>` |
| `netlify.toml` | Tells Netlify where everything is |

## Deploy (one time)

Drag-and-drop deploys do not run server code, so this project deploys from GitHub.

1. **Get an API key.** Sign in at console.anthropic.com, add billing, and create an
   API key. Set a monthly spending limit in the Console so costs can never run away.
2. **Put the project on GitHub.** Create a new private repository (for example
   `rhklytics-chatbot-demo`) and upload the contents of this folder.
3. **Connect Netlify.** In Netlify: Add new project → Import an existing project →
   GitHub → choose the repository. Leave the build settings as they are and deploy.
4. **Add the key.** Project configuration → Environment variables → Add a variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your API key
   Then go to Deploys → Trigger deploy → Deploy project.
5. **Set the bookings password.** Add a second variable:
   - Key: `BOOKINGS_ADMIN_KEY`
   - Value: a password of at least 8 characters, for the salon's bookings screen
   Deploy again. Bookings are stored in Netlify Blobs, which is free and needs no setup.
6. **Rename the project** (Project configuration → Change project name), for example
   `glowstudio-demo`, so the link is glowstudio-demo.netlify.app.

## Test it

Open the site and try:
- "How much is a gel manicure?"
- "Are you open on Friday morning?"
- "I'd like a facial on Saturday"  (free times appear as buttons; tap one, enter a name
  and mobile, and confirm)
- Book the same time again in a second browser: once every stylist is busy, it says the
  time was just taken and shows the times still free
- Open `/admin.html`, enter the bookings password, and see, cancel or add bookings
- "Do you do massages?"  (it should say no and offer WhatsApp)

## Make a demo for a prospect (about 20 minutes)

1. Open `netlify/businesses.mjs`, copy the TEMPLATE block at the bottom and paste it above it.
2. Give it a short key, e.g. `"luxe-nails-jlt"`, and fill in their name, area, colour,
   services, prices, hours and policies from their website, Instagram or Google listing.
3. Keep `prospect: true`. The page then says clearly that it is a demo made by RHKLytics,
   not their official website, and the bot tells visitors that bookings are not sent.
4. Commit and push. Netlify redeploys in about a minute.
5. Send the owner the link: `https://YOUR-SITE.netlify.app/demo/luxe-nails-jlt`

Demo pages are hidden from Google. Remove a prospect's entry once they say no, or once
they become a client and get their own project.

Samples already included: `/demo/glow-studio` and `/demo/core-pilates` (both fictional).
The home page (`/`) is still the full Glow Studio website.

## Set it up for a real client

1. Copy their profile into a new project's `netlify/businesses.mjs`, and change
   `DEFAULT_BUSINESS` in `chat.mjs` to their key.
2. Change the `data-` settings on the `<script src="/widget.js">` tag: business key, name, colour,
   greeting, quick-reply buttons and WhatsApp number.
3. Deploy as a new Netlify project, using the client's own API key or yours,
   built into your monthly fee.
4. To add the chat to the client's existing website, give them this one line to
   paste before `</body>` (change the address to the new project):

```html
<script src="https://CLIENT-PROJECT.netlify.app/widget.js"
        data-business="client-key"
        data-name="Client Name" data-color="#0F7C78"
        data-greeting="Hi! How can I help?"
        data-whatsapp="9715XXXXXXXX"></script>
```

Next upgrades to build: WhatsApp or email confirmations to the customer and the
salon, and allowing the widget's chat and booking calls from the client's own
website address (CORS) when it is embedded there.

## How booking works

1. The customer asks to book. The AI asks for the service and day, then checks the
   calendar with its `check_availability` tool. It can't offer a time the calendar
   doesn't show as free.
2. Free times appear as buttons in the chat. The customer taps one and enters their
   name and mobile.
3. `book.mjs` claims every 15-minute block of that service for one stylist, using
   "write only if new" storage. If another customer got there first, nothing is booked
   and the customer sees the times still free.
4. The salon sees bookings at `/admin.html`. Cancelling frees the time immediately.
   Phone and walk-in bookings added there block the calendar too.

Each business's calendar is set in `netlify/businesses.mjs` under `booking`:
- `staff`: how many clients can be served at once (stylists, chairs or rooms)
- `slotMinutes`: start times every 15 (or 30) minutes
- `leadMinutes`: how much notice same-day bookings need
- `daysAhead`: how far ahead customers can book
- `schedule`: opening times per weekday (`null` for closed)
- Each service's `duration` sets how long it blocks the calendar

A phone number can make at most 2 bookings per day (`MAX_PER_PHONE_PER_DAY` in
`book.mjs`), to stop spam.

## Settings you can change

- `CLAUDE_MODEL` environment variable: which AI model to use. Defaults to
  `claude-haiku-5-5`, the fastest and cheapest, which is plenty for a receptionist bot.
- In `chat.mjs`: `MAX_MESSAGES` (conversation length) and `MAX_CHARS` (longest
  message a visitor can send). These keep costs predictable.
