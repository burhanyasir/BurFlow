"use strict";
(() => {
  // packages/widget/src/stream-client.ts
  async function streamChat(options) {
    const { apiUrl, tenantId, apiKey, widgetToken, sessionId, message, onToken, onDone, onComplete, onError, signal } = options;
    const body = {
      message: message || ""
    };
    if (sessionId) body.sessionId = sessionId;
    const headers = {
      "Content-Type": "application/json"
    };
    if (tenantId) headers["x-tenant-id"] = tenantId;
    if (apiKey) headers["x-api-key"] = apiKey;
    if (widgetToken) headers["x-widget-token"] = widgetToken;
    if (sessionId) headers["x-session-id"] = sessionId;
    let response;
    try {
      response = await fetch(`${apiUrl}/api/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      onError(err.message || "Network error");
      return;
    }
    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        errorMsg = data.error || errorMsg;
      } catch {
      }
      onError(errorMsg);
      return;
    }
    const headersObj = response.headers;
    const contentType = headersObj && typeof headersObj.get === "function" ? headersObj.get("content-type") || "" : "";
    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        if (data.response) {
          onComplete(data.response, data.turnId || "");
        }
        if (data.humanTakeover) {
          options.onHumanTakeover?.();
        }
        if (options.onUiState) {
          options.onUiState(data.uiState, data.cta);
        }
        return;
      } catch (err) {
        onError(err.message || "Failed to parse JSON response");
        return;
      }
    }
    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            const event = JSON.parse(data);
            switch (event.type) {
              case "token":
                if (event.content) onToken(event.content);
                break;
              case "done":
                if (event.finishReason) onDone(event.finishReason);
                if (event.humanTakeover) options.onHumanTakeover?.();
                break;
              case "complete":
                onComplete(event.fullContent || "", event.turnId || "");
                if (event.humanTakeover) options.onHumanTakeover?.();
                break;
              case "ui_state":
                if (options.onUiState) options.onUiState(event.uiState, event.cta);
                if (event.humanTakeover) options.onHumanTakeover?.();
                break;
              case "error":
                onError(event.error || "Unknown error");
                break;
            }
          } catch {
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        onError(err.message || "Stream error");
      }
    } finally {
      reader.releaseLock();
    }
  }

  // packages/widget/src/chat-ui.ts
  function buildBusinessProfileFromWidgetConfig(config = {}) {
    const persisted = config.businessProfile || {};
    const pick = (camel, snake) => persisted[camel] ?? persisted[snake];
    const titleText = (config.title || "").toLowerCase();
    const greetingText = (config.greeting || "").toLowerCase();
    const hasSalesLanguage = titleText.includes("sales") || greetingText.includes("demo") || greetingText.includes("plan") || greetingText.includes("pricing");
    const suggestedActions = (config.suggestedActions || []).map((action) => action.label.toLowerCase());
    const hasDemoAction = suggestedActions.some((label) => label.includes("demo"));
    const hasPricingAction = suggestedActions.some((label) => label.includes("plan") || label.includes("pricing"));
    const base = {
      companyName: pick("companyName", "company_name") || config.companyName || "this business",
      industry: pick("industry", "industry") || (hasSalesLanguage ? "SaaS" : void 0),
      businessType: pick("businessType", "business_type") || (hasSalesLanguage ? "saas" : void 0),
      products: pick("products", "products") || ["product guidance", hasDemoAction ? "demo qualification" : "core offering"].filter(Boolean),
      services: pick("services", "services") || ["guided recommendations", hasDemoAction ? "demo booking support" : "support"].filter(Boolean),
      pricingModel: pick("pricingModel", "pricing_model") || (hasPricingAction ? "guided plans" : "flexible options"),
      valuePropositions: pick("valuePropositions", "value_propositions") || [hasDemoAction ? "clear next steps" : "clear guidance", "fast, trustworthy responses"],
      targetAudience: pick("targetAudience", "target_audience") || ["prospective buyers", "website visitors"],
      faqs: pick("faqs", "faqs") || ["How does this work?", "What should I do next?"],
      contactDetails: pick("contactDetails", "contact_details") || ["sales contact"],
      trustSignals: pick("trustSignals", "trust_signals") || ["website-guided guidance", "transparent next steps"],
      brandTone: pick("brandTone", "brand_tone") || "confident and helpful",
      sourceUrls: pick("sourceUrls", "source_urls") || (config.companyName ? { pricing: "#", services: "#", faq: "#", about: "#" } : void 0)
    };
    return base;
  }
  function buildUnknownResponseGuide(topic, confidence) {
    const normalized = (topic || "").toLowerCase();
    const fallback = normalized.includes("pricing") ? "pricing details" : normalized.includes("faq") || normalized.includes("question") ? "faq details" : normalized.includes("service") || normalized.includes("support") ? "service details" : "the requested information";
    if (typeof confidence === "number" && confidence < 0.45) {
      return `I couldn't confidently determine ${fallback} from this website. If you want, I can help by connecting you with a specialist: Contact Sales, Book Demo, or leave a message.`;
    }
    return `I didn't find enough detail on ${fallback} from this website. I can still help you with Contact Sales, Book Demo, or a message.`;
  }
  function buildContinuityCue(previousMessages, newMessage) {
    const prior = previousMessages.filter((message) => message.role === "user" && typeof message.content === "string").map((message) => message.content?.toLowerCase() || "").join(" ");
    const normalized = newMessage.toLowerCase();
    if (prior.includes("pricing") && normalized.includes("service")) {
      return "Since you were looking at pricing earlier, I can compare that with the available service options.";
    }
    if (prior.includes("service") && normalized.includes("pricing")) {
      return "Since you were looking at services earlier, I can connect that to the pricing information.";
    }
    if (prior.includes("faq") && normalized.includes("contact")) {
      return "Since you were reviewing FAQs earlier, I can point you to the right contact path next.";
    }
    return "I can continue from what you were looking at earlier.";
  }
  function buildBusinessGreeting(profile = {}) {
    const companyName = profile.companyName || "this business";
    const industryLabel = profile.industry || profile.businessType || "business";
    const productHint = profile.products?.[0] || profile.services?.[0] || "offerings";
    const pricingHint = profile.pricingModel || "plans";
    let greeting = "";
    if (/saas|software|technology|platform/i.test(industryLabel)) {
      greeting = `Hey there! \u{1F44B} I know everything about ${companyName}'s products and pricing. Ask me anything \u2014 I'll give you a straight answer, not a sales pitch.`;
    } else if (/agency|consult|marketing|creative|design/i.test(industryLabel)) {
      greeting = `Hey there! \u{1F44B} I can walk you through ${companyName}'s services and help you find the right fit. What are you looking for?`;
    } else if (/restaurant|food|cafe|hotel|hospitality/i.test(industryLabel)) {
      greeting = `Hey there! \u{1F44B} I can help you explore ${companyName}'s menu, availability, or the best next step. What would you like to know?`;
    } else {
      greeting = `Hey there! \u{1F44B} I'm your guide to ${companyName}. I can explain our ${productHint.toLowerCase()}, compare ${pricingHint.toLowerCase()}, or point you to the right next step. What are you curious about?`;
    }
    if (profile.faqs?.length || profile.contactDetails?.length) {
      const faqPart = profile.faqs?.length ? "answer common questions" : "clarify common questions";
      const contactPart = profile.contactDetails?.length ? `point you to contact options such as ${profile.contactDetails[0]}` : "point you to contact options";
      greeting = `${greeting} I can also ${faqPart} and ${contactPart}.`;
    }
    return greeting;
  }
  var DEFAULT_CONFIG = {
    apiUrl: "",
    tenantId: void 0,
    apiKey: void 0,
    sessionId: void 0,
    widgetToken: void 0,
    title: "BurFlow Sales Agent",
    subtitle: "Your smart buying assistant",
    primaryColor: "#006248",
    avatarUrl: void 0,
    greeting: "\u{1F44B} Hey there! I know everything about this website\u2019s products and pricing. Ask me anything!",
    greetingText: void 0,
    position: "bottom-right",
    widgetPosition: void 0,
    theme: "light",
    themeMode: void 0,
    companyName: "",
    launcherText: "Chat with us",
    logoUrl: void 0,
    autoOpen: false,
    autoOpenDelay: 3,
    customCss: "",
    starterOptions: [],
    suggestedActions: [
      { id: "pricing", label: "Pricing", action: "send_text", payload: "Show me pricing", variant: "secondary", category: "plans" },
      { id: "products", label: "Best Fit", action: "send_text", payload: "Which option fits our needs best?", variant: "secondary", category: "guidance" },
      { id: "services", label: "Products", action: "send_text", payload: "What products do you offer?", variant: "secondary", category: "products" },
      { id: "demo", label: "Book 15-Min Demo", action: "send_text", payload: "I want to book a demo", variant: "primary", category: "demo" },
      { id: "faq", label: "Common Questions", action: "send_text", payload: "What are the most common questions?", variant: "secondary", category: "faq" },
      { id: "contact", label: "Talk to Sales", action: "send_text", payload: "Connect me with sales", variant: "secondary", category: "sales" }
    ]
  };
  var messageIdCounter = 0;
  function nextId() {
    return `msg-${Date.now()}-${++messageIdCounter}`;
  }
  var ChatWidget = class {
    config;
    messages = [];
    businessProfile = {};
    isOpen = false;
    isStreaming = false;
    abortController = null;
    container = null;
    messagesEl = null;
    inputEl = null;
    sendBtnEl = null;
    bubbleEl = null;
    headerTitleEl = null;
    headerSubtitleEl = null;
    unreadCount = 0;
    actionPanel = null;
    uiState = null;
    cta = null;
    unreadBadge = null;
    preOpenPanelEl = null;
    configLoadPromise = null;
    suggestionHistory = [];
    preOpenDismissed = false;
    handoffEl = null;
    handoffShown = false;
    takeoverEl = null;
    takeoverShown = false;
    placeholderInterval = null;
    autoOpenTimer = null;
    headerLogoEl = null;
    /** Long-lived SSE stream of takeover events (TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED). */
    takeoverEventsController = null;
    /** Polls GET /api/chat/history for operator messages during a human takeover. */
    agentPollTimer = null;
    lastAgentSeq = 0;
    get placeholders() {
      const type = (this.businessProfile.businessType || "").toLowerCase();
      if (/ecommerce|retail|store|shop|medical|pharma/.test(type)) {
        return ["What products do you offer?", "How fast is delivery?", "What is your return policy?", "Do you have this in stock?"];
      }
      if (/clinic|dental|healthcare|hospital/.test(type)) {
        return ["What services do you offer?", "How do I book an appointment?", "What are your hours?", "Do you accept insurance?"];
      }
      return ["Ask about pricing...", "How does it work?", "Book a demo...", "What products do you offer?"];
    }
    boundDismissPreOpen = (e) => {
      if (this.preOpenPanelEl && !this.preOpenPanelEl.contains(e.target)) {
        this.dismissPreOpenPanel();
      }
    };
    constructor(config) {
      this.config = { ...DEFAULT_CONFIG, ...this.normalizeAliases(config) };
      this.restoreSessionId();
      this.businessProfile = this.deriveBusinessProfileFromConfig();
    }
    normalizeAliases(remote) {
      const merged = { ...remote };
      if (merged.themeMode !== void 0 && merged.theme === void 0) merged.theme = merged.themeMode;
      if (merged.widgetPosition !== void 0 && merged.position === void 0) {
        merged.position = merged.widgetPosition === "right" ? "bottom-right" : merged.widgetPosition === "left" ? "bottom-left" : merged.widgetPosition;
      }
      if (merged.greetingText !== void 0 && merged.greeting === void 0) merged.greeting = merged.greetingText;
      return merged;
    }
    injectStyles() {
      if (document.getElementById("cw-widget-styles")) return;
      const style = document.createElement("style");
      style.id = "cw-widget-styles";
      style.textContent = `
      @keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      @keyframes cw-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      @keyframes cw-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes cw-slide-in { from{opacity:0;transform:translateX(20px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
      @keyframes cw-bubble-pulse { 0%,100%{box-shadow:0 8px 32px rgba(0,98,72,0.45),0 2px 8px rgba(0,0,0,0.1)} 50%{box-shadow:0 8px 40px rgba(0,98,72,0.6),0 2px 12px rgba(0,0,0,0.15)} }
      .cw-bubble { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%) !important; }
      .cw-send { background:linear-gradient(135deg,var(--cw-primary-color,#006248) 0%,var(--cw-primary-color,#004d38) 100%) !important; }
      .cw-bubble:hover { transform:scale(1.05) !important; box-shadow:0 12px 40px rgba(0,98,72,0.55) !important; }
      .cw-send:hover { transform:scale(1.05) !important; box-shadow:0 6px 24px rgba(0,98,72,0.4) !important; }
      .cw-action-button:active { transform:scale(0.96) !important; box-shadow:none !important; }
      .cw-input:focus { border-color:var(--cw-primary-color,#006248) !important; box-shadow:0 0 0 3px rgba(0,98,72,0.12) !important; background:#fff !important; }
      .cw-preopen-panel { border:1.5px solid #E8F5E9 !important; box-shadow:0 20px 60px rgba(0,98,72,0.12),0 4px 20px rgba(0,0,0,0.06) !important; }
      .cw-preopen-pill { background:#E8F5E9 !important; color:#006248 !important; border:1px solid #C8E6C9 !important; }
      .cw-preopen-pill:hover { background:#006248 !important; color:#fff !important; }
      html[data-cw-theme='dark'] .cw-container { background:#111827 !important; }
      html[data-cw-theme='dark'] .cw-messages { background:#0F172A !important; }
      html[data-cw-theme='dark'] .cw-input-area { background:#111827 !important; border-top-color:#1F2937 !important; }
      html[data-cw-theme='dark'] .cw-action-panel { background:#0F172A !important; border-top-color:#1F2937 !important; }
      html[data-cw-theme='dark'] .cw-input { background:#1F2937 !important; border-color:#374151 !important; color:#F3F4F6 !important; }
      html[data-cw-theme='dark'] .cw-card { background:#1F2937 !important; border-color:#374151 !important; color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-msg-user { background:var(--cw-primary-color,#006248) !important; color:#fff !important; }
      html[data-cw-theme='dark'] .cw-bubble-label { color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-preopen-panel { background:#1F2937 !important; border-color:#374151 !important; }
      html[data-cw-theme='dark'] .cw-preopen-panel div { color:#E5E7EB !important; }
      html[data-cw-theme='dark'] .cw-highlight { background: rgba(255,255,255,0.1) !important; }
      @media (max-width:640px) {
        .cw-container { bottom:0 !important; left:0 !important; right:0 !important; width:100vw !important; height:100vh !important; border-radius:0 !important; }
        .cw-bubble { bottom:16px !important; }
        .cw-preopen-panel { bottom:80px !important; left:16px !important; right:16px !important; max-width:none !important; }
      }
    `;
      document.head.appendChild(style);
    }
    mount() {
      if (this.container) return;
      this.injectStyles();
      this.applyBrandingVars();
      this.createBubble();
      this.createChatWindow();
      if (this.config.widgetToken) {
        this.configLoadPromise = this.fetchRemoteConfig();
      }
      this.startAgentPolling();
      this.subscribeTakeoverEvents();
    }
    unmount() {
      this.abort();
      this.takeoverEventsController?.abort();
      this.takeoverEventsController = null;
      if (this.placeholderInterval) {
        clearInterval(this.placeholderInterval);
        this.placeholderInterval = null;
      }
      if (this.autoOpenTimer) {
        clearTimeout(this.autoOpenTimer);
        this.autoOpenTimer = null;
      }
      if (this.agentPollTimer) {
        clearInterval(this.agentPollTimer);
        this.agentPollTimer = null;
      }
      this.container?.remove();
      this.bubbleEl?.remove();
      this.container = null;
      this.bubbleEl = null;
      this.messagesEl = null;
      this.inputEl = null;
    }
    /**
     * Poll the chat history every 4s while the widget is alive. Only agent-sent
     * messages (sender='agent', sequence > lastAgentSeq) are appended, so AI
     * responses — which arrive synchronously over SSE — are never duplicated and
     * operator replies reach the visitor without them sending a new message.
     */
    startAgentPolling() {
      if (this.agentPollTimer) return;
      const POLL_INTERVAL_MS = 4e3;
      this.agentPollTimer = setInterval(() => {
        this.pollForAgentMessages();
      }, POLL_INTERVAL_MS);
      this.pollForAgentMessages();
    }
    /**
     * Subscribes to the session takeover event stream (SSE). This is the
     * real-time channel for TAKEOVER_STARTED / OPERATOR_MESSAGE / TAKEOVER_ENDED
     * — the 4s history poll remains as a fallback for browsers/connections that
     * cannot hold an SSE stream open.
     */
    subscribeTakeoverEvents() {
      const sessionId = this.config.sessionId;
      const apiUrl = this.config.apiUrl;
      if (!sessionId) return;
      try {
        this.takeoverEventsController?.abort();
      } catch {
      }
      this.takeoverEventsController = new AbortController();
      const headers = { Accept: "text/event-stream" };
      if (this.config.tenantId) headers["x-tenant-id"] = this.config.tenantId;
      if (this.config.apiKey) headers["x-api-key"] = this.config.apiKey;
      if (this.config.widgetToken) headers["x-widget-token"] = this.config.widgetToken;
      const url = `${apiUrl}/api/chat/events?sessionId=${encodeURIComponent(sessionId)}`;
      Promise.resolve(fetch(url, { headers, signal: this.takeoverEventsController.signal })).then(async (res) => {
        if (!res.ok || !res.body) return;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const raw = dataLine.slice(5).trim();
            if (!raw) continue;
            try {
              this.handleTakeoverEvent(JSON.parse(raw));
            } catch {
            }
          }
        }
      }).catch(() => {
      });
    }
    handleTakeoverEvent(event) {
      switch (event.type) {
        case "TAKEOVER_STARTED":
          this.showTakeoverBanner();
          this.hideStarterChips();
          break;
        case "OPERATOR_MESSAGE": {
          const payload = event.payload || {};
          const content = typeof payload.content === "string" ? payload.content : "";
          const seq = typeof payload.sequenceNumber === "number" ? payload.sequenceNumber : 0;
          if (!content) break;
          if (seq > this.lastAgentSeq) {
            this.lastAgentSeq = seq;
            this.addMessage({ role: "assistant", content, sender: "agent", sequenceNumber: seq });
            this.scrollToBottom();
            this.hideTypingIndicator();
          }
          break;
        }
        case "TAKEOVER_ENDED":
          this.hideTakeoverBanner();
          this.renderInitialActions();
          break;
      }
    }
    async pollForAgentMessages() {
      const sessionId = this.config.sessionId;
      const apiUrl = this.config.apiUrl;
      if (!sessionId) return;
      try {
        const headers = { Accept: "application/json" };
        if (this.config.tenantId) headers["x-tenant-id"] = this.config.tenantId;
        if (this.config.apiKey) headers["x-api-key"] = this.config.apiKey;
        if (this.config.widgetToken) headers["x-widget-token"] = this.config.widgetToken;
        const url = `${apiUrl}/api/chat/history?sessionId=${encodeURIComponent(sessionId)}&after=${this.lastAgentSeq}`;
        const res = await fetch(url, { headers, signal: this.abortController?.signal });
        if (!res.ok) return;
        const data = await res.json();
        const incoming = data?.messages || [];
        for (const m of incoming) {
          if (!m || typeof m.content !== "string") continue;
          this.lastAgentSeq = Math.max(this.lastAgentSeq, m.sequenceNumber || 0);
          this.addMessage({ role: "assistant", content: m.content, sender: "agent", sequenceNumber: m.sequenceNumber });
        }
        if (incoming.length > 0) {
          this.scrollToBottom();
          this.hideTypingIndicator();
        }
      } catch {
      }
    }
    applyBrandingVars() {
      if (typeof document === "undefined") return;
      const primary = this.config.primaryColor || "#3B82F6";
      document.documentElement.style.setProperty("--cw-primary-color", primary);
      let theme = this.config.theme || "light";
      if (theme === "auto") {
        try {
          theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        } catch {
          theme = "light";
        }
      }
      document.documentElement.setAttribute("data-cw-theme", theme);
      let style = document.getElementById("cw-widget-custom");
      const css = this.config.customCss || "";
      if (css.trim()) {
        if (!style) {
          style = document.createElement("style");
          style.id = "cw-widget-custom";
          document.head.appendChild(style);
        }
        style.textContent = css;
      } else if (style) {
        style.remove();
      }
    }
    createBubble() {
      const bubble = document.createElement("div");
      bubble.className = "cw-bubble";
      bubble.setAttribute("role", "button");
      bubble.setAttribute("aria-label", "Open chat");
      bubble.setAttribute("tabindex", "0");
      bubble.style.cssText = this.getBubbleStyles();
      const icon = document.createElement("div");
      icon.className = "cw-bubble-icon";
      icon.innerHTML = this.getChatIconSvg();
      bubble.appendChild(icon);
      const label = document.createElement("span");
      label.className = "cw-bubble-label";
      label.textContent = "Chat with us";
      bubble.appendChild(label);
      const badge = document.createElement("span");
      badge.className = "cw-bubble-badge";
      badge.style.cssText = "display:none;position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600;";
      bubble.appendChild(badge);
      this.unreadBadge = badge;
      bubble.addEventListener("click", () => this.toggle());
      bubble.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggle();
        }
      });
      document.body.appendChild(bubble);
      this.bubbleEl = bubble;
      this.createPreOpenPanel();
    }
    createPreOpenPanel() {
      const panel = document.createElement("div");
      panel.className = "cw-preopen-panel";
      const pos = this.config.position === "bottom-left" ? "left:92px;" : "right:92px;";
      panel.style.cssText = `position:fixed;bottom:84px;${pos}z-index:999998;display:none;max-width:280px;animation:cw-slide-in 0.3s cubic-bezier(0.16,1,0.3,1);background:#fff;border:1.5px solid #E8F5E9;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,98,72,0.12),0 4px 20px rgba(0,0,0,0.06);cursor:pointer;`;
      const header = document.createElement("div");
      header.style.cssText = "padding:14px 16px 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#006248;";
      header.textContent = "Suggested questions";
      panel.appendChild(header);
      const optionsWrap = document.createElement("div");
      optionsWrap.className = "cw-preopen-options";
      panel.appendChild(optionsWrap);
      document.body.appendChild(panel);
      this.preOpenPanelEl = panel;
      this.renderPreOpenOptions();
      setTimeout(() => {
        if (!this.preOpenDismissed && !this.isOpen) {
          panel.style.display = "block";
        }
      }, 2e3);
      setTimeout(() => this.dismissPreOpenPanel(), 12e3);
      document.addEventListener("click", this.boundDismissPreOpen);
    }
    /** Rebuilds the pre-open "Suggested questions" rows from the current config (called at mount and again when remote config arrives). */
    renderPreOpenOptions() {
      if (!this.preOpenPanelEl) return;
      const wrap = this.preOpenPanelEl.querySelector(".cw-preopen-options");
      if (!wrap) return;
      wrap.innerHTML = "";
      const options = this.config.starterOptions?.length ? this.config.starterOptions : this.defaultStarterOptions();
      options.forEach((text, i) => {
        const row = document.createElement("div");
        row.style.cssText = `padding:10px 16px;font-size:13px;color:#374151;font-weight:500;line-height:1.4;display:flex;align-items:center;gap:8px;${i < options.length - 1 ? "border-bottom:1px solid #F0F4F0;" : ""}transition:background 0.15s ease;border-radius:8px;margin:2px 4px;`;
        const pill = document.createElement("span");
        pill.className = "cw-preopen-pill";
        pill.style.cssText = "display:inline-flex;align-items:center;padding:6px 14px;border-radius:9999px;background:#E8F5E9;color:#006248;font-size:12px;font-weight:600;white-space:nowrap;border:1px solid #C8E6C9;transition:all 0.2s ease;";
        pill.textContent = text;
        row.appendChild(pill);
        row.addEventListener("mouseenter", () => {
          row.style.background = "#F9FAFB";
        });
        row.addEventListener("mouseleave", () => {
          row.style.background = "transparent";
        });
        row.addEventListener("click", (e) => {
          e.stopPropagation();
          this.dismissPreOpenPanel();
          if (!this.isOpen) this.toggle();
          setTimeout(() => {
            if (this.inputEl) {
              this.inputEl.value = text;
              this.send();
            }
          }, 150);
        });
        wrap.appendChild(row);
      });
    }
    defaultStarterOptions() {
      const type = (this.businessProfile.businessType || "").toLowerCase();
      if (/ecommerce|retail|store|shop|medical|pharma/.test(type)) {
        return ["What products do you offer?", "How fast is delivery?", "What is your return policy?"];
      }
      if (/clinic|dental|healthcare|hospital/.test(type)) {
        return ["Book an appointment", "What services do you offer?", "What are your hours?"];
      }
      return ["Show me pricing", "How does it work?", "Book a demo"];
    }
    showPreOpenPanel() {
      if (this.preOpenDismissed || this.isOpen || !this.preOpenPanelEl) return;
      this.preOpenPanelEl.style.display = "flex";
      this.preOpenDismissed = true;
      setTimeout(() => this.dismissPreOpenPanel(), 12e3);
    }
    dismissPreOpenPanel() {
      if (this.preOpenPanelEl) {
        this.preOpenPanelEl.style.display = "none";
      }
    }
    createChatWindow() {
      const container = document.createElement("div");
      container.className = "cw-container";
      container.style.cssText = this.getContainerStyles();
      container.style.display = "none";
      container.appendChild(this.createHeader());
      this.messagesEl = this.createMessagesArea();
      container.appendChild(this.messagesEl);
      this.actionPanel = this.createActionPanel();
      container.appendChild(this.actionPanel);
      container.appendChild(this.createInputArea());
      this.takeoverEl = this.createTakeoverArea();
      container.appendChild(this.takeoverEl);
      this.handoffEl = this.createHandoffArea();
      container.appendChild(this.handoffEl);
      document.body.appendChild(container);
      this.container = container;
      if (this.config.autoOpen) {
        const delayMs = Math.max(0, Math.min(this.config.autoOpenDelay ?? 3, 60)) * 1e3;
        this.autoOpenTimer = setTimeout(() => {
          this.autoOpenTimer = null;
          if (!this.isOpen) this.toggle();
        }, delayMs);
      }
    }
    createHeader() {
      const header = document.createElement("div");
      header.className = "cw-header";
      header.style.cssText = `background:linear-gradient(135deg,#003d2d 0%,#006248 60%,#00855e 100%);color:#fff;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:20px 20px 0 0;`;
      const info = document.createElement("div");
      info.style.cssText = "display:flex;align-items:center;gap:10px;";
      const logoUrl = this.config.logoUrl || this.config.avatarUrl;
      if (logoUrl) {
        const logo = document.createElement("img");
        logo.className = "cw-logo";
        logo.alt = "";
        logo.style.cssText = "width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid rgba(255,255,255,0.25);";
        logo.src = logoUrl;
        info.appendChild(logo);
        this.headerLogoEl = logo;
      }
      const dot = document.createElement("span");
      dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#34D399;flex-shrink:0;box-shadow:0 0 8px rgba(52,211,153,0.5);";
      info.appendChild(dot);
      const textWrap = document.createElement("div");
      const title = document.createElement("div");
      title.style.cssText = "font-weight:600;font-size:15px;";
      title.textContent = this.config.title || this.config.companyName || "";
      this.headerTitleEl = title;
      textWrap.appendChild(title);
      const subtitle = document.createElement("div");
      subtitle.style.cssText = "font-size:11px;opacity:0.75;margin-top:1px;";
      subtitle.textContent = "AI Sales Assistant";
      this.headerSubtitleEl = subtitle;
      textWrap.appendChild(subtitle);
      info.appendChild(textWrap);
      header.appendChild(info);
      const closeBtn = document.createElement("button");
      closeBtn.className = "cw-close";
      closeBtn.setAttribute("aria-label", "Close chat");
      closeBtn.style.cssText = "background:none;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;font-size:18px;line-height:1;";
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", () => this.toggle());
      header.appendChild(closeBtn);
      return header;
    }
    createMessagesArea() {
      const el = document.createElement("div");
      el.className = "cw-messages";
      el.style.cssText = "flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;background:#F8F9FB;overscroll-behavior:contain;";
      return el;
    }
    createActionPanel() {
      const panel = document.createElement("div");
      panel.className = "cw-action-panel";
      panel.style.cssText = "padding:12px 16px 8px;display:none;flex-direction:column;gap:10px;border-top:1px solid #E5E7EB;background:#F3F4F6;";
      return panel;
    }
    createInputArea() {
      const wrapper = document.createElement("div");
      wrapper.className = "cw-input-area";
      wrapper.style.cssText = "padding:0 16px 0;border-top:1px solid #E8ECF1;background:#fff;border-radius:0 0 20px 20px;";
      const inputRow = document.createElement("div");
      inputRow.style.cssText = "display:flex;gap:10px;align-items:flex-end;padding:14px 0 0;";
      const textarea = document.createElement("textarea");
      textarea.className = "cw-input";
      textarea.placeholder = this.placeholders[0];
      textarea.rows = 1;
      textarea.style.cssText = "flex:1;resize:none;border:1.5px solid #E0E4EB;border-radius:14px;padding:12px 14px;font-size:14px;font-family:inherit;outline:none;max-height:120px;min-height:44px;line-height:1.4;transition:border-color 0.15s ease,box-shadow 0.15s ease;background:#F8F9FB;";
      let phIdx = 0;
      this.placeholderInterval = setInterval(() => {
        if (document.activeElement !== textarea && !textarea.value) {
          phIdx = (phIdx + 1) % this.placeholders.length;
          textarea.placeholder = this.placeholders[phIdx];
        }
      }, 3e3);
      textarea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
      textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
      });
      this.inputEl = textarea;
      const sendBtn = document.createElement("button");
      sendBtn.className = "cw-send";
      sendBtn.setAttribute("aria-label", "Send message");
      sendBtn.style.cssText = `background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border:none;border-radius:14px;width:44px;height:44px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 16px rgba(0,98,72,0.3);transition:transform 0.15s ease,box-shadow 0.15s ease;`;
      sendBtn.innerHTML = this.getSendIconSvg();
      sendBtn.addEventListener("click", () => this.send());
      this.sendBtnEl = sendBtn;
      inputRow.appendChild(textarea);
      inputRow.appendChild(sendBtn);
      wrapper.appendChild(inputRow);
      const footer = document.createElement("div");
      footer.style.cssText = "padding:6px 0 10px;text-align:center;";
      footer.innerHTML = '<span style="font-size:10px;color:#9CA3AF;letter-spacing:0.02em;">Powered by <b style="color:#006248;">BurFlow</b></span>';
      wrapper.appendChild(footer);
      return wrapper;
    }
    createTakeoverArea() {
      const el = document.createElement("div");
      el.className = "cw-takeover";
      el.style.cssText = "display:none;padding:0 16px 12px;background:#E8F5E9;border-top:1px solid #C8E6C9;";
      return el;
    }
    showTakeoverBanner() {
      if (!this.takeoverEl || this.takeoverShown) return;
      this.takeoverShown = true;
      this.takeoverEl.style.display = "block";
      this.takeoverEl.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #E0E7FF;">
        <span style="font-size:14px;flex-shrink:0;">\u{1F464}</span>
        <div>
          <p style="margin:0;font-size:12px;font-weight:600;color:#003d2d;">Human agent joined</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6B7280;line-height:1.5;">A real person is now assisting this conversation. Replies will come from them shortly.</p>
        </div>
      </div>`;
    }
    /** Hides the takeover banner when the agent releases control or disconnects. */
    hideTakeoverBanner() {
      this.takeoverShown = false;
      if (this.takeoverEl) this.takeoverEl.style.display = "none";
    }
    /** Removes the starter chips while a human agent is driving the session. */
    hideStarterChips() {
      if (!this.messagesEl) return;
      const chips = this.messagesEl.querySelector(".cw-starter-chips");
      if (chips) chips.remove();
    }
    createHandoffArea() {
      const el = document.createElement("div");
      el.className = "cw-handoff";
      el.style.cssText = "padding:0 16px 12px;display:none;background:#fff;border-radius:0 0 20px 20px;";
      return el;
    }
    updateHandoffVisibility() {
      if (!this.handoffEl || this.handoffShown) return;
      const userMessages = this.messages.filter((m) => m.role === "user").length;
      if (userMessages >= 3) {
        this.handoffEl.style.display = "block";
        this.handoffEl.innerHTML = `
        <button class="cw-handoff-link" style="background:none;border:none;color:#006248;font-size:12px;cursor:pointer;padding:4px 0;font-family:inherit;text-decoration:underline;text-underline-offset:2px;">
          Talk to a human
        </button>`;
        this.handoffEl.querySelector(".cw-handoff-link")?.addEventListener("click", () => this.showHandoffForm());
      }
    }
    showHandoffForm() {
      if (!this.handoffEl) return;
      this.handoffShown = true;
      this.handoffEl.innerHTML = `
      <div style="padding:8px 0;">
        <p style="font-size:12px;color:#6B7280;margin:0 0 8px;">Leave your email and we'll reach out shortly.</p>
        <div style="display:flex;gap:8px;">
          <input type="email" class="cw-handoff-email" placeholder="you@company.com" style="flex:1;border:1.5px solid #E0E4EB;border-radius:10px;padding:8px 12px;font-size:13px;font-family:inherit;outline:none;background:#F8F9FB;" />
          <button class="cw-handoff-submit" style="background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;">Send</button>
        </div>
      </div>`;
      this.handoffEl.querySelector(".cw-handoff-submit")?.addEventListener("click", () => this.submitHandoff());
      this.handoffEl.querySelector(".cw-handoff-email")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submitHandoff();
      });
    }
    async submitHandoff() {
      if (!this.handoffEl) return;
      const emailInput = this.handoffEl.querySelector(".cw-handoff-email");
      const email = emailInput?.value.trim();
      if (!email || !email.includes("@")) {
        if (emailInput) emailInput.style.borderColor = "#EF4444";
        return;
      }
      try {
        const res = await fetch(`${this.config.apiUrl}/api/widget/handoff`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...this.config.widgetToken ? { "x-widget-token": this.config.widgetToken } : {} },
          body: JSON.stringify({ sessionId: this.config.sessionId, visitorEmail: email, message: "Visitor requested human assistance" })
        });
        if (res.ok) {
          this.handoffEl.innerHTML = `<p style="font-size:12px;color:#059669;padding:8px 0;">\u2713 Request sent. Someone will email you at ${email} within a few hours.</p>`;
        } else {
          this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">Something went wrong. Please try again.</p>`;
        }
      } catch {
        this.handoffEl.innerHTML = `<p style="font-size:12px;color:#DC2626;padding:8px 0;">Network error. Please try again.</p>`;
      }
    }
    toggle() {
      this.isOpen = !this.isOpen;
      this.dismissPreOpenPanel();
      if (!this.container) return;
      this.container.style.display = this.isOpen ? "flex" : "none";
      if (this.isOpen) {
        this.container.style.animation = "cw-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)";
        this.unreadCount = 0;
        this.updateBadge();
        this.inputEl?.focus();
        const isFirstOpen = this.messages.length === 0;
        if (isFirstOpen) {
          this.addMessage({ role: "assistant", content: this.getWelcomeMessage() });
        }
        if (isFirstOpen) {
          this.renderInitialActions();
        } else {
          this.renderUiState();
        }
        this.scrollToBottom();
      }
    }
    send() {
      const text = this.inputEl?.value.trim();
      if (!text || this.isStreaming) return;
      this.inputEl.value = "";
      this.inputEl.style.height = "auto";
      this.clearUiState();
      this.fadeOutStarterChips();
      this.addMessage({ role: "user", content: text });
      this.streamResponse(text);
    }
    fadeOutStarterChips() {
      if (!this.messagesEl) return;
      const chips = this.messagesEl.querySelector(".cw-starter-chips");
      if (!chips) return;
      chips.style.opacity = "0";
      chips.style.transition = "opacity 0.25s ease";
      setTimeout(() => chips.remove(), 250);
    }
    sendStarterPrompt(text) {
      if (!text || this.isStreaming) return;
      this.fadeOutStarterChips();
      this.clearUiState();
      this.addMessage({ role: "user", content: text });
      this.streamResponse(text);
    }
    async streamResponse(userMessage) {
      this.isStreaming = true;
      this.updateSendButton();
      const assistantMsg = this.addMessage({ role: "assistant", content: "", streaming: true });
      this.scrollToBottom();
      this.renderTypingIndicator();
      this.abortController = new AbortController();
      await streamChat({
        apiUrl: this.config.apiUrl,
        tenantId: this.config.tenantId,
        apiKey: this.config.apiKey,
        widgetToken: this.config.widgetToken,
        sessionId: this.config.sessionId,
        message: userMessage,
        signal: this.abortController.signal,
        onToken: (delta) => {
          assistantMsg.content += delta;
          this.updateMessageContent(assistantMsg);
          this.scrollToBottom();
        },
        onDone: () => {
        },
        onUiState: (uiState, cta) => {
          this.uiState = uiState || null;
          this.cta = cta || null;
          this.renderUiState();
        },
        onHumanTakeover: () => {
          this.showTakeoverBanner();
          this.hideStarterChips();
        },
        onComplete: (fullContent) => {
          if (fullContent) assistantMsg.content = fullContent;
          assistantMsg.streaming = false;
          this.updateMessageContent(assistantMsg);
          this.hideTypingIndicator();
          this.isStreaming = false;
          this.updateSendButton();
          this.scrollToBottom();
          if (!this.uiState) {
            this.clearUiState();
          }
        },
        onError: (error) => {
          assistantMsg.streaming = false;
          assistantMsg.content = assistantMsg.content || "I\u2019m here to help, but the assistant is temporarily unavailable. Please try again in a moment.";
          this.updateMessageContent(assistantMsg);
          this.hideTypingIndicator();
          this.isStreaming = false;
          this.updateSendButton();
        }
      });
    }
    abort() {
      this.abortController?.abort();
      this.abortController = null;
      this.isStreaming = false;
      this.updateSendButton();
    }
    addMessage(partial) {
      const msg = {
        id: nextId(),
        timestamp: Date.now(),
        ...partial
      };
      this.messages.push(msg);
      this.renderMessage(msg);
      if (msg.role === "assistant" && !this.isOpen) {
        this.unreadCount++;
        this.updateBadge();
      }
      this.updateHandoffVisibility();
      return msg;
    }
    renderMessage(msg) {
      if (!this.messagesEl) return;
      const el = document.createElement("div");
      el.className = `cw-message cw-message-${msg.role}`;
      el.setAttribute("data-message-id", msg.id);
      el.style.cssText = `display:flex;${msg.role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"};position:relative;`;
      const bubble = document.createElement("div");
      bubble.className = "cw-message-bubble";
      const isUser = msg.role === "user";
      const isAgent = msg.sender === "agent";
      const bubbleStyle = isUser ? "background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;border-bottom-right-radius:6px;box-shadow:none;" : isAgent ? "background:#E8F5E9;color:#1F2937;border:1px solid #C8E6C9;border-bottom-left-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.04);" : "background:#F3F4F6;color:#1F2937;border-bottom-left-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.04);";
      bubble.style.cssText = `max-width:82%;padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.6;word-wrap:break-word;${bubbleStyle}`;
      if (!isUser) {
        const icon = document.createElement("span");
        icon.style.cssText = "margin-right:6px;opacity:0.6;font-size:12px;";
        icon.textContent = isAgent ? "\u{1F464}" : "\u2728";
        bubble.appendChild(icon);
      }
      if (isAgent) {
        const label = document.createElement("div");
        label.className = "cw-agent-label";
        label.textContent = "Agent";
        label.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#006248;margin-bottom:4px;";
        bubble.appendChild(label);
      }
      const content = document.createElement("div");
      content.className = "cw-message-content";
      content.textContent = msg.content;
      bubble.appendChild(content);
      if (msg.streaming) {
        const cursor = document.createElement("span");
        cursor.className = "cw-cursor";
        cursor.style.cssText = "display:inline-block;width:2px;height:14px;background:" + (isUser ? "#fff" : this.config.primaryColor) + ";margin-left:2px;animation:cw-blink 1s step-end infinite;vertical-align:text-bottom;";
        bubble.appendChild(cursor);
      }
      el.appendChild(bubble);
      const ts = document.createElement("div");
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      ts.textContent = time;
      ts.style.cssText = `font-size:10px;color:#9CA3AF;margin-top:4px;opacity:0;transition:opacity 0.15s ease;${isUser ? "text-align:right;padding-right:4px;" : "text-align:left;padding-left:26px;"}`;
      el.appendChild(ts);
      el.addEventListener("mouseenter", () => {
        ts.style.opacity = "1";
      });
      el.addEventListener("mouseleave", () => {
        ts.style.opacity = "0";
      });
      this.messagesEl.appendChild(el);
    }
    updateMessageContent(msg) {
      if (!this.messagesEl) return;
      const el = this.messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
      if (!el) return;
      const contentEl = el.querySelector(".cw-message-content");
      if (contentEl) {
        contentEl.textContent = msg.content;
      }
      const cursor = el.querySelector(".cw-cursor");
      if (cursor && !msg.streaming) {
        cursor.remove();
      }
    }
    scrollToBottom() {
      if (!this.messagesEl) return;
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
    renderUiState() {
      if (!this.actionPanel) return;
      const buttonGroup = [
        ...this.config.suggestedActions || [],
        ...this.uiState?.buttons || [],
        ...this.uiState?.suggestedActions || []
      ];
      const hasActiveCard = Boolean(this.uiState?.activeCard);
      const hasCta = Boolean(this.cta && typeof this.cta === "object" && typeof this.cta.label === "string");
      const hasButtons = buttonGroup.length > 0;
      if (!hasActiveCard && !hasButtons && !hasCta) {
        this.actionPanel.style.display = "none";
        this.actionPanel.innerHTML = "";
        return;
      }
      this.actionPanel.innerHTML = "";
      this.actionPanel.style.display = "flex";
      if (hasActiveCard) {
        const card = this.createActiveCard(this.uiState.activeCard);
        this.actionPanel.appendChild(card);
      }
      if (hasButtons) {
        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
        const visibleButtons = this.getContextualButtons(buttonGroup);
        visibleButtons.slice(0, 3).forEach((button) => {
          buttonContainer.appendChild(this.createActionButton(button));
        });
        this.actionPanel.appendChild(buttonContainer);
      }
      if (hasCta) {
        const ctaButton = this.createCtaButton(this.cta);
        if (ctaButton) {
          this.actionPanel.appendChild(ctaButton);
        }
      }
    }
    renderInitialActions() {
      this.suggestionHistory = [];
      if (!this.messagesEl) return;
      const existing = this.messagesEl.querySelector(".cw-starter-chips");
      if (existing) existing.remove();
      const starters = this.config.starterOptions?.length ? this.config.starterOptions : this.defaultStarterOptions();
      const chipWrap = document.createElement("div");
      chipWrap.className = "cw-starter-chips";
      chipWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;padding:12px 0 4px;animation:cw-slide-in 0.3s cubic-bezier(0.16,1,0.3,1);";
      starters.forEach((text) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cw-starter-chip";
        chip.textContent = text;
        chip.style.cssText = "display:inline-flex;align-items:center;padding:6px 14px;border:1px solid #E5E7EB;border-radius:9999px;background:#F9FAFB;color:#374151;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:background 0.15s ease,color 0.15s ease,border-color 0.15s ease;white-space:nowrap;";
        chip.addEventListener("mouseenter", () => {
          chip.style.background = "#E8F5E9";
          chip.style.color = "#006248";
          chip.style.borderColor = "#A5D6A7";
        });
        chip.addEventListener("mouseleave", () => {
          chip.style.background = "#F9FAFB";
          chip.style.color = "#374151";
          chip.style.borderColor = "#E5E7EB";
        });
        chip.addEventListener("click", () => this.sendStarterPrompt(text));
        chipWrap.appendChild(chip);
      });
      const firstAssistantBubble = this.messagesEl.querySelector(".cw-message-assistant .cw-message-bubble");
      if (firstAssistantBubble) {
        firstAssistantBubble.appendChild(chipWrap);
      } else {
        this.messagesEl.appendChild(chipWrap);
      }
      this.scrollToBottom();
    }
    getContextualButtons(buttonGroup) {
      const usedLabels = new Set(this.suggestionHistory.map((action) => action.label.toLowerCase()));
      const filtered = buttonGroup.filter((button) => !usedLabels.has(button.label.toLowerCase()));
      const nextActions = filtered.slice(0, 6);
      this.suggestionHistory = [...this.suggestionHistory, ...nextActions];
      return nextActions;
    }
    clearUiState() {
      this.uiState = null;
      this.cta = null;
      if (this.actionPanel) {
        this.actionPanel.style.display = "none";
        this.actionPanel.innerHTML = "";
      }
    }
    createActiveCard(card) {
      const el = document.createElement("div");
      el.className = "cw-active-card";
      el.style.cssText = "background:linear-gradient(135deg,#fff 0%,#f8fafc 100%);border:1px solid #E5E7EB;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:0 16px 40px rgba(15, 23, 42, 0.08);max-height:320px;overflow-y:auto;";
      const title = document.createElement("div");
      title.style.cssText = "font-size:13px;font-weight:700;color:#111827;display:flex;justify-content:space-between;align-items:center;";
      const titleText = document.createElement("span");
      titleText.textContent = card.type.replace(/_/g, " ").replace(/\b\w/g, (chr) => chr.toUpperCase());
      title.appendChild(titleText);
      const badge = document.createElement("span");
      badge.textContent = "Recommended";
      badge.style.cssText = "font-size:11px;font-weight:600;padding:4px 8px;border-radius:999px;background:#E8F5E9;color:#006248;";
      title.appendChild(badge);
      el.appendChild(title);
      const body = document.createElement("div");
      body.style.cssText = "display:flex;flex-direction:column;gap:8px;";
      const data = card.data || {};
      const summary = document.createElement("div");
      summary.style.cssText = "font-size:12px;color:#374151;line-height:1.5;";
      summary.textContent = this.getCardSummary(data);
      body.appendChild(summary);
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
      const cardActions = this.getCardActions(card.type, data);
      cardActions.forEach((button) => actions.appendChild(this.createActionButton(button)));
      body.appendChild(actions);
      el.appendChild(body);
      return el;
    }
    createUnknownGuidanceCard(message) {
      const guide = buildUnknownResponseGuide(message, 0.3);
      if (!guide) return null;
      const el = document.createElement("div");
      el.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;background:#FEF2F2;border:1px solid #FECACA;";
      const title = document.createElement("div");
      title.style.cssText = "font-size:13px;font-weight:700;color:#991B1B;";
      title.textContent = "I don't want to overstate what I know";
      el.appendChild(title);
      const body = document.createElement("div");
      body.style.cssText = "font-size:12px;color:#7F1D1D;line-height:1.5;";
      body.textContent = guide;
      el.appendChild(body);
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
      const ctas = [
        { id: "fallback-contact", label: "Contact Sales", action: "send_text", payload: "Connect me with sales", variant: "primary" },
        { id: "fallback-demo", label: "Book Demo", action: "send_text", payload: "I want to book a demo", variant: "secondary" },
        { id: "fallback-message", label: "Leave a Message", action: "send_text", payload: "Leave a message", variant: "secondary" }
      ];
      ctas.forEach((cta) => actions.appendChild(this.createActionButton(cta)));
      el.appendChild(actions);
      return el;
    }
    getCardSummary(data) {
      if (data.summary && typeof data.summary === "string") return data.summary;
      if (data.title && typeof data.title === "string") return data.title;
      if (data.description && typeof data.description === "string") return data.description;
      if (data.name && typeof data.name === "string") return data.name;
      return "Recommended next step for this conversation.";
    }
    getCardActions(cardType, data) {
      const base = [];
      if (cardType === "pricing" || cardType === "demo_booking") {
        base.push({ id: "book-demo", label: "Book 15-Min Demo", action: "send_text", payload: "I want to book a demo", variant: "primary" });
        base.push({ id: "compare-plans", label: "Compare Plans", action: "send_text", payload: "Compare plans and pricing", variant: "secondary" });
      }
      if (cardType.includes("service") || cardType === "trust_summary") {
        base.push({ id: "talk-sales", label: "Talk to Sales", action: "send_text", payload: "Connect me with sales", variant: "secondary" });
      }
      if (base.length === 0) {
        base.push({ id: "best-solution", label: "Best Solution", action: "send_text", payload: "Recommend the best fit for my needs", variant: "secondary" });
      }
      return base;
    }
    createActionButton(button) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cw-action-button";
      btn.textContent = button.label;
      btn.style.cssText = `padding:10px 14px;border-radius:999px;border:none;cursor:pointer;font-size:13px;transition:transform 0.15s ease, box-shadow 0.15s ease;${button.variant === "primary" ? `background:${this.config.primaryColor};color:#fff;box-shadow:0 10px 20px rgba(0,98,72,0.16);` : "background:#fff;color:#1F2937;border:1px solid #D1D5DB;"}`;
      if (button.category) {
        const iconMap = { demo: "\u{1F3AF}", plans: "\u{1F4B0}", guidance: "\u{1F9E0}", sales: "\u{1F91D}", faq: "\u2753", products: "\u{1F4E6}" };
        btn.textContent = `${iconMap[button.category] || "\u2022"} ${button.label}`;
      }
      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "translateY(-1px)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "translateY(0)";
      });
      btn.addEventListener("click", () => this.handleActionButton(button));
      return btn;
    }
    handleActionButton(button) {
      switch (button.action) {
        case "send_text":
        case "select_choice":
          if (button.payload) {
            this.inputEl.value = String(button.payload);
            this.send();
          }
          break;
        case "navigate":
          window.open(button.payload, "_blank");
          break;
        case "open_modal":
          if (button.payload) {
            window.open(button.payload, "_blank");
          }
          break;
        default:
          if (button.payload) {
            this.inputEl.value = String(button.payload);
            this.send();
          }
          break;
      }
    }
    renderTypingIndicator() {
      if (!this.actionPanel) return;
      this.actionPanel.innerHTML = "";
      this.actionPanel.style.display = "flex";
      const indicator = document.createElement("div");
      indicator.style.cssText = "display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:999px;background:#F3F4F6;color:#4B5563;font-size:13px;";
      indicator.innerHTML = '<span style="display:inline-flex;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.15s"></span><span style="width:6px;height:6px;border-radius:50%;background:#6B7280;animation: cw-pulse 1s ease-in-out infinite 0.3s"></span></span> Thinking\u2026';
      this.actionPanel.appendChild(indicator);
    }
    hideTypingIndicator() {
      if (!this.isStreaming) {
        this.renderUiState();
      }
    }
    createCtaButton(cta) {
      const label = typeof cta.label === "string" ? cta.label : void 0;
      const link = typeof cta.link === "string" ? cta.link : void 0;
      if (!label || !link) return null;
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;justify-content:center;";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `width:100%;padding:12px 16px;border:none;border-radius:10px;background:${this.config.primaryColor};color:#fff;font-weight:700;cursor:pointer;`;
      btn.addEventListener("click", () => window.open(link, "_blank"));
      wrapper.appendChild(btn);
      return wrapper;
    }
    updateSendButton() {
      if (!this.sendBtnEl) return;
      this.sendBtnEl.disabled = this.isStreaming;
      this.sendBtnEl.style.opacity = this.isStreaming ? "0.5" : "1";
      this.sendBtnEl.style.cursor = this.isStreaming ? "not-allowed" : "pointer";
    }
    updateBadge() {
      if (!this.unreadBadge) return;
      if (this.unreadCount > 0) {
        this.unreadBadge.textContent = String(this.unreadCount);
        this.unreadBadge.style.display = "flex";
      } else {
        this.unreadBadge.style.display = "none";
      }
    }
    getBubbleStyles() {
      const pos = this.config.position === "bottom-left" ? "left:20px;" : "right:20px;";
      return `position:fixed;bottom:20px;${pos}height:52px;padding:0 22px;border-radius:26px;background:linear-gradient(135deg,#006248 0%,#004d38 100%);color:#fff;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,98,72,0.45),0 2px 8px rgba(0,0,0,0.1);z-index:999999;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;border:2px solid rgba(255,255,255,0.2);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.01em;white-space:nowrap;animation:cw-bubble-pulse 3s ease-in-out infinite;`;
    }
    getContainerStyles() {
      const pos = this.config.position === "bottom-left" ? "left:20px;" : "right:20px;";
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        return `position:fixed;top:0;left:0;width:100vw;height:100dvh;background:#FAFBFC;z-index:999998;flex-direction:column;overflow:hidden;border-radius:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
      }
      return `position:fixed;bottom:20px;${pos}width:420px;max-width:min(calc(100vw - 24px), 420px);height:min(650px, calc(100vh - 120px));background:#FAFBFC;border-radius:20px;box-shadow:0 24px 80px rgba(15, 23, 42, 0.22),0 0 0 1px rgba(0,0,0,0.04);z-index:999998;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
    }
    getChatIconSvg() {
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    }
    getSendIconSvg() {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    }
    getSessionStorageKey() {
      if (this.config.tenantId) return `cw_session_${this.config.tenantId}`;
      if (this.config.widgetToken) return `cw_session_token_${this.config.widgetToken}`;
      return null;
    }
    restoreSessionId() {
      if (this.config.sessionId) return;
      const key = this.getSessionStorageKey();
      if (!key) return;
      try {
        const stored = window.localStorage.getItem(key);
        if (stored) {
          this.config.sessionId = stored;
          return;
        }
      } catch {
      }
      this.config.sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      try {
        window.localStorage.setItem(key, this.config.sessionId);
      } catch {
      }
    }
    deriveBusinessProfileFromConfig() {
      return buildBusinessProfileFromWidgetConfig(this.config);
    }
    getWelcomeMessage() {
      const baseGreeting = buildBusinessGreeting(this.businessProfile);
      const continuityCue = this.messages.length > 0 ? ` ${buildContinuityCue(this.messages, this.messages[this.messages.length - 1]?.content || "")}` : "";
      const contextHint = this.messages.length > 0 ? " Based on what you asked earlier, I can continue from there." : "";
      return `${baseGreeting}${contextHint}${continuityCue}`;
    }
    updateHeaderText() {
      if (this.headerTitleEl) {
        this.headerTitleEl.textContent = this.config.title || this.config.companyName || "";
      }
      if (this.headerSubtitleEl) {
        this.headerSubtitleEl.textContent = this.config.subtitle || "";
      }
      const logoUrl = this.config.logoUrl || this.config.avatarUrl;
      if (logoUrl) {
        if (!this.headerLogoEl) {
          const info = this.headerTitleEl?.parentElement;
          if (info) {
            const logo = document.createElement("img");
            logo.className = "cw-logo";
            logo.alt = "";
            logo.style.cssText = "width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid rgba(255,255,255,0.25);";
            info.insertBefore(logo, info.firstChild);
            this.headerLogoEl = logo;
          }
        }
        if (this.headerLogoEl) this.headerLogoEl.src = logoUrl;
      } else if (this.headerLogoEl) {
        this.headerLogoEl.remove();
        this.headerLogoEl = null;
      }
    }
    updateBubbleAndContainerStyles() {
      if (this.bubbleEl) {
        this.bubbleEl.style.cssText = this.getBubbleStyles();
        if (this.config.launcherText) {
          this.bubbleEl.setAttribute("aria-label", this.config.launcherText);
          this.bubbleEl.title = this.config.launcherText;
        }
      }
      if (this.container) {
        const currentDisplay = this.container.style.display;
        this.container.style.cssText = this.getContainerStyles();
        if (currentDisplay) this.container.style.display = currentDisplay;
      }
    }
    async fetchRemoteConfig() {
      if (!this.config.widgetToken) return;
      try {
        const url = `${this.config.apiUrl}/api/widget/config?token=${encodeURIComponent(this.config.widgetToken)}`;
        const response = await fetch(url, {
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) return;
        const remoteConfig = await response.json();
        this.applyRemoteConfig(remoteConfig);
      } catch {
      }
    }
    applyRemoteConfig(remote) {
      const merged = this.normalizeAliases(remote);
      this.config = { ...this.config, ...merged };
      this.businessProfile = this.deriveBusinessProfileFromConfig();
      if (this.inputEl && this.placeholders.length) {
        this.inputEl.placeholder = this.placeholders[0];
      }
      this.renderPreOpenOptions();
      this.applyBrandingVars();
      this.updateBubbleAndContainerStyles();
      this.updateHeaderText();
      if (this.config.launcherText && this.bubbleEl) {
        this.bubbleEl.setAttribute("aria-label", this.config.launcherText);
        this.bubbleEl.title = this.config.launcherText;
      }
      if (this.isOpen && this.messages.length === 0 && this.config.greeting) {
        this.addMessage({ role: "assistant", content: this.config.greeting });
      }
    }
    getMessages() {
      return [...this.messages];
    }
  };

  // packages/widget/src/index.ts
  var _scriptEl = typeof document !== "undefined" ? document.currentScript : null;
  function resolveScriptEl() {
    if (typeof document === "undefined") return null;
    const current = document.currentScript;
    if (current) return current;
    return document.querySelector(
      "script[data-tenant-id], script[data-token]"
    );
  }
  function initChatWidget(config) {
    const widget = new ChatWidget(config);
    widget.mount();
    if (typeof window !== "undefined") {
      window.__CURRENT_WIDGET = widget;
    }
    return widget;
  }
  if (typeof window !== "undefined") {
    let autoInit = function() {
      try {
        const script = _scriptEl || resolveScriptEl();
        if (!script) return;
        const apiUrl = script.getAttribute("data-api-url") || "";
        const primaryColor = script.getAttribute("data-primary-color") || void 0;
        const position = script.getAttribute("data-position") || void 0;
        const title = script.getAttribute("data-title") || void 0;
        const token = script.getAttribute("data-token");
        if (token) {
          initChatWidget({ widgetToken: token, apiUrl, primaryColor, position, title });
          return;
        }
        const tenantId = script.getAttribute("data-tenant-id");
        if (tenantId) {
          fetch(`${apiUrl}/api/widget/public-token?tenantId=${encodeURIComponent(tenantId)}`).then((res) => {
            if (!res.ok) throw new Error(`public-token request failed (${res.status})`);
            return res.json();
          }).then((data) => {
            if (data && data.token) {
              initChatWidget({ widgetToken: data.token, apiUrl, primaryColor, position, title });
            } else {
              initChatWidget({ apiUrl, primaryColor, position, title });
            }
          }).catch(() => {
            initChatWidget({ apiUrl, primaryColor, position, title });
          });
        }
      } catch {
      }
    };
    autoInit2 = autoInit;
    window.ChatWidget = ChatWidget;
    window.initChatWidget = initChatWidget;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoInit);
    } else {
      autoInit();
    }
  }
  var autoInit2;
})();
//# sourceMappingURL=widget.js.map
