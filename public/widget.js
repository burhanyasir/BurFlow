(function () {
  "use strict";
  var cfg = window.BrightSmileWidget || {};
  var apiUrl = cfg.apiUrl || "/api/chat";
  var title = cfg.chatbotTitle || "AI Assistant";
  var greeting = cfg.greeting || "Hi! How can I help you today?";
  var primary = cfg.primaryColor || "#0a66c2";
  var secondary = cfg.secondaryColor || "#00b894";
  var sessionId = "widget-" + Math.random().toString(36).slice(2);

  function injectStyles() {
    var s = document.createElement("style");
    s.textContent = `
      #bsw-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      #bsw-root { position: fixed; bottom: 24px; right: 24px; z-index: 99999; }
      #bsw-bubble { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, ${primary}, ${secondary}); color: #fff; border: none; cursor: pointer; font-size: 26px; box-shadow: 0 6px 20px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; }
      #bsw-panel { position: absolute; bottom: 76px; right: 0; width: 360px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: #fff; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.25); display: none; flex-direction: column; overflow: hidden; }
      #bsw-panel.open { display: flex; }
      #bsw-header { background: linear-gradient(135deg, ${primary}, ${secondary}); color: #fff; padding: 16px 18px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
      #bsw-header .x { cursor: pointer; font-size: 20px; opacity: .8; }
      #bsw-msgs { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; }
      #bsw-msgs .b { max-width: 82%; margin-bottom: 10px; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.45; white-space: pre-wrap; }
      #bsw-msgs .bot { background: #fff; border: 1px solid #e2e8f0; }
      #bsw-msgs .me { background: ${primary}; color: #fff; margin-left: auto; }
      #bsw-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e2e8f0; }
      #bsw-input input { flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13.5px; }
      #bsw-input button { background: ${primary}; color: #fff; border: none; border-radius: 8px; padding: 0 16px; font-weight: 600; cursor: pointer; }
      #bsw-typing { font-size: 12px; color: #94a3b8; padding: 0 16px 8px; }
    `;
    document.head.appendChild(s);
  }

  function build() {
    var root = document.createElement("div");
    root.id = "bsw-root";
    root.innerHTML = `
      <div id="bsw-panel">
        <div id="bsw-header"><span>${title}</span><span class="x" id="bsw-close">×</span></div>
        <div id="bsw-msgs"></div>
        <div id="bsw-typing" style="display:none">Assistant is typing…</div>
        <div id="bsw-input"><input id="bsw-field" placeholder="Type your message…" autocomplete="off"><button id="bsw-send">Send</button></div>
      </div>
      <button id="bsw-bubble" aria-label="Open chat">💬</button>`;
    document.body.appendChild(root);

    var panel = root.querySelector("#bsw-panel");
    var bubble = root.querySelector("#bsw-bubble");
    var close = root.querySelector("#bsw-close");
    var field = root.querySelector("#bsw-field");
    var send = root.querySelector("#bsw-send");
    var msgs = root.querySelector("#bsw-msgs");
    var typing = root.querySelector("#bsw-typing");

    bubble.addEventListener("click", function () { panel.classList.add("open"); if (!msgs.children.length) addBubble(greeting, "bot"); field.focus(); });
    close.addEventListener("click", function () { panel.classList.remove("open"); });
    send.addEventListener("click", sendMsg);
    field.addEventListener("keydown", function (e) { if (e.key === "Enter") sendMsg(); });

    function addBubble(text, who) {
      var d = document.createElement("div");
      d.className = "b " + who;
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
    window.__bswAddBubble = addBubble;

    function getFriendlyReply(data) {
      var fallback = "I’m here to help, but the assistant is temporarily unavailable. Please try again in a moment.";
      if (!data || typeof data !== "object") return fallback;
      var reply = data.reply || data.message || data.error;
      if (typeof reply !== "string" || !reply.trim()) return fallback;
      var lower = reply.toLowerCase();
      if (lower.indexOf("error:") === 0 || lower.indexOf("tenant not found") !== -1 || lower.indexOf("not found") !== -1 || lower.indexOf("unauthorized") !== -1 || lower.indexOf("forbidden") !== -1) {
        return fallback;
      }
      return reply;
    }

    function sendMsg() {
      var text = field.value.trim();
      if (!text) return;
      addBubble(text, "me");
      field.value = "";
      typing.style.display = "block";
      fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-session-id": sessionId }, body: JSON.stringify({ message: text }) })
        .then(function (r) {
          if (!r.ok) return { error: "assistant_unavailable" };
          return r.json().catch(function () { return { error: "assistant_unavailable" }; });
        })
        .then(function (data) { typing.style.display = "none"; addBubble(getFriendlyReply(data), "bot"); })
        .catch(function () { typing.style.display = "none"; addBubble("I’m here to help, but the assistant is temporarily unavailable. Please try again in a moment.", "bot"); });
    }
  }

  function init() {
    if (document.getElementById("bsw-root")) return;
    injectStyles();
    build();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
