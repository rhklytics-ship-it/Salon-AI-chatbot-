/*
  RHKLytics chat widget
  Add to any website with one line before </body>:
  <script src="https://YOUR-SITE.netlify.app/widget.js"
          data-business="glow-studio"
          data-name="Glow Studio" data-color="#B8466B"
          data-greeting="Hi! I can help with prices, opening hours and bookings."
          data-whatsapp="971500000000"></script>
*/
(function () {
  const script = document.currentScript;
  const cfg = {
    name: script?.dataset.name || "Assistant",
    business: script?.dataset.business || "",
    color: script?.dataset.color || "#0F7C78",
    greeting: script?.dataset.greeting || "Hi! How can I help you today?",
    whatsapp: (script?.dataset.whatsapp || "").replace(/\D/g, ""),
    endpoint: script?.dataset.endpoint || new URL("/api/chat", script?.src || location.href).href,
    bookEndpoint: new URL("/api/book", script?.src || location.href).href,
    chips: (script?.dataset.chips || "See prices|Book an appointment|Opening hours").split("|").filter(Boolean),
  };

  const css = `
  .rk-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;
    background:${cfg.color};color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);display:grid;place-items:center}
  .rk-launch svg{width:28px;height:28px}
  .rk-launch:focus-visible,.rk-panel button:focus-visible,.rk-panel input:focus-visible{outline:3px solid #F4B33E;outline-offset:2px}
  .rk-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:370px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);
    background:#fff;color:#1d2430;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;
    font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .rk-panel.rk-open{display:flex}
  .rk-head{background:${cfg.color};color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}
  .rk-head strong{display:block;font-size:16px}.rk-head span{font-size:12px;opacity:.9}
  .rk-dot{width:9px;height:9px;border-radius:50%;background:#5BE38B;display:inline-block;margin-right:6px}
  .rk-close{margin-left:auto;background:transparent;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}
  .rk-log{flex:1;overflow-y:auto;padding:16px 12px;background:#F3F1EF;display:flex;flex-direction:column;gap:8px}
  .rk-msg{max-width:84%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}
  .rk-bot{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}
  .rk-user{align-self:flex-end;background:${cfg.color};color:#fff;border-bottom-right-radius:4px}
  .rk-err{align-self:center;background:#FDECEC;color:#8A1C1C;font-size:13px}
  .rk-card{align-self:flex-start;background:#fff;border-left:4px solid ${cfg.color};border-radius:12px;padding:12px 14px;max-width:88%}
  .rk-card b{display:block;margin-bottom:4px}
  .rk-card dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;font-size:14px}
  .rk-card dt{color:#6B7380}.rk-card dd{margin:0}
  .rk-slots{align-self:stretch;background:#fff;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
  .rk-slots b{font-size:14px}
  .rk-times{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .rk-times button,.rk-more{border:1px solid ${cfg.color};color:${cfg.color};background:#fff;border-radius:10px;padding:8px 4px;font:inherit;font-size:13px;cursor:pointer;min-height:40px}
  .rk-times button[aria-pressed="true"]{background:${cfg.color};color:#fff}
  .rk-times button:disabled{opacity:.45;cursor:default}
  .rk-more{border-style:dashed}
  .rk-book[hidden]{display:none}
  .rk-book{display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEE;padding-top:10px}
  .rk-book label{font-size:12px;color:#6B7380;display:flex;flex-direction:column;gap:3px}
  .rk-book input{border:1px solid #D9D4CF;border-radius:10px;padding:9px 12px;font:inherit}
  .rk-book .rk-go{border:0;background:${cfg.color};color:#fff;border-radius:999px;padding:11px;font:inherit;font-weight:600;cursor:pointer}
  .rk-book .rk-go:disabled{opacity:.5;cursor:default}
  .rk-book small{color:#8A1C1C;font-size:12px}
  .rk-typing{align-self:flex-start;background:#fff;border-radius:14px;padding:12px 14px;display:flex;gap:4px}
  .rk-typing i{width:7px;height:7px;border-radius:50%;background:#9AA1AB;animation:rk-b 1s infinite}
  .rk-typing i:nth-child(2){animation-delay:.15s}.rk-typing i:nth-child(3){animation-delay:.3s}
  @keyframes rk-b{0%,80%,100%{opacity:.25}40%{opacity:1}}
  .rk-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 10px;background:#F3F1EF}
  .rk-chips[hidden]{display:none}
  .rk-chips button{border:1px solid ${cfg.color};color:${cfg.color};background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
  .rk-form{display:flex;gap:8px;padding:10px;border-top:1px solid #E6E2DE;background:#fff}
  .rk-form input{flex:1;border:1px solid #D9D4CF;border-radius:999px;padding:10px 14px;font:inherit;min-width:0}
  .rk-form button{border:0;background:${cfg.color};color:#fff;border-radius:999px;padding:0 16px;font:inherit;font-weight:600;cursor:pointer}
  .rk-form button:disabled{opacity:.5;cursor:default}
  .rk-foot{font-size:11px;color:#8A9099;text-align:center;padding:0 10px 8px;background:#fff}
  .rk-foot a{color:inherit}
  @media (prefers-reduced-motion:reduce){.rk-typing i{animation:none}}
  @media (max-width:480px){.rk-panel{right:8px;left:8px;width:auto;max-width:none;bottom:84px;height:calc(100vh - 100px)}}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const launch = document.createElement("button");
  launch.className = "rk-launch";
  launch.setAttribute("aria-label", "Open chat with " + cfg.name);
  launch.setAttribute("aria-expanded", "false");
  launch.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.5 1.2 4.7 3.2 6.3L4.5 21l3.6-1.8c1.2.4 2.5.6 3.9.6 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z"/></svg>';

  const panel = document.createElement("div");
  panel.className = "rk-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with " + cfg.name);
  panel.innerHTML = `
    <div class="rk-head">
      <div><strong></strong><span><i class="rk-dot"></i>Online, replies instantly</span></div>
      <button class="rk-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="rk-log" aria-live="polite"></div>
    <div class="rk-chips"></div>
    <form class="rk-form">
      <input name="q" autocomplete="off" maxlength="800" placeholder="Type your message..." aria-label="Your message">
      <button type="submit">Send</button>
    </form>
    <div class="rk-foot"></div>`;
  panel.querySelector(".rk-head strong").textContent = cfg.name;
  document.body.append(launch, panel);

  const log = panel.querySelector(".rk-log");
  const chips = panel.querySelector(".rk-chips");
  const form = panel.querySelector(".rk-form");
  const input = form.querySelector("input");
  const sendBtn = form.querySelector("button");
  const foot = panel.querySelector(".rk-foot");
  foot.innerHTML = cfg.whatsapp
    ? `Prefer a person? <a target="_blank" rel="noopener" href="https://wa.me/${cfg.whatsapp}">Message us on WhatsApp</a>`
    : "AI assistant";

  const history = [];
  const booked = [];   // { ref, date } of bookings made in this chat, sent so the server can verify them
  let busy = false;

  function add(cls, text) {
    const el = document.createElement("div");
    el.className = "rk-msg " + cls;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function niceDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return s;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }
  function niceTime(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return s;
    const h = +m[1];
    return (h % 12 || 12) + ":" + m[2] + (h < 12 ? " am" : " pm");
  }

  function bookingCard(b, demo) {
    const card = document.createElement("div");
    card.className = "rk-card";
    const title = document.createElement("b");
    title.textContent = demo ? "Demo booking saved" : "Booking confirmed";
    const dl = document.createElement("dl");
    [["Service", b.service], ["Date", niceDate(b.date)], ["Time", niceTime(b.time)], ["Name", b.name], ["Mobile", b.phone], ["Ref", b.ref]].forEach(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.append(dt, dd);
    });
    card.append(title, dl);
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
  }

  // Free times as buttons; tapping one opens a short name + mobile form.
  function slotPicker(sl) {
    const box = document.createElement("div");
    box.className = "rk-slots";
    const head = document.createElement("b");
    head.textContent = sl.service + " · " + niceDate(sl.date);
    const grid = document.createElement("div");
    grid.className = "rk-times";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Free times");
    const SHOW = 12;
    let picked = null;
    const buttons = [];
    function addTime(t) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = niceTime(t); b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        picked = t;
        buttons.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        form.hidden = false;
        title.textContent = "Book " + niceTime(t) + " on " + niceDate(sl.date);
        nameIn.focus();
      });
      buttons.push(b); grid.appendChild(b);
    }
    sl.times.slice(0, SHOW).forEach(addTime);
    box.append(head, grid);
    if (sl.times.length > SHOW) {
      const more = document.createElement("button");
      more.type = "button"; more.className = "rk-more"; more.textContent = "Show all " + sl.times.length + " times";
      more.addEventListener("click", () => { sl.times.slice(SHOW).forEach(addTime); more.remove(); });
      box.appendChild(more);
    }

    const form = document.createElement("form");
    form.className = "rk-book"; form.hidden = true;
    form.innerHTML = '<b></b><label>Your name<input name="name" autocomplete="name" maxlength="60" required></label>' +
      '<label>Mobile number<input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="05X XXX XXXX" required></label>' +
      '<small role="alert"></small><button class="rk-go" type="submit">Confirm booking</button>';
    const title = form.querySelector("b");
    const nameIn = form.querySelector('[name="name"]');
    const phoneIn = form.querySelector('[name="phone"]');
    const msg = form.querySelector("small");
    const go = form.querySelector(".rk-go");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!picked) return;
      msg.textContent = ""; go.disabled = true; go.textContent = "Booking...";
      try {
        const res = await fetch(cfg.bookEndpoint, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ business: cfg.business || undefined, service: sl.service, date: sl.date, time: picked,
            name: nameIn.value, phone: phoneIn.value }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.booking) {
          box.remove();
          bookingCard(data.booking, data.demo);
          booked.push({ ref: data.booking.ref, date: data.booking.date });
          const done = "You're booked for " + data.booking.service + " on " + niceDate(data.booking.date) + " at " + niceTime(data.booking.time) +
            ". Your reference is " + data.booking.ref + ". Anything else I can help with?";
          history.push({ role: "assistant", content: done });
          add("rk-bot", done);
          return;
        }
        if (res.status === 409 && data.slots) {
          box.remove();
          add("rk-err", data.error);
          if (data.slots.times.length) slotPicker(data.slots);
          return;
        }
        msg.textContent = data.error || "Something went wrong. Please try again.";
      } catch {
        msg.textContent = "Can't reach the booking system. Check your connection and try again.";
      }
      go.disabled = false; go.textContent = "Confirm booking";
    });
    box.appendChild(form);
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true; chips.hidden = true;
    add("rk-user", text);
    history.push({ role: "user", content: text });

    const typing = document.createElement("div");
    typing.className = "rk-typing";
    typing.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      const res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, business: cfg.business || undefined, bookings: booked }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || !data.reply) {
        history.pop();
        add("rk-err", data.error || "Something went wrong. Please try again.");
      } else {
        add("rk-bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
        if (data.slots && data.slots.times && data.slots.times.length) slotPicker(data.slots);
      }
    } catch {
      typing.remove();
      history.pop();
      add("rk-err", "Can't reach the assistant. Check your connection and try again.");
    }
    busy = false; sendBtn.disabled = false; input.focus();
  }

  add("rk-bot", cfg.greeting);
  cfg.chips.forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = c;
    b.addEventListener("click", () => send(c));
    chips.appendChild(b);
  });

  function toggle(open) {
    panel.classList.toggle("rk-open", open);
    launch.setAttribute("aria-expanded", String(open));
    if (open) input.focus(); else launch.focus();
  }
  launch.addEventListener("click", () => toggle(!panel.classList.contains("rk-open")));
  panel.querySelector(".rk-close").addEventListener("click", () => toggle(false));
  panel.addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
  form.addEventListener("submit", e => { e.preventDefault(); const t = input.value; input.value = ""; send(t); });

  // Auto-open on larger screens only, so phones see the page first.
  if (script?.dataset.open === "true" && window.matchMedia("(min-width: 700px)").matches) {
    panel.classList.add("rk-open");
    launch.setAttribute("aria-expanded", "true");
  }
})();
