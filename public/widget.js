/*
  RHKLytics chat widget (English + Arabic)
  Add to any website with one line before </body>:
  <script src="https://YOUR-SITE.netlify.app/widget.js"
          data-business="glow-studio"
          data-name="Glow Studio" data-color="#B8466B"
          data-greeting="Hi! I can help with prices, opening hours and bookings."
          data-greeting-ar="أهلًا! يمكنني مساعدتك في الأسعار ومواعيد العمل والحجز."
          data-chips="See prices|Book an appointment" data-chips-ar="الأسعار|حجز موعد"
          data-lang="auto"
          data-whatsapp="971500000000"></script>
  data-lang: "en", "ar", or "auto" (Arabic if the visitor's browser is Arabic).
  The chat also switches to Arabic when a visitor writes in Arabic, and has an
  English / عربي switch in its header. Pages can call window.RKChat.setLang("ar").
*/
(function () {
  const script = document.currentScript;
  const ds = script?.dataset || {};
  const cfg = {
    name: ds.name || "Assistant",
    business: ds.business || "",
    color: ds.color || "#0F7C78",
    greeting: { en: ds.greeting || "Hi! How can I help you today?", ar: ds.greetingAr || "أهلًا! كيف يمكنني مساعدتك اليوم؟" },
    chips: {
      en: (ds.chips || "See prices|Book an appointment|Opening hours").split("|").filter(Boolean),
      ar: (ds.chipsAr || "الأسعار|حجز موعد|مواعيد العمل").split("|").filter(Boolean),
    },
    whatsapp: (ds.whatsapp || "").replace(/\D/g, ""),
    endpoint: ds.endpoint || new URL("/api/chat", script?.src || location.href).href,
    bookEndpoint: new URL("/api/book", script?.src || location.href).href,
  };

  const T = {
    en: {
      online: "Online, replies instantly", placeholder: "Type your message...", send: "Send", close: "Close chat",
      open: "Open chat with ", chatWith: "Chat with ", yourMsg: "Your message", switchTo: "عربي", switchLabel: "Switch to Arabic",
      freeTimes: "Free times", showAll: "Show all {n} times", bookAt: "Book {time} on {date}",
      name: "Your name", phone: "Mobile number", confirm: "Confirm booking", booking: "Booking...",
      confirmed: "Booking confirmed", demoSaved: "Demo booking saved",
      fService: "Service", fDate: "Date", fTime: "Time", fName: "Name", fMobile: "Mobile", fRef: "Ref",
      done: "You're booked for {service} on {date} at {time}. Your reference is {ref}. Anything else I can help with?",
      wrong: "Something went wrong. Please try again.",
      noBook: "Can't reach the booking system. Check your connection and try again.",
      noChat: "Can't reach the assistant. Check your connection and try again.",
      person: "Prefer a person?", whatsapp: "Message us on WhatsApp", ai: "AI assistant",
    },
    ar: {
      online: "متصل، يرد فورًا", placeholder: "اكتب رسالتك...", send: "إرسال", close: "إغلاق المحادثة",
      open: "فتح المحادثة مع ", chatWith: "محادثة مع ", yourMsg: "رسالتك", switchTo: "English", switchLabel: "التبديل إلى الإنجليزية",
      freeTimes: "الأوقات المتاحة", showAll: "عرض كل الأوقات ({n})", bookAt: "حجز {time} يوم {date}",
      name: "الاسم", phone: "رقم الجوال", confirm: "تأكيد الحجز", booking: "جارٍ الحجز...",
      confirmed: "تم تأكيد الحجز", demoSaved: "تم حفظ الحجز التجريبي",
      fService: "الخدمة", fDate: "التاريخ", fTime: "الوقت", fName: "الاسم", fMobile: "الجوال", fRef: "رقم الحجز",
      done: "تم الحجز: {service} يوم {date} الساعة {time}. رقم الحجز {ref}. هل يمكنني مساعدتك في شيء آخر؟",
      wrong: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
      noBook: "تعذّر الوصول إلى نظام الحجز. تحقق من الاتصال وحاول مرة أخرى.",
      noChat: "تعذّر الوصول إلى المساعد. تحقق من الاتصال وحاول مرة أخرى.",
      person: "تفضّل التحدث مع شخص؟", whatsapp: "راسلنا على واتساب", ai: "مساعد ذكي",
    },
  };
  let lang = ds.lang === "ar" || ds.lang === "en" ? ds.lang
    : (ds.lang === "auto" && (navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en");
  const tr = (k, v = {}) => (T[lang][k] || T.en[k]).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
  const hasArabic = (s) => /[؀-ۿ]/.test(s);

  const css = `
  .rk-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;
    background:${cfg.color};color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);display:grid;place-items:center}
  .rk-launch svg{width:28px;height:28px}
  .rk-launch:focus-visible,.rk-panel button:focus-visible,.rk-panel input:focus-visible{outline:3px solid #F4B33E;outline-offset:2px}
  .rk-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:370px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);
    background:#fff;color:#1d2430;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;
    font:15px/1.5 system-ui,-apple-system,"Segoe UI",Tahoma,"Noto Sans Arabic",Roboto,sans-serif}
  .rk-panel.rk-open{display:flex}
  .rk-head{background:${cfg.color};color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
  .rk-head strong{display:block;font-size:16px}.rk-head span{font-size:12px;opacity:.9}
  .rk-dot{width:9px;height:9px;border-radius:50%;background:#5BE38B;display:inline-block;margin-inline-end:6px}
  .rk-lang{margin-inline-start:auto;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.55);color:#fff;border-radius:999px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer}
  .rk-close{background:transparent;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}
  .rk-log{flex:1;overflow-y:auto;padding:16px 12px;background:#F3F1EF;display:flex;flex-direction:column;gap:8px}
  .rk-msg{max-width:84%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;unicode-bidi:plaintext;text-align:start}
  .rk-bot{align-self:flex-start;background:#fff;border-end-start-radius:4px}
  .rk-user{align-self:flex-end;background:${cfg.color};color:#fff;border-end-end-radius:4px}
  .rk-err{align-self:center;background:#FDECEC;color:#8A1C1C;font-size:13px}
  .rk-card{align-self:flex-start;background:#fff;border-inline-start:4px solid ${cfg.color};border-radius:12px;padding:12px 14px;max-width:88%}
  .rk-card b{display:block;margin-bottom:4px}
  .rk-card dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;font-size:14px}
  .rk-card dt{color:#6B7380}.rk-card dd{margin:0;unicode-bidi:plaintext}
  .rk-slots{align-self:stretch;background:#fff;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
  .rk-slots b{font-size:14px}
  .rk-times{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .rk-times button,.rk-more{border:1px solid ${cfg.color};color:${cfg.color};background:#fff;border-radius:10px;padding:8px 4px;font:inherit;font-size:13px;cursor:pointer;min-height:40px}
  .rk-times button[aria-pressed="true"]{background:${cfg.color};color:#fff}
  .rk-more{border-style:dashed}
  .rk-book[hidden]{display:none}
  .rk-book{display:flex;flex-direction:column;gap:8px;border-top:1px solid #EEE;padding-top:10px}
  .rk-book label{font-size:12px;color:#6B7380;display:flex;flex-direction:column;gap:3px}
  .rk-book input{border:1px solid #D9D4CF;border-radius:10px;padding:9px 12px;font:inherit}
  .rk-book input[type=tel]{direction:ltr;text-align:start}
  .rk-panel[dir=rtl] .rk-book input[type=tel]{text-align:right}
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
  .rk-form input{flex:1;border:1px solid #D9D4CF;border-radius:999px;padding:10px 14px;font:inherit;min-width:0;unicode-bidi:plaintext}
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
  launch.setAttribute("aria-expanded", "false");
  launch.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.5 1.2 4.7 3.2 6.3L4.5 21l3.6-1.8c1.2.4 2.5.6 3.9.6 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z"/></svg>';

  const panel = document.createElement("div");
  panel.className = "rk-panel";
  panel.setAttribute("role", "dialog");
  panel.innerHTML = `
    <div class="rk-head">
      <div><strong></strong><span><i class="rk-dot"></i><span class="rk-online"></span></span></div>
      <button class="rk-lang" type="button"></button>
      <button class="rk-close" type="button">&times;</button>
    </div>
    <div class="rk-log" aria-live="polite"></div>
    <div class="rk-chips"></div>
    <form class="rk-form">
      <input name="q" autocomplete="off" maxlength="800">
      <button type="submit"></button>
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
  const langBtn = panel.querySelector(".rk-lang");

  const history = [];
  const booked = [];   // { ref, date } of bookings made in this chat, sent so the server can verify them
  let busy = false;
  let greetEl = null;

  function add(cls, text) {
    const el = document.createElement("div");
    el.className = "rk-msg " + cls;
    el.setAttribute("dir", "auto");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  const locale = () => (lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB");
  function niceDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return s;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.toLocaleDateString(locale(), { weekday: lang === "ar" ? "long" : "short", day: "numeric", month: lang === "ar" ? "long" : "short", timeZone: "UTC" });
  }
  function niceTime(s) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return s;
    const h = +m[1], hh = (h % 12 || 12) + ":" + m[2];
    if (lang === "ar") return hh + (h < 12 ? " ص" : " م");
    return hh + (h < 12 ? " am" : " pm");
  }
  const svcName = (en, ar) => (lang === "ar" && ar) || en;

  function applyLang() {
    panel.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    panel.setAttribute("lang", lang);
    panel.setAttribute("aria-label", tr("chatWith") + cfg.name);
    launch.setAttribute("aria-label", tr("open") + cfg.name);
    panel.querySelector(".rk-online").textContent = tr("online");
    panel.querySelector(".rk-close").setAttribute("aria-label", tr("close"));
    langBtn.textContent = tr("switchTo");
    langBtn.setAttribute("aria-label", tr("switchLabel"));
    langBtn.setAttribute("lang", lang === "ar" ? "en" : "ar");
    input.placeholder = tr("placeholder");
    input.setAttribute("aria-label", tr("yourMsg"));
    sendBtn.textContent = tr("send");
    foot.textContent = "";
    if (cfg.whatsapp) {
      foot.append(tr("person") + " ");
      const a = document.createElement("a");
      a.target = "_blank"; a.rel = "noopener"; a.href = "https://wa.me/" + cfg.whatsapp; a.textContent = tr("whatsapp");
      foot.appendChild(a);
    } else foot.textContent = tr("ai");
    if (greetEl && !history.length) greetEl.textContent = cfg.greeting[lang];
    chips.innerHTML = "";
    cfg.chips[lang].forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = c;
      b.addEventListener("click", () => send(c));
      chips.appendChild(b);
    });
  }
  function setLang(l, tell = true) {
    l = l === "ar" ? "ar" : "en";
    if (l === lang && panel.getAttribute("dir")) return;
    lang = l; applyLang();
    if (tell) window.dispatchEvent(new CustomEvent("rk-lang", { detail: lang }));
  }

  function bookingCard(b, demo) {
    const card = document.createElement("div");
    card.className = "rk-card";
    const title = document.createElement("b");
    title.textContent = demo ? tr("demoSaved") : tr("confirmed");
    const dl = document.createElement("dl");
    [[tr("fService"), svcName(b.service, b.serviceAr)], [tr("fDate"), niceDate(b.date)], [tr("fTime"), niceTime(b.time)],
     [tr("fName"), b.name], [tr("fMobile"), b.phone], [tr("fRef"), b.ref]].forEach(([k, v]) => {
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
    head.textContent = svcName(sl.service, sl.serviceAr) + " · " + niceDate(sl.date);
    const grid = document.createElement("div");
    grid.className = "rk-times";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", tr("freeTimes"));
    const SHOW = 12;
    let picked = null;
    const buttons = [];
    function addTime(t) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = niceTime(t); b.setAttribute("aria-pressed", "false"); b.setAttribute("dir", "ltr");
      b.addEventListener("click", () => {
        picked = t;
        buttons.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        bform.hidden = false;
        title.textContent = tr("bookAt", { time: niceTime(t), date: niceDate(sl.date) });
        nameIn.focus();
      });
      buttons.push(b); grid.appendChild(b);
    }
    sl.times.slice(0, SHOW).forEach(addTime);
    box.append(head, grid);
    if (sl.times.length > SHOW) {
      const more = document.createElement("button");
      more.type = "button"; more.className = "rk-more"; more.textContent = tr("showAll", { n: sl.times.length });
      more.addEventListener("click", () => { sl.times.slice(SHOW).forEach(addTime); more.remove(); });
      box.appendChild(more);
    }

    const bform = document.createElement("form");
    bform.className = "rk-book"; bform.hidden = true;
    bform.innerHTML = '<b></b><label><span></span><input name="name" autocomplete="name" maxlength="60" required></label>' +
      '<label><span></span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="05X XXX XXXX" required></label>' +
      '<small role="alert"></small><button class="rk-go" type="submit"></button>';
    const labels = bform.querySelectorAll("label span");
    labels[0].textContent = tr("name"); labels[1].textContent = tr("phone");
    const title = bform.querySelector("b");
    const nameIn = bform.querySelector('[name="name"]');
    const phoneIn = bform.querySelector('[name="phone"]');
    const msg = bform.querySelector("small");
    const go = bform.querySelector(".rk-go");
    go.textContent = tr("confirm");
    bform.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!picked) return;
      msg.textContent = ""; go.disabled = true; go.textContent = tr("booking");
      try {
        const res = await fetch(cfg.bookEndpoint, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ business: cfg.business || undefined, service: sl.service, date: sl.date, time: picked,
            name: nameIn.value, phone: phoneIn.value, lang }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.booking) {
          box.remove();
          const b = data.booking;
          bookingCard(b, data.demo);
          booked.push({ ref: b.ref, date: b.date });
          const done = tr("done", { service: svcName(b.service, b.serviceAr), date: niceDate(b.date), time: niceTime(b.time), ref: b.ref });
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
        msg.textContent = data.error || tr("wrong");
      } catch {
        msg.textContent = tr("noBook");
      }
      go.disabled = false; go.textContent = tr("confirm");
    });
    box.appendChild(bform);
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    if (hasArabic(text) && lang !== "ar") setLang("ar");
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
        body: JSON.stringify({ messages: history, business: cfg.business || undefined, bookings: booked, lang }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || !data.reply) {
        history.pop();
        add("rk-err", data.error || tr("wrong"));
      } else {
        add("rk-bot", data.reply);
        history.push({ role: "assistant", content: data.reply });
        if (data.slots && data.slots.times && data.slots.times.length) slotPicker(data.slots);
      }
    } catch {
      typing.remove();
      history.pop();
      add("rk-err", tr("noChat"));
    }
    busy = false; sendBtn.disabled = false; input.focus();
  }

  greetEl = add("rk-bot", cfg.greeting[lang]);
  applyLang();

  function toggle(open) {
    panel.classList.toggle("rk-open", open);
    launch.setAttribute("aria-expanded", String(open));
    if (open) input.focus(); else launch.focus();
  }
  launch.addEventListener("click", () => toggle(!panel.classList.contains("rk-open")));
  panel.querySelector(".rk-close").addEventListener("click", () => toggle(false));
  panel.addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
  langBtn.addEventListener("click", () => setLang(lang === "ar" ? "en" : "ar"));
  form.addEventListener("submit", e => { e.preventDefault(); const t = input.value; input.value = ""; send(t); });
  window.addEventListener("rk-setlang", e => setLang(e.detail, false));
  window.RKChat = { setLang: (l) => setLang(l), get lang() { return lang; } };

  // Auto-open on larger screens only, so phones see the page first.
  if (ds.open === "true" && window.matchMedia("(min-width: 700px)").matches) {
    panel.classList.add("rk-open");
    launch.setAttribute("aria-expanded", "true");
  }
})();
