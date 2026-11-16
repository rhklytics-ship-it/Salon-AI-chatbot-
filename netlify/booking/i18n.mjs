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
    badPhoto: "The photo must be a JPG, PNG or WebP image.",
    bigPhoto: "The photo is too large. Please choose a smaller one.",
    notFound: "I couldn't find a booking with that reference and mobile number.",
    tooLate: "This booking starts in less than {h} hours, so it can't be changed online. {handoff}",
    alreadyCancelled: "This booking was already cancelled.",
    cancelledOk: "Your booking {ref} is cancelled. The time is free for others now.",
    moved: "Moved. Your new booking replaces {old}.",
    redoNotAllowed: "That booking isn't eligible for a free fix online. {handoff}",
    issueLogged: "Thank you for telling us, and sorry again. I've passed this to our manager, who will contact you today.",
    askPhoneIssue: "So our manager can call you, could you share the mobile number you booked with?",
    confirmBelow: "Please confirm below.",
    tapTime: "Here are the free times. Tap one to book.",
    sayAgain: "Sorry, could you say that again?",
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
    badPhoto: "يجب أن تكون الصورة بصيغة JPG أو PNG أو WebP.",
    bigPhoto: "الصورة كبيرة جدًا. يرجى اختيار صورة أصغر.",
    notFound: "لم أجد حجزًا بهذا الرقم ورقم الجوال.",
    tooLate: "يبدأ هذا الحجز خلال أقل من {h} ساعات، لذلك لا يمكن تعديله عبر الإنترنت. {handoff}",
    alreadyCancelled: "تم إلغاء هذا الحجز من قبل.",
    cancelledOk: "تم إلغاء حجزك {ref}. أصبح الوقت متاحًا للآخرين الآن.",
    moved: "تم النقل. حجزك الجديد يحل محل {old}.",
    redoNotAllowed: "هذا الحجز غير مؤهل لإصلاح مجاني عبر الإنترنت. {handoff}",
    issueLogged: "شكرًا لإخبارنا، ونعتذر مرة أخرى. نقلت الأمر إلى المدير، وسيتواصل معك اليوم.",
    askPhoneIssue: "حتى يتمكن المدير من الاتصال بك، هل يمكنك مشاركة رقم الجوال المستخدم في الحجز؟",
    confirmBelow: "يرجى التأكيد أدناه.",
    tapTime: "هذه هي الأوقات المتاحة. اضغط على وقت للحجز.",
    sayAgain: "عذرًا، هل يمكنك إعادة ما قلته؟",
  },
};

export function t(lang, key, vars = {}) {
  const s = (M[langOf(lang)][key] ?? M.en[key] ?? key);
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

// Arabic name of a service, falling back to English.
export const serviceLabel = (service, lang) => (langOf(lang) === "ar" && service.name_ar) || service.name;
