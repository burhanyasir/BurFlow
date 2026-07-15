const { createKnowledgeBase } = require("./business-knowledge");
const { createFlows } = require("./conversation-flows");
const { classifyIntent } = require("./intent-classifier");
const { extractEntities, isConfirmation, isDeclination, isGreeting, isChangeRequest } = require("./entity-extractor");

function createConversationManager(demoData) {
  const knowledge = createKnowledgeBase(demoData.clinic, demoData.services, demoData.faqs);
  const flows = createFlows(knowledge);
  const allServices = demoData.services || [];
  const sessions = new Map();

  function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        history: [],
        activeWorkflow: null,
        workflows: {},
        memory: {
          extractedEntities: { names: [], phones: [], emails: [], dates: [], times: [], services: [], insurance: [] },
          mentionedServices: [],
          pausedWorkflows: [],
          completions: [],
          frustrationCount: 0,
          lastGenericResponses: [],
          confusedCount: 0,
          hostilityCount: 0,
          lastWorkflowSwitch: 0,
          workflowSwitchCount: 0,
          completedPricing: false,
          completedInsurance: false,
          lastResponseType: null,
          responseTypeCount: {},
          escalationRepeatCount: 0
        },
        lastIntent: null,
        turnCount: 0,
        createdAt: new Date().toISOString(),
        metadata: { name: null, email: null, phone: null }
      });
    }
    return sessions.get(sessionId);
  }

  function getWorkflowState(session, workflowName) {
    const flow = flows[workflowName];
    if (!flow) return null;
    if (!session.workflows[workflowName] || session.workflows[workflowName].status === "completed" || session.workflows[workflowName].status === "cancelled") {
      session.workflows[workflowName] = {
        ...JSON.parse(JSON.stringify(flow.initialState)),
        createdAt: new Date().toISOString()
      };
    }
    return session.workflows[workflowName];
  }

  function updateMemory(session, text) {
    const entities = extractEntities(text);
    const mem = session.memory;
    if (entities.names.length > 0) {
      mem.extractedEntities.names.push(...entities.names);
      session.metadata.name = entities.names[0];
    }
    if (entities.phones.length > 0) {
      mem.extractedEntities.phones.push(...entities.phones);
      session.metadata.phone = entities.phones[0];
    }
    if (entities.emails.length > 0) {
      mem.extractedEntities.emails.push(...entities.emails);
      session.metadata.email = entities.emails[0];
    }
    if (entities.dates.length > 0) {
      mem.extractedEntities.dates.push(...entities.dates);
    }
    if (entities.times.length > 0) {
      mem.extractedEntities.times.push(...entities.times);
    }
    if (entities.services.length > 0) {
      mem.extractedEntities.services.push(...entities.services);
      mem.mentionedServices.push(...entities.services);
    }
    if (entities.insurance.length > 0) {
      mem.extractedEntities.insurance.push(...entities.insurance);
    }
    Object.keys(mem.extractedEntities).forEach(k => {
      mem.extractedEntities[k] = [...new Set(mem.extractedEntities[k])];
    });
    mem.mentionedServices = [...new Set(mem.mentionedServices)];
  }

  function getActiveWorkflowName(session) {
    if (!session.activeWorkflow) return null;
    const ws = session.workflows[session.activeWorkflow];
    if (!ws) return null;
    if (ws.status === "completed" || ws.status === "cancelled") return null;
    return session.activeWorkflow;
  }

  function pauseActiveWorkflow(session) {
    if (session.activeWorkflow) {
      const ws = session.workflows[session.activeWorkflow];
      if (ws && ws.status === "in_progress") {
        session.memory.pausedWorkflows.push({
          name: session.activeWorkflow,
          state: JSON.parse(JSON.stringify(ws))
        });
        ws.status = "paused";
      }
      session.activeWorkflow = null;
    }
  }

  function resumeLastWorkflow(session) {
    const paused = session.memory.pausedWorkflows;
    if (paused.length > 0) {
      const last = paused.pop();
      session.workflows[last.name] = JSON.parse(JSON.stringify(last.state));
      session.activeWorkflow = last.name;
      return last.name;
    }
    return null;
  }

  function getStepPrompt(flow, stepName, state) {
    const stepDef = flow.steps[stepName];
    if (!stepDef) return null;
    if (typeof stepDef.prompt === "function") return stepDef.prompt(null, state);
    return stepDef.prompt || null;
  }

  function prefillStepFromMemory(session, workflowName) {
    const flow = flows[workflowName];
    if (!flow) return false;
    const ws = session.workflows[workflowName];
    if (!ws || ws.status !== "in_progress") return false;
    const mem = session.memory.extractedEntities;
    const stepName = ws.step;

    if (workflowName === "appointment_booking") {
      if (stepName === "service" && !ws.collected.service) {
        if (mem.services.length > 0 && mem.services[0] !== "") {
          ws.collected.service = mem.services[0];
          ws.step = "visit_type";
          return true;
        }
      }
      if (stepName === "date" && !ws.collected.date && mem.dates.length > 0) {
        ws.collected.date = mem.dates[0];
        ws.step = "time";
        return true;
      }
      if (stepName === "time" && !ws.collected.time && mem.times.length > 0) {
        const t = mem.times[0];
        let hour = t.hour;
        const min = String(t.minute).padStart(2, "0");
        if (t.ampm === "pm" && hour < 12) hour += 12;
        if (t.ampm === "am" && hour === 12) hour = 0;
        ws.collected.time = `${String(hour).padStart(2, "0")}:${min}`;
        ws.step = "name";
        return true;
      }
      if ((stepName === "name" || stepName === "confirm_name") && !ws.collected.name && mem.names.length > 0) {
        ws.collected.name = mem.names[0];
        ws.step = "phone";
        return true;
      }
    }

    if (workflowName === "lead_capture") {
      if ((stepName === "name" || stepName === "confirm_name") && !ws.collected.name && mem.names.length > 0) {
        ws.collected.name = mem.names[0];
        ws.step = "contact";
        return true;
      }
      if (mem.phones.length > 0 || mem.emails.length > 0) {
        if (!ws.collected.contactValue && (stepName === "contact" || stepName === "name")) {
          ws.collected.contactMethod = mem.phones.length > 0 ? "phone" : "email";
          ws.collected.contactValue = mem.phones.length > 0 ? mem.phones[0] : mem.emails[0];
          if (ws.step !== "interest") {
            ws.step = "interest";
            return true;
          }
        }
      }
    }

    if (workflowName === "insurance") {
      if (stepName === "name" && !ws.collected.name && mem.names.length > 0) {
        ws.collected.name = mem.names[0];
        ws.step = "confirm_insurance";
        return true;
      }
    }

    return false;
  }

  function isRelevantToWorkflow(text, workflowName, stepName) {
    const flow = flows[workflowName];
    if (!flow) return true;
    const step = flow.steps[stepName];
    if (!step) return true;
    const lower = text.toLowerCase();

    if (workflowName === "appointment_booking") {
      if (stepName === "service") {
        return true;
      }
      if (stepName === "visit_type") {
        return !(/hours|address|location|phone|email|cost|price|insurance|coverage|review|rating|reputation|good doctor|experienced/.test(lower));
      }
      if (stepName === "date") {
        if (/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|next|this|week/i.test(lower) ||
            /\d{1,2}[\/-]\d{1,2}/.test(lower) || /\d{1,2}(st|nd|rd|th)/.test(lower)) return true;
        return !(/hours|address|located|location|phone|email|cost|price|what is|what are|service|offer|how (long|often|does|do)|tell me about|review|rating|reputation/.test(lower));
      }
      if (stepName === "time") {
        if (/\b\d{1,2}(?::\d{2})?\s*(am|pm)?\b/i.test(lower)) return true;
        return !(/hours|address|location|phone|email|cost|price|what is|how|tell me|review|rating/.test(lower));
      }
      if (stepName === "name" || stepName === "confirm_name") {
        return true;
      }
      if (stepName === "phone") {
        return !(/hours|address|location|cost|price|insurance|review|rating|reputation|what is|tell me about/.test(lower));
      }
      if (stepName === "confirm" || stepName === "offer_recovery") {
        return true;
      }
    }

    if (workflowName === "emergency") {
      return true;
    }

    if (workflowName === "insurance") {
      return true;
    }

    if (workflowName === "lead_capture") {
      return true;
    }

    if (workflowName === "pricing") {
      return true;
    }

    return true;
  }

  function processMessage(sessionId, message) {
    const session = getSession(sessionId);
    const text = (message || "").trim();
    session.turnCount++;

    session.history.push({ role: "user", text, timestamp: new Date().toISOString() });
    updateMemory(session, text);

    const activeWf = getActiveWorkflowName(session);
    const context = {
      activeWorkflow: activeWf,
      lastIntent: session.lastIntent,
      history: session.history.slice(-6)
    };

    const classification = classifyIntent(text, context);
    const intent = classification.intent;
    session.lastIntent = intent;

    if (intent === "greeting" && session.history.length <= 2) {
      const reply = handleGreeting(session);
      session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
      return reply;
    }

    if (intent === "decline_workflow") {
      const ws = activeWf ? session.workflows[activeWf] : null;
      if (ws) {
        ws.status = "cancelled";
        session.activeWorkflow = null;
        const reply = "No problem at all! If you change your mind or need anything else, I'm here to help. Is there anything else you'd like to know?";
        session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
        return reply;
      }
    }

    if (activeWf) {
      const ws = session.workflows[activeWf];
      const flow = flows[activeWf];

      if (isConfirmation(text) && ws.step === "confirm") {
        const reply = advanceWorkflow(session, text);
        session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
        return reply;
      }

      if (intent === "confirm_workflow") {
        const reply = advanceWorkflow(session, text);
        session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
        return reply;
      }

      if ((intent === "emergency" || intent === "insurance" || intent === "pricing") && intent !== activeWf) {
        if (intent === "pricing" && session.memory.completedPricing) {
          const reply = advanceWorkflow(session, text);
          session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
          return reply;
        }
        if (intent === "insurance" && session.memory.completedInsurance) {
          const reply = advanceWorkflow(session, text);
          session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
          return reply;
        }
        session.memory.workflowSwitchCount++;
        const switchThreshold = activeWf === "appointment_booking" ? 3 : 5;
        if (session.memory.workflowSwitchCount >= switchThreshold) {
          const reply = advanceWorkflow(session, text);
          session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
          return reply;
        }
        return startAndLog(session, sessionId, intent, text);
      }

      if (text.length > 4 && !isRelevantToWorkflow(text, activeWf, ws.step)) {
        if (intent === "general_faq" || intent === "business_info" || intent === activeWf) {
          pauseActiveWorkflow(session);
          const answer = intent === "business_info" ? handleBusinessInfo(session, text) : handleGeneralQuestion(session, text);
          trackResponse(session, answer);
          const resumed = resumeLastWorkflow(session);
          if (resumed) {
            session.activeWorkflow = resumed;
            const resumedWs = session.workflows[resumed];
            const resumedFlow = flows[resumed];
            const stepDef = resumedFlow.steps[resumedWs.step];
            if (stepDef) {
              const prompt = typeof stepDef.prompt === "function" ? stepDef.prompt(text, resumedWs) : stepDef.prompt;
              const combined = `${answer}\n\nNow, back to what we were doing — ${prompt}`;
              session.history.push({ role: "bot", text: combined, timestamp: new Date().toISOString() });
              return combined;
            }
          }
          session.history.push({ role: "bot", text: answer, timestamp: new Date().toISOString() });
          return answer;
        }
        pauseActiveWorkflow(session);
        const reply = processMessage(sessionId, message);
        return reply;
      }

      const reply = advanceWorkflow(session, text);
      session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
      return reply;
    }

    if (intent === "continue_workflow") {
      const resumed = resumeLastWorkflow(session);
      if (resumed) {
        const ws = session.workflows[resumed];
        const flow = flows[resumed];
        const stepDef = flow.steps[ws.step];
        if (stepDef) {
          const prompt = typeof stepDef.prompt === "function" ? stepDef.prompt(text, ws) : stepDef.prompt;
          const reply = `Welcome back! Let me continue where we left off.\n\n${prompt}`;
          session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
          return reply;
        }
      }
    }

    if (intent === "emergency" && classification.confidence >= 0.15) {
      return startAndLog(session, sessionId, "emergency", text);
    }
    if (intent === "appointment_booking" && classification.confidence >= 0.15) {
      const bookingWf = "appointment_booking";
      pauseActiveWorkflow(session);
      const reply = startWorkflow(session, sessionId, bookingWf, text);
      session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
      return reply;
    }
    if (intent === "reschedule" && classification.confidence >= 0.15) {
      pauseActiveWorkflow(session);
      const reply = startWorkflow(session, sessionId, "appointment_booking", text);
      session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
      return reply;
    }
    if (intent === "insurance" && classification.confidence >= 0.15) {
      return startAndLog(session, sessionId, "insurance", text);
    }
    if (intent === "pricing" && classification.confidence >= 0.15) {
      return startAndLog(session, sessionId, "pricing", text);
    }
    if (intent === "lead_capture" && classification.confidence >= 0.15) {
      return startAndLog(session, sessionId, "lead_capture", text);
    }
    if (intent === "business_info" && classification.confidence >= 0.15) {
      const reply = handleBusinessInfo(session, text);
      session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
      return reply;
    }

    if (session.memory.completions.length > 0 && /(?:also|another|need|want|book|schedule)\s+.+(?:cleaning|checkup|filling|crown|whitening|extraction|implant|invisalign|root canal|brace)/i.test(text)) {
      return startAndLog(session, sessionId, "appointment_booking", text);
    }

    const reply = handleGeneralQuestion(session, text);
    trackResponse(session, reply);
    session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
    return reply;
  }

  function startAndLog(session, sessionId, workflowName, text) {
    const existing = getActiveWorkflowName(session);
    if (existing) pauseActiveWorkflow(session);
    const reply = startWorkflow(session, sessionId, workflowName, text);
    session.history.push({ role: "bot", text: reply, timestamp: new Date().toISOString() });
    return reply;
  }

  function handleGreeting(session) {
    const name = session.metadata.name;
    return name
      ? `Welcome back, ${name}! How can I help you today?`
      : "Hello! Welcome to BrightSmile Dental Care. I'm your virtual assistant. I can help you book appointments, check pricing, verify insurance, handle emergencies, or answer any questions. What can I help you with?";
  }

  function processToCompletion(session, workflowName, text) {
    const flow = flows[workflowName];
    const ws = session.workflows[workflowName];
    const mem = session.memory.extractedEntities;
    let maxIterations = 20;
    if (typeof ws.retries !== "object") ws.retries = {};
    if (typeof ws.retries._stepFailures !== "number") ws.retries._stepFailures = 0;
    const MAX_STEP_FAILURES = 3;

    while (maxIterations-- > 0) {

      if (ws.status === "completed" || ws.status === "cancelled") {
        const reply = flow.generateConfirmation(ws);
        session.activeWorkflow = null;
        if (reply) {
          session.memory.completions.push({ workflow: workflowName, completedAt: new Date().toISOString() });
          if (workflowName === "pricing") session.memory.completedPricing = true;
          if (workflowName === "insurance") session.memory.completedInsurance = true;
        }
        return reply || "Is there anything else I can help with?";
      }

      if (!text) {
        while (prefillStepFromMemory(session, workflowName)) {
          if (ws.status === "completed" || ws.status === "cancelled") break;
        }
      }

      const step = flow.steps[ws.step];
      if (!step) {
        session.activeWorkflow = null;
        return "Is there anything else I can help with?";
      }

      if (isConfirmation(text) && (ws.step === "confirm" || ws.step === "confirm_emergency" || ws.step === "confirm_insurance" || ws.step === "confirm_lead")) {
        ws.status = "completed";
        ws.retries._stepFailures = 0;
        continue;
      }

      if (ws.retries._stepFailures >= MAX_STEP_FAILURES && ws.step !== "offer_recovery") {
        ws.step = "offer_recovery";
        ws.retries._stepFailures = 0;
        try {
          if (!step.process || step.process(text, ws) === null) {
          }
        } catch (e) {}
        const recStep = flow.steps.offer_recovery;
        if (recStep && recStep.prompt) {
          const prompt = typeof recStep.prompt === "function" ? recStep.prompt(text, ws) : recStep.prompt;
          return prompt;
        }
        return "I'm sorry, I'm having trouble understanding. Would you like to start over or speak to the clinic directly?";
      }

      const prevStep = ws.step;
      let result = null;
      let processError = null;
      try {
        if (step.process) {
          result = step.process(text, ws);
        }
      } catch (e) {
        processError = e.message;
        result = null;
      }

      if (processError) {
        ws.status = "completed";
        continue;
      }

      if (ws.status === "completed" || ws.status === "cancelled") {
        ws.retries._stepFailures = 0;
        continue;
      }

      if (ws.step !== prevStep) {
        ws.retries._stepFailures = 0;
        if (ws.status === "completed" || ws.status === "cancelled") continue;
        while (prefillStepFromMemory(session, workflowName)) {
          if (ws.status === "completed" || ws.status === "cancelled") break;
        }
        if (ws.status === "completed" || ws.status === "cancelled") continue;
        const nextStep = flow.steps[ws.step];
        if (nextStep && nextStep.prompt) {
          const prompt = typeof nextStep.prompt === "function" ? nextStep.prompt(text, ws) : nextStep.prompt;
          return prompt;
        }
        text = "";
        continue;
      }

      if (result) {
        ws.retries._stepFailures++;
        if (ws.retries._stepFailures >= MAX_STEP_FAILURES && ws.step !== "offer_recovery") {
          ws.step = "offer_recovery";
          const recStep = flow.steps.offer_recovery;
          if (recStep && recStep.prompt) {
            const prompt = typeof recStep.prompt === "function" ? recStep.prompt(text, ws) : recStep.prompt;
            return prompt;
          }
          return "I'm having trouble understanding. Would you like to start over or should I connect you with the clinic directly?";
        }
        const textEntities = extractEntities(text);
        const stepName = ws.step;
        const canPrefill =
          (stepName === "service" && textEntities.services.length === 0 && mem.services.length > 0 && !ws.collected.service) ||
          (stepName === "date" && textEntities.dates.length === 0 && mem.dates.length > 0 && !ws.collected.date) ||
          (stepName === "time" && textEntities.times.length === 0 && mem.times.length > 0 && !ws.collected.time) ||
          (stepName === "name" && textEntities.names.length === 0 && mem.names.length > 0 && !ws.collected.name);
        if (canPrefill && prefillStepFromMemory(session, workflowName)) {
          ws.retries._stepFailures = 0;
          const nextStep = flow.steps[ws.step];
          if (nextStep && nextStep.prompt) {
            const prompt = typeof nextStep.prompt === "function" ? nextStep.prompt(text, ws) : nextStep.prompt;
            return prompt;
          }
          text = "";
          continue;
        }
        return result;
      }

      ws.retries._stepFailures = 0;

      const prompt = typeof step.prompt === "function" ? step.prompt(text, ws) : (step.prompt || null);
      if (prompt) return prompt;

      if (!step.prompt && !step.process) {
        ws.status = "completed";
        continue;
      }

      return "How can I help you?";
    }

    session.activeWorkflow = null;
    return "I'm sorry, we seem to be going in circles. Would you like to start over? Just say 'start over' and I'll reset everything for you.";
  }

  function startWorkflow(session, sessionId, workflowName, text) {
    const flow = flows[workflowName];
    if (!flow) return "I'm sorry, I don't have that workflow available.";

    session.activeWorkflow = workflowName;
    const ws = getWorkflowState(session, workflowName);
    ws.status = "in_progress";

    return processToCompletion(session, workflowName, text);
  }

  function advanceWorkflow(session, text) {
    const wfName = session.activeWorkflow;
    if (!wfName) return "How can I help?";

    const flow = flows[wfName];
    const ws = session.workflows[wfName];
    if (!flow || !ws) {
      session.activeWorkflow = null;
      return "I'm sorry, I lost track of what we were doing. How can I help you?";
    }

    return processToCompletion(session, wfName, text);
  }

  function handleBusinessInfo(session, text) {
    const lower = text.toLowerCase();
    if (/hours?|open|close/i.test(lower)) {
      return `We're open ${knowledge.getHours()}. We're located at ${knowledge.getLocation().address}.`;
    }
    if (/phone|call|contact/i.test(lower)) {
      return `You can reach us at ${knowledge.getLocation().phone} or email ${knowledge.getLocation().email}.`;
    }
    if (/address|location|where/i.test(lower)) {
      return `We're at ${knowledge.getLocation().address}. Our hours are ${knowledge.getHours()}. Give us a call at ${knowledge.getLocation().phone}!`;
    }
    if (/parking|directions/i.test(lower)) {
      return `We're at ${knowledge.getLocation().address} with free parking available in the lot behind the building. There's also street parking out front.`;
    }
    return `Here's our info:\nAddress: ${knowledge.getLocation().address}\nPhone: ${knowledge.getLocation().phone}\nEmail: ${knowledge.getLocation().email}\nHours: ${knowledge.getHours()}\n\nIs there anything else you'd like to know?`;
  }

  function isHostile(text) {
    const lower = text.toLowerCase();
    return /useless|terrible|awful|horrible|waste|stupid|idiot|dumb|annoying|frustrating|ridiculous|unhelpful|are you (even|actually) (listening|helping|real|human)|this is (useless|ridiculous|not helping)|i'm leaving|bad review|complaint/i.test(lower);
  }

  function isConfused(text) {
    const lower = text.toLowerCase().trim();
    return /^(what\??|huh\??|huh\?|what do you mean|i don't understand|i don't get it|can you repeat|what does that mean|sorry\??|explain|i'm confused|i am confused|what are you talking about)/i.test(lower) || lower.length < 4;
  }

  function isGenericCatchAll(response) {
    const r = response.toLowerCase().trim();
    return r.includes("i'm here to help with anything related to brightsmile") ||
           r.includes("i can assist with appointments, pricing, insurance") ||
           r.includes("how can i help you?");
  }

  function trackResponse(session, response) {
    session.memory.lastGenericResponses.push(response);
    if (session.memory.lastGenericResponses.length > 6) {
      session.memory.lastGenericResponses.shift();
    }
  }

  function hasRepeatedGeneric(session) {
    const recent = session.memory.lastGenericResponses;
    if (recent.length < 3) return false;
    const last3 = recent.slice(-3);
    const normalized = last3.map(r => r.replace(/[^a-z]/gi, "").toLowerCase().slice(-40));
    return new Set(normalized).size <= 1;
  }

  function escalationReply(session) {
    const name = session.metadata.name || "";
    const mem = session.memory;
    if (mem.escalated) {
      mem.escalationRepeatCount = (mem.escalationRepeatCount || 0) + 1;
      const repeats = [
        `You can reach us at ${knowledge.getLocation().phone} or say "start over" to begin again.`,
        `Our front desk team is available at ${knowledge.getLocation().phone}. Would you like to call now?`,
        `Just let me know if you'd like to call ${knowledge.getLocation().phone} or try again.`,
      ];
      return repeats[(mem.escalationRepeatCount - 1) % repeats.length];
    }
    mem.escalated = true;
    return `I apologize${name ? ", " + name : ""} — I'm having trouble understanding and I don't want to waste your time. Would you like me to connect you with our front desk team at ${knowledge.getLocation().phone}? Or we can start over — just say "start over" and I'll reset.`;
  }

  function handleGeneralQuestion(session, text) {
    const lower = text.toLowerCase();
    const mem = session.memory;

    function trackResponseType(type) {
      mem.lastResponseType = type;
      mem.responseTypeCount[type] = (mem.responseTypeCount[type] || 0) + 1;
    }

    function isRepeatingType(type) {
      return mem.responseTypeCount[type] >= 2;
    }

    if (/^(start over|restart|reset|try again)/i.test(lower)) {
      session.activeWorkflow = null;
      session.workflows = {};
      session.memory.pausedWorkflows = [];
      session.memory.frustrationCount = 0;
      session.memory.confusedCount = 0;
      session.memory.hostilityCount = 0;
      session.memory.escalated = false;
      session.memory.lastGenericResponses = [];
      const name = session.metadata.name || "";
      return `No problem${name ? ", " + name : ""}! Let's start fresh. How can I help you today?`;
    }

    if (/(?:call|phone|connect|speak|transfer)\s*(?:clinic|front.?desk|office|human|agent|person|staff|team|directly)/i.test(lower) ||
        /(?:clinic|front.?desk|office)\s*(?:phone|number|call)/i.test(lower)) {
      mem.escalated = true;
      return `Of course! You can reach BrightSmile Dental Care directly at ${knowledge.getLocation().phone}. Our team will be happy to assist you. Is there anything else I can help with?`;
    }

    if (isConfused(text)) {
      mem.confusedCount = (mem.confusedCount || 0) + 1;
      mem.frustrationCount++;
      if (mem.confusedCount >= 3) {
        return escalationReply(session);
      }
      if (mem.confusedCount === 2) {
        return "Let me try explaining differently. I'm a virtual assistant for BrightSmile Dental Care. I can help you book appointments, check our prices, verify insurance, or answer questions about our services. What would you like help with? Just say something like \"book a cleaning\" or \"how much is invisalign?\"";
      }
    }

    if (isHostile(text)) {
      mem.hostilityCount = (mem.hostilityCount || 0) + 1;
      mem.frustrationCount++;
      if (mem.hostilityCount >= 2) {
        return escalationReply(session);
      }
      return "I'm sorry you're having a frustrating experience. That's not my intention — let me try to help better. What can I assist you with? You can say \"book an appointment\", \"check pricing\", or \"insurance question\" and I'll get right to it.";
    }

    if (hasRepeatedGeneric(session)) {
      mem.frustrationCount++;
      return escalationReply(session);
    }

    if (/(?:are you|how good|reputation|review|rating|recommend|trust|experienced|testimonial|referral)\s*(?:good|reliable|trustworthy|reputable|experienced|recommended|rated)?/i.test(lower) ||
        /patient (reviews?|testimonials|feedback)|google review|star rating|how (long has|many years).*(?:been|practice|open)|are you (any )?good|what('s| is) your (rating|review)|do you have (good|positive) (reviews|feedback)/i.test(lower)) {
      return "Our team is led by Dr. Patel (15+ years experience), Dr. Lee (pediatric specialist), and Dr. Garcia (cosmetic dentistry). We maintain a 4.8-star rating across review platforms, and many of our patients come through referrals. The best way to judge is to visit us — would you like to book a consultation to meet the team?";
    }

    const faq = knowledge.findFaq(text);
    if (faq) {
      trackResponseType("faq");
      if (isRepeatingType("faq")) {
        return "I shared that information already. Would you like to book an appointment or is there something specific you'd like to know?";
      }
      return faq.answer + "\n\nWould you like to book an appointment or is there anything else I can help with?";
    }

    const svc = knowledge.findService(text);
    if (svc) {
      trackResponseType("service_info");
      if (isRepeatingType("service_info")) {
        return `I already mentioned ${svc.name}. Would you like to book an appointment for that, or is there something else I can help with?`;
      }
      return `Yes, we offer ${svc.name}. The price is ${svc.price} and takes about ${svc.duration}. Would you like more details, or would you like to book an appointment?`;
    }

    const provider = knowledge.findInsurance(text);
    if (provider) {
      trackResponseType("insurance_accept");
      if (isRepeatingType("insurance_accept")) {
        return `Yes, we accept ${provider}. We are in-network with most major plans. Would you like to book an appointment or check your specific coverage details?`;
      }
      return `Yes, we accept ${provider}! We're in-network with most ${provider} plans. Would you like me to check your specific coverage? Just share your member ID and I can look it up.`;
    }

    if (/thanks|thank you|appreciate/i.test(lower)) {
      return `You're welcome${session.metadata.name ? ", " + session.metadata.name : ""}! Is there anything else I can help with?`;
    }

    if (/bye|goodbye|see you|talk later/i.test(lower)) {
      return `Goodbye${session.metadata.name ? ", " + session.metadata.name : ""}! Feel free to come back anytime you need us. Have a great day!`;
    }

    if (/who are you|what are you/i.test(lower)) {
      return "I'm BrightSmile AI, your virtual dental clinic assistant. I can help with appointments, pricing, insurance questions, emergencies, and general information about BrightSmile Dental Care. How can I help you?";
    }

    if (/pediatric|child|kid|children/i.test(lower)) {
      trackResponseType("pediatric");
      if (isRepeatingType("pediatric")) {
        return "I'd be happy to help you schedule an appointment for your child. What day works best for you? We're open Monday through Friday.";
      }
      return "Yes, we see children of all ages! Dr. Lee specializes in pediatric dentistry. First visits are gentle and fun. We recommend bringing children by age 1. Would you like to schedule an appointment for your child?";
    }

    if (/implant/i.test(lower)) {
      return "We offer dental implants ranging from $3,000-$4,500 per tooth. The process takes a few months but results are permanent and natural-looking. We offer CareCredit financing. Would you like to book a consultation with Dr. Patel?";
    }

    if (/payment plan|financing|care ?credit/i.test(lower)) {
      return "We offer flexible payment plans through CareCredit with 0% financing options for 6-12 months. We also accept cash, credit cards, and HSA/FSA cards. Would you like to discuss this further?";
    }

    if (/cancel/i.test(lower)) {
      return "I can help with cancellations! Could you please provide the name on the appointment and the date so I can look it up?";
    }

    if (/how (are you|doing)/i.test(lower)) {
      return "I'm doing great, thanks for asking! I'm here to help you with anything you need. What can I assist you with today?";
    }

    if (/service|what do you offer/i.test(lower)) {
      const list = knowledge.getServiceList().map(s => `${s.name}: ${s.price} (${s.duration})`).join("\n");
      return `Here's what we offer at BrightSmile Dental Care:\n${list}\n\nWhich service are you interested in?`;
    }

    if (/book|schedule|appointment/i.test(lower)) {
      return "I'd be happy to help you book an appointment! What service are you looking for? We offer checkups, whitening, fillings, and more.";
    }

    const svcFromKnowledge = knowledge.findService(text);
    if (svcFromKnowledge) {
      return `Yes, we offer ${svcFromKnowledge.name} at ${svcFromKnowledge.price}. Would you like to book an appointment?`;
    }

    mem.frustrationCount++;
    if (mem.frustrationCount >= 5) {
      return escalationReply(session);
    }

    return "I'm here to help with anything related to BrightSmile Dental Care! I can assist with appointments, pricing, insurance, emergencies, or answer general questions. What can I help you with?";
  }

  function getSessionState(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    const active = getActiveWorkflowName(session);
    let wf = active ? session.workflows[active] : null;
    if (!wf && session.memory.completions.length > 0) {
      const last = session.memory.completions[session.memory.completions.length - 1];
      wf = session.workflows[last.workflow] || null;
    }
    return {
      activeWorkflow: active,
      workflowState: wf ? { step: wf.step, status: wf.status, collected: wf.collected } : null,
      metadata: session.metadata,
      turnCount: session.turnCount,
      completions: session.memory.completions,
      pausedWorkflows: session.memory.pausedWorkflows.map(p => p.name)
    };
  }

  function resetAll() {
    sessions.clear();
  }

  return { processMessage, getSessionState, resetAll };
}

module.exports = { createConversationManager };
