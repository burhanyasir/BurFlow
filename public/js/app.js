const API = window.location.origin;

let clientState = {
  analytics: null,
  conversations: null,
  faqs: null,
  services: null,
  clinic: null,
  currentView: "home",
  chatScenario: null,
  sessionId: sessionStorage.getItem("demo-session-id") || null,
  workflowActive: false,
  workflowStep: null
};

async function api(path, options = {}) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (clientState.sessionId) headers["x-session-id"] = clientState.sessionId;
    const res = await fetch(API + path, { headers, ...options });
    return await res.json();
  } catch (e) {
    console.error("API error:", e);
    return null;
  }
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showView(view) {
  clientState.currentView = view;
  $$(".view").forEach(v => v.classList.remove("active"));
  const el = $(`#view-${view}`);
  if (el) el.classList.add("active");
  $$(".nav-links a").forEach(a => a.classList.remove("active"));
  const link = $(`.nav-link[data-view="${view}"]`);
  if (link) link.classList.add("active");
  window.scrollTo({ top: 0 });
  if (view === "analytics") renderAnalytics();
  if (view === "faq") renderFAQs();
}

async function loadData() {
  const [analytics, conversations, faqs, services, clinic] = await Promise.all([
    api("/api/analytics"),
    api("/api/conversations"),
    api("/api/faqs"),
    api("/api/services"),
    api("/api/clinic")
  ]);
  clientState.analytics = analytics;
  clientState.conversations = conversations;
  clientState.faqs = faqs;
  clientState.services = services;
  clientState.clinic = clinic;
  updateStatsBar();
}

function updateStatsBar() {
  const a = clientState.analytics;
  if (!a) return;
  $("#stat-conversations").textContent = a.totalConversations;
  $("#stat-leads").textContent = a.leadsCaptured;
  $("#stat-appointments").textContent = a.appointmentsBooked;
  $("#stat-rate").textContent = Math.round(a.conversionRate * 100) + "%";
}

function renderAnalytics() {
  const a = clientState.analytics;
  if (!a) return;
  document.getElementById("metric-total-conv").textContent = a.totalConversations;
  document.getElementById("metric-leads").textContent = a.leadsCaptured;
  document.getElementById("metric-appts").textContent = a.appointmentsBooked;
  document.getElementById("metric-revenue").textContent = "$" + a.estimatedMonthlyRevenue.toLocaleString();
  document.getElementById("metric-rate").textContent = Math.round(a.conversionRate * 100) + "%";
  document.getElementById("metric-missed").textContent = a.missedOpportunities;

  const tbody = document.querySelector("#revenue-tbody");
  if (tbody && a.topServices) {
    tbody.innerHTML = a.topServices.map(s =>
      `<tr><td>${s.name}</td><td>${s.bookings}</td><td>$${s.revenue}</td></tr>`
    ).join("");
  }

  renderDailyChart(a.dailyStats);
  renderTypeChart(a.conversationTypes);
}

function renderDailyChart(dailyStats) {
  const canvas = document.getElementById("daily-chart");
  if (!canvas || !dailyStats) return;
  const ctx = canvas.getContext("2d");
  const parent = canvas.parentElement;
  canvas.width = parent.offsetWidth - 48;
  canvas.height = 260;

  const labels = dailyStats.map(d => d.date.slice(5));
  const convs = dailyStats.map(d => d.conversations);
  const leads = dailyStats.map(d => d.leads);
  const apts = dailyStats.map(d => d.appointments);

  const max = Math.max(...convs, ...leads, ...apts, 3);
  const pad = 40;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const stepX = w / Math.max(labels.length - 1, 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = { conversations: "#0a66c2", leads: "#00b894", appointments: "#fdcb6e" };
  const datasets = [
    { label: "Conversations", data: convs, color: colors.conversations },
    { label: "Leads", data: leads, color: colors.leads },
    { label: "Appointments", data: apts, color: colors.appointments }
  ];

  datasets.forEach(ds => {
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ds.data.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = pad + h - (v / max) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    ds.data.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = pad + h - (v / max) * h;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.fill();
    });
  });

  ctx.fillStyle = "#636e72";
  ctx.font = "12px system-ui";
  labels.forEach((l, i) => {
    const x = pad + i * stepX;
    ctx.fillText(l, x - 12, canvas.height - 12);
  });

  ctx.textAlign = "right";
  for (let i = 0; i <= max; i++) {
    const y = pad + h - (i / max) * h;
    ctx.fillStyle = "#e0e0e0";
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + w, y);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#636e72";
    ctx.fillText(i, pad - 8, y + 4);
  }
}

function renderTypeChart(types) {
  const canvas = document.getElementById("type-chart");
  if (!canvas || !types) return;
  const ctx = canvas.getContext("2d");
  const parent = canvas.parentElement;
  canvas.width = parent.offsetWidth - 48;
  canvas.height = 260;

  const entries = Object.entries(types);
  const labels = entries.map(e => e[0].replace("-", " "));
  const values = entries.map(e => e[1]);
  const total = values.reduce((a, b) => a + b, 0);
  const pad = 60;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const barW = Math.min(40, (w / values.length) * 0.6);
  const gap = w / values.length;
  const max = Math.max(...values, 5);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const palette = ["#0a66c2", "#00b894", "#fdcb6e", "#e17055", "#6c5ce7", "#fd79a8"];

  values.forEach((v, i) => {
    const x = pad + i * gap + (gap - barW) / 2;
    const barH = (v / max) * h;
    const y = pad + h - barH;
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = "#2d3436";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(v, x + barW / 2, y - 8);

    ctx.fillStyle = "#636e72";
    ctx.font = "11px system-ui";
    const label = labels[i].length > 12 ? labels[i].slice(0, 12) + "..." : labels[i];
    ctx.fillText(label, x + barW / 2, canvas.height - 8);
  });

  ctx.fillStyle = "#636e72";
  ctx.font = "11px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("Total: " + total + " conversations", canvas.width - pad, pad - 8);
}

function renderFAQs() {
  const container = document.getElementById("faq-list");
  if (!container || !clientState.faqs) return;
  container.innerHTML = clientState.faqs.map((f, i) =>
    `<div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(${i})">${f.question}</div>
      <div class="faq-answer">${f.answer}</div>
    </div>`
  ).join("");
}

function toggleFaq(idx) {
  const items = $$(".faq-item");
  if (items[idx]) items[idx].classList.toggle("open");
}

function initChat() {
  const messagesEl = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const workflowIndicator = document.getElementById("chat-workflow-indicator");

  function addMessage(role, text, extra = "") {
    const div = document.createElement("div");
    div.className = `msg msg-${role}`;
    const roleLabel = role === "visitor" ? "You" : "BrightSmile AI";
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    div.innerHTML = `<div class="msg-label">${roleLabel}</div>${text.replace(/\n/g, "<br>")}<div class="msg-time">${time}</div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "msg msg-ai typing";
    div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function updateWorkflowIndicator(intent, active, step) {
    if (!workflowIndicator) return;
    clientState.workflowActive = active;
    clientState.workflowStep = step;
    if (active && step) {
      const labels = {
        service: "Choosing a service",
        visit_type: "New or existing patient",
        date: "Selecting a date",
        time: "Selecting a time",
        name: "Getting your name",
        phone: "Getting your phone number",
        confirm: "Confirming appointment",
        provider: "Identifying insurance provider",
        member_info: "Getting member ID",
        interest: "Understanding your interest",
        contact: "Getting contact info",
        assess: "Assessing urgency",
        booking: "Booking timeslot",
        answer: "Answering your question",
        show_pricing: "Showing pricing"
      };
      const display = labels[step] || step.replace(/_/g, " ");
      workflowIndicator.textContent = "Active: " + intent.replace(/_/g, " ") + " \u2014 " + display;
      workflowIndicator.style.display = "block";
    } else {
      workflowIndicator.style.display = "none";
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage("visitor", text);
    input.value = "";

    await loadData();
    updateStatsBar();

    const typing = showTyping();
    const res = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: text })
    });
    typing.remove();

    if (res) {
      if (res.sessionId) {
        clientState.sessionId = res.sessionId;
        sessionStorage.setItem("demo-session-id", res.sessionId);
      }
      if (res.reply) {
        setTimeout(() => {
          addMessage("ai", res.reply);
          updateWorkflowIndicator(res.intent, res.workflowActive, res.workflowStep);
          if (!res.workflowActive && !res.intent === "general") {
            updateLiveStats();
          }
        }, res.delay || 500);
      }
    }
  }

  async function updateLiveStats() {
    await loadData();
    updateStatsBar();
    if (clientState.currentView === "analytics") renderAnalytics();
  }

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage(input.value);
  });
  sendBtn.addEventListener("click", () => sendMessage(input.value));
  addMessage("ai", "Hello! Welcome to BrightSmile Dental Care. I'm your virtual assistant. How can I help you today? I can help you book appointments, check pricing, verify insurance, handle emergencies, or answer any questions.");
  updateWorkflowIndicator(null, false, null);
}

function loadScenario(id) {
  const conv = clientState.conversations?.find(c => c.id === id);
  if (!conv) return;
  clientState.chatScenario = id;
  const messagesEl = document.getElementById("chat-messages");
  messagesEl.innerHTML = "";
  conv.messages.forEach(m => {
    const div = document.createElement("div");
    div.className = `msg msg-${m.role}`;
    const roleLabel = m.role === "visitor" ? conv.visitorName || "Visitor" : "BrightSmile AI";
    div.innerHTML = `<div class="msg-label">${roleLabel}</div>${m.text}`;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
  $$(".scenario-item").forEach(s => s.classList.remove("active"));
  const el = $(`.scenario-item[data-id="${id}"]`);
  if (el) el.classList.add("active");
  document.getElementById("chat-header-name").textContent = conv.visitorName;
  document.getElementById("chat-header-type").textContent = conv.type.replace("-", " ");
}

function loadScenarioList() {
  const list = document.getElementById("scenario-list");
  if (!list || !clientState.conversations) return;
  list.innerHTML = clientState.conversations.map(c =>
    `<div class="scenario-item" data-id="${c.id}" onclick="loadScenario('${c.id}')">
      <div class="scenario-name">${c.visitorName}</div>
      <div class="scenario-desc">${c.summary}</div>
    </div>`
  ).join("");
}

function openLeadForm() {
  document.getElementById("modal-lead").classList.add("open");
}

function closeLeadForm() {
  document.getElementById("modal-lead").classList.remove("open");
}

async function submitLead(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById("lead-name").value,
    email: document.getElementById("lead-email").value,
    phone: document.getElementById("lead-phone").value,
    service: document.getElementById("lead-service").value,
    message: document.getElementById("lead-message").value
  };
  if (!data.name) return alert("Please enter your name");
  const res = await api("/api/leads", { method: "POST", body: JSON.stringify(data) });
  if (res && res.success) {
    showToast("Lead captured! Check the analytics dashboard.", "success");
    closeLeadForm();
    document.getElementById("lead-form").reset();
    await loadData();
    updateStatsBar();
  }
}

function openAppointmentForm() {
  document.getElementById("modal-appointment").classList.add("open");
}

function closeAppointmentForm() {
  document.getElementById("modal-appointment").classList.remove("open");
}

async function submitAppointment(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById("apt-name").value,
    email: document.getElementById("apt-email").value,
    phone: document.getElementById("apt-phone").value,
    service: document.getElementById("apt-service").value,
    date: document.getElementById("apt-date").value,
    time: document.getElementById("apt-time").value
  };
  if (!data.name || !data.date || !data.time) return alert("Please fill in required fields");
  const res = await api("/api/appointments", { method: "POST", body: JSON.stringify(data) });
  if (res && res.success) {
    showToast("Appointment booked! Check the analytics dashboard.", "success");
    closeAppointmentForm();
    document.getElementById("appointment-form").reset();
    await loadData();
    updateStatsBar();
    if (clientState.currentView === "analytics") renderAnalytics();
  }
}

async function resetDemo() {
  if (!confirm("Reset all demo data? This will clear all conversations, leads, analytics, and your chat session.")) return;
  const res = await api("/api/reset", { method: "POST" });
  if (res && res.success) {
    clientState.sessionId = null;
    sessionStorage.removeItem("demo-session-id");
    await loadData();
    if (clientState.currentView === "analytics") renderAnalytics();
    const messagesEl = document.getElementById("chat-messages");
    if (messagesEl) {
      messagesEl.innerHTML = "";
      const div = document.createElement("div");
      div.className = "msg msg-ai";
      div.innerHTML = '<div class="msg-label">BrightSmile AI</div>Hello! Welcome to BrightSmile Dental Care. I\'m your virtual assistant. How can I help you today? I can help you book appointments, check pricing, verify insurance, handle emergencies, or answer any questions.';
      messagesEl.appendChild(div);
    }
    const wi = document.getElementById("chat-workflow-indicator");
    if (wi) wi.style.display = "none";
    showToast("Demo reset complete! Everything is back to initial state.", "info");
  }
}

function showToast(msg, type = "info") {
  const div = document.createElement("div");
  div.className = `toast toast-${type}`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

async function initSession() {
  if (clientState.sessionId) {
    const res = await api("/api/session");
    if (res && res.state) {
      clientState.workflowActive = !!res.state.activeWorkflow;
      clientState.workflowStep = res.state.workflowState?.step || null;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  renderFAQs();
  initSession();
  initChat();
  loadScenarioList();
  if (clientState.conversations && clientState.conversations.length > 0) {
    loadScenario(clientState.conversations[0].id);
  }

  document.querySelectorAll(".nav-link").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      showView(a.dataset.view);
    });
  });
});
