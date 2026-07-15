const { isConfirmation, isDeclination, isGreeting, SERVICES } = require("./entity-extractor");

function classifyIntent(message, context) {
  const text = message.toLowerCase().trim();
  const activeWorkflow = context.activeWorkflow;
  const lastIntent = context.lastIntent;
  const history = context.history || [];

  if (!text) return { intent: "unknown", confidence: 0 };

  const isConfirm = isConfirmation(text);
  const isDecline = isDeclination(text);
  const isHello = isGreeting(text);

  if (isHello) {
    if (activeWorkflow && activeWorkflow !== "greeting") {
      return { intent: "continue_workflow", confidence: 0.9 };
    }
    return { intent: "greeting", confidence: 0.95 };
  }

  if (activeWorkflow && (isConfirm || text === "continue" || text === "yes please" || text === "book it" || text === "do it" || text === "let's do it")) {
    return { intent: "confirm_workflow", confidence: 0.95, workflow: activeWorkflow };
  }

  if (activeWorkflow && isDecline) {
    return { intent: "decline_workflow", confidence: 0.9, workflow: activeWorkflow };
  }

  const scores = {
    appointment_booking: 0,
    lead_capture: 0,
    pricing: 0,
    insurance: 0,
    emergency: 0,
    general_faq: 0,
    reschedule: 0,
    business_info: 0,
    clarification: 0
  };

  const has = (pattern) => new RegExp(pattern, "i").test(text);

  if (has("emergency|toothache|pain|hurts?|hurt(ing)?|urgent|bleeding|swelling|broken tooth|cracked tooth|dental emergency|my tooth")) {
    scores.emergency += 20;
  }

  if (has("appointment|book|schedule|reserve|checkup|cleaning|visit|come in")) {
    if (has("reschedule|rescheduling|move my|change my|something came up")) {
      scores.reschedule += 18;
    } else if (has("cancel")) {
      scores.general_faq += 5;
    } else {
      scores.appointment_booking += 15;
    }
  }

  if (has("insurance|coverage|delta dental|metlife|cigna|aetna|blue cross|united healthcare|in.?network|out.?of.?pocket|deductible|copay|claim|do you accept|do you take")) {
    scores.insurance += 14;
  }

  if (has("how much|cost|price|pricing|fee|charges?|rates?|\\$\\d+|afford|expensive|cheap|financ")) {
    scores.pricing += 12;
  }

  if (has("hours|open|close|location|address|phone|where are|weekend|saturday|sunday|parking|direction")) {
    scores.business_info += 8;
  }

  if (has("sign up|contact|call|email|more info|interested in|i'd like|newsletter|promo|reach me")) {
    scores.lead_capture += 10;
  }

  if (has("what is|what are|how (long|often|does|do)|tell me|do you offer|what about|question|how does")) {
    scores.general_faq += 5;
  }

  if (text.includes("need") && text.length < 30) {
    scores.appointment_booking += 3;
    scores.general_faq += 2;
  }

  if (/^(?:i need|i want|i\'d like|can i|could i|i was wondering)/i.test(text) && !has("info|question|about")) {
    scores.appointment_booking += 5;
  }

  if (text.length < 4 && !isConfirm && !isDecline && !isHello) {
    scores.clarification += 20;
  }

  const matchedServices = SERVICES.filter(s => text.includes(s));
  const dedupedServices = matchedServices.filter(s => !matchedServices.some(other => other !== s && other.includes(s)));
  if (dedupedServices.length > 0) {
    if (dedupedServices.length >= 2 || has("interested in") || (has("interested") && /book|schedule|appointment|need|want/i.test(text))) {
      scores.appointment_booking += 15;
    } else {
      const hasBooking = scores.appointment_booking >= 5;
      if (!hasBooking) {
        scores.general_faq += 8;
        scores.pricing += 4;
      } else {
        scores.appointment_booking += 5;
      }
    }
  }

  if (activeWorkflow && activeWorkflow !== "greeting") {
    scores[activeWorkflow] = (scores[activeWorkflow] || 0) * 1.3 + 5;
  }

  if (lastIntent === "pricing" && scores.pricing === 0 && text.length > 3 && !isConfirm && !isDecline) {
    scores.general_faq += 3;
  }

  if (lastIntent === "appointment_booking" && scores.appointment_booking === 0 && text.length > 3 && !isConfirm && !isDecline) {
    scores.clarification += 4;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];

  if (top[1] === 0) {
    if (text.length < 5) return { intent: "clarify", confidence: 0.3 };
    return { intent: "general_faq", confidence: 0.2 };
  }

  const totalScore = sorted.reduce((s, [, v]) => s + v, 0);
  const confidence = Math.min(top[1] / Math.max(totalScore, 1), 1);

  if (isConfirm && activeWorkflow) {
    return { intent: "confirm_workflow", confidence: 0.95, workflow: activeWorkflow };
  }

  return { intent: top[0], confidence, runnersUp: sorted.slice(0, 3) };
}

module.exports = { classifyIntent };
