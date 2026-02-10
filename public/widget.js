/**
 * OrionChat — Client Command Channel Widget
 * Embed: <script src="https://orionchat.vercel.app/widget.js" defer></script>
 * Auth: Send client a link with ?oc_token=xxx — stores in localStorage
 */
(function () {
  const API_BASE = "https://hardy-mongoose-695.eu-west-1.convex.site";
  const TOKEN_KEY = "oc_token";
  const POLL_INTERVAL = 5000;

  // Check for token in URL params
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("oc_token");
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken);
    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete("oc_token");
    window.history.replaceState({}, "", url.toString());
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return; // No token = no widget

  let siteInfo = null;
  let messages = [];
  let isOpen = false;
  let pollTimer = null;

  // Verify token
  async function verify() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.authenticated) {
        siteInfo = data;
        render();
        loadMessages();
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Silent fail
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`${API_BASE}/api/messages?limit=50`, {
        headers: { "X-OC-Token": token },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        messages = data;
        if (isOpen) renderMessages();
      }
    } catch {
      // Silent
    }
  }

  async function sendMessage(text) {
    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-OC-Token": token },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.id) {
        messages.push({
          _id: data.id,
          siteId: siteInfo.siteId,
          role: "client",
          content: text,
          status: "pending",
          createdAt: Date.now(),
        });
        renderMessages();
        scrollToBottom();
      }
    } catch {
      // Silent
    }
  }

  function statusIcon(status) {
    if (status === "pending") return "⏳";
    if (status === "in-progress") return "🔄";
    if (status === "done") return "✅";
    return "";
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function scrollToBottom() {
    const container = document.getElementById("oc-messages");
    if (container) container.scrollTop = container.scrollHeight;
  }

  function renderMessages() {
    const container = document.getElementById("oc-messages");
    if (!container) return;

    container.innerHTML = messages.length === 0
      ? '<div style="text-align:center;color:#94a3b8;padding:40px 20px;font-size:14px;">No messages yet.<br>Type a request below to get started.</div>'
      : messages.map((m) => `
        <div style="display:flex;flex-direction:column;align-items:${m.role === "client" ? "flex-end" : "flex-start"};margin-bottom:12px;">
          <div style="
            max-width:85%;
            padding:10px 14px;
            border-radius:${m.role === "client" ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
            background:${m.role === "client" ? "#3b82f6" : "#1e293b"};
            color:#fff;
            font-size:14px;
            line-height:1.5;
            word-break:break-word;
          ">${escapeHtml(m.content)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:3px;display:flex;gap:6px;align-items:center;">
            <span>${timeAgo(m.createdAt)}</span>
            ${m.role === "client" ? `<span>${statusIcon(m.status)}</span>` : ""}
          </div>
        </div>
      `).join("");

    scrollToBottom();
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function render() {
    // Floating button
    const btn = document.createElement("div");
    btn.id = "oc-btn";
    btn.innerHTML = `
      <div style="
        position:fixed;bottom:24px;right:24px;z-index:99999;
        width:56px;height:56px;border-radius:50%;
        background:linear-gradient(135deg,#3b82f6,#8b5cf6);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;box-shadow:0 4px 20px rgba(59,130,246,0.4);
        transition:transform 0.2s,box-shadow 0.2s;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </div>
    `;
    document.body.appendChild(btn);

    // Chat panel
    const panel = document.createElement("div");
    panel.id = "oc-panel";
    panel.style.cssText = `
      position:fixed;bottom:90px;right:24px;z-index:99999;
      width:380px;max-width:calc(100vw - 48px);height:520px;max-height:calc(100vh - 120px);
      background:#0f172a;border:1px solid rgba(255,255,255,0.1);
      border-radius:20px;overflow:hidden;display:none;
      box-shadow:0 20px 60px rgba(0,0,0,0.5);
      flex-direction:column;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    `;
    panel.innerHTML = `
      <div style="padding:16px 20px;background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff;">Orián</div>
          <div style="font-size:12px;color:#64748b;">Request changes to your site</div>
        </div>
        <div id="oc-close" style="cursor:pointer;color:#64748b;font-size:20px;padding:4px 8px;border-radius:8px;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">✕</div>
      </div>
      <div id="oc-messages" style="flex:1;overflow-y:auto;padding:16px;min-height:0;"></div>
      <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.06);background:#0f172a;">
        <div style="display:flex;gap:8px;">
          <input id="oc-input" type="text" placeholder="Describe what you need changed..." style="
            flex:1;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);
            background:#1e293b;color:#fff;font-size:14px;outline:none;
            transition:border-color 0.2s;
          " onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'" />
          <button id="oc-send" style="
            padding:10px 16px;border-radius:12px;border:none;
            background:#3b82f6;color:#fff;font-weight:600;font-size:14px;
            cursor:pointer;transition:background 0.2s;white-space:nowrap;
          " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Make panel flex
    panel.style.display = "none";

    // Events
    btn.addEventListener("click", () => {
      isOpen = !isOpen;
      panel.style.display = isOpen ? "flex" : "none";
      if (isOpen) {
        renderMessages();
        scrollToBottom();
        document.getElementById("oc-input").focus();
        startPolling();
      } else {
        stopPolling();
      }
    });

    document.getElementById("oc-close").addEventListener("click", () => {
      isOpen = false;
      panel.style.display = "none";
      stopPolling();
    });

    const input = document.getElementById("oc-input");
    const sendBtn = document.getElementById("oc-send");

    function handleSend() {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendMessage(text);
    }

    sendBtn.addEventListener("click", handleSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(loadMessages, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Init
  verify();
})();
