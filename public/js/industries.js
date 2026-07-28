(function () {
  "use strict";
  var DATA = {
    dental: {
      label: "Dental & Orthodontics",
      emoji: "🦷",
      title: "AI Reception for Dental Practices",
      sub: "Book cleanings, answer insurance questions, and triage emergencies — even when your front desk is at lunch.",
      name: "dental",
      pains: [
        "Front desk misses calls during appointments and lunch breaks",
        "Patients abandon booking because phone trees are slow",
        "Insurance and coverage questions eat up reception time",
        "Dental emergencies need fast triage, not voicemail"
      ],
      solutions: [
        { icon: "📅", title: "Booking & recalls", desc: "Schedule cleanings, fillings, and whitening, and prompt for recall visits automatically." },
        { icon: "💳", title: "Insurance answers", desc: "Respond to 'Do you take Delta Dental / Cigna?' and route coverage questions." },
        { icon: "🚨", title: "Emergency triage", desc: "Spot urgent cases and fast-track them to the next open emergency slot." },
        { icon: "🦷", title: "Treatment education", desc: "Explain procedures like implants or Invisalign to warm up case acceptance." },
        { icon: "🔁", title: "No-show recovery", desc: "Confirm appointments and rebook cancellations without staff effort." },
        { icon: "🌙", title: "After-hours capture", desc: "Capture every new-patient lead at 9 PM the same way you would at 9 AM." }
      ],
      chat: [
        { f: "bot", t: "Hi! I'm the BrightSmile assistant for Maple Grove Dental. Want to book a visit or ask a question?" },
        { f: "user", t: "Do you take Delta Dental?" },
        { f: "bot", t: "Yes, we accept Delta Dental and most major PPO plans. Want me to verify your coverage?" },
        { f: "user", t: "Sure — and I'd like a cleaning Friday afternoon" },
        { f: "bot", t: "Perfect, Friday at 2:00 PM with Dr. Lee is open. I've booked it and sent a confirmation. See you then!" }
      ],
      roi: { visitors: 4000, conv: 2.2, value: 520, uplift: 42 }
    },
    restaurant: {
      label: "Restaurants & Hospitality",
      emoji: "🍝",
      title: "AI Host for Restaurants",
      sub: "Take reservations, share menus and hours, and capture private-event inquiries — without tying up your staff.",
      name: "restaurants",
      pains: [
        "Host is too busy to answer the phone during the dinner rush",
        "Reservation no-shows hurt covers and revenue",
        "Guests ask the same menu, hours, and parking questions constantly",
        "Event and large-party inquiries slip through"
      ],
      solutions: [
        { icon: "📞", title: "Reservations", desc: "Take bookings by party size, date, and time and confirm instantly." },
        { icon: "📋", title: "Menu & hours", desc: "Answer 'Are you open now?' and share menus, specials, and dietary info." },
        { icon: "🎉", title: "Events & large parties", desc: "Capture private-dining and catering leads with full contact details." },
        { icon: "🚗", title: "Logistics", desc: "Share parking, dress code, and waitlist info in seconds." },
        { icon: "🔁", title: "No-show recovery", desc: "Send reminders and rebook open tables automatically." },
        { icon: "⭐", title: "Review recovery", desc: "Catch a bad experience early and route it to a manager." }
      ],
      chat: [
        { f: "bot", t: "Welcome to Bella Trattoria! Want to make a reservation or see tonight's specials?" },
        { f: "user", t: "Table for 2 tonight at 7?" },
        { f: "bot", t: "Lovely! A window table for 2 at 7:00 PM is available. Should I hold it under a name?" },
        { f: "user", t: "Yes, under Rossi. Also do you do gluten-free pasta?" },
        { f: "bot", t: "Done, Rossi at 7:00. Yes — we have house-made gluten-free pasta. I'll note the preference on your booking!" }
      ],
      roi: { visitors: 9000, conv: 1.8, value: 95, uplift: 35 }
    },
    law: {
      label: "Law Firms",
      emoji: "⚖️",
      title: "AI Intake for Law Firms",
      sub: "Qualify potential clients, book consultations, and route practice areas — so no billable lead is wasted.",
      name: "law firms",
      pains: [
        "High-value intakes arrive after hours and go cold",
        "Paralegals spend hours on unqualified calls",
        "Prospects don't know which practice area fits",
        "Slow follow-up loses cases to faster competitors"
      ],
      solutions: [
        { icon: "🧭", title: "Practice routing", desc: "Send family, injury, or business questions to the right attorney." },
        { icon: "📝", title: "Intake qualification", desc: "Capture facts, deadlines, and contact info before the consult." },
        { icon: "📅", title: "Consult booking", desc: "Book consultations on the attorney's calendar in real time." },
        { icon: "🌙", title: "After-hours intake", desc: "Never miss a statute-of-limitations-sensitive lead at night." },
        { icon: "🔒", title: "Confidential by design", desc: "Handles sensitive details carefully and routes to staff." },
        { icon: "⚡", title: "Speed to lead", desc: "Instant responses that beat slow-responding competitors." }
      ],
      chat: [
        { f: "bot", t: "Thank you for reaching out to Hartwell Law. Can I help you find the right practice area?" },
        { f: "user", t: "I was in a car accident and think I have a claim" },
        { f: "bot", t: "I'm sorry to hear that. Personal injury is exactly our focus. When did it happen, and may I take your name?" },
        { f: "user", t: "Last week — name's Marcus. Can someone call me?" },
        { f: "bot", t: "Got it, Marcus. I've booked a free consult with our PI team for tomorrow at 10 AM and flagged it urgent." }
      ],
      roi: { visitors: 3000, conv: 3.0, value: 2500, uplift: 38 }
    },
    gym: {
      label: "Gyms & Fitness",
      emoji: "💪",
      title: "AI Closer for Gyms & Fitness",
      sub: "Sell memberships, book classes, and capture personal-training leads — around the clock.",
      name: "gyms",
      pains: [
        "Prospects browse at midnight but staff only sell 9–5",
        "Trial-member drop-off with no follow-up",
        "Class booking by phone is a bottleneck",
        "Personal-training leads go cold"
      ],
      solutions: [
        { icon: "💪", title: "Membership sales", desc: "Explain plans, pricing, and perks and capture sign-ups." },
        { icon: "📅", title: "Class booking", desc: "Book classes and trials directly through chat." },
        { icon: "🏋️", title: "PT lead capture", desc: "Qualify personal-training interest and route to coaches." },
        { icon: "🎁", title: "Free-trial funnel", desc: "Drive visitors into a booked first session automatically." },
        { icon: "🔁", title: "Win-back", desc: "Re-engage lapsed members with offers and check-ins." },
        { icon: "⏰", title: "24/7 selling", desc: "Close the midnight browser before they forget." }
      ],
      chat: [
        { f: "bot", t: "Hey! Thinking about joining IronForge Gym? I can get you set up with a free trial." },
        { f: "user", t: "How much is membership and do you have classes?" },
        { f: "bot", t: "Membership is $39/mo, and we run 25+ classes a week. Want me to book your free trial session?" },
        { f: "user", t: "Yes, Saturday morning?" },
        { f: "bot", t: "Saturday 9 AM HIIT trial is open. You're booked — just bring water and we'll handle the rest!" }
      ],
      roi: { visitors: 7000, conv: 2.5, value: 180, uplift: 45 }
    },
    realty: {
      label: "Real Estate",
      emoji: "🏠",
      title: "AI Assistant for Real Estate",
      sub: "Qualify buyers and sellers, book viewings, and capture property inquiries the moment they land.",
      name: "real estate",
      pains: [
        "Property inquiries arrive faster than agents can reply",
        "Unqualified leads waste agent time",
        "Buyers want to view now, not 'next business day'",
        "Seller leads captured late lose the listing"
      ],
      solutions: [
        { icon: "🏠", title: "Listing Q&A", desc: "Answer price, beds, location, and availability instantly." },
        { icon: "📅", title: "Viewing booking", desc: "Book showings on the agent's calendar in real time." },
        { icon: "🧭", title: "Buyer/seller qualify", desc: "Capture budget, timeline, and motivation to prioritize." },
        { icon: "🌙", title: "Instant capture", desc: "Catch the late-night Zillow-style browser before they scroll on." },
        { icon: "🔁", title: "Follow-up", desc: "Nurture leads with new listings they care about." },
        { icon: "📊", title: "Agent alerts", desc: "Route hot leads to the right agent immediately." }
      ],
      chat: [
        { f: "bot", t: "Welcome to Summit Realty! Looking to buy, sell, or just browsing listings?" },
        { f: "user", t: "Buying — budget around 600k, need 3 beds" },
        { f: "bot", t: "Great. I have 4 homes matching that. Want to book a viewing for the one on Maple Ave this Saturday?" },
        { f: "user", t: "Yes please, 1pm" },
        { f: "bot", t: "Booked — Saturday 1 PM at 14 Maple Ave. I've texted the listing agent your details." }
      ],
      roi: { visitors: 6000, conv: 2.0, value: 1200, uplift: 40 }
    },
    salon: {
      label: "Salons & Spas",
      emoji: "💇",
      title: "AI Front Desk for Salons & Spas",
      sub: "Book cuts, color, and spa days with a friendly, on-brand assistant that never misses the phone.",
      name: "salons & spas",
      pains: [
        "Stylists can't answer the phone mid-service",
        "Booking inquiries lost to voicemail",
        "Clients forget appointments and no-show",
        "Upsell opportunities missed at booking"
      ],
      solutions: [
        { icon: "💇", title: "Appointment booking", desc: "Book cuts, color, and spa services by stylist and time." },
        { icon: "🔁", title: "Reminders & rebook", desc: "Confirm and rebook automatically to cut no-shows." },
        { icon: "🎁", title: "Upsell prompts", desc: "Suggest add-ons like gloss or manicures at booking." },
        { icon: "🕒", title: "Hours & policies", desc: "Share hours, cancellation, and deposit info instantly." },
        { icon: "🌙", title: "After-hours booking", desc: "Capture the 10 PM 'should I book?' impulse." },
        { icon: "💬", title: "On-brand voice", desc: "A friendly tone that matches your salon's personality." }
      ],
      chat: [
        { f: "bot", t: "Hi gorgeous! Want to book a service at Lush Salon? ✨" },
        { f: "user", t: "A balayage with Mia next Thursday?" },
        { f: "bot", t: "Mia has Thursday at 11 AM and 3 PM. Which works? I can add a gloss too if you like!" },
        { f: "user", t: "11am with the gloss please" },
        { f: "bot", t: "You're set — Thursday 11 AM balayage + gloss with Mia. Can't wait to see you! 💇" }
      ],
      roi: { visitors: 5000, conv: 2.6, value: 140, uplift: 43 }
    }
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function getInd() {
    var p = new URLSearchParams(window.location.search).get("industry");
    return DATA[p] ? p : "dental";
  }
  function render() {
    var k = getInd(), d = DATA[k];
    document.getElementById("ind-emoji").textContent = d.emoji;
    document.getElementById("ind-title").textContent = d.title;
    document.getElementById("ind-sub").textContent = d.sub;
    document.getElementById("ind-name").textContent = d.name;
    document.title = d.label + " — BrightSmile AI";
    var chat = document.getElementById("ind-chat");
    chat.innerHTML = d.chat.map(function (m) {
      return '<div class="lp-bubble ' + (m.f === "bot" ? "bot" : "me") + '">' + esc(m.t) + "</div>";
    }).join("");
    document.getElementById("ind-pains").innerHTML = d.pains.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    document.getElementById("ind-solutions").innerHTML = d.solutions.map(function (s) {
      return '<div class="lp-feature"><div class="lp-feature-icon">' + s.icon + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.desc) + "</p></div>";
    }).join("");
    document.getElementById("roi-visitors").value = d.roi.visitors;
    document.getElementById("roi-conv").value = d.roi.conv;
    document.getElementById("roi-value").value = d.roi.value;
    document.getElementById("roi-uplift").value = d.roi.uplift;
    calc();
  }
  function calc() {
    var v = +document.getElementById("roi-visitors").value || 0;
    var c = (+document.getElementById("roi-conv").value || 0) / 100;
    var val = +document.getElementById("roi-value").value || 0;
    var u = (+document.getElementById("roi-uplift").value || 0) / 100;
    var bookings = v * c * u;
    var monthly = bookings * val;
    document.getElementById("roi-bookings").textContent = Math.round(bookings).toLocaleString();
    document.getElementById("roi-monthly").textContent = "$" + Math.round(monthly).toLocaleString();
    document.getElementById("roi-annual").textContent = "$" + Math.round(monthly * 12).toLocaleString();
  }
  ["roi-visitors", "roi-conv", "roi-value", "roi-uplift"].forEach(function (id) {
    document.addEventListener("input", function (e) { if (e.target && e.target.id === id) calc(); });
  });
  render();
})();
