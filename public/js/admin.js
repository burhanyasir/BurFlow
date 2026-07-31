(function () {
  "use strict";

  // ---------------------------------------------------------
  // API Client
  // ---------------------------------------------------------
  async function api(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch("/api/agency" + path, opts);
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : "Request failed";
      throw new Error(msg);
    }
    return data;
  }

  // ---------------------------------------------------------
  // Helpers: toast, modal, confirm, fmt
  // ---------------------------------------------------------
  function toast(type, title, msg) {
    const wrap = document.getElementById("toast-wrap");
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML = `<div class="toast-title">${esc(title)}</div>${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ""}`;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 3200);
  }

  function openModal(innerHtml, opts = {}) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `<div class="modal-overlay" id="modal-overlay"><div class="modal ${opts.large ? "modal-lg" : ""}">
      <div class="modal-header"><h3>${opts.title || ""}</h3><button class="modal-close" onclick="window.__closeModal()">×</button></div>
      <div class="modal-body">${innerHtml}</div>
      ${opts.hideFooter ? "" : `<div class="modal-footer" id="modal-footer"></div>`}
    </div></div>`;
    root.querySelector("#modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") window.__closeModal(); });
    return root;
  }
  window.__closeModal = function () { document.getElementById("modal-root").innerHTML = ""; };
  function modalFooter() { return document.getElementById("modal-footer"); }

  function confirmDialog(title, message, onConfirm, confirmLabel) {
    openModal(`<p style="margin:0;color:var(--text-light)">${esc(message)}</p>`, { title, hideFooter: false });
    const f = modalFooter();
    f.innerHTML = `<button class="btn btn-secondary" onclick="window.__closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirm-btn">${confirmLabel || "Confirm"}</button>`;
    f.querySelector("#confirm-btn").onclick = () => { window.__closeModal(); onConfirm(); };
  }

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmtMoney(cents) { return "$" + ((cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(s) { if (!s) return "—"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

  const STATUS_BADGE = {
    lead: "gray", prospect: "blue", onboarding: "amber", active: "green", suspended: "red", churned: "red",
  };
  const PIPE_BADGE = {
    discovery: "gray", proposal: "blue", negotiation: "amber", closed_won: "green", closed_lost: "red",
  };
  function badge(label, kind) { return `<span class="badge badge-${kind || "gray"}">${esc(label)}</span>`; }

  // ---------------------------------------------------------
  // Router & State
  // ---------------------------------------------------------
  const state = { view: "dashboard", clientId: null, crm: { search: "", status: "", page: 1 }, scanner: {}, proposals: {}, invoices: {} };
  const PAGE_META = {
    dashboard: ["Dashboard", "Agency overview"],
    crm: ["Client CRM", "Manage your client pipeline"],
    onboarding: ["Onboarding", "Guided setup for new clients"],
    scanner: ["Website Scanner", "Bootstrap chatbot config from a client site"],
    proposals: ["Proposals", "Generate and track sales proposals"],
    invoices: ["Invoices", "Billing & revenue"],
    branding: ["Tenants & Branding", "Multi-tenant configuration"],
    deployment: ["Deployment", "One-click chatbot install"],
    health: ["System Health", "Server status & diagnostics"],
    client: ["Client Profile", ""],
  };

  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.view));
  });

  function navigate(view, params) {
    if (params) Object.assign(state, params);
    navItems.forEach((n) => n.classList.toggle("active", n.dataset.view === view));
    const meta = PAGE_META[view] || PAGE_META.dashboard;
    document.getElementById("page-title").textContent = meta[0];
    document.getElementById("page-subtitle").textContent = meta[1];
    document.getElementById("topbar-actions").innerHTML = "";
    state.view = view;
    render();
  }

  async function render() {
    const c = document.getElementById("content");
    c.innerHTML = `<div class="loading-state"><div class="spinner"></div>Loading…</div>`;
    try {
      const fn = {
        dashboard: renderDashboard, crm: renderCRM, onboarding: renderOnboarding, scanner: renderScanner,
        proposals: renderProposals, invoices: renderInvoices, branding: renderBranding, deployment: renderDeployment,
        health: renderHealth, client: renderClientProfile,
      }[state.view] || renderDashboard;
      await fn(c);
    } catch (err) {
      c.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><div class="title">Something went wrong</div><div class="desc">${esc(err.message)}</div></div>`;
    }
  }

  // ---------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------
  async function renderDashboard(c) {
    const d = await api("GET", "/dashboard");
    c.innerHTML = `
      <div class="grid grid-4 mb-24">
        <div class="card stat-card"><div class="stat-label">Total Clients</div><div class="stat-value">${d.totalClients}</div><div class="stat-foot">${d.activeClients} active</div></div>
        <div class="card stat-card"><div class="stat-label">Pipeline Value</div><div class="stat-value">${fmtMoney(d.pendingRevenue)}</div><div class="stat-foot up">${d.pendingInvoices} pending invoices</div></div>
        <div class="card stat-card"><div class="stat-label">Monthly Revenue</div><div class="stat-value">${fmtMoney(d.monthlyRevenue)}</div><div class="stat-foot">last 30 days</div></div>
        <div class="card stat-card"><div class="stat-label">Scanner Queue</div><div class="stat-value">${d.scanner_queue}</div><div class="stat-foot">sites to process</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Sales Pipeline</div></div>
          ${pipelineBar("discovery", "Discovery", d.pipeline.discovery)}
          ${pipelineBar("proposal", "Proposal", d.pipeline.proposal)}
          ${pipelineBar("negotiation", "Negotiation", d.pipeline.negotiation)}
          ${pipelineBar("closed_won", "Closed Won", d.pipeline.won)}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Quick Actions</div></div>
          <div class="grid grid-2" style="gap:12px">
            <button class="btn btn-primary" style="width:100%" onclick="window.__newClient()">+ New Client</button>
            <button class="btn btn-secondary" style="width:100%" onclick="window.__navigate('scanner')">Scan Website</button>
            <button class="btn btn-secondary" style="width:100%" onclick="window.__navigate('onboarding')">Onboarding</button>
            <button class="btn btn-secondary" style="width:100%" onclick="window.__navigate('deployment')">Deploy</button>
          </div>
          <div class="divider"></div>
          <div class="text-sm text-light">Tip: Use the Client CRM to track every account. The onboarding wizard walks you through a full deployment in minutes.</div>
        </div>
      </div>`;
  }
  function pipelineBar(stage, label, count) {
    const total = 6;
    const pct = Math.min(100, (count / total) * 100);
    return `<div class="progress-row mb-16"><div style="min-width:110px" class="text-sm">${label}</div><div class="progress flex-1"><div class="progress-bar" style="width:${pct}%"></div></div><div class="pct">${count}</div></div>`;
  }

  // ---------------------------------------------------------
  // CLIENT CRM
  // ---------------------------------------------------------
  async function renderCRM(c) {
    const f = state.crm;
    const q = new URLSearchParams({ search: f.search, status: f.status, page: f.page, limit: 10 });
    const r = await api("GET", "/clients?" + q.toString());
    const rows = r.data.map((cl) => `
      <tr class="clickable" onclick="window.__openClient('${cl.id}')">
        <td><div style="font-weight:600">${esc(cl.name)}</div><div class="text-sm text-light">${esc(cl.industry)}</div></td>
        <td>${cl.email ? esc(cl.email) : '<span class="text-faint">—</span>'}</td>
        <td>${cl.website ? `<a href="https://${esc(cl.website)}" target="_blank" onclick="event.stopPropagation()">${esc(cl.website)}</a>` : "—"}</td>
        <td>${badge(cl.status, STATUS_BADGE[cl.status])}</td>
        <td>${badge(cl.pipeline_stage.replace("_", " "), PIPE_BADGE[cl.pipeline_stage])}</td>
        <td class="text-right">${fmtMoney(cl.monthly_budget)}/mo</td>
      </tr>`).join("");
    c.innerHTML = `
      <div class="row between mb-16 wrap">
        <div class="row" style="gap:10px;flex:1">
          <input placeholder="Search name, email, website…" value="${esc(f.search)}" id="crm-search" style="max-width:320px">
          <select id="crm-status" style="max-width:160px">
            <option value="">All statuses</option>
            ${["lead", "prospect", "onboarding", "active", "suspended", "churned"].map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <button class="btn btn-primary" onclick="window.__newClient()">+ New Client</button>
      </div>
      ${r.total === 0 ? emptyState("◍", "No clients found", "Try adjusting your search or add a new client.", "+ New Client", "window.__newClient()") : `
      <div class="table-wrap">
        <table><thead><tr><th>Client</th><th>Email</th><th>Website</th><th>Status</th><th>Stage</th><th class="text-right">Budget</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
      <div class="row between mt-16">
        <div class="text-sm text-light">${r.total} clients · page ${r.page} of ${r.pages}</div>
        <div class="row" style="gap:6px">
          <button class="btn btn-sm btn-secondary" ${r.page <= 1 ? "disabled" : ""} onclick="window.__crmPage(${r.page - 1})">Prev</button>
          <button class="btn btn-sm btn-secondary" ${r.page >= r.pages ? "disabled" : ""} onclick="window.__crmPage(${r.page + 1})">Next</button>
        </div>
      </div>`}`;

    const search = c.querySelector("#crm-search");
    let t;
    search.addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.crm.search = e.target.value; state.crm.page = 1; renderCRM(c); }, 300); });
    c.querySelector("#crm-status").addEventListener("change", (e) => { state.crm.status = e.target.value; state.crm.page = 1; renderCRM(c); });
  }

  // ---------------------------------------------------------
  // CLIENT PROFILE
  // ---------------------------------------------------------
  async function renderClientProfile(c) {
    const id = state.clientId;
    const cl = await api("GET", "/clients/" + id);
    const total = cl.onboarding ? cl.onboarding.total : 0;
    const done = cl.onboarding ? cl.onboarding.done : 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    c.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-16" onclick="window.__navigate('crm')">← Back to CRM</button>
      <div class="grid grid-3 mb-24">
        <div class="card"><div class="stat-label">Status</div><div class="mt-8">${badge(cl.status, STATUS_BADGE[cl.status])} ${badge(cl.pipeline_stage.replace("_", " "), PIPE_BADGE[cl.pipeline_stage])}</div></div>
        <div class="card"><div class="stat-label">Onboarding</div><div class="mt-8"><div class="progress-row"><div class="progress flex-1"><div class="progress-bar" style="width:${pct}%"></div></div><div class="pct">${pct}%</div></div></div></div>
        <div class="card"><div class="stat-label">Budget</div><div class="stat-value" style="font-size:22px">${fmtMoney(cl.monthly_budget)}/mo</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Details</div><button class="btn btn-sm btn-secondary" onclick="window.__editClient('${cl.id}')">Edit</button></div>
          <div class="form-group"><label>Name</label><div>${esc(cl.name)}</div></div>
          <div class="form-group"><label>Email</label><div>${esc(cl.email) || "—"}</div></div>
          <div class="form-group"><label>Phone</label><div>${esc(cl.phone) || "—"}</div></div>
          <div class="form-group"><label>Website</label><div>${esc(cl.website) || "—"}</div></div>
          <div class="form-group"><label>Industry</label><div>${esc(cl.industry)}</div></div>
          <div class="form-group"><label>Notes</label><div class="text-light">${esc(cl.notes) || "—"}</div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Workflow</div></div>
          <div class="row wrap" style="gap:10px">
            <button class="btn btn-secondary btn-sm" onclick="window.__navigate('scanner',{clientId:'${cl.id}'})">Scan Site</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__navigate('onboarding',{clientId:'${cl.id}'})">Onboarding</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__newProposal('${cl.id}')">New Proposal</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__newInvoice('${cl.id}')">New Invoice</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__navigate('branding',{clientId:'${cl.id}'})">Branding</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__navigate('deployment',{clientId:'${cl.id}'})">Deploy</button>
          </div>
          <div class="divider"></div>
          <div class="text-sm text-light">Use the tools above to move this client through onboarding to a live deployment.</div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------
  // ONBOARDING
  // ---------------------------------------------------------
  async function renderOnboarding(c) {
    const id = state.clientId;
    if (!id) {
      // pick a client
      const r = await api("GET", "/clients?limit=100");
      if (!r.data.length) { c.innerHTML = emptyState("✦", "No clients yet", "Create a client first to start onboarding.", "+ New Client", "window.__newClient()"); return; }
      c.innerHTML = `
        <div class="card" style="max-width:560px;margin:0 auto">
          <div class="card-title mb-16">Select a client to onboard</div>
          <div class="form-group"><label>Client</label><select id="ob-client">${r.data.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
          <button class="btn btn-primary" onclick="window.__navigate('onboarding',{clientId:document.getElementById('ob-client').value})">Continue</button>
        </div>`;
      return;
    }
    const cl = await api("GET", "/clients/" + id);
    const ob = await api("GET", "/clients/" + id + "/onboarding");
    const cats = ["setup", "content", "branding", "deployment"];
    const blocks = cats.map((cat) => {
      const tasks = ob.tasks.filter((t) => t.category === cat);
      const done = tasks.filter((t) => t.is_completed).length;
      const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      const list = tasks.map((t) => `
        <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div class="row" style="gap:10px">
            <input type="checkbox" style="width:auto" ${t.is_completed ? "checked" : ""} onchange="window.__toggleTask('${t.id}')">
            <span style="${t.is_completed ? "text-decoration:line-through;color:var(--text-faint)" : ""}">${esc(t.task)}</span>
          </div>
        </div>`).join("");
      return `<div class="card"><div class="card-header"><div class="card-title text-cap">${cat}</div><span class="text-sm text-light">${done}/${tasks.length}</span></div><div class="progress mb-16"><div class="progress-bar" style="width:${pct}%"></div></div>${list}</div>`;
    }).join("");
    c.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-16" onclick="window.__navigate('client',{clientId:'${id}'})">← ${esc(cl.name)}</button>
      <div class="stepper mb-24">
        ${["Add client", "Scan site", "Configure", "Proposal", "Branding", "Deploy"].map((s, i) => `<div class="step ${i <= 2 ? "done" : ""}"><div class="step-num">${i < 3 ? "✓" : i + 1}</div><div class="step-label">${s}</div></div>`).join("")}
      </div>
      <div class="grid grid-2">${blocks}</div>`;
  }

  // ---------------------------------------------------------
  // WEBSITE SCANNER
  // ---------------------------------------------------------
  async function renderScanner(c) {
    const id = state.clientId;
    if (!id) {
      const r = await api("GET", "/clients?limit=100");
      if (!r.data.length) { c.innerHTML = emptyState("⌖", "No clients yet", "Create a client first, then scan their website.", "+ New Client", "window.__newClient()"); return; }
      c.innerHTML = `
        <div class="card" style="max-width:560px;margin:0 auto">
          <div class="card-title mb-16">Select a client to scan</div>
          <div class="form-group"><label>Client</label><select id="sc-client">${r.data.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
          <button class="btn btn-primary" onclick="window.__navigate('scanner',{clientId:document.getElementById('sc-client').value})">Continue</button>
        </div>`;
      return;
    }
    const cl = await api("GET", "/clients/" + id);
    const results = await api("GET", "/clients/" + id + "/scanner");
    const latest = results[0];
    const cfg = await api("GET", "/clients/" + id + "/deployment/config").catch(() => null);

    let resultBlock = "";
    if (latest && latest.status === "complete") {
      const services = JSON.parse(latest.services_found || "[]");
      const faqs = JSON.parse(latest.faqs_found || "[]");
      const team = JSON.parse(latest.team_found || "[]");
      resultBlock = `
        <div class="card mt-24">
          <div class="card-header"><div class="card-title">Extracted from ${esc(latest.url)}</div><span class="badge badge-green">complete</span></div>
          <div class="grid grid-3">
            <div><div class="stat-label mb-8">Services (${services.length})</div>${services.length ? services.map((s) => `<div class="text-sm mb-8">• ${esc(s.name)} <span class="text-faint">${esc(s.price || "")}</span></div>`).join("") : '<span class="text-faint">None detected</span>'}</div>
            <div><div class="stat-label mb-8">FAQs (${faqs.length})</div>${faqs.length ? faqs.map((f) => `<div class="text-sm mb-8">• ${esc(f.question)}</div>`).join("") : '<span class="text-faint">None detected</span>'}</div>
            <div><div class="stat-label mb-8">Team (${team.length})</div>${team.length ? team.map((t) => `<div class="text-sm mb-8">• ${esc(t)}</div>`).join("") : '<span class="text-faint">None detected</span>'}</div>
          </div>
          <div class="divider"></div>
          <button class="btn btn-success" onclick="window.__applyScan('${latest.id}')">Apply to Chatbot Config</button>
        </div>`;
    } else if (latest && latest.status === "failed") {
      resultBlock = `<div class="card mt-24"><div class="card-header"><div class="card-title">Scan failed</div><span class="badge badge-red">failed</span></div><div class="text-light">${esc(latest.error)}</div></div>`;
    } else if (latest && latest.status === "scanning") {
      resultBlock = `<div class="card mt-24 text-center"><div class="spinner"></div>Scanning…</div>`;
    }

    c.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-16" onclick="window.__navigate('client',{clientId:'${id}'})">← ${esc(cl.name)}</button>
      <div class="card" style="max-width:620px">
        <div class="card-header"><div class="card-title">Website Scanner</div></div>
        <p class="text-light mb-16">Enter the client's public website URL. We'll crawl it and auto-extract services, FAQs, and team members to bootstrap their chatbot configuration.</p>
        <div class="form-group"><label>Website URL</label><input id="scan-url" value="${esc(cl.website ? "https://" + cl.website : "")}" placeholder="https://example.com"></div>
        <button class="btn btn-primary" id="scan-btn" onclick="window.__runScan('${id}')">Start Scan</button>
      </div>
      ${resultBlock}`;
  }

  // ---------------------------------------------------------
  // PROPOSALS
  // ---------------------------------------------------------
  async function renderProposals(c) {
    const r = await api("GET", "/clients?limit=100");
    const clients = r.data;
    const all = [];
    for (const cl of clients) {
      const ps = await api("GET", "/clients/" + cl.id + "/proposals");
      ps.forEach((p) => all.push({ ...p, clientName: cl.name, clientId: cl.id }));
    }
    if (!all.length) { c.innerHTML = emptyState("▤", "No proposals yet", "Generate a proposal from a client profile to start closing deals.", "New Proposal", "window.__pickClientFor('proposal')"); return; }
    const rows = all.map((p) => `
      <tr class="clickable" onclick="window.__viewProposal('${p.id}')">
        <td><div style="font-weight:600">${esc(p.title)}</div><div class="text-sm text-light">${esc(p.clientName)}</div></td>
        <td class="text-right">${fmtMoney(p.total_cents)}</td>
        <td>${badge(p.status, { draft: "gray", sent: "blue", accepted: "green", rejected: "red" }[p.status])}</td>
        <td class="text-right"><button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();window.__viewProposal('${p.id}')">View</button></td>
      </tr>`).join("");
    c.innerHTML = `<div class="row between mb-16"><div class="text-sm text-light">${all.length} proposals</div><button class="btn btn-primary" onclick="window.__pickClientFor('proposal')">+ New Proposal</button></div>
      <div class="table-wrap"><table><thead><tr><th>Proposal</th><th class="text-right">Total</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  async function viewProposal(id) {
    const p = await api("GET", "/proposals/" + id);
    const pricing = JSON.parse(p.pricing || "[]");
    openModal(`
      <div class="doc-preview">
        ${p.content.split("\n").map((line) => {
          if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
          if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
          if (line.startsWith("- ")) return `<li>${esc(line.slice(2))}</li>`;
          if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ") || line.startsWith("5. ")) return `<li>${esc(line.slice(3))}</li>`;
          if (line.startsWith("**") && line.endsWith("**")) return `<p><strong>${esc(line.slice(2, -2))}</strong></p>`;
          return line ? `<p>${esc(line)}</p>` : "";
        }).join("")}
        <h2>Pricing Summary</h2>
        ${pricing.map((pr) => `<div class="price-row"><span>${esc(pr.label)}</span><span>${fmtMoney(pr.amount)}</span></div>`).join("")}
        <div class="price-row total"><span>Total First Month</span><span>${fmtMoney(p.total_cents)}</span></div>
      </div>`, { title: p.title, large: true, hideFooter: false });
    const f = modalFooter();
    const statusBtns = p.status === "draft" ? `<button class="btn btn-primary btn-sm" onclick="window.__setProposalStatus('${id}','sent')">Mark Sent</button>` : "";
    const acceptBtn = p.status === "sent" ? `<button class="btn btn-success btn-sm" onclick="window.__setProposalStatus('${id}','accepted')">Accept</button>` : "";
    f.innerHTML = `${statusBtns} ${acceptBtn} <button class="btn btn-secondary btn-sm" onclick="window.__exportProposal('${id}')">Export</button> <button class="btn btn-ghost btn-sm" onclick="window.__closeModal()">Close</button>`;
  }

  // ---------------------------------------------------------
  // INVOICES
  // ---------------------------------------------------------
  async function renderInvoices(c) {
    const invs = await api("GET", "/invoices");
    const rows = invs.map((i) => `
      <tr>
        <td><strong>${esc(i.invoice_number)}</strong></td>
        <td>${esc(i.client_name)}</td>
        <td class="text-right">${fmtMoney(i.amount_cents)}</td>
        <td>${badge(i.status, { pending: "amber", paid: "green", overdue: "red", cancelled: "gray" }[i.status])}</td>
        <td>${fmtDate(i.due_date)}</td>
        <td class="text-right"><select onchange="window.__setInvoiceStatus('${i.id}',this.value)" style="width:auto;padding:5px 8px">
          ${["pending", "paid", "overdue", "cancelled"].map((s) => `<option value="${s}" ${i.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select></td>
      </tr>`).join("");
    const totalPending = invs.filter((i) => i.status === "pending" || i.status === "overdue").reduce((a, i) => a + i.amount_cents, 0);
    c.innerHTML = `
      <div class="grid grid-4 mb-24">
        <div class="card stat-card"><div class="stat-label">Total Invoices</div><div class="stat-value">${invs.length}</div></div>
        <div class="card stat-card"><div class="stat-label">Outstanding</div><div class="stat-value">${fmtMoney(totalPending)}</div></div>
        <div class="card stat-card"><div class="stat-label">Paid</div><div class="stat-value">${fmtMoney(invs.filter((i) => i.status === "paid").reduce((a, i) => a + i.amount_cents, 0))}</div></div>
        <div class="card stat-card"><div class="stat-label">Overdue</div><div class="stat-value">${invs.filter((i) => i.status === "overdue").length}</div></div>
      </div>
      <div class="row between mb-16"><div class="text-sm text-light">${invs.length} invoices</div><button class="btn btn-primary" onclick="window.__pickClientFor('invoice')">+ New Invoice</button></div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Client</th><th class="text-right">Amount</th><th>Status</th><th>Due</th><th class="text-right">Update</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---------------------------------------------------------
  // BRANDING / TENANTS
  // ---------------------------------------------------------
  async function renderBranding(c) {
    const id = state.clientId;
    if (!id) {
      const ts = await api("GET", "/tenants");
      if (!ts.length) { c.innerHTML = emptyState("◈", "No tenants yet", "Tenants are created automatically when you add a client. Open a client to configure branding.", "Go to CRM", "window.__navigate('crm')"); return; }
      c.innerHTML = `<div class="grid grid-3">${ts.map((t) => `
        <div class="card"><div class="row between mb-12"><div class="card-title">${esc(t.brand_name || "Unnamed")}</div>${t.is_active ? badge("active", "green") : badge("inactive", "gray")}</div>
        <div class="text-sm text-light mb-8">Subdomain: <code class="inline">${esc(t.subdomain)}</code></div>
        <div class="row" style="gap:8px;margin-bottom:12px"><span class="color-swatch" style="background:${esc(t.brand_primary_color)}"></span><span class="color-swatch" style="background:${esc(t.brand_secondary_color)}"></span></div>
        <button class="btn btn-sm btn-secondary" onclick="window.__navigate('branding',{clientId:'${t.client_id}'})">Configure</button></div>`).join("")}</div>`;
      return;
    }
    const t = await api("GET", "/clients/" + id + "/tenant").catch(() => null);
    const cl = await api("GET", "/clients/" + id);
    if (!t) { c.innerHTML = emptyState("◈", "No tenant", "Create a tenant for this client to configure branding."); return; }
    c.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-16" onclick="window.__navigate('client',{clientId:'${id}'})">← ${esc(cl.name)}</button>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Branding</div><button class="btn btn-sm btn-primary" onclick="window.__saveTenant('${id}')">Save</button></div>
          <div class="form-group"><label>Brand Name</label><input id="b-name" value="${esc(t.brand_name)}"></div>
          <div class="form-group"><label>Subdomain</label><input id="b-sub" value="${esc(t.subdomain)}"><div class="hint">Used for the hosted widget: <code class="inline">${esc(t.subdomain)}.BurFlow.ai</code></div></div>
          <div class="form-group"><label>Custom Domain</label><input id="b-dom" value="${esc(t.custom_domain || "")}"></div>
          <div class="form-group"><label>Logo URL</label><input id="b-logo" value="${esc(t.brand_logo_url)}"></div>
          <div class="form-row">
            <div class="form-group"><label>Primary Color</label><input id="b-pri" type="color" value="${esc(t.brand_primary_color)}"></div>
            <div class="form-group"><label>Secondary Color</label><input id="b-sec" type="color" value="${esc(t.brand_secondary_color)}"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Chatbot Appearance</div></div>
          <div class="form-group"><label>Chatbot Title</label><input id="b-title" value="${esc(t.chatbot_title)}"></div>
          <div class="form-group"><label>Greeting Message</label><textarea id="b-greet">${esc(t.chatbot_greeting)}</textarea></div>
          <div class="divider"></div>
          <div class="widget-preview">
            <div class="widget-header-bar" style="background:linear-gradient(135deg,${esc(t.brand_primary_color)},${esc(t.brand_secondary_color)})"><span>${esc(t.chatbot_title)}</span><span>●</span></div>
            <div class="widget-msg-area"><div class="widget-bubble bot">${esc(t.chatbot_greeting)}</div></div>
            <div class="widget-input-bar"><input placeholder="Type a message…" disabled><button class="btn btn-primary btn-sm" disabled>Send</button></div>
          </div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------
  // DEPLOYMENT
  // ---------------------------------------------------------
  async function renderDeployment(c) {
    const id = state.clientId;
    if (!id) {
      const r = await api("GET", "/clients?limit=100");
      c.innerHTML = `
        <div class="card" style="max-width:560px;margin:0 auto">
          <div class="card-title mb-16">Select a client to deploy</div>
          <div class="form-group"><label>Client</label><select id="dep-client">${r.data.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
          <button class="btn btn-primary" onclick="window.__navigate('deployment',{clientId:document.getElementById('dep-client').value})">Continue</button>
        </div>`;
      return;
    }
    const cl = await api("GET", "/clients/" + id);
    const dep = await api("GET", "/clients/" + id + "/deployment");
    const r = dep.readiness;
    const checks = [
      ["Tenant configured", r.hasTenant],
      ["Chatbot config created", r.hasConfig],
      ["Services populated", r.servicesPopulated],
      ["Deployment tasks done", r.deploymentDone],
    ];
    const checkList = checks.map(([label, ok]) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)"><span>${esc(label)}</span>${ok ? badge("ready", "green") : badge("pending", "amber")}</div>`).join("");
    c.innerHTML = `
      <button class="btn btn-ghost btn-sm mb-16" onclick="window.__navigate('client',{clientId:'${id}'})">← ${esc(cl.name)}</button>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Deployment Readiness</div>${dep.ready ? badge("ready to deploy", "green") : badge("in progress", "amber")}</div>
          ${checkList}
          <div class="divider"></div>
          <button class="btn btn-success" ${dep.ready ? "" : "disabled"} onclick="window.__completeDeployment('${id}')">${dep.ready ? "Mark Deployment Complete" : "Complete prerequisites first"}</button>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Install Snippet</div><button class="btn btn-sm btn-secondary" onclick="window.__copyWidget()">Copy</button></div>
          ${dep.widgetCode ? `<pre class="code" id="widget-code">${esc(dep.widgetCode)}</pre>` : `<div class="text-light">Configure a tenant to generate the install snippet.</div>`}
          <div class="divider"></div>
          <div class="text-sm text-light">Paste this snippet before <code class="inline">&lt;/body&gt;</code> on the client's website to activate their AI assistant.</div>
          <div class="mt-12"><a class="btn btn-sm btn-secondary" href="/install" target="_blank">Open self-serve install page →</a></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------
  // SYSTEM HEALTH
  // ---------------------------------------------------------
  async function renderHealth(c) {
    const h = await fetch("/api/health").then((r) => r.json());
    const checks = [
      ["Server responding", true],
      ["Memory healthy", parseInt(h.memory.heapUsed) < 512],
      ["Fuzzer idle", h.fuzzerStatus === "idle" || h.fuzzerStatus === "stopped"],
    ];
    c.innerHTML = `
      <div class="grid grid-4 mb-24">
        <div class="card stat-card"><div class="stat-label">Status</div><div class="stat-value" style="font-size:20px;color:var(--success)">● Online</div></div>
        <div class="card stat-card"><div class="stat-label">Uptime</div><div class="stat-value" style="font-size:20px">${h.uptimeMinutes}m</div></div>
        <div class="card stat-card"><div class="stat-label">Heap Used</div><div class="stat-value" style="font-size:20px">${h.memory.heapUsed}</div></div>
        <div class="card stat-card"><div class="stat-label">Active Sessions</div><div class="stat-value" style="font-size:20px">${h.activeSessions}</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Health Checks</div></div>
          ${checks.map(([l, ok]) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)"><span>${esc(l)}</span>${ok ? badge("pass", "green") : badge("fail", "red")}</div>`).join("")}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Environment</div></div>
          <div class="form-group"><label>Node Version</label><div>${esc(h.version)}</div></div>
          <div class="form-group"><label>Environment</label><div>${esc(h.environment)}</div></div>
          <div class="form-group"><label>PID</label><div>${h.pid}</div></div>
          <div class="form-group"><label>RSS Memory</label><div>${esc(h.memory.rss)}</div></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------
  // Shared modals & actions
  // ---------------------------------------------------------
  window.__navigate = navigate;
  window.__openClient = (id) => navigate("client", { clientId: id });
  window.__crmPage = (p) => { state.crm.page = p; renderCRM(document.getElementById("content")); };
  window.__newClient = () => {
    openModal(`
      <div class="form-group"><label>Business Name *</label><input id="nc-name"></div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input id="nc-email"></div>
        <div class="form-group"><label>Phone</label><input id="nc-phone"></div>
      </div>
      <div class="form-group"><label>Website</label><input id="nc-web" placeholder="example.com"></div>
      <div class="form-row">
        <div class="form-group"><label>Industry</label><select id="nc-ind">${["dental","restaurant","law","gym","realestate","salon","other"].map((s) => `<option>${s}</option>`).join("")}</select></div>
        <div class="form-group"><label>Status</label><select id="nc-status">${["lead","prospect","onboarding","active"].map((s) => `<option>${s}</option>`).join("")}</select></div>
      </div>
      <div class="form-group"><label>Monthly Budget ($)</label><input id="nc-budget" type="number" value="299"></div>
      <div class="form-group"><label>Notes</label><textarea id="nc-notes"></textarea></div>`,
      { title: "New Client", hideFooter: false });
    const f = modalFooter();
    f.innerHTML = `<button class="btn btn-secondary" onclick="window.__closeModal()">Cancel</button><button class="btn btn-primary" id="nc-save">Create & Onboard</button>`;
    f.querySelector("#nc-save").onclick = async () => {
      try {
        const name = document.getElementById("nc-name").value.trim();
        if (!name) { toast("error", "Name required"); return; }
        const cl = await api("POST", "/clients", {
          name, email: document.getElementById("nc-email").value, phone: document.getElementById("nc-phone").value,
          website: document.getElementById("nc-web").value, industry: document.getElementById("nc-ind").value,
          status: document.getElementById("nc-status").value, monthly_budget: Math.round(parseFloat(document.getElementById("nc-budget").value || 0) * 100),
          notes: document.getElementById("nc-notes").value,
        });
        await api("POST", "/clients/" + cl.id + "/onboarding/init");
        await api("PUT", "/clients/" + cl.id + "/tenant", { subdomain: "client-" + cl.id.slice(0, 8), brand_name: name });
        window.__closeModal();
        toast("success", "Client created", name + " is ready to onboard.");
        navigate("onboarding", { clientId: cl.id });
      } catch (e) { toast("error", "Failed to create", e.message); }
    };
  };
  window.__editClient = async (id) => {
    const cl = await api("GET", "/clients/" + id);
    openModal(`
      <div class="form-group"><label>Name</label><input id="ec-name" value="${esc(cl.name)}"></div>
      <div class="form-row"><div class="form-group"><label>Email</label><input id="ec-email" value="${esc(cl.email)}"></div><div class="form-group"><label>Phone</label><input id="ec-phone" value="${esc(cl.phone)}"></div></div>
      <div class="form-group"><label>Website</label><input id="ec-web" value="${esc(cl.website)}"></div>
      <div class="form-row"><div class="form-group"><label>Status</label><select id="ec-status">${["lead","prospect","onboarding","active","suspended","churned"].map((s) => `<option ${cl.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="form-group"><label>Stage</label><select id="ec-stage">${["discovery","proposal","negotiation","closed_won","closed_lost"].map((s) => `<option ${cl.pipeline_stage === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div>
      <div class="form-group"><label>Notes</label><textarea id="ec-notes">${esc(cl.notes)}</textarea></div>`,
      { title: "Edit Client", hideFooter: false });
    const f = modalFooter();
    f.innerHTML = `<button class="btn btn-secondary" onclick="window.__closeModal()">Cancel</button><button class="btn btn-primary" id="ec-save">Save</button>`;
    f.querySelector("#ec-save").onclick = async () => {
      try {
        await api("PUT", "/clients/" + id, { name: document.getElementById("ec-name").value, email: document.getElementById("ec-email").value, phone: document.getElementById("ec-phone").value, website: document.getElementById("ec-web").value, status: document.getElementById("ec-status").value, pipeline_stage: document.getElementById("ec-stage").value, notes: document.getElementById("ec-notes").value });
        window.__closeModal(); toast("success", "Saved"); renderClientProfile(document.getElementById("content"));
      } catch (e) { toast("error", "Save failed", e.message); }
    };
  };
  window.__toggleTask = async (tid) => {
    try { await api("POST", "/onboarding/" + tid + "/toggle"); renderOnboarding(document.getElementById("content")); } catch (e) { toast("error", "Update failed", e.message); }
  };
  window.__runScan = async (id) => {
    const btn = document.getElementById("scan-btn");
    btn.disabled = true; btn.textContent = "Scanning…";
    try {
      const url = document.getElementById("scan-url").value.trim();
      const res = await api("POST", "/clients/" + id + "/scanner", { url });
      toast("success", "Scan complete", res.status === "complete" ? "Extracted data from site." : "Scan finished with issues.");
      renderScanner(document.getElementById("content"));
    } catch (e) { toast("error", "Scan failed", e.message); btn.disabled = false; btn.textContent = "Start Scan"; }
  };
  window.__applyScan = async (rid) => {
    try {
      await api("POST", "/clients/" + state.clientId + "/scanner/" + rid + "/apply");
      toast("success", "Applied", "Chatbot config updated with scanned data.");
      renderScanner(document.getElementById("content"));
    } catch (e) { toast("error", "Apply failed", e.message); }
  };
  window.__newProposal = (id) => { window.__pickClientFor("proposal", id); };
  window.__pickClientFor = async (kind, presetId) => {
    const r = await api("GET", "/clients?limit=100");
    const sel = presetId ? `<input type="hidden" id="pc-id" value="${presetId}">` : `<div class="form-group"><label>Client</label><select id="pc-id">${r.data.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>`;
    if (kind === "proposal") {
      openModal(sel + `<div class="form-group"><label>Plan Tier</label><select id="pc-tier"><option value="starter">Starter — $299/mo</option><option value="growth" selected>Growth — $599/mo</option><option value="enterprise">Enterprise — $999/mo</option></select></div>`, { title: "New Proposal", hideFooter: false });
      modalFooter().innerHTML = `<button class="btn btn-secondary" onclick="window.__closeModal()">Cancel</button><button class="btn btn-primary" id="pc-go">Generate</button>`;
      modalFooter().querySelector("#pc-go").onclick = async () => {
        try { const p = await api("POST", "/clients/" + document.getElementById("pc-id").value + "/proposals", { tier: document.getElementById("pc-tier").value }); window.__closeModal(); toast("success", "Proposal generated"); window.__viewProposal(p.id); }
        catch (e) { toast("error", "Failed", e.message); }
      };
    } else {
      openModal(sel + `<div class="form-group"><label>Amount ($)</label><input id="pc-amt" type="number" value="299"></div><div class="form-group"><label>Notes</label><input id="pc-notes" placeholder="Monthly subscription"></div>`, { title: "New Invoice", hideFooter: false });
      modalFooter().innerHTML = `<button class="btn btn-secondary" onclick="window.__closeModal()">Cancel</button><button class="btn btn-primary" id="pc-go">Create</button>`;
      modalFooter().querySelector("#pc-go").onclick = async () => {
        try { await api("POST", "/clients/" + document.getElementById("pc-id").value + "/invoices", { amount_cents: Math.round(parseFloat(document.getElementById("pc-amt").value || 0) * 100), notes: document.getElementById("pc-notes").value }); window.__closeModal(); toast("success", "Invoice created"); renderInvoices(document.getElementById("content")); }
        catch (e) { toast("error", "Failed", e.message); }
      };
    }
  };
  window.__viewProposal = (id) => viewProposal(id);
  window.__setProposalStatus = async (id, status) => {
    try { await api("PUT", "/proposals/" + id + "/status", { status }); window.__closeModal(); toast("success", "Status updated", status); renderProposals(document.getElementById("content")); }
    catch (e) { toast("error", "Failed", e.message); }
  };
  window.__exportProposal = async (id) => {
    const p = await api("GET", "/proposals/" + id);
    const blob = new Blob([p.content], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = p.title.replace(/\s+/g, "_") + ".md"; a.click();
    toast("success", "Exported", p.title + ".md");
  };
  window.__setInvoiceStatus = async (id, status) => { try { await api("PUT", "/invoices/" + id + "/status", { status }); toast("success", "Invoice updated"); } catch (e) { toast("error", "Failed", e.message); } };
  window.__saveTenant = async (id) => {
    try {
      await api("PUT", "/clients/" + id + "/tenant", {
        brand_name: document.getElementById("b-name").value, subdomain: document.getElementById("b-sub").value,
        custom_domain: document.getElementById("b-dom").value, brand_logo_url: document.getElementById("b-logo").value,
        brand_primary_color: document.getElementById("b-pri").value, brand_secondary_color: document.getElementById("b-sec").value,
        chatbot_title: document.getElementById("b-title").value, chatbot_greeting: document.getElementById("b-greet").value,
      });
      toast("success", "Branding saved"); renderBranding(document.getElementById("content"));
    } catch (e) { toast("error", "Save failed", e.message); }
  };
  window.__completeDeployment = async (id) => {
    confirmDialog("Mark deployment complete?", "This will finalize the client's chatbot deployment and update their onboarding status.", async () => {
      try {
        const ob = await api("GET", "/clients/" + id + "/onboarding");
        for (const t of ob.tasks.filter((t) => t.category === "deployment" && !t.is_completed)) {
          await api("POST", "/onboarding/" + t.id + "/toggle");
        }
        toast("success", "Deployment complete", "Client is live.");
        renderDeployment(document.getElementById("content"));
      } catch (e) { toast("error", "Failed", e.message); }
    });
  };
  window.__copyWidget = () => {
    const code = document.getElementById("widget-code").textContent;
    navigator.clipboard.writeText(code).then(() => toast("success", "Copied", "Install snippet copied to clipboard."), () => toast("error", "Copy failed"));
  };

  function emptyState(icon, title, desc, btnLabel, btnOnclick) {
    return `<div class="empty-state"><div class="icon">${icon}</div><div class="title">${esc(title)}</div><div class="desc">${esc(desc)}</div>${btnLabel ? `<button class="btn btn-primary" onclick="${btnOnclick}">${esc(btnLabel)}</button>` : ""}</div>`;
  }

  // Boot
  render();
})();
