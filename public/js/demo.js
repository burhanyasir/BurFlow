(function () {
  "use strict";
  var demo = { clientId: null, scanId: null, proposalId: null, invoiceId: null, step: 0, done: {} };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return "$" + ((n || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function toast(t, title, msg) {
    var wrap = document.getElementById("toast-wrap");
    var el = document.createElement("div"); el.className = "toast " + (t || "");
    el.innerHTML = '<div class="toast-title">' + esc(title) + "</div>" + (msg ? '<div class="toast-msg">' + esc(msg) + "</div>" : "");
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(function () { el.remove(); }, 300); }, 3200);
  }
  function api(method, path, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    return fetch("/api/agency" + path, opts).then(function (r) { return r.json(); });
  }

  var STEPS = [
    {
      key: "add", title: "1 · Add Client", label: "Add Client",
      desc: "Create the client record. In the real console this opens a form; here we create <strong>Maple Grove Dental</strong> programmatically.",
      run: function () {
        return api("GET", "/clients?search=Maple%20Grove%20Dental%20(Demo)&limit=50").then(function (r) {
          var deletes = (r.data || []).map(function (c) { return api("DELETE", "/clients/" + c.id); });
          return Promise.all(deletes);
        }).then(function () {
          return api("POST", "/clients", { name: "Maple Grove Dental (Demo)", email: "frontdesk@maplegrove.example", website: "maplegrove.example", industry: "dental", status: "lead", monthly_budget: 59900 });
        }).then(function (c) {
          demo.clientId = c.id;
          return api("PUT", "/clients/" + c.id + "/tenant", { subdomain: "maplegrove", brand_name: "Maple Grove Dental" });
        }).then(function () { return "<strong>Client created:</strong> Maple Grove Dental (Demo) (status: lead, budget: " + fmt(59900) + "/mo)"; });
      }
    },
    {
      key: "scan", title: "2 · Scan Website", label: "Scan Site",
      desc: "The Website Scanner crawls the client's public site and auto-extracts services, FAQs, and team members. We'll scan a bundled sample clinic page.",
      run: function () {
        var url = window.location.origin + "/demo-sample-site.html";
        return api("POST", "/clients/" + demo.clientId + "/scanner", { url: url })
          .then(function (r) {
            if (r.status !== "complete") throw new Error(r.error || "scan failed");
            demo.scanId = r.id;
            var svcs = JSON.parse(r.services_found || "[]");
            var faqs = JSON.parse(r.faqs_found || "[]");
            var team = JSON.parse(r.team_found || "[]");
            return "<strong>Scan complete.</strong> Extracted " + svcs.length + " services, " + faqs.length + " FAQs, " + team.length + " team mentions.<br><br>" +
              "<strong>Services:</strong> " + svcs.map(function (s) { return esc(s.name); }).join(", ") + "<br>" +
              "<strong>Team:</strong> " + (team.length ? team.map(esc).join(", ") : "—");
          });
      }
    },
    {
      key: "config", title: "3 · Configure Chatbot", label: "Apply Config",
      desc: "Apply the scanned data to the client's chatbot configuration. This bootstraps their assistant without writing a single line of content.",
      run: function () {
        return api("POST", "/clients/" + demo.clientId + "/scanner/" + demo.scanId + "/apply")
          .then(function (cfg) {
            var svcs = JSON.parse(cfg.services || "[]");
            return "<strong>Configuration applied.</strong> Chatbot now knows " + svcs.length + " services and is ready to answer patient questions.";
          });
      }
    },
    {
      key: "proposal", title: "4 · Generate Proposal", label: "Generate Proposal",
      desc: "Generate a polished sales proposal with pricing. In the console you pick a tier; here we use the Growth plan.",
      run: function () {
        return api("POST", "/clients/" + demo.clientId + "/proposals", { tier: "growth" })
          .then(function (p) { demo.proposalId = p.id; return "<strong>Proposal generated:</strong> " + esc(p.title) + "<br><strong>Total (first month):</strong> " + fmt(p.total_cents); });
      }
    },
    {
      key: "invoice", title: "5 · Generate Invoice", label: "Generate Invoice",
      desc: "Generate the first invoice for the client. The console lets you set amounts and due dates.",
      run: function () {
        return api("POST", "/clients/" + demo.clientId + "/invoices", { amount_cents: 59900, notes: "Growth plan - monthly" })
          .then(function (inv) { demo.invoiceId = inv.id; return "<strong>Invoice created:</strong> " + esc(inv.invoice_number) + " for " + fmt(inv.amount_cents); });
      }
    },
    {
      key: "deploy", title: "6 · Deploy Widget", label: "Get Snippet",
      desc: "Generate the install snippet. Paste it before &lt;/body&gt; on the client's site to go live.",
      run: function () {
        return api("PUT", "/clients/" + demo.clientId + "/tenant", { subdomain: "maplegrove", brand_name: "Maple Grove Dental" })
          .then(function () { return api("GET", "/clients/" + demo.clientId + "/deployment"); })
          .then(function (dep) {
            demo.widgetCode = dep.widgetCode;
            return "<strong>Deployment snippet ready.</strong><pre class='code' style='margin-top:10px'>" + esc(dep.widgetCode || "n/a") + "</pre>";
          });
      }
    },
    {
      key: "live", title: "7 · Chatbot Working", label: "Show Chatbot",
      desc: "The assistant is live. Try it now — the floating bubble (bottom-right) is a real, working BrightSmile AI widget backed by the conversation engine.",
      run: function () {
        if (!document.getElementById("bsw-root")) {
          var s = document.createElement("script");
          s.src = "/widget.js";
          s.onload = function () { if (window.__bswAddBubble) window.__bswAddBubble("Hi! I'm the Maple Grove Dental assistant. Ask me about cleanings, whitening, or book an appointment!", "bot"); };
          document.body.appendChild(s);
        }
        return "<strong>You're done!</strong> A live chatbot is now running on this page. Open the bubble in the bottom-right corner and say <em>“Do you take Delta Dental?”</em> or <em>“Book a cleaning Friday.”</em><br><br><a class='btn btn-secondary btn-sm' href='/admin'>Open the Agency Console →</a>";
      }
    }
  ];

  function renderStepper() {
    var el = document.getElementById("stepper");
    el.innerHTML = STEPS.map(function (s, i) {
      var cls = i === demo.step ? "step active" : (demo.done[s.key] ? "step done" : "step");
      var num = demo.done[s.key] ? "✓" : (i + 1);
      return "<div class='" + cls + "'><div class='step-num'>" + num + "</div><div class='step-label'>" + s.label + "</div></div>" + (i < STEPS.length - 1 ? "<div class='step-line'></div>" : "");
    }).join("");
  }

  function renderStep() {
    var s = STEPS[demo.step];
    var container = document.getElementById("steps");
    var already = demo.done[s.key];
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">${esc(s.title)}</div>${already ? "<span class='badge badge-green'>completed</span>" : ""}</div>
        <p class="text-light mb-16">${s.desc}</p>
        <button class="btn btn-primary" id="run-btn" ${already ? "disabled" : ""} onclick="window.__runStep()">${already ? "Re-run" : "▶ Run this step"}</button>
        <div id="result" class="mt-16"></div>
      </div>`;
    if (already) { document.getElementById("result").innerHTML = demo.results[s.key] || ""; }
    document.getElementById("prev-btn").disabled = demo.step === 0;
    document.getElementById("next-btn").disabled = demo.step === STEPS.length - 1;
  }

  window.__runStep = function () {
    var s = STEPS[demo.step];
    var btn = document.getElementById("run-btn");
    var result = document.getElementById("result");
    btn.disabled = true; btn.textContent = "Running…";
    result.innerHTML = "<div class='loading-state' style='padding:20px'><div class='spinner'></div>Working…</div>";
    s.run().then(function (html) {
      demo.done[s.key] = true; demo.results = demo.results || {}; demo.results[s.key] = html;
      result.innerHTML = html; btn.textContent = "✓ Done"; toast("success", s.label + " complete");
      renderStepper();
    }).catch(function (err) {
      result.innerHTML = "<div class='empty-state' style='padding:20px'><div class='title'>Step failed</div><div class='desc'>" + esc(err.message) + "</div></div>";
      btn.disabled = false; btn.textContent = "▶ Retry"; toast("error", "Step failed", err.message);
    });
  };
  window.__next = function () { if (demo.step < STEPS.length - 1) { demo.step++; renderStepper(); renderStep(); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  window.__prev = function () { if (demo.step > 0) { demo.step--; renderStepper(); renderStep(); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  renderStepper(); renderStep();
})();
