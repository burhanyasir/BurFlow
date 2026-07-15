(function () {
  "use strict";
  function toast(type, title, msg) {
    var wrap = document.getElementById("toast-wrap");
    if (!wrap) return;
    var el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.innerHTML = '<div class="toast-title">' + esc(title) + "</div>" + (msg ? '<div class="toast-msg">' + esc(msg) + "</div>" : "");
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(function () { el.remove(); }, 300); }, 3200);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  window.__submitContact = function (e) {
    e.preventDefault();
    var name = document.getElementById("c-name").value.trim();
    var email = document.getElementById("c-email").value.trim();
    var status = document.getElementById("contact-status");
    if (!name || !email) { status.textContent = "Please provide your name and email."; status.style.color = "var(--danger)"; return false; }
    var payload = {
      name: name, email: email,
      phone: document.getElementById("c-phone").value,
      industry: document.getElementById("c-industry").value,
      website: document.getElementById("c-site").value,
      message: document.getElementById("c-msg").value,
    };
    status.textContent = "Submitting…"; status.style.color = "var(--text-light)";
    fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function () {
        status.textContent = "Thanks! Our team will reach out within one business day.";
        status.style.color = "var(--success)";
        document.getElementById("contact-form").reset();
        toast("success", "Demo requested", "We'll be in touch soon.");
      })
      .catch(function () { status.textContent = "Something went wrong. Please try again."; status.style.color = "var(--danger)"; });
    return false;
  };

  function roiCalc() {
    var v = +document.getElementById("roi-visitors").value || 0;
    var c = (+document.getElementById("roi-conv").value || 0) / 100;
    var val = +document.getElementById("roi-value").value || 0;
    var u = (+document.getElementById("roi-uplift").value || 0) / 100;
    var bookings = v * c * u;
    var monthly = bookings * val;
    document.getElementById("roi-bookings").textContent = Math.round(bookings).toLocaleString();
    document.getElementById("roi-monthly").textContent = "$" + Math.round(monthly).toLocaleString();
    document.getElementById("roi-annual").textContent = "$" + Math.round(monthly * 12).toLocaleString();
  }
  ["roi-visitors", "roi-conv", "roi-value", "roi-uplift"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", roiCalc);
  });
  if (document.getElementById("roi-visitors")) roiCalc();
})();
