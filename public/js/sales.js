(function () {
  "use strict";
  function calc() {
    var visitors = parseFloat(document.getElementById("roi-visitors").value) || 0;
    var conv = parseFloat(document.getElementById("roi-conv").value) || 0;
    var value = parseFloat(document.getElementById("roi-value").value) || 0;
    var uplift = parseFloat(document.getElementById("roi-uplift").value) || 0;
    var base = visitors * (conv / 100);
    var after = visitors * (conv / 100) * (1 + uplift / 100);
    var extra = after - base;
    var monthly = extra * value;
    document.getElementById("roi-bookings").textContent = Math.round(extra).toLocaleString();
    document.getElementById("roi-monthly").textContent = "$" + Math.round(monthly).toLocaleString();
    document.getElementById("roi-annual").textContent = "$" + Math.round(monthly * 12).toLocaleString();
  }
  ["roi-visitors", "roi-conv", "roi-value", "roi-uplift"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", calc);
  });
  calc();

  window.__viewAsset = function (file) {
    fetch("/sales/" + file).then(function (r) { return r.text(); }).then(function (md) {
      var overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = "<div class='modal modal-lg'><div class='modal-header'><h3>" + file + "</h3><button class='modal-close' onclick='this.closest(\".modal-overlay\").remove()'>×</button></div><div class='modal-body'><div class='md-viewer'>" + window.Markdown.render(md) + "</div></div></div>";
      document.body.appendChild(overlay);
    });
  };
  window.__download = function (file) {
    window.location.href = "/sales/" + file + "?download=1";
  };
})();
