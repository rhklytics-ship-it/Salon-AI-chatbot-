// Customer-facing messages in English and Arabic.
export const langOf = (x) => (String(x || "").toLowerCase().startsWith("ar") ? "ar" : "en");

const M = {
  en: {
    chooseService: "Please choose a service.",
    chooseTime: "Please choose a time.",
    enterName: "Please enter your name.",
    enterPhone: "Please enter a valid mobile number.",
    taken: "Sorry, that time was just taken. Here are the times still free.",
    tooMany: "You already have {n} bookings on this day. Please contact us to book more.",
    busy: "The assistant is busy. Please try again in a moment.",
    notAvailable: "Online booking is not available here.",
    invalid: "Invalid request.",
    badDate: "That date is not valid.",
    past: "That date is in the past.",
    tooFar: "Bookings open up to {n} days ahead.",
    closed: "{name} is closed on {day}s.",
  },
  ar: {
    chooseService: "يرجى اختيار الخدمة.",
    chooseTime: "يرجى اختيار الوقت.",
    enterName: "يرجى إدخال الاسم.",
    enterPhone: "يرجى إدخال رقم جوال صحيح.",
    taken: "عذرًا، تم حجز هذا الوقت للتو. هذه هي الأوقات التي ما زالت متاحة.",
    tooMany: "لديك {n} حجوزات في هذا اليوم. يرجى التواصل معنا لحجز المزيد.",
    busy: "المساعد مشغول حاليًا. يرجى المحاولة مرة أخرى بعد قليل.",
    notAvailable: "الحجز عبر الإنترنت غير متاح هنا.",
    invalid: "طلب غير صالح.",
    badDate: "التاريخ غير صحيح.",
    past: "هذا التاريخ قد مضى.",
    tooFar: "يمكن الحجز حتى {n} يومًا مقدمًا.",
    closed: "{name} مغلق يوم {day}.",
  },
};

export function t(lang, key, vars = {}) {
  const s = (M[langOf(lang)][key] ?? M.en[key] ?? key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

// Arabic name of a service, falling back to English.
export const serviceLabel = (service, lang) => (langOf(lang) === "ar" && service.name_ar) || service.name;
