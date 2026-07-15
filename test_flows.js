const demoData = require("./data/seed");
const { createConversationManager } = require("./lib/conversation-manager");

const cm = createConversationManager(demoData);
let failures = 0;
let totalTests = 0;

function ok(label) {
  console.log(`  [OK] ${label}`);
}

function fail(label, msg) {
  console.log(`  [FAIL] ${label}: ${msg}`);
  failures++;
}

function check(actual, expect, label) {
  totalTests++;
  const pass = actual.toLowerCase().includes(expect.toLowerCase());
  if (pass) ok(label);
  else fail(label, `expected "${expect}" not found in "${actual.substring(0, 100)}"`);
}

function section(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

// ==============================
// FIX 1: Contact preferences
// ==============================
section("FIX 1: Contact Preferences (WhatsApp, SMS, Email)");

let sid = "r1";
let r = cm.processMessage(sid, "I need to book a cleaning");
check(r, "new patient", "Starts booking");

r = cm.processMessage(sid, "new patient");
check(r, "day", "Visit type selected");

r = cm.processMessage(sid, "Next Thursday");
check(r, "time", "Date accepted");

r = cm.processMessage(sid, "10 AM");
check(r, "name", "Time accepted");

r = cm.processMessage(sid, "Sarah Johnson");
check(r, "reach", "Name accepted");

r = cm.processMessage(sid, "WhatsApp me at 555-111-2233");
check(r, "confirm", "WhatsApp preference detected");

r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Booking confirmed");

// ==============================
// FIX 2: Multiple services in one message
// ==============================
section("FIX 2: Multiple Services - Ask Which First");

sid = "r2";
r = cm.processMessage(sid, "I need cleaning and whitening");
check(r, "services", "Multi-service prompt");

r = cm.processMessage(sid, "cleaning");
check(r, "new patient", "User chose first service");

r = cm.processMessage(sid, "new");
check(r, "day", "Visit type");

r = cm.processMessage(sid, "Wednesday");
check(r, "time", "Standalone day name works");

r = cm.processMessage(sid, "10 am");
check(r, "name", "Time accepted");

r = cm.processMessage(sid, "Jane Doe");
check(r, "reach", "Name accepted");

r = cm.processMessage(sid, "555-111-2222");
check(r, "confirm", "Contact accepted");

r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Booking confirmed");

// ==============================
// FIX 3: Expanded date parsing
// ==============================
section("FIX 3: Expanded Date Parsing (Day Names, Abbreviations, Tomorrow)");

sid = "r3";
r = cm.processMessage(sid, "book a checkup");
check(r, "new patient", "Starts booking");

r = cm.processMessage(sid, "new");
check(r, "day", "Visit type");

r = cm.processMessage(sid, "Monday");
check(r, "time", "Standalone day name 'Monday' works");

r = cm.processMessage(sid, "2 pm");
check(r, "name", "Time accepted");

r = cm.processMessage(sid, "Alice Brown");
check(r, "reach", "Name accepted");

r = cm.processMessage(sid, "email: alice@test.com");
check(r, "confirm", "Email contact accepted");

r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Booking confirmed");

// Test abbreviation
sid = "r3b";
r = cm.processMessage(sid, "book a cleaning");
r = cm.processMessage(sid, "existing");
r = cm.processMessage(sid, "Fri");
check(r, "time", "Abbrev 'Fri' works");

r = cm.processMessage(sid, "11 am");
r = cm.processMessage(sid, "Bob Test");
r = cm.processMessage(sid, "555-000-1111");
r = cm.processMessage(sid, "yes");

// Test tomorrow
sid = "r3c";
r = cm.processMessage(sid, "book a cleaning");
r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "tomorrow");
check(r, "time", "Tomorrow accepted");

// ==============================
// FIX 4: Relaxed name validation
// ==============================
section("FIX 4: Relaxed Name Validation + Confirm Step");

sid = "r4";
r = cm.processMessage(sid, "book a cleaning");
r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Tue");
r = cm.processMessage(sid, "9 am");
r = cm.processMessage(sid, "John Brick");
check(r, "John Brick", "Two-word name accepted");

sid = "r4b";
r = cm.processMessage(sid, "booking cleaning");
r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Thursday");
r = cm.processMessage(sid, "10 am");
r = cm.processMessage(sid, "john brick");
check(r, "confirm", "Lowercase name triggers confirm");

r = cm.processMessage(sid, "yes");
check(r, "reach", "Confirmed name proceeds to contact");

// ==============================
// FIX 5: Change mid-workflow
// ==============================
section("FIX 5: Change Service/Date Mid-Workflow");

sid = "r5";
r = cm.processMessage(sid, "book a cleaning");
r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Monday");
r = cm.processMessage(sid, "10 am");
r = cm.processMessage(sid, "Tom Green");
r = cm.processMessage(sid, "Actually, I want whitening instead");
check(r, "whitening", "Service change mid-workflow");

r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Friday");
r = cm.processMessage(sid, "2 pm");
r = cm.processMessage(sid, "Tom Green");
r = cm.processMessage(sid, "555-222-3333");
r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Changed booking completed");

// Change date during phone step
sid = "r5b";
r = cm.processMessage(sid, "book cleaning");
r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Monday");
r = cm.processMessage(sid, "2 pm");
r = cm.processMessage(sid, "Sue Blue");
r = cm.processMessage(sid, "actually change date to Friday");
check(r, "name", "Date changed to Friday (time prefilled)");

r = cm.processMessage(sid, "Sue Blue");
r = cm.processMessage(sid, "555-333-4444");
r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Date-changed booking done");

// ==============================
// FIX 6: Infinite loop prevention
// ==============================
section("FIX 6: Infinite Loop Prevention + Recovery");

sid = "r6";
r = cm.processMessage(sid, "book a zyzzyx");
check(r, "service", "Step 1: fails");

r = cm.processMessage(sid, "qwerty");
check(r, "service", "Step 2: fails");

r = cm.processMessage(sid, "asdfgh");
check(r, "start over", "Step 3: recovery offered");

r = cm.processMessage(sid, "start over");
check(r, "service", "Recovery: start over accepted");

r = cm.processMessage(sid, "cleaning");
check(r, "new patient", "Recovery: continues normally");

r = cm.processMessage(sid, "new");
r = cm.processMessage(sid, "Wed");
r = cm.processMessage(sid, "10 am");
r = cm.processMessage(sid, "Clinic Test");
r = cm.processMessage(sid, "555-444-3333");
r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Booking after recovery completed");

// Test clinic referral
sid = "r6b";
r = cm.processMessage(sid, "book a widget");
r = cm.processMessage(sid, "gizmo");
r = cm.processMessage(sid, "gadget");
r = cm.processMessage(sid, "I'd like to speak to the clinic");
check(r, "BrightSmile", "Recovery: clinic referral");

// ==============================
// FIX 7: Existing scenarios still work
// ==============================
section("FIX 7: Inline Questions Resume Workflow");

sid = "r7";
r = cm.processMessage(sid, "I need to book a checkup");
check(r, "new patient", "Starts booking");

r = cm.processMessage(sid, "new patient");
check(r, "day", "Visit type");

r = cm.processMessage(sid, "tell me about your services");
check(r, "back to what we were doing", "Inline question resumes");

r = cm.processMessage(sid, "Next Friday");
check(r, "time", "Resumed: date accepted");

r = cm.processMessage(sid, "3 PM");
check(r, "name", "Resumed: time accepted");

r = cm.processMessage(sid, "Emily Park");
check(r, "reach", "Resumed: name accepted");

r = cm.processMessage(sid, "555-777-1234");
check(r, "confirm", "Resumed: contact accepted");

r = cm.processMessage(sid, "looks good");
check(r, "confirmed", "Booking confirmed");

section("FIX 8: Reputation Questions");

sid = "r8a";
r = cm.processMessage(sid, "Are you good doctors?");
check(r, "15+ years", "Reputation: good doctor");

sid = "r8b";
r = cm.processMessage(sid, "What's your rating?");
check(r, "4.8", "Reputation: rating");

sid = "r8c";
r = cm.processMessage(sid, "Do you have good reviews?");
check(r, "referral", "Reputation: reviews");

sid = "r8d";
r = cm.processMessage(sid, "How experienced is your team?");
check(r, "15+ years", "Reputation: experience");

sid = "r8e";
r = cm.processMessage(sid, "Are you recommended?");
check(r, "referral", "Reputation: recommended");

section("FIX 9: Prefill Service from Memory");

sid = "r9";
r = cm.processMessage(sid, "What does a root canal cost?");
check(r, "root canal", "Service stored in memory");

r = cm.processMessage(sid, "I want to book an appointment");
check(r, "new patient", "Service pre-filled from memory");

r = cm.processMessage(sid, "new patient");
check(r, "day", "Continues booking");

r = cm.processMessage(sid, "next Wednesday");
check(r, "time", "Date accepted");

r = cm.processMessage(sid, "11 AM");
check(r, "name", "Time accepted");

r = cm.processMessage(sid, "John Smith");
check(r, "reach", "Name accepted");

r = cm.processMessage(sid, "555-333-4455");
check(r, "confirm", "Contact accepted");

r = cm.processMessage(sid, "yes");
check(r, "confirmed", "Booking confirmed");

section("FIX 10: Confirmation Summary Before Completion");

sid = "r10";
r = cm.processMessage(sid, "Emergency! I have a cracked tooth");
check(r, "slot", "Emergency starts");

r = cm.processMessage(sid, "11:30 AM");
check(r, "name", "Time set");

r = cm.processMessage(sid, "Mike Wilson");
check(r, "number", "Name set");

r = cm.processMessage(sid, "555-444-3322");
check(r, "confirm", "Contact set");

r = cm.processMessage(sid, "yes");
check(r, "all set", "Emergency confirmed");

// ==============================
// RESULTS
// ==============================
console.log(`\n${"=".repeat(60)}`);
console.log(`  Results: ${failures} failures out of ${totalTests} tests`);
console.log(`${"=".repeat(60)}`);
process.exit(failures > 0 ? 1 : 0);
