const SERVICES = [
  "general checkup", "cleaning", "cleening", "checkup", "teeth whitening", "whitening", "whitenning",
  "dental filling", "filling", "root canal", "dental crown", "crown",
  "tooth extraction", "extraction", "invisalign", "braces", "dental implant", "implant",
  "pediatric dentistry", "children", "child", "kid", "emergency", "cosmetic", "veneers", "bonding"
];

const INSURANCE_PROVIDERS = [
  "delta dental", "metlife", "cigna", "aetna", "blue cross", "united healthcare", "guardian", "humana"
];

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_ALIASES = { "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6 };

function extractEntities(text) {
  const lower = text.toLowerCase().trim();
  const entities = { names: [], phones: [], emails: [], dates: [], times: [], services: [], insurance: [], contactPreference: null };

  const nameMatch = text.match(/(?:my name is|i'm|i am|called|this is|it's)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/i);
  if (nameMatch && /^[A-Z]/.test(nameMatch[1])) entities.names.push(nameMatch[1].trim());

  const phoneRaw = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g);
  if (phoneRaw) entities.phones = phoneRaw;

  const emailRaw = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailRaw) entities.emails = emailRaw;

  if (/\bwhatsapp\b/i.test(text)) entities.contactPreference = "whatsapp";
  else if (/\bsms\b|\btext\s+me\b/i.test(text)) entities.contactPreference = "sms";
  else if (/\bemail\s+me\b|\bsend\s+an\s+email\b/i.test(text)) entities.contactPreference = "email";
  else if (/\bcall\s+me\b|\bphone\s+call\b|\bgive\s+me\s+a\s+call\b/i.test(text)) entities.contactPreference = "phone";

  const datePatterns = [
    { re: /\b((?:next|this)\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/gi, parse: parseRelativeDay },
    { re: /\b(tomorrow|today)\b/gi, parse: parseSimpleRelative },
    { re: /\b(next\s+week)\b/gi, parse: parseNextWeek },
    { re: /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, parse: parseStandaloneDay },
    { re: /\b(mon|tue|wed|thu|fri|sat|sun)\b/gi, parse: parseAbbrevDay },
    { re: /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi, parse: parseMonthDay },
    { re: /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/g, parse: parseNumericDate }
  ];
  for (const dp of datePatterns) {
    let m;
    while ((m = dp.re.exec(text)) !== null) {
      const parsed = dp.parse(m);
      if (parsed) entities.dates.push(parsed);
    }
  }

  const isChange = /\b(actually|instead|different|change|no wait|wait no)\b/i.test(text);
  const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/gi;
  let tm;
  while ((tm = timePattern.exec(text)) !== null) {
    const hour = parseInt(tm[1]);
    const min = tm[2] ? parseInt(tm[2]) : 0;
    const ampm = (tm[3] || "").toLowerCase().replace(/\./g, "");
    if (hour <= 12 && (ampm || (hour >= 1 && hour <= 12))) {
      if (!ampm && hour >= 1 && hour <= 12 && min === 0 && !isChange) continue;
      entities.times.push({ hour, minute: min, ampm: ampm || (hour < 12 ? "am" : "pm") });
    }
  }

  SERVICES.forEach(svc => {
    if (lower.includes(svc)) entities.services.push(svc);
  });

  INSURANCE_PROVIDERS.forEach(ins => {
    if (lower.includes(ins)) entities.insurance.push(ins);
  });

  entities.services = [...new Set(entities.services)];
  entities.insurance = [...new Set(entities.insurance)];
  return entities;
}

function parseSimpleRelative(match) {
  const raw = match[0].toLowerCase();
  if (raw === "today") return dateStr(0);
  if (raw === "tomorrow") return dateStr(1);
  return null;
}

function parseRelativeDay(match) {
  const raw = match[0].toLowerCase();
  const parts = raw.split(/\s+/);
  const prefix = parts[0];
  const dayName = parts.slice(1).join(" ");
  const targetDay = DAY_NAMES.indexOf(dayName);
  if (targetDay === -1) return null;
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0 || (prefix === "next" && diff === 0)) diff += 7;
  if (prefix === "this" && diff < 0) diff += 7;
  return dateStr(diff);
}

function parseNextWeek(match) {
  const now = new Date();
  const currentDay = now.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay;
  return dateStr(daysUntilMonday);
}

function parseStandaloneDay(match) {
  const dayName = match[0].toLowerCase();
  const targetDay = DAY_NAMES.indexOf(dayName);
  if (targetDay === -1) return null;
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  return dateStr(diff);
}

function parseAbbrevDay(match) {
  const abbrev = match[0].toLowerCase();
  const targetDay = DAY_ALIASES[abbrev];
  if (targetDay === undefined) return null;
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  return dateStr(diff);
}

function parseMonthDay(match) {
  const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const monStr = match[1].toLowerCase().slice(0, 3);
  const month = months[monStr];
  if (month === undefined) return null;
  const day = parseInt(match[2]);
  const now = new Date();
  let year = now.getFullYear();
  const d = new Date(year, month, day);
  if (d < now) d.setFullYear(year + 1);
  return d.toISOString().slice(0, 10);
}

function parseNumericDate(match) {
  const a = parseInt(match[1]), b = parseInt(match[2]);
  const c = match[3] ? parseInt(match[3]) : null;
  const now = new Date();
  if (a > 12 && b <= 12) {
    let yr = c || now.getFullYear();
    if (yr < 100) yr += 2000;
    const d = new Date(yr, b - 1, a);
    return d.toISOString().slice(0, 10);
  }
  if (a <= 12 && b <= 31) {
    let yr = c || now.getFullYear();
    if (yr < 100) yr += 2000;
    const d = new Date(yr, a - 1, b);
    if (d < now && !c) d.setFullYear(yr + 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isConfirmation(text) {
  const lower = text.toLowerCase().trim();
  if (/^(yes|yeah|sure|okay|ok|yep|correct|right|please|go ahead|do it|book it|sounds good|that works|perfect|great|let's do it|absolutely|confirm)$/i.test(lower)) return true;
  if (/^(yes please|yes sure|yes that'?s right|yes correct|yeah sure|sure thing)$/i.test(lower)) return true;
  if (/^that('?s| is) correct|looks? (good|great)|that('?s| is) right|book it|let'?s do it$/i.test(lower)) return true;
  return false;
}

function isDeclination(text) {
  const lower = text.toLowerCase().trim();
  return /^(no|nah|nope|not now|maybe later|not right now|no thanks|no thank you|i'm good|that's all|not really|not yet)$/i.test(lower);
}

function isChangeRequest(text) {
  const lower = text.toLowerCase().trim();
  return /change|different|actually|instead|no wait|wait no|sorry i meant|wrong|nevermind/i.test(lower);
}

function isGreeting(text) {
  const lower = text.toLowerCase().trim();
  return /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|hi there|hello there)$/i.test(lower);
}

module.exports = { extractEntities, isConfirmation, isDeclination, isGreeting, isChangeRequest, SERVICES, INSURANCE_PROVIDERS };
