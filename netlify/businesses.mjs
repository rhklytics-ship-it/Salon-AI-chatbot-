// =====================================================================
// Clinic profile. Everything the assistant knows comes from here.
// CareFirst Clinic is a fictional sample clinic for demonstrations.
// For a real clinic: change the details, set sample: false, and redeploy.
// =====================================================================

export const businesses = {
  "carefirst-clinic": {
    name: "CareFirst Clinic",
    type: "family clinic",
    location: "Dubai (sample address), with free parking for patients",
    timezone: "Asia/Dubai",
    languages: "English and Arabic",
    sample: true,                         // true = fictional demo clinic, shown as such on the page

    // Arabic version of what patients see. Leave a field out to fall back to English.
    ar: {
      type: "عيادة عائلية",
      location: "دبي (عنوان تجريبي)، مع مواقف مجانية للمرضى",
      hours: ["الاثنين إلى السبت: 9:00 صباحًا – 5:00 مساءً (استراحة 1:00 – 2:00 ظهرًا)", "الأحد: مغلق"],
    },

    hours: [
      "Monday to Saturday: 9:00 am to 5:00 pm (break 1:00 to 2:00 pm)",
      "Sunday: closed",
    ],

    // Each service: duration sets how long it blocks the doctor's calendar.
    services: [
      { name: "General consultation", name_ar: "استشارة طب عام", duration: "30 min", price: "AED 250" },
      { name: "Skin consultation", name_ar: "استشارة جلدية", duration: "30 min", price: "AED 350" },
      { name: "Dental check-up", name_ar: "فحص الأسنان", duration: "30 min", price: "AED 300" },
    ],

    booking: {
      slotMinutes: 30,                    // appointment start times every 30 minutes
      leadMinutes: 60,                    // earliest booking: 1 hour from now
      daysAhead: 14,                      // how far ahead patients can book
      staffLabel: "Doctor",
      // Each doctor has their own calendar and only the services listed.
      staff: [
        { name: "Dr. Amina Rahman", name_ar: "د. أمينة رحمن", role: "General practitioner", role_ar: "طبيبة عامة", services: ["General consultation"] },
        { name: "Dr. Omar Haddad", name_ar: "د. عمر حداد", role: "Dermatologist", role_ar: "طبيب جلدية", services: ["Skin consultation"] },
        { name: "Dr. Lina Farouk", name_ar: "د. لينا فاروق", role: "Dentist", role_ar: "طبيبة أسنان", services: ["Dental check-up"] },
      ],
      // Opening times per weekday; null = closed. Two ranges = a lunch break.
      schedule: {
        mon: [["09:00", "13:00"], ["14:00", "17:00"]],
        tue: [["09:00", "13:00"], ["14:00", "17:00"]],
        wed: [["09:00", "13:00"], ["14:00", "17:00"]],
        thu: [["09:00", "13:00"], ["14:00", "17:00"]],
        fri: [["09:00", "13:00"], ["14:00", "17:00"]],
        sat: [["09:00", "13:00"], ["14:00", "17:00"]],
        sun: null,
      },
    },

    policies: [
      "Fees are paid at the clinic, by card or cash.",
      "Please arrive 10 minutes early and bring your Emirates ID and insurance card if you have one.",
      "To cancel, use your booking reference and the mobile number you booked with.",
    ],

    // Anything the assistant cannot answer is handed to the front desk.
    handoff: "please call the clinic front desk during opening hours.",
  },
};

export function findBusiness(key) {
  const k = String(key || "").toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(businesses, k) ? businesses[k] : null;
}
