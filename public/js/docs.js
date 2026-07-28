(function () {
  "use strict";
  var DOCS = [
    { file: "user-guide.md", title: "👤 User Guide", desc: "Day-to-day use of the Agency Console for operators." },
    { file: "admin-guide.md", title: "🛠️ Admin Guide", desc: "Architecture, server, API reference, and maintenance." },
    { file: "deployment-guide.md", title: "🚀 Deployment Guide", desc: "Take a client from signed proposal to a live chatbot." },
    { file: "client-onboarding-guide.md", title: "🤝 Client Onboarding", desc: "The 4-phase checklist to launch a new client." },
    { file: "troubleshooting-guide.md", title: "🔧 Troubleshooting", desc: "Common issues and how to resolve them." },
  ];
  var grid = document.getElementById("doc-grid");
  grid.innerHTML = DOCS.map(function (d) {
    return "<div class='card'><div class='card-title'>" + d.title + "</div><p class='text-light text-sm mb-16'>" + d.desc + "</p><button class='btn btn-sm btn-primary' onclick=\"window.__viewDoc('" + d.file + "')\">Read guide</button></div>";
  }).join("");

  window.__viewDoc = function (file) {
    fetch("/docs/" + file).then(function (r) { return r.text(); }).then(function (md) {
      var overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = "<div class='modal modal-lg'><div class='modal-header'><h3>" + file + "</h3><button class='modal-close' onclick='this.closest(\".modal-overlay\").remove()'>×</button></div><div class='modal-body'><div class='md-viewer'>" + window.Markdown.render(md) + "</div></div></div>";
      document.body.appendChild(overlay);
    });
  };
})();
