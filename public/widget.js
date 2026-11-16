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
          data-followups="true"
          data-whatsapp="971500000000"></script>
  data-followups="true" shows a tick box in the booking form to get a WhatsApp
  reminder and a follow-up after the visit (needs the WhatsApp add-on).
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
    manageEndpoint: new URL("/api/manage", script?.src || location.href).href,
    followups: ds.followups === "true",
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
      fPrice: "Price", fStylist: "Stylist", withStylist: "with {name}", payNote: "Pay in the salon.",
      notes: "Notes for your stylist (optional)", notesConsult: "What you'd like, allergies, past treatments (optional)",
      notesPh: "e.g. shoulder length, soft layers. No allergies.", photo: "Reference photo (optional)", photoBig: "That photo couldn't be read. Try another one.",
      optin: "Send me a reminder and a follow-up on WhatsApp", saved: "Notes and photo saved for your stylist.", savedNotes: "Notes saved for your stylist.",
      moveAt: "Move {ref} to {time} on {date}", moveGo: "Move booking", moving: "Moving...", movedTitle: "Booking moved",
      movedDone: "Done. You're now booked for {service} on {date} at {time}, reference {ref}. Your old booking {old} is cancelled.",
      fixAt: "Free fix: {time} on {date}",
      cancelQ: "Cancel {service} on {date} at {time} (ref {ref})?", cancelPhone: "Mobile number you booked with",
      cancelGo: "Cancel booking", cancelling: "Cancelling...", keep: "Keep it", kept: "No problem, your booking stays as it is.",
      cancelledTitle: "Booking cancelled",
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
      fPrice: "السعر", fStylist: "المصففة", withStylist: "مع {name}", payNote: "الدفع في الصالون.",
      notes: "ملاحظات للمصففة (اختياري)", notesConsult: "ما الذي تريدينه، الحساسية، العلاجات السابقة (اختياري)",
      notesPh: "مثال: حتى الكتف، طبقات خفيفة. لا توجد حساسية.", photo: "صورة مرجعية (اختياري)", photoBig: "تعذّرت قراءة الصورة. جرّبي صورة أخرى.",
      optin: "أرسلوا لي تذكيرًا ومتابعة على واتساب", saved: "تم حفظ الملاحظات والصورة للمصففة.", savedNotes: "تم حفظ الملاحظات للمصففة.",
      moveAt: "نقل {ref} إلى {time} يوم {date}", moveGo: "نقل الحجز", moving: "جارٍ النقل...", movedTitle: "تم نقل الحجز",
      movedDone: "تم. حجزك الآن: {service} يوم {date} الساعة {time}، رقم الحجز {ref}. تم إلغاء حجزك السابق {old}.",
      fixAt: "إصلاح مجاني: {time} يوم {date}",
      cancelQ: "إلغاء {service} يوم {date} الساعة {time} (رقم {ref})؟", cancelPhone: "رقم الجوال المستخدم في الحجز",
      cancelGo: "إلغاء الحجز", cancelling: "جارٍ الإلغاء...", keep: "الإبقاء عليه", kept: "لا مشكلة، حجزك باقٍ كما هو.",
      cancelledTitle: "تم إلغاء الحجز",
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
  .rk-launch:focus-visible,.rk-panel button:focus-visible,.rk-panel input:focus-visible,.rk-panel textarea:focus-visible{outline:3px solid #F4B33E;outline-offset:2px}
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
  .rk-book [hidden]{display:none!important}
  .rk-book textarea{border:1px solid #D9D4CF;border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;resize:vertical;min-height:58px;unicode-bidi:plaintext}
  .rk-book input[type=file]{border:0;padding:0;font-size:13px}
  .rk-book .rk-tick{flex-direction:row;align-items:center;gap:8px;font-size:13px;color:#1d2430}
  .rk-book .rk-tick input{width:18px;height:18px;margin:0}
  .rk-sub{font-size:13px;color:#6B7380;font-weight:400}
  .rk-acts{display:flex;gap:8px;flex-wrap:wrap}
  .rk-acts .rk-keep{border:1px solid #D9D4CF;background:#fff;color:#1d2430;border-radius:999px;padding:10px 14px;font:inherit;cursor:pointer}
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
  const booked = [];   // { ref, date, phone } of bookings made in this chat; only ref + date are sent to the server
  let activePicker = null;   // only one set of time buttons at a time, so old offers don't linger
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

  function bookingCard(b, demo, titleKey) {
    const card = document.createElement("div");
    card.className = "rk-card";
    const title = document.createElement("b");
    title.textContent = titleKey ? tr(titleKey) : demo ? tr("demoSaved") : tr("confirmed");
    const dl = document.createElement("dl");
    const rows = [[tr("fService"), svcName(b.service, b.serviceAr)], [tr("fDate"), niceDate(b.date)], [tr("fTime"), niceTime(b.time)]];
    if (b.stylist) rows.push([tr("fStylist"), b.stylist]);
    if (b.price) rows.push([tr("fPrice"), b.price]);
    if (b.name) rows.push([tr("fName"), b.name]);
    if (b.phone) rows.push([tr("fMobile"), b.phone]);
    rows.push([tr("fRef"), b.ref]);
    rows.forEach(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      dl.append(dt, dd);
    });
    card.append(title, dl);
    if (b.photos || b.notes) {
      const p = document.createElement("p"); p.className = "rk-sub"; p.style.margin = "8px 0 0";
      p.textContent = b.photos ? tr("saved") : tr("savedNotes");
      card.appendChild(p);
    }
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
  }

  // Shrinks a photo in the browser (longest side 1280 px, JPEG) so it uploads quickly.
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("type"));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("read")); };
      img.src = url;
    });
  }

  const knownPhone = (ref) => (booked.find(x => x.ref === ref) || booked[booked.length - 1] || {}).phone || "";

  // Free times as buttons; tapping one opens a short form.
  // sl.replaces = moving an existing booking (only the mobile number is asked).
  // sl.redoOf = a free fix for an earlier booking.
  function slotPicker(sl) {
    if (activePicker) activePicker.remove();   // a new offer replaces the old one
    const box = document.createElement("div");
    box.className = "rk-slots";
    activePicker = box;
    const head = document.createElement("b");
    head.textContent = svcName(sl.service, sl.serviceAr) + " · " + niceDate(sl.date);
    const sub = document.createElement("span");
    sub.className = "rk-sub";
    sub.textContent = [sl.stylist ? tr("withStylist", { name: sl.stylist }) : "", sl.price || ""].filter(Boolean).join(" · ");
    if (sub.textContent) { head.append(" "); head.appendChild(sub); }
    const grid = document.createElement("div");
    grid.className = "rk-times";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", tr("freeTimes"));
    const SHOW = 12;
    let picked = null;
    const buttons = [];
    const moving = !!sl.replaces;
    function addTime(t) {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = niceTime(t); b.setAttribute("aria-pressed", "false"); b.setAttribute("dir", "ltr");
      b.addEventListener("click", () => {
        picked = t;
        buttons.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        bform.hidden = false;
        const v = { time: niceTime(t), date: niceDate(sl.date), ref: sl.replaces };
        title.textContent = moving ? tr("moveAt", v) : sl.redoOf ? tr("fixAt", v) : tr("bookAt", v);
        (moving ? phoneIn : nameIn).focus();
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
    bform.innerHTML = '<b></b>' +
      '<label data-f="name"><span></span><input name="name" autocomplete="name" maxlength="60"></label>' +
      '<label><span></span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="05X XXX XXXX" required></label>' +
      '<label data-f="notes"><span></span><textarea name="notes" maxlength="500" rows="2"></textarea></label>' +
      '<label data-f="photo"><span></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label>' +
      '<label class="rk-tick" data-f="optin"><input name="optin" type="checkbox"><span></span></label>' +
      '<small role="alert"></small><button class="rk-go" type="submit"></button>';
    const field = (f) => bform.querySelector(`[data-f="${f}"]`);
    const title = bform.querySelector("b");
    const nameIn = bform.querySelector('[name="name"]');
    const phoneIn = bform.querySelector('[name="phone"]');
    const notesIn = bform.querySelector('[name="notes"]');
    const photoIn = bform.querySelector('[name="photo"]');
    const optIn = bform.querySelector('[name="optin"]');
    const msg = bform.querySelector("small");
    const go = bform.querySelector(".rk-go");
    field("name").querySelector("span").textContent = tr("name");
    phoneIn.closest("label").querySelector("span").textContent = moving ? tr("cancelPhone") : tr("phone");
    field("notes").querySelector("span").textContent = sl.consult ? tr("notesConsult") : tr("notes");
    notesIn.placeholder = sl.consult ? tr("notesPh") : "";
    field("photo").querySelector("span").textContent = tr("photo");
    field("optin").querySelector("span").textContent = tr("optin");
    if (moving) { field("name").hidden = true; field("notes").hidden = true; field("photo").hidden = true; field("optin").hidden = true; }
    else nameIn.required = true;
    if (!sl.consult) field("photo").hidden = true;
    if (!cfg.followups) field("optin").hidden = true;
    phoneIn.value = moving || sl.redoOf ? knownPhone(sl.replaces || sl.redoOf) : "";
    go.textContent = moving ? tr("moveGo") : tr("confirm");

    bform.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!picked) return;
      msg.textContent = ""; go.disabled = true; go.textContent = moving ? tr("moving") : tr("booking");
      try {
        let photo = null;
        if (!moving && photoIn.files && photoIn.files[0]) {
          try { photo = await shrinkPhoto(photoIn.files[0]); }
          catch { msg.textContent = tr("photoBig"); go.disabled = false; go.textContent = tr("confirm"); return; }
        }
        const res = await fetch(cfg.bookEndpoint, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ business: cfg.business || undefined, service: sl.service, date: sl.date, time: picked,
            name: nameIn.value, phone: phoneIn.value, notes: notesIn.value, photo, whatsappOk: optIn.checked,
            stylist: sl.stylist || undefined, replaces: sl.replaces || undefined, redoOf: sl.redoOf || undefined, lang }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.booking) {
          box.remove(); activePicker = null;
          const b = data.booking;
          bookingCard(b, data.demo, b.replaced ? "movedTitle" : null);
          booked.push({ ref: b.ref, date: b.date, phone: phoneIn.value });
          const v = { service: svcName(b.service, b.serviceAr), date: niceDate(b.date), time: niceTime(b.time), ref: b.ref, old: b.replaced };
          const done = b.replaced ? tr("movedDone", v) : tr("done", v);
          history.push({ role: "assistant", content: done });
          add("rk-bot", done);
          return;
        }
        if (res.status === 409 && data.slots) {
          box.remove(); activePicker = null;
          add("rk-err", data.error);
          if (data.slots.times.length) slotPicker({ ...sl, ...data.slots, consult: sl.consult, price: sl.price });
          return;
        }
        msg.textContent = data.error || tr("wrong");
      } catch {
        msg.textContent = tr("noBook");
      }
      go.disabled = false; go.textContent = moving ? tr("moveGo") : tr("confirm");
    });
    box.appendChild(bform);
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }

  // "Cancel this booking?" with a confirm button. Nothing is cancelled until the customer confirms.
  function manageCard(m) {
    const card = document.createElement("form");
    card.className = "rk-slots rk-book";
    const q = document.createElement("b");
    q.textContent = tr("cancelQ", { service: svcName(m.service, m.serviceAr), date: niceDate(m.date), time: niceTime(m.time), ref: m.ref });
    const label = document.createElement("label");
    const span = document.createElement("span"); span.textContent = tr("cancelPhone");
    const phoneIn = document.createElement("input");
    phoneIn.type = "tel"; phoneIn.required = true; phoneIn.maxLength = 20; phoneIn.placeholder = "05X XXX XXXX"; phoneIn.autocomplete = "tel";
    phoneIn.value = knownPhone(m.ref);
    label.append(span, phoneIn);
    if (phoneIn.value) label.hidden = true;
    const msg = document.createElement("small"); msg.setAttribute("role", "alert");
    const acts = document.createElement("div"); acts.className = "rk-acts";
    const go = document.createElement("button"); go.type = "submit"; go.className = "rk-go"; go.textContent = tr("cancelGo");
    const keep = document.createElement("button"); keep.type = "button"; keep.className = "rk-keep"; keep.textContent = tr("keep");
    acts.append(go, keep);
    card.append(q, label, msg, acts);
    keep.addEventListener("click", () => {
      card.remove();
      history.push({ role: "assistant", content: tr("kept") });
      add("rk-bot", tr("kept"));
    });
    card.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = ""; go.disabled = true; go.textContent = tr("cancelling");
      try {
        const res = await fetch(cfg.manageEndpoint, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ business: cfg.business || undefined, action: "cancel", ref: m.ref, phone: phoneIn.value, lang }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.cancelled) {
          card.remove();
          bookingCard({ ...data.cancelled, serviceAr: m.serviceAr }, false, "cancelledTitle");
          history.push({ role: "assistant", content: data.message });
          add("rk-bot", data.message);
          return;
        }
        label.hidden = false;
        msg.textContent = data.error || tr("wrong");
      } catch { msg.textContent = tr("noBook"); }
      go.disabled = false; go.textContent = tr("cancelGo");
    });
    log.appendChild(card);
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
        body: JSON.stringify({ messages: history, business: cfg.business || undefined, bookings: booked.map(({ ref, date }) => ({ ref, date })), lang }),
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
        if (data.manage && data.manage.action === "cancel") manageCard(data.manage);
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
