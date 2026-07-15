const { extractEntities, isConfirmation, isChangeRequest } = require("./entity-extractor");

function createFlows(knowledge) {
  const clinic = knowledge.getClinicInfo();
  const services = knowledge.getServiceList();

  function getServiceForFlow(userText, collected) {
    if (collected.service) return collected.service;
    const entities = extractEntities(userText);
    const known = entities.services.find(s => s !== "");
    if (known) {
      const canonical = knowledge.findService(known);
      if (canonical) return canonical.name;
      return known;
    }
    const svc = knowledge.findService(userText);
    if (svc) return svc.name;
    return null;
  }

  function getMultipleServices(userText) {
    const entities = extractEntities(userText);
    const raw = entities.services.filter(s => s !== "");
    const deduped = raw.filter(s => !raw.some(other => other !== s && other.includes(s)));
    return deduped;
  }

  function formatServiceList() {
    return services.map(s => `- ${s.name} (${s.price}, ${s.duration})`).join("\n");
  }

  function formatTimeOptions() {
    return "9:00 AM, 10:00 AM, 11:00 AM, 1:00 PM, 2:00 PM, 3:00 PM, 4:00 PM";
  }

  function formatContact(collected) {
    const method = collected.contactMethod || "phone";
    const value = collected.contactValue || "";
    return method === "phone" ? value : `${value} (via ${method})`;
  }

  function detectAndHandleChange(text, state, validSteps) {
    const lower = text.toLowerCase();
    if (!isChangeRequest(text) && !(/no/i.test(lower) && !isConfirmation(text))) return null;
    const entities = extractEntities(text);
    if (entities.services.length > 0 && state.collected.service && entities.services[0] !== state.collected.service) {
      state.retries = state.retries || {};
      state.retries.serviceChanges = (state.retries.serviceChanges || 0) + 1;
      if (state.retries.serviceChanges > 3) {
        return null;
      }
      state.collected.service = entities.services[0];
      state.collected.patientType = undefined;
      state.collected.date = undefined;
      state.collected.time = undefined;
      state.collected.name = undefined;
      state.collected.contactMethod = undefined;
      state.collected.contactValue = undefined;
      state.step = "visit_type";
      return "visit_type";
    }
    if (entities.dates.length > 0 && state.collected.date) {
      state.collected.date = entities.dates[0];
      state.collected.time = undefined;
      if (validSteps.includes("time")) { state.step = "time"; return "time"; }
    }
    if (entities.times.length > 0 && state.collected.time) {
      const t = entities.times[0];
      let hour = t.hour;
      const min = String(t.minute).padStart(2, "0");
      if (t.ampm === "pm" && hour < 12) hour += 12;
      if (t.ampm === "am" && hour === 12) hour = 0;
      const newTime = `${String(hour).padStart(2, "0")}:${min}`;
      if (newTime !== state.collected.time) {
        state.collected.time = newTime;
        if (validSteps.includes("confirm")) { state.step = "confirm"; return "confirm"; }
        if (validSteps.includes("name")) { state.step = "name"; return "name"; }
      }
    }
    if (/service/i.test(lower) && validSteps.includes("service")) { state.step = "service"; state.collected.service = undefined; return "service"; }
    if (/(?:date|day)/i.test(lower) && validSteps.includes("date")) { state.step = "date"; return "date"; }
    if (/time/i.test(lower) && validSteps.includes("time")) { state.step = "time"; return "time"; }
    if (/name/i.test(lower) && validSteps.includes("name")) { state.step = "name"; return "name"; }
    if (/(?:phone|contact|email|whatsapp|sms|number)/i.test(lower) && validSteps.includes("phone")) { state.step = "phone"; return "phone"; }
    return null;
  }

  function parseNameFromText(text) {
    const cleaned = text.trim().replace(/^(?:my name is|i'm|i am|it's|this is|called)\s+/i, "").trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 1 && words.length <= 4 && /^[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*$/.test(cleaned)) {
      return { name: cleaned, confident: true };
    }
    const cappedWords = words.filter(w => /^[A-Z]/.test(w));
    if (cappedWords.length >= 1 && cappedWords.length <= 4) {
      const guess = cappedWords.join(" ");
      if (guess.length >= 2) return { name: guess, confident: false };
    }
    if (words.length >= 1 && words.length <= 4 && words.every(w => w.length >= 2)) {
      const guess = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      if (guess.length >= 2) return { name: guess, confident: false };
    }
    return { name: null, confident: false };
  }

  function buildConfirmSummary(state) {
    const d = state.collected.date;
    const t = state.collected.time;
    const dateDisplay = d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "TBD";
    const timeDisplay = t ? new Date(`2000-01-01T${t}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD";
    const contact = formatContact(state.collected);
    return `Let me confirm everything:\n\nPatient: ${state.collected.name}\nService: ${state.collected.service}\nDate: ${dateDisplay}\nTime: ${timeDisplay}\nContact: ${contact}\n\nDoes everything look good?`;
  }

  function extractContactFromText(text, state) {
    const entities = extractEntities(text);
    let value = null;
    let method = "phone";

    if (entities.contactPreference) {
      method = entities.contactPreference;
    }

    if (entities.phones.length > 0) {
      value = entities.phones[0];
    } else if (entities.emails.length > 0) {
      value = entities.emails[0];
      if (!entities.contactPreference) method = "email";
    } else {
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 7) {
        value = digits;
      } else if (/@/.test(text)) {
        value = text.trim();
        method = "email";
      }
    }

    if (value) {
      state.collected.contactMethod = method;
      state.collected.contactValue = value;
      return true;
    }
    return false;
  }

  function getNameStepRetry(state) {
    state.retries = state.retries || {};
    state.retries.name = (state.retries.name || 0) + 1;
    if (state.retries.name >= 3) {
      state.step = "offer_recovery";
      return "I'm having trouble understanding the name. Would you like to start over or would you prefer to call the clinic directly at " + clinic.phone + "?";
    }
    return null;
  }

  const flows = {
    appointment_booking: {
      name: "Appointment Booking",
      initialState: { status: "in_progress", step: "service", collected: {}, retries: {} },
      steps: {
        service: {
          prompt: "I'd be happy to help book an appointment! What service are you looking for? We offer:\n" + formatServiceList(),
          process(text, state) {
            const matches = getMultipleServices(text);
            if (matches.length > 1) {
              if (!state.collected.service) {
                return "I see you're interested in " + matches.length + " services: " + matches.join(", ") + ". Which one would you like to schedule first?";
              }
            }
            const svc = getServiceForFlow(text, state.collected);
            if (svc) {
              state.collected.service = svc;
              state.step = "visit_type";
              return null;
            }
            const lower = text.toLowerCase();
            if (/child|kid|children|pediatric/i.test(lower)) {
              state.collected.service = "Pediatric Dentistry";
              state.step = "visit_type";
              return null;
            }
            if (/existing|returning|follow.up/i.test(lower)) {
              state.collected.service = "Follow-up Visit";
              state.step = "visit_type";
              return null;
            }
            if (/new|first.time/i.test(lower)) {
              state.collected.service = "New Patient Exam";
              state.step = "visit_type";
              return null;
            }
            return "I didn't quite catch which service you need. Here's what we offer:\n" + formatServiceList() + "\n\nJust let me know what you're interested in!";
          }
        },
        visit_type: {
          prompt(text, state) {
            return `Great, ${state.collected.service}! Are you a new patient or an existing patient?`;
          },
          process(text, state) {
            const changeResult = detectAndHandleChange(text, state, ["service", "date", "time", "name", "phone"]);
            if (changeResult) return null;
            const lower = text.toLowerCase();
            if (/new|first.time/.test(lower)) {
              state.collected.patientType = "new";
              state.step = "date";
              return null;
            }
            if (/existing|returning/.test(lower)) {
              state.collected.patientType = "existing";
              state.step = "date";
              return null;
            }
            state.collected.patientType = "new";
            state.step = "date";
            return null;
          }
        },
        date: {
          prompt(text, state) {
            return `What day would work best for you? We're open Monday through Friday 8-6 and Saturday 9-2.`;
          },
          process(text, state) {
            const changeResult = detectAndHandleChange(text, state, ["service", "time", "name", "phone"]);
            if (changeResult) return null;
            const entities = extractEntities(text);
            if (entities.dates.length > 0) {
              state.collected.date = entities.dates[0];
              state.step = "time";
              return null;
            }
            if (/today/i.test(text)) {
              state.collected.date = new Date().toISOString().slice(0, 10);
              state.step = "time";
              return null;
            }
            return "I'm sorry, I didn't catch the date. Could you tell me which day works for you? For example: \"Monday\", \"tomorrow\", or \"this Thursday\".";
          }
        },
        time: {
          prompt(text, state) {
            const dayName = state.collected.date
              ? new Date(state.collected.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })
              : "that day";
            return `Great! What time works best on ${dayName}? We have openings at ${formatTimeOptions()}.`;
          },
          process(text, state) {
            const changeResult = detectAndHandleChange(text, state, ["service", "date", "name", "phone"]);
            if (changeResult) return null;
            const entities = extractEntities(text);
            if (entities.times.length > 0) {
              const t = entities.times[0];
              let hour = t.hour;
              const min = String(t.minute).padStart(2, "0");
              if (t.ampm === "pm" && hour < 12) hour += 12;
              if (t.ampm === "am" && hour === 12) hour = 0;
              state.collected.time = `${String(hour).padStart(2, "0")}:${min}`;
              state.step = "name";
              return null;
            }
            const knownTimes = text.match(/\b(9|10|11|1|2|3|4)(?::(00|15|30|45))?\s*(am|pm)?\b/i);
            if (knownTimes) {
              let h = parseInt(knownTimes[1]);
              const m = knownTimes[2] || "00";
              const ap = (knownTimes[3] || "").toLowerCase();
              if (ap === "pm" && h < 12) h += 12;
              if (ap === "am" && h === 12) h = 0;
              state.collected.time = `${String(h).padStart(2, "0")}:${m}`;
              state.step = "name";
              return null;
            }
            return "I didn't quite get the time. Our available slots are " + formatTimeOptions() + ". Which works for you?";
          }
        },
        name: {
          prompt(text, state) {
            return "Great! And what name should I put the appointment under?";
          },
          process(text, state) {
            const changeResult = detectAndHandleChange(text, state, ["service", "date", "time", "phone"]);
            if (changeResult) return null;
            const entities = extractEntities(text);
            if (entities.names.length > 0) {
              state.collected.name = entities.names[0];
              state.step = "phone";
              state.retries.name = 0;
              return null;
            }
            const parsed = parseNameFromText(text);
            if (parsed.name) {
              if (parsed.confident) {
                state.collected.name = parsed.name;
                state.step = "phone";
                state.retries.name = 0;
                return null;
              }
              state.collected.pendingName = parsed.name;
              state.step = "confirm_name";
              return "Just to confirm — should I use the name \"" + parsed.name + "\"?";
            }
            const retryMsg = getNameStepRetry(state);
            if (retryMsg) return retryMsg;
            return "Could you please tell me your full name so I can get this booked?";
          }
        },
        confirm_name: {
          prompt(text, state) {
            return "Just to confirm — should I use the name \"" + (state.collected.pendingName || "") + "\"?";
          },
          process(text, state) {
            if (isConfirmation(text)) {
              state.collected.name = state.collected.pendingName;
              delete state.collected.pendingName;
              state.step = "phone";
              state.retries.name = 0;
              return null;
            }
            const lower = text.toLowerCase();
            if (/no|different|wrong|actually/i.test(lower)) {
              delete state.collected.pendingName;
              state.step = "name";
              return "I apologize. Could you please tell me your full name?";
            }
            const parsed = parseNameFromText(text);
            if (parsed.name) {
              state.collected.pendingName = parsed.name;
              return "How about \"" + parsed.name + "\"? Does that look right?";
            }
            state.collected.name = state.collected.pendingName || "Valued Patient";
            delete state.collected.pendingName;
            state.step = "phone";
            state.retries.name = 0;
            return null;
          }
        },
        phone: {
          prompt(text, state) {
            return `Thanks, ${state.collected.name}! What's the best way to reach you? Phone, email, WhatsApp, or SMS?`;
          },
          process(text, state) {
            const changeResult = detectAndHandleChange(text, state, ["service", "date", "time", "name", "confirm"]);
            if (changeResult) return null;
            if (extractContactFromText(text, state)) {
              state.step = "confirm";
              return null;
            }
            return "I need a way to confirm your appointment. What's the best contact method — phone, email, WhatsApp, or SMS?";
          }
        },
        confirm: {
          prompt(text, state) {
            return buildConfirmSummary(state);
          },
          process(text, state) {
            if (isConfirmation(text) || /looks? (good|great)|perfect|correct|that('s| is) right|book it/i.test(text)) {
              state.status = "completed";
              return null;
            }
            const lower = text.toLowerCase();
            if (/change|wrong|different|actually|no/i.test(lower)) {
              if (/service/i.test(lower)) { state.step = "service"; return null; }
              if (/date|day/i.test(lower)) { state.step = "date"; return null; }
              if (/time/i.test(lower)) { state.step = "time"; return null; }
              if (/name/i.test(lower)) { state.step = "name"; return null; }
              if (/phone|contact|email|whatsapp|sms|number/i.test(lower)) { state.step = "phone"; return null; }
              state.step = "service";
              return null;
            }
            state.status = "completed";
            return null;
          }
        },
        offer_recovery: {
          process(text, state) {
            const lower = text.toLowerCase();
            if (/start over|restart|try again/i.test(lower)) {
              Object.keys(state.collected).forEach(k => delete state.collected[k]);
              state.retries = {};
              state.step = "service";
              return null;
            }
            if (/clinic|phone|call|speak/i.test(lower)) {
              state.collected._recoveryToClinic = true;
              state.status = "completed";
              return null;
            }
            state.step = "service";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        if (state.collected._recoveryToClinic) {
          return "No problem at all! You can reach BrightSmile Dental Care directly at " + clinic.phone + ". Our team will be happy to help you. Is there anything else I can help with?";
        }
        if (!state.collected.name || !state.collected.service) {
          return "Is there anything else I can help with?";
        }
        const d = state.collected.date;
        const t = state.collected.time;
        const dateDisplay = d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "TBD";
        const timeDisplay = t ? new Date(`2000-01-01T${t}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD";
        const contact = formatContact(state.collected);
        return `Wonderful! Your appointment is confirmed:\n\n${state.collected.name}\n${state.collected.service}\n${dateDisplay} at ${timeDisplay}\n\nWe'll reach you via ${contact}. Is there anything else I can help with?`;
      }
    },

    lead_capture: {
      name: "Lead Capture",
      initialState: { status: "in_progress", step: "name", collected: {}, retries: {} },
      steps: {
        name: {
          prompt: "I'd love to get you connected with our team! Could I start with your name?",
          process(text, state) {
            const entities = extractEntities(text);
            if (entities.names.length > 0) {
              state.collected.name = entities.names[0];
              state.step = "contact";
              state.retries.name = 0;
              return null;
            }
            const parsed = parseNameFromText(text);
            if (parsed.name) {
              if (parsed.confident) {
                state.collected.name = parsed.name;
                state.step = "contact";
                state.retries.name = 0;
                return null;
              }
              state.collected.pendingName = parsed.name;
              state.step = "confirm_name";
              return "Just to check — is your name \"" + parsed.name + "\"?";
            }
            const retryMsg = getNameStepRetry(state);
            if (retryMsg) return retryMsg;
            return "No problem! Could you share your name so I know who to connect with?";
          }
        },
        confirm_name: {
          prompt(text, state) {
            return "Just to check — is your name \"" + (state.collected.pendingName || "") + "\"?";
          },
          process(text, state) {
            if (isConfirmation(text)) {
              state.collected.name = state.collected.pendingName;
              delete state.collected.pendingName;
              state.step = "contact";
              state.retries.name = 0;
              return null;
            }
            if (/no|different|wrong|actually/i.test(text.toLowerCase())) {
              delete state.collected.pendingName;
              state.step = "name";
              return "I apologize. Could you tell me your name?";
            }
            state.collected.name = state.collected.pendingName || "Valued Patient";
            delete state.collected.pendingName;
            state.step = "contact";
            state.retries.name = 0;
            return null;
          }
        },
        contact: {
          prompt(text, state) {
            return `Thanks, ${state.collected.name}! What's the best way to reach you — phone, email, WhatsApp, or SMS?`;
          },
          process(text, state) {
            if (extractContactFromText(text, state)) {
              state.step = "interest";
              return null;
            }
            return "Either a phone number or email works! What's easiest for you?";
          }
        },
        interest: {
          prompt(text, state) {
            return "Great! And what service are you interested in?";
          },
          process(text, state) {
            const matches = getMultipleServices(text);
            if (matches.length > 1) {
              if (!state.collected.service) {
                return "I see you mentioned " + matches.join(" and ") + ". Which one are you most interested in?";
              }
            }
            const svc = getServiceForFlow(text, state.collected);
            if (svc) {
              state.collected.service = svc;
              state.step = "confirm_lead";
              return null;
            }
            if (/not sure|general|just browsing|i don't know/i.test(text)) {
              state.collected.service = "General Inquiry";
              state.step = "confirm_lead";
              return null;
            }
            const entities = extractEntities(text);
            if (entities.services.length > 0) {
              state.collected.service = entities.services[0];
              state.step = "confirm_lead";
              return null;
            }
            state.collected.service = "General Inquiry";
            state.step = "confirm_lead";
            return null;
          }
        },
        confirm_lead: {
          prompt(text, state) {
            const contact = formatContact(state.collected);
            return `Let me confirm:\n\nName: ${state.collected.name}\nContact: ${contact}\nInterest: ${state.collected.service || "General Inquiry"}\n\nWould you like to submit this information?`;
          },
          process(text, state) {
            if (isConfirmation(text)) {
              state.status = "completed";
              return null;
            }
            const lower = text.toLowerCase();
            if (/change|wrong|different|actually|no/i.test(lower)) {
              if (/name/i.test(lower)) { state.step = "name"; return null; }
              if (/phone|contact|email|whatsapp|sms|number/i.test(lower)) { state.step = "contact"; return null; }
              if (/service|interest/i.test(lower)) { state.step = "interest"; return null; }
              state.step = "name";
              return null;
            }
            state.status = "completed";
            return null;
          }
        },
        offer_recovery: {
          process(text, state) {
            const lower = text.toLowerCase();
            if (/start over|restart|try again/i.test(lower)) {
              Object.keys(state.collected).forEach(k => delete state.collected[k]);
              state.retries = {};
              state.step = "name";
              return null;
            }
            if (/clinic|phone|call|speak/i.test(lower)) {
              state.collected._recoveryToClinic = true;
              state.status = "completed";
              return null;
            }
            state.step = "name";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        if (state.collected._recoveryToClinic) {
          return "No problem! You can reach BrightSmile Dental Care directly at " + clinic.phone + ". A team member will assist you. Is there anything else I can help with?";
        }
        if (!state.collected.name) {
          return "Is there anything else I can help with?";
        }
        const contact = formatContact(state.collected);
        return `Thank you, ${state.collected.name}! I've shared your information with our team. Someone will reach out to you at ${contact} about ${state.collected.service || "your interest"}. Is there anything else I can help with?`;
      }
    },

    pricing: {
      name: "Pricing Inquiry",
      initialState: { status: "in_progress", step: "service", collected: {} },
      steps: {
        service: {
          process(text, state) {
            const matches = getMultipleServices(text);
            if (matches.length > 1) {
              if (!state.collected.service) {
                return "I see you mentioned " + matches.join(" and ") + ". Which one would you like pricing for?";
              }
            }
            const svc = getServiceForFlow(text, state.collected);
            if (svc) {
              state.collected.service = svc;
              state.step = "show_pricing";
              return null;
            }
            return null;
          }
        },
        show_pricing: {
          process(text, state) {
            state.status = "completed";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        const svc = knowledge.findService(state.collected.service);
        if (svc) {
          return `For ${svc.name}, our price is ${svc.price} and the appointment typically takes ${svc.duration}. We also offer payment plans through CareCredit if needed.\n\nWould you like to book an appointment for this?`;
        }
        const list = services.map(s => `${s.name}: ${s.price}`).join("\n");
        return `Here's our pricing:\n${list}\n\nWhich service are you interested in learning more about?`;
      }
    },

    insurance: {
      name: "Insurance Verification",
      initialState: { status: "in_progress", step: "provider", collected: {} },
      steps: {
        provider: {
          process(text, state) {
            const provider = knowledge.findInsurance(text);
            if (provider) {
              state.collected.provider = provider;
              state.step = "member_info";
              return null;
            }
            return "I'm not sure I caught the insurance provider. Could you tell me the name of your insurance company? We accept Delta Dental, MetLife, Cigna, Aetna, Blue Cross, and many others.";
          }
        },
        member_info: {
          prompt(text, state) {
            return `Great, ${state.collected.provider}! Could you share your member ID so I can look up your specific coverage details?`;
          },
          process(text, state) {
            const idMatch = text.match(/\b([A-Z]{2,}\d{3,}|[A-Z]\d{5,}|\d{5,})\b/i);
            const id = idMatch ? idMatch[1] : text.trim();
            if (id.length > 3) {
              state.collected.memberId = id;
              state.step = "name";
              return null;
            }
            return "I'll need your member ID to verify coverage. It's usually on your insurance card.";
          }
        },
        name: {
          prompt(text, state) {
            return "Thanks! And your full name for the verification?";
          },
          process(text, state) {
            const entities = extractEntities(text);
            if (entities.names.length > 0) {
              state.collected.name = entities.names[0];
              state.step = "confirm_insurance";
              return null;
            }
            const parsed = parseNameFromText(text);
            if (parsed.name) {
              state.collected.name = parsed.name;
              state.step = "confirm_insurance";
              return null;
            }
            state.collected.name = text.trim();
            state.step = "confirm_insurance";
            return null;
          }
        },
        confirm_insurance: {
          prompt(text, state) {
            return `Let me confirm:\n\nProvider: ${state.collected.provider}\nMember ID: ${state.collected.memberId}\nName: ${state.collected.name}\n\nWould you like me to submit this for verification?`;
          },
          process(text, state) {
            if (isConfirmation(text)) {
              state.status = "completed";
              return null;
            }
            const lower = text.toLowerCase();
            if (/change|wrong|different|actually|no/i.test(lower)) {
              if (/provider|insurance/i.test(lower)) { state.step = "provider"; return null; }
              if (/member|id|number/i.test(lower)) { state.step = "member_info"; return null; }
              if (/name/i.test(lower)) { state.step = "name"; return null; }
              state.step = "provider";
              return null;
            }
            state.status = "completed";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        return `Thank you, ${state.collected.name}! I've submitted your ${state.collected.provider} (member ID: ${state.collected.memberId || "provided"}) to our verification team. You'll receive a confirmation with your coverage details within 1-2 hours.\n\nWould you like to book an appointment while you wait?`;
      }
    },

    emergency: {
      name: "Emergency Triage",
      initialState: { status: "in_progress", step: "assess", collected: {} },
      steps: {
        assess: {
          process(text, state) {
            const lower = text.toLowerCase();
            if (/severe|bleeding|knocked.?out|broken|cracked|can'?t (stop|control)/i.test(lower)) {
              state.collected.urgency = "high";
            } else {
              state.collected.urgency = "normal";
            }
            state.step = "booking";
            return null;
          }
        },
        booking: {
          prompt(text, state) {
            const urgency = state.collected.urgency === "high"
              ? "That sounds urgent — please come in as soon as possible."
              : "I'm sorry you're not feeling well. We can get you in today.";
            return `${urgency} We have emergency slots available today at:\n- 9:00 AM\n- 11:30 AM\n- 2:00 PM\n- 4:30 PM\n\nWhich works best for you?`;
          },
          process(text, state) {
            const entities = extractEntities(text);
            if (entities.times.length > 0) {
              const t = entities.times[0];
              let hour = t.hour;
              const min = String(t.minute).padStart(2, "0");
              if (t.ampm === "pm" && hour < 12) hour += 12;
              if (t.ampm === "am" && hour === 12) hour = 0;
              state.collected.time = `${String(hour).padStart(2, "0")}:${min}`;
              state.step = "name";
              return null;
            }
            const known = text.match(/\b(9|11|2|4)\b/);
            if (known) {
              const h = parseInt(known[1]);
              state.collected.time = `${String(h >= 9 && h < 12 ? h : h + 12).padStart(2, "0")}:00`;
              state.step = "name";
              return null;
            }
            return "Our emergency slots are at 9 AM, 11:30 AM, 2 PM, and 4:30 PM. Which works best?";
          }
        },
        name: {
          prompt(text, state) {
            return "Got it! What name should I put this under?";
          },
          process(text, state) {
            const entities = extractEntities(text);
            if (entities.names.length > 0) {
              state.collected.name = entities.names[0];
              state.step = "phone";
              return null;
            }
            const parsed = parseNameFromText(text);
            if (parsed.name) {
              state.collected.name = parsed.name;
              state.step = "phone";
              return null;
            }
            state.collected.name = text.trim();
            state.step = "phone";
            return null;
          }
        },
        phone: {
          prompt(text, state) {
            return `Thanks, ${state.collected.name}! What's the best number to reach you at?`;
          },
          process(text, state) {
            if (extractContactFromText(text, state)) {
              state.step = "confirm_emergency";
              return null;
            }
            return "I'll need a contact number. What's the best phone number to reach you?";
          }
        },
        confirm_emergency: {
          prompt(text, state) {
            const timeDisplay = state.collected.time
              ? new Date(`2000-01-01T${state.collected.time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "your scheduled time";
            const dateDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            const contact = formatContact(state.collected);
            return `Let me confirm:\n\nPatient: ${state.collected.name}\nDate: Today (${dateDisplay})\nTime: ${timeDisplay}\nContact: ${contact}\n\nCan I confirm this emergency appointment?`;
          },
          process(text, state) {
            if (isConfirmation(text)) {
              state.status = "completed";
              return null;
            }
            const lower = text.toLowerCase();
            if (/change|wrong|different|actually|no/i.test(lower)) {
              if (/time/i.test(lower)) { state.step = "booking"; return null; }
              if (/name/i.test(lower)) { state.step = "name"; return null; }
              if (/phone|contact|number|email|whatsapp|sms/i.test(lower)) { state.step = "phone"; return null; }
              state.step = "booking";
              return null;
            }
            state.status = "completed";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        const timeDisplay = state.collected.time
          ? new Date(`2000-01-01T${state.collected.time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "your scheduled time";
        const dateDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        const contact = formatContact(state.collected);
        return `You're all set, ${state.collected.name}! We've booked your emergency appointment for today (${dateDisplay}) at ${timeDisplay}.\n\nWe'll contact you via ${contact}. Please bring your ID and insurance card if you have one. Our address is ${clinic.address}. Call us at ${clinic.phone} if you need anything before then.\n\nIs there anything else I can help with?`;
      }
    },

    general_faq: {
      name: "General Questions",
      initialState: { status: "in_progress", step: "answer", collected: {} },
      steps: {
        answer: {
          process(text, state) {
            const faq = knowledge.findFaq(text);
            if (faq) {
              state.collected.answer = faq.answer;
              state.collected.question = faq.question;
              state.status = "completed";
              return null;
            }
            const lower = text.toLowerCase();
            if (/hours?|open|close/i.test(lower) && !state.collected.answer) {
              state.collected.answer = `We're open ${clinic.hours}. We're located at ${clinic.address}.`;
              state.collected.question = "Office hours and location";
              state.status = "completed";
              return null;
            }
            if (/phone|call|contact|reach/i.test(lower) && !state.collected.answer) {
              state.collected.answer = `You can reach us at ${clinic.phone} or email ${clinic.email}. We're here Mon-Fri 8-6 and Sat 9-2.`;
              state.collected.question = "Contact information";
              state.status = "completed";
              return null;
            }
            if (/address|location|where/i.test(lower) && !state.collected.answer) {
              state.collected.answer = `We're located at ${clinic.address}. We're right near the new shopping center! Our hours are ${clinic.hours}.`;
              state.collected.question = "Location";
              state.status = "completed";
              return null;
            }
            const svc = knowledge.findService(text);
            if (svc && !state.collected.answer) {
              state.collected.answer = `Yes, we offer ${svc.name}. The price is ${svc.price} and takes about ${svc.duration}. Would you like more details or to book an appointment?`;
              state.collected.question = `About ${svc.name}`;
              state.status = "completed";
              return null;
            }
            state.collected.answer = null;
            state.status = "completed";
            return null;
          }
        }
      },
      generateConfirmation(state) {
        if (state.collected.answer) {
          return state.collected.answer;
        }
        return null;
      }
    }
  };

  return flows;
}

module.exports = { createFlows };