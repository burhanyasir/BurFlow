const SERVICES = [
  "cleaning", "teeth whitening", "filling", "root canal", "crown",
  "extraction", "invisalign", "dental implant", "pediatric dentistry",
  "general checkup", "veneers", "bonding"
];

const NAMES = [
  "James Wilson", "Maria Garcia", "Robert Chen", "Sarah Johnson",
  "David Kim", "Emily Davis", "Michael Brown", "Lisa Anderson",
  "Thomas Taylor", "Jennifer Martinez", "Christopher Lee", "Amanda White"
];

const PHONES = [
  "(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890",
  "(555) 867-5309", "(555) 246-8135", "(555) 369-2580", "(555) 159-7534"
];

const INSURANCE = ["Delta Dental", "MetLife", "Cigna", "Aetna", "Blue Cross", "United Healthcare"];
const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
const DATES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "tomorrow", "next week"];

const PHRASES = {
  greeting: ["Hi", "Hello", "Hey there", "Hi there"],
  thanks: ["Thanks", "Thank you", "Great, thanks", "Perfect, thank you"],
  goodbye: ["Bye", "Goodbye", "See you later", "That's all thanks"],
  confirm: ["Yes", "Sounds good", "Perfect", "That's right", "Yes please", "Sure", "Okay", "Looks good"],
  decline: ["No thanks", "Not now", "Maybe later", "No", "Not really"],
  confused: ["What?", "I don't understand", "Can you repeat that?", "Huh?", "What do you mean?"],
  angry: ["This is frustrating", "Are you even listening?", "You're not helping", "This is useless"]
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function withProbability(text, prob) { return Math.random() < prob ? text : ""; }

function injectTypo(text, rate) {
  if (Math.random() > rate) return text;
  const words = text.split(" ");
  const idx = Math.floor(Math.random() * words.length);
  const word = words[idx];
  if (word.length < 3) return text;
  const typos = {
    "cleaning": ["cleening", "cleaing", "cleenin"],
    "whitening": ["whitenning", "whitineng", "whitning"],
    "appointment": ["appoinment", "apointment", "appointmnet"],
    "insurance": ["insurence", "insuracne", "insuranse"],
    "emergency": ["emergeny", "emegency", "emergnce"],
    "schedule": ["schedual", "scedule", "scheduel"],
    "tomorrow": ["tommorow", "tomorow", "tommorrow"],
    "thursday": ["thrusday", "thurday", "thusday"],
    "please": ["pleas", "plz", "pls"],
    "thanks": ["thx", "thanx", "tnx"],
    "dentist": ["denist", "dentis", "dentsit"]
  };
  for (const [correct, wrongs] of Object.entries(typos)) {
    if (word.toLowerCase() === correct || word.toLowerCase().includes(correct)) {
      words[idx] = pick(wrongs);
      return words.join(" ");
    }
  }
  if (word.length >= 4) {
    const pos = Math.floor(Math.random() * (word.length - 1));
    words[idx] = word.slice(0, pos) + word.slice(pos + 1, pos + 2) + word[pos] + word.slice(pos + 2);
  }
  return words.join(" ");
}

const personas = {

  new_patient: {
    id: "new_patient",
    name: "New Patient",
    description: "Polite first-time visitor. Provides complete info, follows workflow naturally.",
    traits: { followWorkflow: 0.95, provideFullInfo: 0.9, patient: 0.9, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(PHRASES.greeting) + ", I'd like to book a " + pick(SERVICES) + " appointment.";
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(SERVICES);
        if (state.workflowStep === "visit_type") return "I'm a new patient";
        if (state.workflowStep === "date") return pick(DATES);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
      }
      if (state.activeWorkflow === "pricing") return "How much does " + pick(SERVICES) + " cost?";
      if (state.activeWorkflow === "insurance") return pick(INSURANCE);
      if (state.activeWorkflow === "lead_capture") {
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "contact") return pick(PHONES);
        if (state.workflowStep === "interest") return pick(SERVICES);
        if (state.workflowStep === "confirm_lead") return pick(PHRASES.confirm);
      }
      if (state.activeWorkflow === "emergency") {
        if (state.workflowStep === "assess") return "I have a bad toothache";
        if (state.workflowStep === "booking") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm_emergency") return pick(PHRASES.confirm);
      }
      return pick(SERVICES) + " appointment please";
    }
  },

  returning_patient: {
    id: "returning_patient",
    name: "Returning Patient",
    description: "Has been before, mentions previous visits, wants specific provider.",
    traits: { followWorkflow: 0.85, provideFullInfo: 0.8, patient: 0.85, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Hi, I've been here before", "I'm a returning patient", "Hi, I need to schedule a follow-up", "Hello, I'd like to come in again"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["I need a regular cleaning", "A checkup please", "Follow-up visit"]).replace(/regular cleaning/i, "cleaning");
        if (state.workflowStep === "visit_type") return "I'm an existing patient";
        if (state.workflowStep === "date") return pick(DATES);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
      }
      return pick(SERVICES) + " appointment please";
    }
  },

  parent_booking: {
    id: "parent_booking",
    name: "Parent Booking for Child",
    description: "Books pediatric appointments for children. Uses 'my son/daughter/kid' language.",
    traits: { followWorkflow: 0.85, provideFullInfo: 0.9, patient: 0.85, typoRate: 0.03 },
    name: () => pick(["Sarah Mitchell", "Jennifer Adams", "Michael Torres", "Rachel Green"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Hi, I need to book an appointment for my son", "Hello, my daughter needs to see a dentist", "Hi, can I schedule a visit for my child"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["pediatric dentistry for my kid", "a checkup for my child", "my son needs a cleaning"]);
        if (state.workflowStep === "visit_type") return "My child is a new patient";
        if (state.workflowStep === "date") return pick(DATES);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return pick(["Emily", "Lucas", "Sophie", "Ethan", "Ava"]);
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
      }
      return "I need to bring my kid in for a checkup";
    }
  },

  typo_heavy: {
    id: "typo_heavy",
    name: "Typo-Heavy User",
    description: "Heavy typos and misspellings. Tests fuzzy matching and entity extraction robustness.",
    traits: { followWorkflow: 0.75, provideFullInfo: 0.8, patient: 0.7, typoRate: 0.45 },
    name: () => pick(["James Wilson", "Maria Garcia"]),
    generateMessage(turn, state) {
      let msg = personas.new_patient.generateMessage(turn, state);
      return injectTypo(msg, this.traits.typoRate);
    }
  },

  impatient: {
    id: "impatient",
    name: "Impatient Caller",
    description: "Short, aggressive responses. Wants quick booking, gets frustrated with questions.",
    traits: { followWorkflow: 0.6, provideFullInfo: 0.5, patient: 0.2, typoRate: 0.02 },
    name: () => pick(["David Kim", "Tom Johnson"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["I need a cleaning ASAP", "Book me in. Now.", "I need an appointment today.", "Cleaning. Quick."]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service" && turn > 1) return pick(["I already told you — cleaning", "Did you not hear me?", "cleaning, duh"]);
        if (state.workflowStep === "service") return pick("cleaning");
        if (state.workflowStep === "visit_type") return pick(["I'm new", "existing", "new patient"]);
        if (state.workflowStep === "date") return pick(["tomorrow", "today", "whatever's soonest"]);
        if (state.workflowStep === "time") return pick(["10 AM", "2 PM", "11:30"]);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(["(555) 867-5309", "555-123-4567"]);
        if (state.workflowStep === "confirm") return pick(["YES", "Just book it", "Do it", "Fine"]);
      }
      if (turn > 5 && !state.activeWorkflow) return pick(["HELLO?", "Are you still there?", "This is taking forever"]);
      return pick(["Hurry up", "Just book it", "I don't have all day"]);
    }
  },

  multi_topic: {
    id: "multi_topic",
    name: "Multi-Topic Jumper",
    description: "Jumps between services mid-conversation. Tests context retention and change detection.",
    traits: { followWorkflow: 0.3, provideFullInfo: 0.6, patient: 0.4, typoRate: 0.03 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["I have a few questions about different services", "Let me ask about some stuff"]);

      if (turn === 2) return "Actually, how much does " + pick(SERVICES.filter(s => s !== "cleaning")) + " cost?";
      if (turn === 4) return "Wait, I also need to book a " + pick(SERVICES.filter(s => !(state?.metadata?.mentionedServices || []).flat().includes(s))) + " too";
      if (turn === 6) return "And do you take " + pick(INSURANCE) + " insurance?";
      if (turn === 8 && Math.random() > 0.5) return "What are your hours?";

      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["Actually, what about", "Wait, I meant"].map(p => p + " " + pick(SERVICES)));
        if (state.workflowStep === "date") {
          if (turn < 5) return pick(DATES);
          return "Wait, I also wanted to ask about " + pick(SERVICES) + " pricing";
        }
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
      }
      return "What about " + pick(SERVICES) + "?";
    }
  },

  emergency: {
    id: "emergency",
    name: "Emergency Patient",
    description: "In pain, urgent language. Tests emergency triage workflow thoroughly.",
    traits: { followWorkflow: 0.9, provideFullInfo: 0.85, patient: 0.5, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      const painLevels = [
        "I have a really bad toothache, it hurts so much",
        "My tooth is killing me, I need help",
        "I think I cracked my tooth, it's painful",
        "I'm in a lot of pain, can you see me today?",
        "My gums are bleeding and it hurts",
        "I have a dental emergency, my tooth is broken"
      ];
      if (turn === 0) return pick(painLevels);
      if (state.activeWorkflow === "emergency") {
        if (state.workflowStep === "assess") return pick(["It really hurts", "I'm in pain", "Yes it's bad"]);
        if (state.workflowStep === "booking") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm_emergency") return pick(PHRASES.confirm);
      }
      if (state.activeWorkflow === "appointment_booking" && turn > 2) return pick(painLevels);
      return pick(["Please help, it hurts", "I need to see someone today"]);
    }
  },

  hostile: {
    id: "hostile",
    name: "Hostile User",
    description: "Complaints, rude language, threatens bad reviews. Tests safety and escalation handling.",
    traits: { followWorkflow: 0.3, provideFullInfo: 0.3, patient: 0.1, typoRate: 0.02 },
    name: () => pick(["Mike Smith", "Karen Johnson", "Frank Reynolds"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Your website is terrible but I need a dentist", "I hope you're better than your competitors", "I need to book but don't waste my time"]);
      if (turn > 4 && Math.random() < 0.3) return pick(["This is ridiculous", "Are you even a real person?", "I'm leaving a bad review", "Useless", "You're not helping at all"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["cleaning", "I already said cleaning", "Is it that hard?"]);
        if (state.workflowStep === "visit_type") return "existing patient";
        if (state.workflowStep === "date") return pick(["tomorrow", "this week"]);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(["(555) 159-7534", "555-555-5555"]);
        if (state.workflowStep === "confirm") return pick(["YES finally", "About time", "Sure"]);
      }
      return pick(["Can you just help me already?", "I don't have time for this", "Just book the damn appointment"]);
    }
  },

  confused: {
    id: "confused",
    name: "Confused User",
    description: "Doesn't understand questions, gives contradictory info, asks for clarification often.",
    traits: { followWorkflow: 0.4, provideFullInfo: 0.4, patient: 0.3, typoRate: 0.05 },
    name: () => pick(["Bob Johnson", "Pat Miller"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Hi, I'm looking for a dentist", "Hello, I need some help", "I have a dental question"]);
      if (turn > 2 && turn < 6 && Math.random() < 0.35) return pick(PHRASES.confused);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["umm, teeth cleaning?", "I'm not sure, what do you have?", "what's available?"]);
        if (state.workflowStep === "visit_type") return pick(["what does that mean?", "I'm not sure", "both?"]);
        if (state.workflowStep === "date") return pick(["next week sometime", "I don't know, what days do you have?"]);
        if (state.workflowStep === "time") return pick(["uhh, afternoon?", "what times are free?"]);
        if (state.workflowStep === "name") {
          const n = this.name();
          if (turn % 2 === 0) return n;
          return pick(["Didn't I already tell you?", n]);
        }
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(["I think so, yes", "Wait, what was the date again?", "Yes that's fine"]);
      }
      return pick(["Sorry, what?", "Can you explain that?", "I'm confused"]);
    }
  },

  indecisive: {
    id: "indecisive",
    name: "Indecisive Shopper",
    description: "Changes mind constantly, asks about multiple services, can't commit. Tests change detection.",
    traits: { followWorkflow: 0.3, provideFullInfo: 0.5, patient: 0.3, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["I'm looking into getting some dental work done", "I want to improve my smile", "I need some dental help"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") {
          const lastSvc = state.collected?.service;
          if (lastSvc && turn > 2) return pick(["Actually, I want " + pick(SERVICES.filter(s => s !== lastSvc.toLowerCase())), "On second thought, maybe " + pick(SERVICES)]);
          return pick(SERVICES);
        }
        if (state.workflowStep === "visit_type") return pick(["new patient", "existing", "I'm not sure what I am"]);
        if (state.workflowStep === "date") return pick(["Actually, next week is better", "hmm, maybe this week?", "I'm not sure about the day"]).replace(/next week/, "next week");
        if (state.workflowStep === "time") { if (Math.random() < 0.4) return "Actually, do you have anything earlier?"; return pick(TIMES); }
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") { if (Math.random() < 0.3) return "Actually, can we change the service?"; return pick(PHRASES.confirm); }
      }
      return pick(["Actually, what about", "I'm also considering"].map(p => p + " " + pick(SERVICES)));
    }
  },

  pricing_focused: {
    id: "pricing_focused",
    name: "Pricing-Focused User",
    description: "Primarily asks about costs, compares prices, asks about payment plans.",
    traits: { followWorkflow: 0.5, provideFullInfo: 0.5, patient: 0.6, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["How much does " + pick(SERVICES) + " cost?", "What are your prices?", "Can you tell me about your pricing?"]);
      if (turn < 4) return pick(["How much for " + pick(SERVICES) + "?", "What about " + pick(SERVICES) + " pricing?", "Do you offer payment plans?", "Is " + pick(SERVICES) + " covered by insurance?"]);
      if (state.activeWorkflow === "pricing") {
        if (state.workflowStep === "service") return pick(SERVICES);
      }
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["Actually, how much does that cost first?", "What's the price?"]).replace(/that/, pick(SERVICES));
        if (state.workflowStep === "date") return pick(DATES);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
      }
      return "How much?";
    }
  },

  insurance_focused: {
    id: "insurance_focused",
    name: "Insurance-Focused User",
    description: "Multiple insurance queries, asks about coverage, deductibles, in-network providers.",
    traits: { followWorkflow: 0.5, provideFullInfo: 0.7, patient: 0.7, typoRate: 0.02 },
    name: () => pick(NAMES),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Do you accept " + pick(INSURANCE) + "?", "Is " + pick(INSURANCE) + " accepted here?", "I have " + pick(INSURANCE) + ", are you in-network?"]);
      if (turn < 5 && Math.random() < 0.5) return pick(["What about " + pick(INSURANCE) + "?", "Do you take other insurances too?", "What's my copay likely to be?"]);
      if (state.activeWorkflow === "insurance") {
        if (state.workflowStep === "provider") return pick(INSURANCE);
        if (state.workflowStep === "member_info") return "My member ID is " + pick(["ABC123456", "XYZ789012", "DEN345678"]);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "confirm_insurance") return pick(PHRASES.confirm);
      }
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "confirm") return pick(PHRASES.confirm);
        return pick(["Does it cover ", "Will my insurance pay for "].map(p => p + pick(SERVICES) + "?"));
      }
      return "Do you accept " + pick(INSURANCE) + "?";
    }
  },

  elderly: {
    id: "elderly",
    name: "Elderly Patient",
    description: "Slower pace, prefers phone contact, may need simpler language, asks about Medicare.",
    traits: { followWorkflow: 0.8, provideFullInfo: 0.9, patient: 0.95, typoRate: 0.06 },
    name: () => pick(["Harold Wilson", "Martha Stewart", "George Patterson", "Betty White"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["Hello, I need to schedule a dental visit", "Hi there, I'm looking for a dentist", "Good day, I need some dental work done"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return pick(["A regular cleaning please", "I need my teeth cleaned", "A checkup"]);
        if (state.workflowStep === "visit_type") return pick(["I'm a new patient", "I haven't been before"]);
        if (state.workflowStep === "date") return pick(["next Monday", "this Thursday", "Wednesday if possible"]);
        if (state.workflowStep === "time") return pick(["10 in the morning", "after lunch, about 1?", "morning time"]);
        if (state.workflowStep === "name") return this.name();
        if (state.workflowStep === "phone") return pick(["555-123-4567", "(555) 234-5678"]);
        if (state.workflowStep === "confirm") return pick(["Yes that looks fine", "That's good, thank you dear", "Yes please"]);
      }
      if (turn > 2 && !state.activeWorkflow && Math.random() < 0.4) return pick(["Could you repeat that?", "I'm sorry, what was that?", "A little slower please?"]);
      if (state.activeWorkflow === "insurance" && Math.random() < 0.4) return "Do you take Medicare or Medicaid?";
      return pick(["I'd like to book please", "Can you help me schedule?"]);
    }
  },

  confused_parent: {
    id: "confused_parent",
    name: "Anxious Parent",
    description: "Worried about child's dental health, asks many questions before committing.",
    traits: { followWorkflow: 0.5, provideFullInfo: 0.7, patient: 0.5, typoRate: 0.03 },
    name: () => pick(["Rachel Green", "Amy Johnson", "Chris Miller"]),
    generateMessage(turn, state) {
      if (turn === 0) return pick(["I'm worried about my child's teeth", "My little one has a toothache", "I need to bring my daughter in"]);
      if (turn < 4 && Math.random() < 0.5) return pick(["Is the dentist good with kids?", "What if my child is scared?", "Do you have children's toys?", "How long does a kid's visit take?"]);
      if (state.activeWorkflow === "appointment_booking") {
        if (state.workflowStep === "service") return "pediatric dentistry for my " + pick(["son", "daughter", "child"]);
        if (state.workflowStep === "visit_type") return "My child is a new patient";
        if (state.workflowStep === "date") return pick(DATES);
        if (state.workflowStep === "time") return pick(TIMES);
        if (state.workflowStep === "name") return pick(["Liam", "Emma", "Noah", "Olivia"]);
        if (state.workflowStep === "phone") return pick(PHONES);
        if (state.workflowStep === "confirm") return pick(["Yes, let's do it", "Okay, book it"]).concat(PHRASES.confirm);
      }
      return pick(["Is it safe for my child?", "Will it hurt?", "How should I prepare my kid?"]);
    }
  }
};

function getAllPersonas() { return Object.values(personas); }

function getPersona(id) { return personas[id] || null; }

function pickPersona() { return pick(getAllPersonas()); }

module.exports = { personas, getAllPersonas, getPersona, pickPersona, PHRASES, pick, SERVICES, NAMES, PHONES, INSURANCE, TIMES, DATES };