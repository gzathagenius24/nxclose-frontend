/**
 * NexClose AI Chat Widget
 * Drop this <script> tag at the bottom of nexclose.html just before </body>
 *
 * <script src="nexclose-chat.js"></script>
 *
 * It injects a floating chat button + panel into any page automatically.
 * Connects to your Railway API at the NEXCLOSE_API_URL you configure below.
 */

(function () {
  // ── CONFIG ─────────────────────────────────────────────────────────
  const API_URL   = window.NEXCLOSE_API_URL || 'https://nexclose-backend.up.railway.app';
  const ENDPOINT  = `${API_URL}/api/chat/support`;
  const BOT_NAME  = 'NexClose AI';
  const TAGLINE   = 'Ask me anything about NexClose';

  // ── STATE ──────────────────────────────────────────────────────────
  let isOpen    = false;
  let messages  = [];
  let isTyping  = false;

  // ── STYLES ────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@700&display=swap');

    #nc-chat-root * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }

    /* ── TRIGGER BUTTON ── */
    #nc-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 9999;
      width: 60px; height: 60px; border-radius: 50%;
      background: #0d0e13;
      border: 2px solid #c9a84c;
      box-shadow: 0 8px 32px rgba(13,14,19,0.35), 0 0 0 0 rgba(201,168,76,0.4);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.25s, box-shadow 0.25s;
      animation: nc-pulse 3s infinite;
    }
    #nc-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 40px rgba(13,14,19,0.4), 0 0 0 8px rgba(201,168,76,0.15);
    }
    #nc-chat-btn svg { transition: transform 0.3s; }
    #nc-chat-btn.open svg { transform: rotate(45deg); }

    @keyframes nc-pulse {
      0%,100% { box-shadow: 0 8px 32px rgba(13,14,19,0.35), 0 0 0 0 rgba(201,168,76,0.4); }
      50%      { box-shadow: 0 8px 32px rgba(13,14,19,0.35), 0 0 0 10px rgba(201,168,76,0); }
    }

    /* ── NOTIFICATION DOT ── */
    #nc-chat-dot {
      position: absolute; top: 2px; right: 2px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #c9a84c; border: 2px solid #0d0e13;
      animation: nc-blink 2s infinite;
    }
    @keyframes nc-blink {
      0%,100% { opacity: 1; } 50% { opacity: 0.4; }
    }

    /* ── CHAT PANEL ── */
    #nc-chat-panel {
      position: fixed; bottom: 100px; right: 28px; z-index: 9998;
      width: 380px; height: 540px;
      background: #fdfbf7;
      border: 1px solid rgba(201,168,76,0.3);
      border-radius: 16px;
      box-shadow: 0 32px 80px rgba(13,14,19,0.2), 0 8px 24px rgba(13,14,19,0.1);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      opacity: 0; pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
      transform-origin: bottom right;
    }
    #nc-chat-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    /* ── PANEL HEADER ── */
    #nc-chat-header {
      background: #0d0e13; padding: 16px 18px;
      display: flex; align-items: center; gap: 12px;
      flex-shrink: 0;
    }
    .nc-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #c9a84c, #8a6820);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Playfair Display', serif;
      font-size: 15px; font-weight: 700; color: #0d0e13;
      flex-shrink: 0; position: relative;
    }
    .nc-avatar::after {
      content: '';
      position: absolute; bottom: 1px; right: 1px;
      width: 9px; height: 9px; border-radius: 50%;
      background: #22c55e; border: 2px solid #0d0e13;
    }
    .nc-header-info { flex: 1; }
    .nc-header-name {
      font-family: 'Playfair Display', serif;
      font-size: 15px; font-weight: 700; color: #f7f4ee;
    }
    .nc-header-tag {
      font-size: 11px; color: rgba(247,244,238,0.5);
      margin-top: 1px;
    }
    #nc-chat-close {
      background: none; border: none; cursor: pointer;
      color: rgba(247,244,238,0.4); padding: 4px;
      border-radius: 6px; transition: color 0.2s, background 0.2s;
      line-height: 1; display: flex;
    }
    #nc-chat-close:hover { color: #f7f4ee; background: rgba(255,255,255,0.08); }

    /* ── MESSAGES AREA ── */
    #nc-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
      scroll-behavior: smooth;
    }
    #nc-chat-messages::-webkit-scrollbar { width: 4px; }
    #nc-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #nc-chat-messages::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 4px; }

    /* ── MESSAGE BUBBLES ── */
    .nc-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
    .nc-msg.user { flex-direction: row-reverse; }

    .nc-msg-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      flex-shrink: 0; display: flex; align-items: center;
      justify-content: center; font-size: 11px; font-weight: 700;
      margin-bottom: 2px;
    }
    .nc-msg.bot .nc-msg-avatar {
      background: linear-gradient(135deg, #c9a84c, #8a6820);
      color: #0d0e13;
    }
    .nc-msg.user .nc-msg-avatar {
      background: #0d0e13; color: #c9a84c;
    }

    .nc-bubble {
      padding: 10px 14px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.6; max-width: 260px;
      word-wrap: break-word;
    }
    .nc-msg.bot .nc-bubble {
      background: white;
      border: 1px solid rgba(201,168,76,0.15);
      border-bottom-left-radius: 4px;
      color: #1a1c23;
      box-shadow: 0 2px 8px rgba(13,14,19,0.06);
    }
    .nc-msg.user .nc-bubble {
      background: #0d0e13; color: #f7f4ee;
      border-bottom-right-radius: 4px;
    }
    .nc-msg-time {
      font-size: 10px; color: #9ca3af; margin-top: 2px;
      padding: 0 4px;
    }
    .nc-msg.user .nc-msg-time { text-align: right; }

    /* ── TYPING INDICATOR ── */
    .nc-typing .nc-bubble {
      background: white; border: 1px solid rgba(201,168,76,0.15);
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
    }
    .nc-dots { display: flex; gap: 4px; align-items: center; }
    .nc-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #c9a84c; animation: nc-bounce 1.2s infinite;
    }
    .nc-dot:nth-child(2) { animation-delay: 0.2s; }
    .nc-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nc-bounce {
      0%,60%,100% { transform: translateY(0); opacity: 0.4; }
      30%          { transform: translateY(-6px); opacity: 1; }
    }

    /* ── QUICK REPLIES ── */
    #nc-quick-replies {
      padding: 0 16px 10px; display: flex; flex-wrap: wrap; gap: 6px;
    }
    .nc-quick {
      background: white; border: 1px solid rgba(201,168,76,0.3);
      color: #0d0e13; border-radius: 100px; padding: 5px 13px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: all 0.2s; white-space: nowrap;
      font-family: 'DM Sans', sans-serif;
    }
    .nc-quick:hover {
      background: #0d0e13; color: #c9a84c; border-color: #0d0e13;
    }

    /* ── INPUT AREA ── */
    #nc-chat-footer {
      padding: 12px 14px; border-top: 1px solid rgba(201,168,76,0.12);
      background: white; flex-shrink: 0;
    }
    #nc-chat-form {
      display: flex; gap: 8px; align-items: center;
    }
    #nc-chat-input {
      flex: 1; border: 1px solid rgba(201,168,76,0.25);
      border-radius: 100px; padding: 9px 16px;
      font-size: 13.5px; font-family: 'DM Sans', sans-serif;
      background: #fdfbf7; color: #0d0e13;
      outline: none; transition: border-color 0.2s;
      resize: none;
    }
    #nc-chat-input:focus { border-color: #c9a84c; }
    #nc-chat-input::placeholder { color: #9ca3af; }
    #nc-chat-send {
      width: 38px; height: 38px; border-radius: 50%;
      background: #0d0e13; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.2s, transform 0.15s;
    }
    #nc-chat-send:hover { background: #3d5c4a; transform: scale(1.05); }
    #nc-chat-send:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }

    /* ── BRANDING FOOTER ── */
    .nc-brand {
      text-align: center; padding: 6px 0 2px;
      font-size: 10px; color: #c9a84c;
      letter-spacing: 0.05em;
    }

    /* ── MOBILE ── */
    @media (max-width: 480px) {
      #nc-chat-panel { width: calc(100vw - 20px); right: 10px; bottom: 90px; }
      #nc-chat-btn   { bottom: 16px; right: 16px; }
    }
  `;

  // ── DOM BUILDER ────────────────────────────────────────────────────
  function buildWidget() {
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Root container
    const root = document.createElement('div');
    root.id = 'nc-chat-root';

    // Chat panel
    root.innerHTML = `
      <div id="nc-chat-panel">
        <div id="nc-chat-header">
          <div class="nc-avatar">N</div>
          <div class="nc-header-info">
            <div class="nc-header-name">${BOT_NAME}</div>
            <div class="nc-header-tag">${TAGLINE}</div>
          </div>
          <button id="nc-chat-close" title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="nc-chat-messages"></div>

        <div id="nc-quick-replies">
          <button class="nc-quick" data-q="How does pricing work?">💰 Pricing</button>
          <button class="nc-quick" data-q="Who is NexClose for?">👥 Who it's for</button>
          <button class="nc-quick" data-q="Is there a free trial?">🎯 Free trial</button>
          <button class="nc-quick" data-q="How does e-signing work?">✍️ E-Sign</button>
        </div>

        <div id="nc-chat-footer">
          <form id="nc-chat-form">
            <input id="nc-chat-input" type="text" placeholder="Ask me anything..." maxlength="500" autocomplete="off"/>
            <button type="submit" id="nc-chat-send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f7f4ee" stroke-width="2.5" stroke-linecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          <div class="nc-brand">Powered by NexClose AI</div>
        </div>
      </div>

      <button id="nc-chat-btn" title="Chat with us">
        <div id="nc-chat-dot"></div>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    `;

    document.body.appendChild(root);
  }

  // ── RENDER MESSAGES ────────────────────────────────────────────────
  function renderMessages() {
    const container = document.getElementById('nc-chat-messages');
    container.innerHTML = '';

    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `nc-msg ${msg.role}`;

      const initials = msg.role === 'bot' ? 'N' : 'Me';
      const timeStr  = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      div.innerHTML = `
        <div class="nc-msg-avatar">${initials}</div>
        <div>
          <div class="nc-bubble">${escapeHtml(msg.content)}</div>
          <div class="nc-msg-time">${timeStr}</div>
        </div>
      `;
      container.appendChild(div);
    });

    if (isTyping) {
      const typing = document.createElement('div');
      typing.className = 'nc-msg bot nc-typing';
      typing.innerHTML = `
        <div class="nc-msg-avatar">N</div>
        <div class="nc-bubble">
          <div class="nc-dots">
            <div class="nc-dot"></div>
            <div class="nc-dot"></div>
            <div class="nc-dot"></div>
          </div>
        </div>
      `;
      container.appendChild(typing);
    }

    container.scrollTop = container.scrollHeight;
  }

  // ── SEND MESSAGE ──────────────────────────────────────────────────
  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;

    // Hide quick replies after first message
    document.getElementById('nc-quick-replies').style.display = 'none';

    messages.push({ role: 'user', content: text, ts: Date.now() });
    isTyping = true;
    renderMessages();

    // Clear input
    document.getElementById('nc-chat-input').value = '';
    document.getElementById('nc-chat-send').disabled = true;

    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: messages.map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }))
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm having trouble connecting right now. Please try again shortly.";
      messages.push({ role: 'bot', content: reply, ts: Date.now() });
    } catch {
      messages.push({ role: 'bot', content: "I'm having trouble connecting right now. Please email hello@nexclose.com and we'll get back to you!", ts: Date.now() });
    }

    isTyping = false;
    document.getElementById('nc-chat-send').disabled = false;
    renderMessages();
  }

  // ── TOGGLE PANEL ──────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    const panel = document.getElementById('nc-chat-panel');
    const btn   = document.getElementById('nc-chat-btn');
    const dot   = document.getElementById('nc-chat-dot');

    panel.classList.toggle('open', isOpen);
    btn.classList.toggle('open', isOpen);

    // Hide notification dot once opened
    if (isOpen) {
      dot.style.display = 'none';
      document.getElementById('nc-chat-input').focus();

      // Show welcome message on first open
      if (messages.length === 0) {
        setTimeout(() => {
          messages.push({
            role: 'bot',
            content: "👋 Hi! I'm the NexClose AI assistant. I can answer questions about our platform, pricing, and how it works for loan officers and real estate agents. What would you like to know?",
            ts: Date.now()
          });
          renderMessages();
        }, 300);
      }
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  // ── INIT ──────────────────────────────────────────────────────────
  function init() {
    buildWidget();

    // Event listeners
    document.getElementById('nc-chat-btn').addEventListener('click', toggleChat);
    document.getElementById('nc-chat-close').addEventListener('click', toggleChat);

    document.getElementById('nc-chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(document.getElementById('nc-chat-input').value.trim());
    });

    document.getElementById('nc-chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(e.target.value.trim());
      }
    });

    // Quick reply buttons
    document.querySelectorAll('.nc-quick').forEach(btn => {
      btn.addEventListener('click', () => sendMessage(btn.dataset.q));
    });
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
