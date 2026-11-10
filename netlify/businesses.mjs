// =====================================================================
// Business profiles for the chatbot.
//
// Every entry here gets its own demo page at  /demo/<key>
// e.g. "glow-studio" -> https://YOUR-SITE.netlify.app/demo/glow-studio
//
// To make a demo for a new prospect:
//   1. Copy the TEMPLATE block at the bottom, paste it above it.
//   2. Change the key (lowercase, dashes only) and fill in their details
//      from their website, Instagram or Google listing.
//   3. Keep  prospect: true  so the page says it is a demo made by RHKLytics,
//      not the business's own website.
//   4. Commit and push. Netlify redeploys in about a minute.
// =====================================================================

export const businesses = {
  "glow-studio": {
    name: "Glow Studio",
    type: "beauty salon",
    location: "Al Barsha, Dubai (near Mall of the Emirates)",
    tagline: "A calm, ladies-only salon near Mall of the Emirates. Book online any time, day or night.",
    color: "#B8466B",
    whatsapp: "",                       // digits only, e.g. "971501234567"; empty hides the link
    timezone: "Asia/Dubai",
    languages: "English and Arabic",
    greeting: "Hi, welcome to Glow Studio! I can help with prices, opening hours or booking an appointment.",
    chips: ["See prices", "Book an appointment", "Opening hours"],
    prospect: false,                    // false = our own fictional sample business

    // Arabic version of what customers see. Leave a field out to fall back to English.
    ar: {
      type: "صالون تجميل",
      location: "البرشاء، دبي (بالقرب من مول الإمارات)",
      tagline: "صالون نسائي هادئ بالقرب من مول الإمارات. احجزي موعدك أونلاين في أي وقت، ليلًا أو نهارًا.",
      greeting: "أهلًا بكِ في Glow Studio! يسعدني مساعدتكِ في الأسعار أو مواعيد العمل أو حجز موعد.",
      chips: ["الأسعار", "حجز موعد", "مواعيد العمل"],
      hours: ["السبت إلى الخميس: 10:00 صباحًا – 9:00 مساءً", "الجمعة: 2:00 ظهرًا – 9:00 مساءً"],
    },

    hours: [
      "Saturday to Thursday: 10:00 to 21:00",
      "Friday: 14:00 to 21:00",
    ],

    services: [
      { name: "Classic facial", name_ar: "تنظيف بشرة كلاسيكي", duration: "60 min", price: "AED 250" },
      { name: "Hydrating facial", name_ar: "تنظيف بشرة مرطّب", duration: "75 min", price: "AED 320" },
      { name: "Haircut and blow-dry", name_ar: "قص الشعر مع سشوار", duration: "60 min", price: "AED 180" },
      { name: "Blow-dry only", name_ar: "سشوار فقط", duration: "45 min", price: "AED 120" },
      { name: "Hair colour (full)", name_ar: "صبغة شعر كاملة", duration: "120 min", price: "from AED 450" },
      { name: "Manicure", name_ar: "مانيكير", duration: "45 min", price: "AED 90" },
      { name: "Gel manicure", name_ar: "مانيكير جل", duration: "60 min", price: "AED 140" },
      { name: "Pedicure", name_ar: "باديكير", duration: "60 min", price: "AED 120" },
      { name: "Eyebrow threading", name_ar: "تشذيب الحواجب بالخيط", duration: "15 min", price: "AED 40" },
    ],

    policies: [
      "Appointments can be cancelled or moved free of charge up to 4 hours before.",
      "Payment by card or cash in the salon. No deposit needed.",
      "Ladies only.",
      "Free parking in the building basement.",
    ],

    // Anything the bot cannot answer is handed over to a human here.
    // Booking calendar. The bot only offers times that are free here.
    booking: {
      slotMinutes: 15,          // start times every 15 minutes
      staff: 2,                 // stylists who can take clients at the same time
      staffLabel: "Stylist",
      leadMinutes: 60,          // earliest booking: 1 hour from now
      daysAhead: 30,            // how far ahead customers can book
      // Opening hours per weekday; null = closed. Keep in step with "hours" above.
      schedule: { sat: ["10:00", "21:00"], sun: ["10:00", "21:00"], mon: ["10:00", "21:00"], tue: ["10:00", "21:00"],
                  wed: ["10:00", "21:00"], thu: ["10:00", "21:00"], fri: ["14:00", "21:00"] },
    },
    handoff: "For anything else, please message us on WhatsApp at +971 50 000 0000 and our team will reply.",
  },

  // A second fictional sample, to show the same bot working for a studio.
  "core-pilates": {
    name: "Core Pilates Studio",
    type: "reformer pilates studio",
    location: "JLT, Dubai (Cluster D)",
    tagline: "Small reformer classes of 6, for complete beginners to advanced.",
    color: "#2F6F5E",
    whatsapp: "",
    timezone: "Asia/Dubai",
    languages: "English and Arabic",
    greeting: "Hi! I can help with class times, prices or booking your first class.",
    chips: ["Book a trial class", "Class prices", "Timetable"],
    prospect: false,
    ar: {
      type: "استوديو بيلاتس ريفورمر",
      location: "أبراج بحيرات جميرا، دبي (المجموعة D)",
      tagline: "حصص ريفورمر صغيرة من 6 أشخاص، للمبتدئين وحتى المستوى المتقدم.",
      greeting: "أهلًا! يمكنني مساعدتك في أوقات الحصص والأسعار وحجز حصتك الأولى.",
      chips: ["حجز حصة تجريبية", "أسعار الحصص", "جدول الحصص"],
      hours: ["الاثنين إلى الجمعة: 6:30 صباحًا – 9:00 مساءً", "السبت والأحد: 8:00 صباحًا – 2:00 ظهرًا"],
    },
    hours: [
      "Monday to Friday: 06:30 to 21:00",
      "Saturday and Sunday: 08:00 to 14:00",
    ],
    services: [
      { name: "Trial reformer class (first visit only)", name_ar: "حصة ريفورمر تجريبية (للزيارة الأولى فقط)", duration: "50 min", price: "AED 99" },
      { name: "Single reformer class", name_ar: "حصة ريفورمر واحدة", duration: "50 min", price: "AED 150" },
      { name: "10-class pack (valid 3 months)", name_ar: "باقة 10 حصص (صالحة 3 أشهر)", duration: "50 min each", price: "AED 1,200" },
      { name: "Private session", name_ar: "حصة خاصة", duration: "55 min", price: "AED 380" },
    ],
    policies: [
      "Classes start on the hour. Please arrive 10 minutes early for your first class.",
      "Grip socks are required; you can buy them at the studio for AED 40.",
      "Cancel at least 12 hours before class to keep your credit.",
      "Free lockers and showers at the studio.",
    ],
    booking: {
      slotMinutes: 30,
      staff: 1,
      staffLabel: "Reformer room",
      leadMinutes: 120,
      daysAhead: 21,
      schedule: { mon: ["06:30", "21:00"], tue: ["06:30", "21:00"], wed: ["06:30", "21:00"], thu: ["06:30", "21:00"],
                  fri: ["06:30", "21:00"], sat: ["08:00", "14:00"], sun: ["08:00", "14:00"] },
    },
    handoff: "For anything else, please message the studio team on WhatsApp and they will reply.",
  },

  /* ------------------------------------------------------------------
  TEMPLATE: copy from here ...

  "their-business-name": {
    name: "Their Business Name",
    type: "nail salon",                       // what they are, in a few words
    location: "Area, Dubai",
    tagline: "One line taken from their Instagram bio or website.",
    color: "#0F7C78",                         // their brand colour if you can see it
    whatsapp: "",                             // leave empty for prospect demos
    timezone: "Asia/Dubai",
    languages: "English and Arabic",
    greeting: "Hi! I can help with prices, opening hours or booking.",
    chips: ["See prices", "Book an appointment", "Opening hours"],
    prospect: true,                           // keep true for real businesses
    ar: {                                     // Arabic version (optional; leave out a field for English)
      type: "صالون أظافر", location: "المنطقة، دبي", tagline: "", greeting: "أهلًا! كيف يمكنني مساعدتك؟",
      chips: ["الأسعار", "حجز موعد", "مواعيد العمل"], hours: ["يوميًا: 10:00 صباحًا – 10:00 مساءً"],
    },
    hours: ["Daily: 10:00 to 22:00"],
    services: [
      { name: "Service", name_ar: "الخدمة", duration: "60 min", price: "AED 100" },  // duration sets how long it blocks the calendar
    ],
    policies: [
      "Payment by card or cash.",
    ],
    booking: {
      slotMinutes: 15,
      staff: 1,                               // how many clients can be served at once
      staffLabel: "Stylist",
      leadMinutes: 60,
      daysAhead: 30,
      schedule: { sat: ["10:00", "22:00"], sun: ["10:00", "22:00"], mon: ["10:00", "22:00"], tue: ["10:00", "22:00"],
                  wed: ["10:00", "22:00"], thu: ["10:00", "22:00"], fri: ["10:00", "22:00"] },
    },
    handoff: "For anything else, please contact the team directly.",
  },

  ... to here
  ------------------------------------------------------------------ */
};

export function findBusiness(key) {
  const k = String(key || "").toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(businesses, k) ? businesses[k] : null;
}

// Only what the demo page needs to show. Kept separate from the prompt data.
export function publicProfile(b) {
  return {
    name: b.name, type: b.type, location: b.location, tagline: b.tagline,
    color: b.color, whatsapp: b.whatsapp, greeting: b.greeting, chips: b.chips, canBook: !!b.booking,
    prospect: !!b.prospect, hours: b.hours, services: b.services, ar: b.ar || {},
  };
}
