"use strict";

// Verifies the conversation engine is industry-independent: the SAME engine code
// serves Dental, Restaurant, and Law Firm clients with zero code changes.
// Run: node test_industry.js

const path = require("path");
const { createConversationManager } = require("./lib/conversation-manager");
const { restaurant, lawFirm } = require("./data/industries");

const LEAK_WORDS = [
  "BrightSmile", "Dr.", "dental", "CareCredit", "patient",
  "pediatric", "Follow-up Visit", "New Patient Exam", "Pediatric Dentistry"
];

function checkNoLeak(replies) {
  const joined = replies.join(" ").toLowerCase();
  return LEAK_WORDS.filter(w => joined.includes(w.toLowerCase()));
}

function runConversation(cm, sid, turns) {
  const replies = [];
  for (const t of turns) {
    replies.push(cm.processMessage(sid, t));
  }
  return replies;
}

let failures = 0;
function assert(cond, msg) {
  if (!cond) { failures++; console.log("  [FAIL] " + msg); }
  else { console.log("  [PASS] " + msg); }
}

// --- Restaurant (no patient types -> visit_type step skipped) ---
console.log("\n=== Restaurant: Bella's Bistro ===");
{
  const cm = createConversationManager(restaurant);
  const sid = "rest-1";
  const replies = runConversation(cm, sid, [
    "hello",
    "book a table for 2",
    "next Friday",
    "7 PM",
    "John Smith",
    "5551234567",
    "yes"
  ]);
  const leak = checkNoLeak(replies);
  assert(leak.length === 0, "No dental leakage" + (leak.length ? ": " + leak.join(", ") : ""));
  assert(replies.join(" ").includes("Bella's Bistro"), "Brand 'Bella's Bistro' present");
  assert(!replies.join(" ").toLowerCase().includes("new patient"), "No 'new patient' wording");
  const st = cm.getSessionState(sid);
  assert(st && st.workflowState && st.workflowState.status === "completed", "Booking completed");
  assert(st.workflowState.collected.service === "Table for 2", "Service collected = Table for 2");
}

// --- Law Firm (client types configured -> visit_type step used) ---
console.log("\n=== Law Firm: Hartwell & Associates ===");
{
  const cm = createConversationManager(lawFirm);
  const sid = "law-1";
  const replies = runConversation(cm, sid, [
    "hello",
    "book a consultation",
    "new",
    "next Monday",
    "10 AM",
    "Jane Doe",
    "5559876543",
    "yes"
  ]);
  const leak = checkNoLeak(replies);
  assert(leak.length === 0, "No dental leakage" + (leak.length ? ": " + leak.join(", ") : ""));
  assert(replies.join(" ").includes("Hartwell"), "Brand 'Hartwell' present");
  assert(replies.join(" ").toLowerCase().includes("client"), "Uses 'client' terminology, not 'patient'");
  const st = cm.getSessionState(sid);
  assert(st && st.workflowState && st.workflowState.status === "completed", "Booking completed");
  assert(st.workflowState.collected.service === "Consultation", "Service collected = Consultation");
}

// --- FAQ / general question independence ---
console.log("\n=== FAQ independence (Restaurant) ===");
{
  const cm = createConversationManager(restaurant);
  const sid = "rest-faq";
  const replies = runConversation(cm, sid, [
    "what are your hours?",
    "where are you located?"
  ]);
  const leak = checkNoLeak(replies);
  assert(leak.length === 0, "No dental leakage in FAQ" + (leak.length ? ": " + leak.join(", ") : ""));
  assert(replies.join(" ").includes("5-10 PM") || replies.join(" ").includes("5:00 PM"), "Restaurant hours shown");
  assert(replies.join(" ").includes("Vine Street"), "Restaurant address shown");
}

console.log("\n==================================================");
console.log(failures === 0 ? "INDUSTRY INDEPENDENCE: PASS" : `INDUSTRY INDEPENDENCE: ${failures} FAILURE(S)`);
console.log("==================================================");
process.exit(failures === 0 ? 0 : 1);
