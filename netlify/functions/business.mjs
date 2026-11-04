// =====================================================================
// Business profile for the chatbot.
// To set the bot up for a new client, copy this file and change the
// details below. Nothing else in the project needs to change.
// =====================================================================

export const business = {
  name: "Glow Studio",
  type: "beauty salon",
  location: "Al Barsha, Dubai (near Mall of the Emirates)",
  phone: "+971 50 000 0000",
  timezone: "Asia/Dubai",
  languages: "English and Arabic",

  hours: [
    "Saturday to Thursday: 10:00 to 21:00",
    "Friday: 14:00 to 21:00",
  ],

  services: [
    { name: "Classic facial", duration: "60 min", price: "AED 250" },
    { name: "Hydrating facial", duration: "75 min", price: "AED 320" },
    { name: "Haircut and blow-dry", duration: "60 min", price: "AED 180" },
    { name: "Blow-dry only", duration: "45 min", price: "AED 120" },
    { name: "Hair colour (full)", duration: "120 min", price: "from AED 450" },
    { name: "Manicure", duration: "45 min", price: "AED 90" },
    { name: "Gel manicure", duration: "60 min", price: "AED 140" },
    { name: "Pedicure", duration: "60 min", price: "AED 120" },
    { name: "Eyebrow threading", duration: "15 min", price: "AED 40" },
  ],

  policies: [
    "Appointments can be cancelled or moved free of charge up to 4 hours before.",
    "Payment by card or cash in the salon. No deposit needed.",
    "Ladies only.",
    "Free parking in the building basement.",
  ],

  // Anything the bot cannot answer is handed over to a human here.
  handoff: "For anything else, please message us on WhatsApp at +971 50 000 0000 and our team will reply.",
};
