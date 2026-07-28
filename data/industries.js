"use strict";

// Alternative industry configurations used to prove the conversation engine is
// fully industry-independent: the same engine code serves Dental, Restaurant,
// and Law Firm clients with NO changes to lib/conversation-*.js. All industry
// specifics (brand, staff, services, pricing, terminology, patient/client types)
// live here in data only.

const restaurant = {
  clinic: {
    name: "Bella's Bistro",
    address: "200 Vine Street, Downtown",
    phone: "(555) 777-1234",
    email: "reservations@bellasbistro.com",
    hours: "Tuesday through Sunday 5:00 PM - 10:00 PM, Monday closed",
    rating: "4.7",
    paymentProvider: "Split",
    assistantName: "Bella Bot",
    staff: [
      { name: "Chef Marco", specialty: "Italian cuisine" },
      { name: "Sofia", specialty: "sommelier" }
    ],
    patientTypes: [],
    patientTypeQuestion: "How many guests will be in your party?",
    serviceAliases: {},
    pediatricServiceLabel: "kids' menu",
    customerLabel: "Guest",
    clientNoun: "guests"
  },
  services: [
    { name: "Table for 2", price: "No deposit", duration: "2 hours" },
    { name: "Table for 4", price: "No deposit", duration: "2 hours" },
    { name: "Private Dining", price: "$200", duration: "3 hours" },
    { name: "Wine Tasting", price: "$65 per person", duration: "90 minutes" }
  ],
  faqs: [
    { q: "What are your hours?", a: "We're open Tuesday through Sunday 5-10 PM, closed Mondays.", keywords: ["hours", "open", "time"] },
    { q: "Do you take reservations?", a: "Yes! I can book a table for you right now.", keywords: ["reservation", "book", "table"] },
    { q: "Where are you located?", a: "We're at 200 Vine Street, downtown.", keywords: ["location", "address", "where"] },
    { q: "Is there parking?", a: "Yes, free valet parking is available.", keywords: ["parking", "valet"] }
  ]
};

const lawFirm = {
  clinic: {
    name: "Hartwell & Associates",
    address: "88 Liberty Plaza, Suite 12",
    phone: "(555) 310-8820",
    email: "help@hartwelllaw.com",
    hours: "Monday through Friday 9:00 AM - 5:00 PM",
    rating: "4.9",
    paymentProvider: "our financing partners",
    assistantName: "Hartwell Assistant",
    staff: [
      { name: "Mr. Hartwell", specialty: "family law" },
      { name: "Ms. Cho", specialty: "estate planning" }
    ],
    patientTypes: ["new client", "existing client"],
    patientTypeQuestion: "Are you a new client or an existing client?",
    serviceAliases: {},
    pediatricServiceLabel: "family law",
    customerLabel: "Client",
    clientNoun: "clients"
  },
  services: [
    { name: "Consultation", price: "$250", duration: "1 hour" },
    { name: "Document Review", price: "$400", duration: "2 hours" },
    { name: "Court Representation", price: "$2000", duration: "Full day" }
  ],
  faqs: [
    { q: "What are your hours?", a: "Our office is open Monday through Friday 9-5.", keywords: ["hours", "open", "time"] },
    { q: "Do you offer consultations?", a: "Yes! I can schedule a consultation for you.", keywords: ["consultation", "book", "appointment"] },
    { q: "Where are you located?", a: "We're at 88 Liberty Plaza, Suite 12.", keywords: ["location", "address", "where"] }
  ]
};

module.exports = { restaurant, lawFirm };
