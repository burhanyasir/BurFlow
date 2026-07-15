const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const logger = require("./lib/logger");
const demoData = require("./data/seed");
const { createConversationManager } = require("./lib/conversation-manager");
const { createConversationRecorder } = require("./lib/conversation-recorder");
const { createFuzzerCampaign } = require("./lib/fuzzer");
const agencyRoutes = require("./lib/agency/routes");
const demoSeed = require("./lib/agency/demo-data");

const app = express();
const PORT = process.env.PORT || 3456;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

let state = JSON.parse(JSON.stringify(demoData));
const cm = createConversationManager(demoData);
const recorder = createConversationRecorder();
const sessionMap = new Map();
const activeSessions = new Map();
let fuzzerCampaign = null;

function generateSession() {
  return crypto.randomBytes(16).toString("hex");
}

function getSessionId(req) {
  let sid = req.headers["x-session-id"];
  if (!sid || !sessionMap.has(sid)) {
    sid = generateSession();
    sessionMap.set(sid, true);
  }
  return sid;
}

app.get("/api/demo/status", (req, res) => {
  res.json({ mode: "active", startedAt: state.demoMode.startedAt });
});

app.get("/api/clinic", (req, res) => {
  res.json(state.clinic);
});

app.get("/api/services", (req, res) => {
  res.json(state.services);
});

app.get("/api/faqs", (req, res) => {
  res.json(state.faqs);
});

app.get("/api/analytics", (req, res) => {
  state.analytics.estimatedMonthlyRevenue = state.analytics.appointmentsBooked * state.analytics.estimatedValuePerAppointment;
  state.analytics.conversionRate = state.analytics.totalConversations > 0
    ? state.analytics.leadsCaptured / state.analytics.totalConversations
    : 0;
  res.json(state.analytics);
});

app.get("/api/conversations", (req, res) => {
  res.json(state.conversations);
});

app.get("/api/conversations/:id", (req, res) => {
  const conv = state.conversations.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json(conv);
});

app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  const sessionId = getSessionId(req);
  if (!recorder.getConversation(sessionId)) {
    recorder.startRecording(sessionId, cm);
    activeSessions.set(sessionId, Date.now());
  }
  const preState = cm.getSessionState(sessionId);
  const reply = cm.processMessage(sessionId, message);
  const sessionState = cm.getSessionState(sessionId);

  let intent = "general";
  let confidence = 0;
  try {
    const { classifyIntent } = require("./lib/intent-classifier");
    const ctx = { activeWorkflow: sessionState?.activeWorkflow || null };
    const classification = classifyIntent(message, ctx);
    intent = classification.intent;
    confidence = classification.confidence;
  } catch (e) { intent = sessionState?.activeWorkflow || "general"; }

  recorder.recordTurn(sessionId, cm, message, reply, intent, confidence, {
    error: sessionState?.workflowState?.step ? null : "step_unknown"
  });

  if (sessionState?.completions?.length > 0) {
    const lastCompletionCount = preState?.completions?.length || 0;
    if (sessionState.completions.length > lastCompletionCount) {
      const recent = sessionState.completions[sessionState.completions.length - 1];
      const outcome = recent.workflow === "appointment_booking" ? "appointment_booked"
        : recent.workflow === "lead_capture" ? "lead_captured"
        : recent.workflow === "emergency" ? "emergency_booked"
        : "completed";
      recorder.finalizeConversation(sessionId, outcome, recent.workflow);
      if (recent?.workflow === "appointment_booking") {
        const ws = sessionState.workflowState;
        if (ws?.collected) {
          const c = ws.collected;
          const newConv = {
            id: "conv-" + Date.now(),
            visitorName: c.name || "Demo Visitor",
            visitorEmail: "",
            visitorPhone: c.phone || "",
            type: "appointment-booking",
            timestamp: new Date().toISOString(),
            summary: `Appointment booked: ${c.service} on ${c.date}`,
            leadCaptured: true,
            appointmentBooked: true,
            appointmentTime: c.date + "T" + (c.time || "12:00") + ":00Z",
            messages: []
          };
          state.conversations.unshift(newConv);
          state.analytics.totalConversations += 1;
          state.analytics.leadsCaptured += 1;
          state.analytics.appointmentsBooked += 1;
        }
      }
      if (recent?.workflow === "lead_capture") {
        const ws = sessionState.workflowState;
        if (ws?.collected) {
          const c = ws.collected;
          const newConv = {
            id: "conv-" + Date.now(),
            visitorName: c.name || "Demo Visitor",
            visitorEmail: c.email || "",
            visitorPhone: c.phone || "",
            type: "lead-capture",
            timestamp: new Date().toISOString(),
            summary: `Lead captured: ${c.service || "General Inquiry"}`,
            leadCaptured: true,
            appointmentBooked: false,
            messages: []
          };
          state.conversations.unshift(newConv);
          state.analytics.totalConversations += 1;
          state.analytics.leadsCaptured += 1;
        }
      }
    }
  }

  const delay = Math.floor(Math.random() * 600) + 300;
  res.json({
    reply,
    delay,
    sessionId,
    intent: intent || "general",
    confidence: confidence || 0,
    workflowActive: !!sessionState?.activeWorkflow,
    workflowStep: sessionState?.workflowState?.step || null,
    workflowStatus: sessionState?.workflowState?.status || null
  });
});

app.get("/api/session", (req, res) => {
  const sessionId = getSessionId(req);
  const ss = cm.getSessionState(sessionId);
  res.json({ sessionId, state: ss });
});

app.post("/api/leads", (req, res) => {
  const { name, email, phone, service, message } = req.body;
  const newLead = {
    id: "lead-" + Date.now(),
    name: name || "Anonymous",
    email: email || "",
    phone: phone || "",
    service: service || "General Inquiry",
    message: message || "",
    timestamp: new Date().toISOString(),
    status: "new"
  };
  const newConv = {
    id: "conv-" + Date.now(),
    visitorName: newLead.name,
    visitorEmail: newLead.email,
    visitorPhone: newLead.phone,
    type: "lead-capture",
    timestamp: newLead.timestamp,
    summary: `Lead captured: ${newLead.service}`,
    leadCaptured: true,
    appointmentBooked: false,
    messages: [
      { role: "visitor", text: message || "I'd like more information." },
      { role: "ai", text: `Thank you, ${newLead.name}! We've received your information and a team member will reach out to you shortly at ${newLead.email || newLead.phone}. Is there anything else I can help with?` }
    ]
  };
  state.conversations.unshift(newConv);
  state.analytics.totalConversations += 1;
  state.analytics.leadsCaptured += 1;
  res.json({ success: true, lead: newLead, conversation: newConv });
});

app.post("/api/appointments", (req, res) => {
  const { name, email, phone, service, date, time } = req.body;
  const newAppointment = {
    id: "apt-" + Date.now(),
    name: name || "Anonymous",
    email: email || "",
    phone: phone || "",
    service: service || "General",
    date: date || "2026-07-20",
    time: time || "10:00",
    timestamp: new Date().toISOString(),
    confirmed: true
  };
  const newConv = {
    id: "conv-" + Date.now(),
    visitorName: newAppointment.name,
    visitorEmail: newAppointment.email,
    visitorPhone: newAppointment.phone,
    type: "appointment-booking",
    timestamp: newAppointment.timestamp,
    summary: `Appointment booked: ${newAppointment.service} on ${newAppointment.date}`,
    leadCaptured: true,
    appointmentBooked: true,
    appointmentTime: new Date(newAppointment.date + "T" + newAppointment.time + ":00Z").toISOString(),
    messages: [
      { role: "visitor", text: `I'd like to book a ${newAppointment.service} appointment.` },
      { role: "ai", text: `You're booked for ${newAppointment.service} on ${newAppointment.date} at ${newAppointment.time}. You'll receive a confirmation email. See you soon, ${newAppointment.name}!` }
    ]
  };
  state.conversations.unshift(newConv);
  state.analytics.totalConversations += 1;
  state.analytics.leadsCaptured += 1;
  state.analytics.appointmentsBooked += 1;
  res.json({ success: true, appointment: newAppointment, conversation: newConv });
});

app.post("/api/reset", (req, res) => {
  state = JSON.parse(JSON.stringify(demoData));
  state.demoMode.startedAt = new Date().toISOString();
  cm.resetAll();
  sessionMap.clear();
  recorder.reset();
  res.json({ success: true, message: "Demo has been reset to initial state." });
});

app.get("/api/admin/conversations", (req, res) => {
  const { outcome, workflow, search, from, to, page, limit } = req.query;
  const filters = {};
  if (outcome) filters.outcome = outcome;
  if (workflow) filters.workflow = workflow;
  if (search) filters.query = search;
  if (from) filters.from = from;
  if (to) filters.to = to;
  const all = recorder.getAllConversations(filters);
  const pg = parseInt(page) || 1;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const start = (pg - 1) * lim;
  res.json({
    total: all.length,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(all.length / lim),
    conversations: all.slice(start, start + lim).map(c => ({
      id: c.id, sessionId: c.sessionId, startedAt: c.startedAt,
      endedAt: c.endedAt, outcome: c.outcome, outcomeDetail: c.outcomeDetail,
      totalTurns: c.totalTurns, metadata: c.metadata
    }))
  });
});

app.get("/api/admin/conversations/:id", (req, res) => {
  const conv = recorder.getAllConversations().find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  const ws = cm.getSessionState(conv.sessionId);
  res.json({ conversation: conv, currentState: ws });
});

app.get("/api/admin/conversations/:id/replay", (req, res) => {
  const conv = recorder.getAllConversations().find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });
  res.json({
    id: conv.id,
    turns: conv.turns.map(t => ({
      index: t.index,
      userMessage: t.userMessage,
      aiResponse: t.aiResponse,
      intent: t.intent,
      confidence: t.confidence,
      entities: t.entities,
      activeWorkflow: t.activeWorkflow,
      workflowStep: t.workflowStep,
      stepError: t.stepError,
      collected: t.collected
    }))
  });
});

app.get("/api/admin/conversations/export/:format", (req, res) => {
  const format = req.params.format === "csv" ? "csv" : "json";
  const data = recorder.exportConversations(format);
  const ext = format === "csv" ? "csv" : "json";
  res.setHeader("Content-Type", format === "csv" ? "text/csv" : "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="conversations.${ext}"`);
  res.send(data);
});

app.get("/api/admin/analytics", (req, res) => {
  const analytics = recorder.computeAnalytics();
  res.json(analytics);
});

app.get("/api/admin/status", (req, res) => {
  const sessions = cm.getSessionState ? Array.from(sessionMap.keys()).length : 0;
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    activeSessions: sessions,
    conversations: recorder.getAllConversations().length,
    nodeVersion: process.version,
    environment: IS_PRODUCTION ? "production" : "development"
  });
});

app.post("/api/fuzzer/run", async (req, res) => {
  if (fuzzerCampaign && fuzzerCampaign.status === "running") {
    return res.status(409).json({ error: "Fuzzer is already running", status: "running" });
  }
  const { personaIds, conversationsPerPersona, maxTurnsPerConversation } = req.body || {};
  fuzzerCampaign = createFuzzerCampaign({
    personaIds: personaIds || undefined,
    conversationsPerPersona: Math.min(conversationsPerPersona || 3, 20),
    maxTurnsPerConversation: Math.min(maxTurnsPerConversation || 40, 100),
    demoData
  });
  res.json({ status: "started", total: fuzzerCampaign.progress.total, message: "Fuzzer campaign started" });
  try {
    const result = await fuzzerCampaign.run();
    logger.info({ totalConversations: result.summary?.totalConversations, withFailures: result.summary?.conversationsWithFailures, totalFailures: result.summary?.totalFailures }, "Fuzzer campaign completed");
  } catch (err) {
    logger.error({ err: err.message }, "Fuzzer campaign failed");
  }
});

app.get("/api/fuzzer/status", (req, res) => {
  if (!fuzzerCampaign) return res.json({ status: "idle" });
  res.json({
    status: fuzzerCampaign.status,
    progress: fuzzerCampaign.progress,
    errors: fuzzerCampaign.errors?.slice(0, 10) || [],
    startedAt: fuzzerCampaign.startedAt,
    completedAt: fuzzerCampaign.completedAt
  });
});

app.get("/api/fuzzer/results", (req, res) => {
  if (!fuzzerCampaign || fuzzerCampaign.status !== "completed") {
    return res.status(400).json({ error: "No completed fuzzer results available" });
  }
  const results = fuzzerCampaign.getResults();
  res.json({
    status: results.status,
    summary: results.report?.summary || null,
    outcomeDistribution: results.report?.outcomeDistribution || {},
    personaPerformance: results.report?.personaPerformance || [],
    failureTypes: (results.report?.failureTypes || []).slice(0, 20),
    severitySummary: results.report?.severitySummary || {},
    completionBreakdown: results.report?.completionBreakdown || {},
    rootCauses: (results.report?.rootCauses || []).slice(0, 20),
    topFailuresDetail: (results.report?.topFailuresDetail || []).slice(0, 10),
    sampleTranscripts: (results.report?.sampleTranscripts || []).slice(0, 5),
    regressionTestCount: results.regressionTests?.report?.totalTests || 0,
    errorCount: results.errors?.length || 0,
    conversations: results.conversations?.map(c => ({
      personaId: c.personaId, outcome: c.outcome, turnCount: c.turnCount,
      failureCount: (c.failures || []).length,
      topFailures: (c.failures || []).slice(0, 3).map(f => ({ type: f.type, severity: f.severity, detail: f.detail?.slice(0, 100) })),
      startedAt: c.startedAt
    })) || []
  });
});

app.get("/api/fuzzer/report", (req, res) => {
  if (!fuzzerCampaign || !fuzzerCampaign.report) {
    return res.status(400).json({ error: "No fuzzer report available" });
  }
  res.json(fuzzerCampaign.report);
});

app.get("/api/fuzzer/regression-tests", (req, res) => {
  if (!fuzzerCampaign || !fuzzerCampaign.regressionTests) {
    return res.status(400).json({ error: "No regression tests available" });
  }
  res.json(fuzzerCampaign.regressionTests.report);
});

app.get("/api/health", (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: "ok",
    uptime: process.uptime(),
    pid: process.pid,
    version: process.env.npm_package_version || "1.0.0",
    environment: IS_PRODUCTION ? "production" : "development",
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
      rss: Math.round(memUsage.rss / 1024 / 1024) + "MB"
    },
    fuzzerStatus: fuzzerCampaign ? fuzzerCampaign.status : "idle",
    activeSessions: sessionMap.size,
    sessionMapSize: sessionMap.size,
    uptimeMinutes: Math.floor(process.uptime() / 60)
  });
});

app.post("/api/fuzzer/stop", (req, res) => {
  if (fuzzerCampaign && fuzzerCampaign.status === "running") {
    fuzzerCampaign.status = "stopped";
    res.json({ status: "stopped" });
  } else {
    res.json({ status: "no_running_campaign" });
  }
});

app.use("/api/agency", agencyRoutes);

// Contact / demo-request intake (persists into CRM as a lead)
const crm = require("./lib/agency/client-crm");
app.post("/api/contact", (req, res) => {
  const { name, email, phone, industry, website, message } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
  let lead = null;
  try {
    lead = crm.create({ name, email, phone, industry, website, status: "lead", source: "inbound", notes: message || "" });
  } catch (err) {
    logger.error({ err: err.message }, "Failed to persist contact lead");
  }
  logger.info({ name, email, industry, website, leadId: lead && lead.id }, "Demo request received");
  res.json({ ok: true, message: "Thanks! Our team will reach out within one business day." });
});

if (process.env.AGENCY_SEED === "true" || process.env.NODE_ENV !== "production") {
  try {
    demoSeed.seedIfEmpty();
  } catch (err) {
    logger.error({ err: err.message }, "Demo seed failed");
  }
}

// Serve documentation and sales markdown (project-root dirs, with optional download)
function serveMarkdown(dir) {
  return (req, res) => {
    const file = req.params.file;
    if (!/^[a-z0-9-]+\.md$/i.test(file)) return res.status(400).json({ error: "Invalid file" });
    const filePath = path.join(__dirname, dir, file);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
    if (req.query.download) res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.sendFile(filePath);
  };
}
app.get("/docs/:file", serveMarkdown("docs"));
app.get("/sales/:file", serveMarkdown("sales"));

// Public widget snippet lookup by subdomain (used by client install page)
const agencyDeployment = require("./lib/agency/deployment");
app.get("/api/agency/widget/:subdomain", (req, res) => {
  const widget = agencyDeployment.getWidgetBySubdomain(req.params.subdomain);
  if (!widget) return res.status(404).json({ error: "Tenant not found" });
  res.json(widget);
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});
app.get("/industries", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "industries.html"));
});
app.get("/install", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "install.html"));
});
app.get("/demo", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "demo.html"));
});
app.get("/sales", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sales.html"));
});
app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "docs.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  logger.info({ port: PORT, env: IS_PRODUCTION ? "production" : "development" }, `AI Lead Platform - Demo Mode running at http://localhost:${PORT}`);
});
