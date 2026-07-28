(function () {
  "use strict";
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function inline(s) {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, function (_, c) { return "<code>" + c + "</code>"; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, h) { return '<a href="' + h + '" target="_blank" rel="noopener">' + t + "</a>"; });
    return s;
  }
  function render(md) {
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var html = "", i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (line.startsWith("```")) {
        var code = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
        i++;
        html += "<pre class='code'>" + escapeHtml(code.join("\n")) + "</pre>";
        continue;
      }
      if (line.startsWith("### ")) { html += "<h3>" + inline(line.slice(4)) + "</h3>"; i++; continue; }
      if (line.startsWith("## ")) { html += "<h2>" + inline(line.slice(3)) + "</h2>"; i++; continue; }
      if (line.startsWith("# ")) { html += "<h1>" + inline(line.slice(2)) + "</h1>"; i++; continue; }
      if (line.startsWith("> ")) { html += "<blockquote>" + inline(line.slice(2)) + "</blockquote>"; i++; continue; }
      if (line.trim() === "---") { html += "<hr>"; i++; continue; }
      if (/^\|\s/.test(line)) {
        var tbl = [];
        while (i < lines.length && /^\|\s/.test(lines[i])) { tbl.push(lines[i]); i++; }
        html += table(tbl);
        continue;
      }
      if (/^(\d+)\.\s/.test(line)) {
        var ol = [];
        while (i < lines.length && /^(\d+)\.\s/.test(lines[i])) { ol.push("<li>" + inline(lines[i].replace(/^\d+\.\s/, "")) + "</li>"); i++; }
        html += "<ol>" + ol.join("") + "</ol>";
        continue;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        var ul = [];
        while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) { ul.push("<li>" + inline(lines[i].slice(2)) + "</li>"); i++; }
        html += "<ul>" + ul.join("") + "</ul>";
        continue;
      }
      if (line.trim() === "") { i++; continue; }
      var para = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("- ") && !lines[i].startsWith("* ") && !lines[i].startsWith("```") && !/^\d+\.\s/.test(lines[i]) && !/^\|\s/.test(lines[i]) && !lines[i].startsWith("> ") && lines[i].trim() !== "---") {
        para.push(lines[i]); i++;
      }
      if (para.length) html += "<p>" + inline(para.join(" ")) + "</p>";
    }
    return html;
  }
  function table(rows) {
    var cells = rows.map(function (r) { return r.split("|").slice(1, -1).map(function (c) { return c.trim(); }); });
    var head = cells[0], body = cells.slice(2);
    var h = "<table class='md-table'><thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    h += body.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    return h;
  }
  window.Markdown = { render: render };
})();
