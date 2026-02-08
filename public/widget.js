(function() {
  const script = document.currentScript;
  const SITE_ID = script.getAttribute('data-site-id') || 'default';
  const ACCENT = script.getAttribute('data-accent') || '#10b981';
  const CONVEX_URL = script.getAttribute('data-convex-url') || 'https://little-echidna-115.convex.site';

  const SESSION_KEY = 'orion_chat_session';
  const CONVO_KEY = 'orion_chat_convo_' + SITE_ID;

  function getSessionId() {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) { s = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(SESSION_KEY, s); }
    return s;
  }

  const sessionId = getSessionId();
  let conversationId = localStorage.getItem(CONVO_KEY) || null;
  let messages = [];
  let isOpen = false;
  let pollTimer = null;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #orion-chat-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:${ACCENT};cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,.4);z-index:999998;transition:transform .2s;animation:orion-pulse 2s infinite}
    #orion-chat-bubble:hover{transform:scale(1.1)}
    #orion-chat-bubble svg{width:28px;height:28px;fill:#fff}
    @keyframes orion-pulse{0%,100%{box-shadow:0 0 0 0 ${ACCENT}44}50%{box-shadow:0 0 0 12px ${ACCENT}00}}
    #orion-chat-panel{position:fixed;bottom:24px;right:24px;width:380px;height:500px;background:#111;border:1px solid #222;border-radius:16px;z-index:999999;display:none;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);font-family:-apple-system,system-ui,sans-serif;animation:orion-slide .25s ease}
    @keyframes orion-slide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .orion-header{display:flex;align-items:center;justify-content:space-between;padding:16px;background:#0a0a0a;border-bottom:1px solid #222}
    .orion-header h3{margin:0;font-size:15px;color:#fff;font-weight:600}
    .orion-header button{background:none;border:none;color:#666;cursor:pointer;font-size:20px;padding:0 4px}
    .orion-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
    .orion-msg{max-width:75%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.4;word-wrap:break-word}
    .orion-msg.visitor{align-self:flex-end;background:${ACCENT};color:#fff;border-bottom-right-radius:4px}
    .orion-msg.agent{align-self:flex-start;background:#1a1a1a;color:#e5e5e5;border-bottom-left-radius:4px}
    .orion-input{display:flex;padding:12px;gap:8px;border-top:1px solid #222;background:#0a0a0a}
    .orion-input input{flex:1;background:#1a1a1a;border:1px solid #333;border-radius:10px;padding:10px 14px;color:#fff;font-size:13px;outline:none}
    .orion-input input:focus{border-color:${ACCENT}}
    .orion-input button{background:${ACCENT};border:none;border-radius:10px;padding:0 16px;cursor:pointer;color:#fff;font-weight:600;font-size:13px}
    .orion-footer{text-align:center;padding:6px;font-size:10px}
    .orion-footer a{color:#555;text-decoration:none}
    .orion-footer a:hover{color:${ACCENT}}
  `;
  document.head.appendChild(style);

  // Bubble
  const bubble = document.createElement('div');
  bubble.id = 'orion-chat-bubble';
  bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(bubble);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'orion-chat-panel';
  panel.innerHTML = `
    <div class="orion-header"><h3>💬 Chat with us</h3><button id="orion-close">✕</button></div>
    <div class="orion-messages" id="orion-msgs"></div>
    <div class="orion-input"><input id="orion-input" placeholder="Type a message..." /><button id="orion-send">Send</button></div>
    <div class="orion-footer"><a href="https://github.com/spinupstudiomvp-dev/orion-chat" target="_blank">Powered by Orión</a></div>
  `;
  document.body.appendChild(panel);

  const msgContainer = panel.querySelector('#orion-msgs');
  const input = panel.querySelector('#orion-input');
  const sendBtn = panel.querySelector('#orion-send');
  const closeBtn = panel.querySelector('#orion-close');

  function renderMessages() {
    msgContainer.innerHTML = '';
    messages.forEach(function(m) {
      const div = document.createElement('div');
      div.className = 'orion-msg ' + m.sender;
      div.textContent = m.text;
      msgContainer.appendChild(div);
    });
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function toggle() {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    bubble.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) { startPolling(); input.focus(); }
    else stopPolling();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    messages.push({ sender: 'visitor', text: text });
    renderMessages();

    try {
      const res = await fetch(CONVEX_URL + '/api/widget/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: SITE_ID,
          sessionId: sessionId,
          text: text,
          pageUrl: location.href,
          userAgent: navigator.userAgent
        })
      });
      const data = await res.json();
      if (data.conversationId && !conversationId) {
        conversationId = data.conversationId;
        localStorage.setItem(CONVO_KEY, conversationId);
      }
    } catch (e) { console.error('[OrionChat] Send error:', e); }
  }

  async function pollMessages() {
    if (!conversationId) return;
    try {
      const res = await fetch(CONVEX_URL + '/api/widget/messages?conversationId=' + conversationId);
      const data = await res.json();
      if (data.messages) {
        messages = data.messages.map(function(m) { return { sender: m.sender, text: m.text }; });
        renderMessages();
      }
    } catch (e) { console.error('[OrionChat] Poll error:', e); }
  }

  function startPolling() { pollMessages(); pollTimer = setInterval(pollMessages, 2500); }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  bubble.onclick = toggle;
  closeBtn.onclick = toggle;
  sendBtn.onclick = sendMessage;
  input.onkeydown = function(e) { if (e.key === 'Enter') sendMessage(); };

  // Restore conversation
  if (conversationId) { startPolling(); setTimeout(stopPolling, 5000); }
})();
