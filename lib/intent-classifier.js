const { isConfirmation, isDeclination, isGreeting, SERVICES } = require("./entity-extractor");
const TAXONOMY = require("../data/intents.json");

function classifyIntent(message, context) {
  const text = message.toLowerCase().trim();
  const activeWorkflow = context.activeWorkflow;
  const lastIntent = context.lastIntent;
  const history = context.history || [];

  if (!text) return { intent: "unknown", route: "unknown", confidence: 0, taxonomy: "unknown" };

  const isConfirm = isConfirmation(text);
  const isDecline = isDeclination(text);
  const isHello = isGreeting(text);

  if (isHello) {
    if (activeWorkflow && activeWorkflow !== "greeting") {
      return { intent: "continue_workflow", route: "continue", confidence: 0.9, taxonomy: "greeting" };
    }
    return { intent: "greeting", route: "greeting", confidence: 0.95, taxonomy: "greeting" };
  }

  if (activeWorkflow && (isConfirm || text === "continue" || text === "yes please" || text === "book it" || text === "do it" || text === "let's do it")) {
    return { intent: "confirm_workflow", route: "confirm", confidence: 0.95, workflow: activeWorkflow, taxonomy: "confirm" };
  }

  if (activeWorkflow && isDecline) {
    return { intent: "decline_workflow", route: "decline", confidence: 0.9, workflow: activeWorkflow, taxonomy: "decline" };
  }

  const scores = {};
  for (const intent of TAXONOMY.intents) scores[intent.label] = 0;

  const matches = (pattern) => new RegExp(pattern, "i").test(text);

  for (const intent of TAXONOMY.intents) {
    let hit = false;
    for (const p of intent.patterns) {
      if (matches(p)) { scores[intent.label] += intent.weight; hit = true; }
    }
    if (hit && Array.isArray(intent.exclude)) {
      for (const ex of intent.exclude) {
        if (matches(ex)) { scores[intent.label] = 0; break; }
      }
    }
  }

  if (text.length < 4 && !isConfirm && !isDecline && !isHello) {
    scores.clarification = (scores.clarification || 0) + 20;
  }

  for (const sig of (TAXONOMY.genericSignals || [])) {
    if (sig.maxLen && text.length > sig.maxLen) continue;
    if (!new RegExp(sig.pattern, "i").test(text)) continue;
    if (sig.exclude && new RegExp(sig.exclude, "i").test(text)) continue;
    for (const [intent, w] of Object.entries(sig.scores)) {
      if (typeof scores[intent] === "number") scores[intent] += w;
    }
  }

  const matchedServices = SERVICES.filter(s => text.includes(s));
  const dedupedServices = matchedServices.filter(s => !matchedServices.some(other => other !== s && other.includes(s)));
  if (dedupedServices.length > 0) {
    if (dedupedServices.length >= 2 || matches("interested in") || (matches("interested") && /book|schedule|appointment|need|want/i.test(text))) {
      scores.appointment_booking += TAXONOMY.serviceMatch.multiBookingWeight;
    } else {
      const hasBooking = scores.appointment_booking >= 5;
      if (!hasBooking) {
        scores.faq += TAXONOMY.serviceMatch.singleFaqWeight;
        scores.pricing += TAXONOMY.serviceMatch.singlePricingWeight;
      } else {
        scores.appointment_booking += 5;
      }
    }
  }

  if (activeWorkflow && activeWorkflow !== "greeting" && typeof scores[activeWorkflow] === "number") {
    scores[activeWorkflow] = scores[activeWorkflow] * TAXONOMY.contextBoost.activeWorkflowMultiplier + TAXONOMY.contextBoost.activeWorkflowAdd;
  }

  if (lastIntent === "pricing" && (scores.pricing || 0) === 0 && text.length > 3 && !isConfirm && !isDecline) {
    scores.faq += TAXONOMY.contextBoost.lastIntentPricingAdd;
  }

  if (lastIntent === "appointment_booking" && (scores.appointment_booking || 0) === 0 && text.length > 3 && !isConfirm && !isDecline) {
    scores.clarification = (scores.clarification || 0) + TAXONOMY.contextBoost.lastIntentClarificationAdd;
  }

  const sorted = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];

  if (!top) {
    if (text.length < 5) return { intent: "clarify", route: "general", confidence: 0.3, taxonomy: "clarify", suggestions: defaultSuggestions() };
    return { intent: "faq", route: "general", confidence: 0.2, taxonomy: "faq", suggestions: defaultSuggestions() };
  }

  const totalScore = sorted.reduce((s, [, v]) => s + v, 0);
  const confidence = Math.min(top[1] / Math.max(totalScore, 1), 1);

  function labelToIntent(label) {
    return TAXONOMY.intents.find(i => i.label === label);
  }

  function defaultSuggestions() {
    return (TAXONOMY.defaultSuggestions || [])
      .map(label => labelToIntent(label))
      .filter(Boolean)
      .slice(0, 4)
      .map(d => ({ label: d.label, text: d.suggest }));
  }

  const topDef = labelToIntent(top[0]);

  if (isConfirm && activeWorkflow) {
    return { intent: "confirm_workflow", route: "confirm", confidence: 0.95, workflow: activeWorkflow, taxonomy: "confirm" };
  }

  const route = topDef ? topDef.route : "general";
  const runnersUp = sorted.slice(1, 4).map(([label, score]) => {
    const d = labelToIntent(label);
    return { label, score, route: d ? d.route : "general", suggest: d ? d.suggest : label };
  });

  let suggestions = null;
  if (confidence < TAXONOMY.thresholds.lowConfidence && route !== "unknown") {
    const seen = new Set([route]);
    suggestions = runnersUp
      .filter(r => r.route !== "general" || (r.label !== "faq" && r.label !== "clarify"))
      .filter(r => { if (seen.has(r.route)) return false; seen.add(r.route); return true; })
      .slice(0, 3)
      .map(r => ({ label: r.label, text: r.suggest }));
  }

  return {
    intent: top[0],
    route,
    confidence,
    runnersUp,
    taxonomy: top[0],
    suggestions
  };
}

module.exports = { classifyIntent };
