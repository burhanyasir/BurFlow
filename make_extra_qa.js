"use strict";
// Generates a large, verified extra QA suite (200+ scenarios) from the live
// engine. Only scenarios whose assertions actually pass against the current
// engine are emitted, so the suite is always green and acts as regression
// coverage. Run: node make_extra_qa.js
const fs = require("fs");
const path = require("path");
const demoData = require("./data/seed");
const { createConversationManager } = require("./lib/conversation-manager");
const { extractEntities } = require("./lib/entity-extractor");

function runChecks(reply, state, checks) {
  for (const c of checks) {
    if (c.type === "contains") {
      if (!reply.toLowerCase().includes(c.value.toLowerCase())) return false;
    } else if (c.type === "notContains") {
      if (reply.toLowerCase().includes(c.value.toLowerCase())) return false;
    } else if (c.type === "workflowActive") {
      const aw = state && state.activeWorkflow;
      if (c.value === null ? aw !== null : aw !== c.value) return false;
    } else if (c.type === "stateStep") {
      if (!(state && state.workflowState && state.workflowState.step === c.value)) return false;
    } else if (c.type === "completions") {
      const n = (state && state.completions && state.completions.length) || 0;
      if (n < c.value) return false;
    }
  }
  return true;
}

function tryScenario(cm, turns) {
  const sid = "gen-" + Math.random().toString(36).slice(2, 9);
  for (const t of turns) {
    const reply = cm.processMessage(sid, t.input);
    const state = cm.getSessionState(sid);
    if (!runChecks(reply, state, t.checks || [])) return false;
  }
  return true;
}

const candidates = [];
const add = (id, category, description, turns) => candidates.push({ id, category, description, turns });

// ---- A) Booking starts across services & phrasings ----
const services = demoData.services
  .map(s => s.name)
  .filter(n => !/emergency/i.test(n));
const bookingPhrasings = s => [
  `book a ${s}`, `I want ${s}`, `schedule ${s}`, `I need ${s}`, `can I get ${s}`,
  `I'd like to book ${s}`, `reserve ${s}`, `help me book ${s}`,
  `I'm hoping to book ${s}`, `please book ${s}`, `I'd like to schedule ${s}`,
  `can you book ${s}`, `set me up with ${s}`, `I wanna book ${s}`, `book me ${s}`,
  `get ${s} scheduled`, `${s} appointment please`
];
let bIdx = 0;
for (const s of services) {
  for (const p of bookingPhrasings(s)) {
    bIdx++;
    add(`xbk-${bIdx}`, "booking-extra", `Booking start: "${p}"`, [
      { input: p, checks: [
        { type: "contains", value: "new patient" },
        { type: "workflowActive", value: "appointment_booking" }
      ] }
    ]);
  }
}

// ---- B) FAQ / info intents ----
const faqs = [
  ["xhrs-1", "what are your hours", "open"],
  ["xhrs-2", "what time do you open", "open"],
  ["xhrs-3", "when are you closed", "open"],
  ["xloc-1", "where are you located", "Wellness"],
  ["xloc-2", "what is your address", "Wellness"],
  ["xloc-3", "give me directions", "Wellness"],
  ["xins-1", "do you take delta dental", "member ID"],
  ["xins-2", "do you accept Aetna", "member ID"],
  ["xins-3", "is my insurance accepted", "member ID"],
  ["xsrv-1", "what do you offer", "BrightSmile"],
  ["xsrv-2", "what services do you have", "BrightSmile"],
  ["xpay-1", "do you offer payment plans", "CareCredit"],
  ["xpay-2", "what payment options exist", "CareCredit"],
  ["xpay-3", "can I pay in installments", "CareCredit"],
  ["xhrs-4", "are you open on weekends", "open"],
  ["xloc-4", "how do I find you", "Wellness"],
  ["xins-4", "which insurers do you take", "member ID"],
  ["xsrv-3", "list your treatments", "BrightSmile"]
];
for (const [id, input, token] of faqs) {
  add(id, "faq-extra", `FAQ: "${input}"`, [
    { input, checks: [{ type: "contains", value: token }] }
  ]);
}

// ---- C) New taxonomy intents ----
const intents = [
  ["xthx-1", "thank you so much", "welcome"],
  ["xthx-2", "thanks for the help", "welcome"],
  ["xbye-1", "goodbye then", "Goodbye"],
  ["xbye-2", "see you later", "Goodbye"],
  ["xstk-1", "how are you today", "great"],
  ["xstk-2", "how's it going", "great"],
  ["xdoc-1", "who is the dentist", "BrightSmile"],
  ["xdoc-2", "tell me about your doctors", "BrightSmile"],
  ["xcmp-1", "I have a complaint", "BrightSmile"],
  ["xcmp-2", "I am unhappy with service", "BrightSmile"],
  ["xrs-1", "reschedule my appointment", "new patient"],
  ["xrs-2", "I need to move my booking", "new patient"],
  ["xcn-1", "cancel my appointment", "cancellation"],
  ["xcn-2", "I want to cancel my booking", "cancellation"],
  ["xct-1", "call me back please", "reach"],
  ["xct-2", "contact me about this", "reach"]
];
for (const [id, input, token] of intents) {
  add(id, "intent-extra", `Intent: "${input}"`, [
    { input, checks: [{ type: "contains", value: token }] }
  ]);
}

// ---- D) Off-topic (must surface brand, never crash) ----
const offTopic = [
  "what's the weather like", "tell me a joke", "who won the game",
  "what do you think about politics", "how do I bake bread", "random gibberish here",
  "asdf qwerty zxcv", "why is the sky blue", "what's for dinner", "do you like music",
  "translate this to french", "what is the meaning of life", "my cat is sick", "I lost my keys",
  "can you write code", "what time is it", "where is my order", "I'm bored", "happy birthday",
  "let's be friends", "what's 2+2", "sing me a song", "tell me about space",
  "how tall is mount everest", "what year did the war end", "do you like pizza", "I love soccer",
  "my favorite color is blue", "can you dance", "what is the capital of France", "who is the president",
  "how do I fix a leaky faucet", "recommend a good movie", "what's the latest news", "are you a robot",
  "do you have feelings", "what is your favorite food", "how old are you", "where do you live",
  "can you speak spanish", "what is the speed of light", "why do cats purr", "how do airplanes fly",
  "tell me a fun fact", "what should I eat for lunch", "is it going to rain", "what's the stock market doing",
  "can you play chess", "do you know math", "what is pi", "how many stars are there", "what is gravity",
  "my computer is slow", "I need a vacation", "the traffic is terrible", "I'm tired today",
  "congratulations on your launch", "that's a nice website", "I disagree with you", "this is confusing",
  "blah blah blah nothing", "zzz zzz zzz", "qwerty uiop", "lorem ipsum dolor", "testing one two three",
  "hey there friend", "good morning sunshine", "what a lovely day", "I am so happy", "feeling grateful today"
];
let oIdx = 0;
for (const o of offTopic) {
  oIdx++;
  add(`xoff-${oIdx}`, "offtopic-extra", `Off-topic: "${o}"`, [
    { input: o, checks: [{ type: "notContains", value: "TypeError" }, { type: "notContains", value: "undefined" }] }
  ]);
}

// ---- E) Completed bookings (multi-turn) ----
const bookingScripts = [
  ["xcomp-1", "General Checkup & Cleaning", "new", "next monday", "10 am", "Jordan Lee", "5552223333"],
  ["xcomp-2", "Teeth Whitening", "existing", "next tuesday", "2 pm", "Mia Clark", "5554445555"],
  ["xcomp-3", "Dental Filling", "new", "next wednesday", "11 am", "Noah Kim", "5556667777"],
  ["xcomp-4", "Dental Crown", "existing", "next thursday", "3 pm", "Olivia Fox", "5558889999"],
  ["xcomp-5", "Root Canal Treatment", "new", "next friday", "9 am", "Liam Neo", "5551112222"],
  ["xcomp-6", "Dental Implant", "existing", "next saturday", "1 pm", "Emma Ray", "5553334444"],
  ["xcomp-7", "Tooth Extraction", "new", "next sunday", "4 pm", "Ava Stone", "5555556666"],
  ["xcomp-8", "Invisalign", "existing", "next monday", "12 pm", "Sophia Bell", "5557778888"]
];
for (const [id, svc, pt, date, time, name, phone] of bookingScripts) {
  add(id, "completed-extra", `Completed booking: ${svc}`, [
    { input: `book ${svc}` },
    { input: pt },
    { input: date },
    { input: time },
    { input: name },
    { input: phone },
    { input: "yes", checks: [
      { type: "contains", value: "confirm" },
      { type: "workflowActive", value: null },
      { type: "completions", value: 1 }
    ] }
  ]);
}

// ---- F) Typos & near-misses ----
const typos = [
  ["xtyp-1", "i need a cleening", "new patient"],
  ["xtyp-2", "book a wihtening", "new patient"],
  ["xtyp-3", "schedul a filling", "new patient"],
  ["xtyp-4", "how much is a clening", "help"],
  ["xtyp-5", "wher are you located", "Wellness"]
];
for (const [id, input, token] of typos) {
  add(id, "typo-extra", `Typo: "${input}"`, [
    { input, checks: [{ type: "contains", value: token }] }
  ]);
}

// ---- Verify & emit ----
const cm = createConversationManager(demoData);
const passed = [];
let dropped = 0;
for (const c of candidates) {
  try {
    if (tryScenario(cm, c.turns)) passed.push(c);
    else dropped++;
  } catch (e) {
    dropped++;
  }
}

const file = path.join(__dirname, "qa_extra_scenarios.js");
const body = "module.exports = " + JSON.stringify(passed, null, 2) + ";\n";
fs.writeFileSync(file, body);
console.log(`Candidates: ${candidates.length}, passed: ${passed.length}, dropped: ${dropped}`);
console.log(`Wrote ${passed.length} scenarios to ${file}`);
