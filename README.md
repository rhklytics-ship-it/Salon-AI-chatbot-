# RHKLytics AI booking assistant: Glow Studio demo

A demo salon website with a working AI chat assistant that answers questions
and books appointments. Bookings are saved to Netlify Forms.

## What's inside

| File | What it does |
|---|---|
| `public/index.html` | The demo salon website (Glow Studio, fictional) |
| `public/widget.js` | The chat widget. One script tag adds it to any website |
| `netlify/functions/chat.mjs` | Server code that talks to the AI. Keeps the API key secret |
| `netlify/functions/business.mjs` | The salon's details: services, prices, hours, policies |
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
5. **Turn on forms.** Forms → Enable form detection, then deploy once more.
   Bookings made in the chat appear under Forms → booking.
6. **Rename the project** (Project configuration → Change project name), for example
   `glowstudio-demo`, so the link is glowstudio-demo.netlify.app.

## Test it

Open the site and try:
- "How much is a gel manicure?"
- "Are you open on Friday morning?"
- "I'd like a facial tomorrow at 3"  (then give a name and number and confirm)
- "Do you do massages?"  (it should say no and offer WhatsApp)

## Set it up for a real client

1. Edit `netlify/functions/business.mjs` with their services, prices, hours and policies.
2. Change the `data-` settings on the `<script src="/widget.js">` tag: name, colour,
   greeting, quick-reply buttons and WhatsApp number.
3. Deploy as a new Netlify project, using the client's own API key or yours,
   built into your monthly fee.
4. To add the chat to the client's existing website, give them this one line to
   paste before `</body>` (change the address to the new project):

```html
<script src="https://CLIENT-PROJECT.netlify.app/widget.js"
        data-name="Client Name" data-color="#0F7C78"
        data-greeting="Hi! How can I help?"
        data-whatsapp="9715XXXXXXXX"></script>
```

When the widget runs on another website, bookings are not saved to Netlify Forms
(that only works on the project's own pages). For those clients, send bookings to
a Google Sheet or email instead. This is the next upgrade to build.

## Settings you can change

- `CLAUDE_MODEL` environment variable: which AI model to use. Defaults to
  `claude-haiku-5-5`, the fastest and cheapest, which is plenty for a receptionist bot.
- In `chat.mjs`: `MAX_MESSAGES` (conversation length) and `MAX_CHARS` (longest
  message a visitor can send). These keep costs predictable.
