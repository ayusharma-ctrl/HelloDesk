// HelloDesk Live Chat Widget
// Embed: <div id="hellodesk-widget-root"></div><script src="YOUR_CLIENT_URL/widget-demo/widget.js" data-workspace-id="YOUR_WS_ID"></script>

(function () {
    const currentScript = (document.currentScript as HTMLScriptElement | null) || (document.querySelector('script[data-workspace-id]') as HTMLScriptElement | null);
    const workspaceId = currentScript?.getAttribute('data-workspace-id') ?? 'demo-workspace';
    const apiBase = (currentScript?.getAttribute('data-api-base') ?? 'http://localhost:3001').replace(/\/$/, '');
    const appHost = currentScript?.src ? new URL(currentScript.src).origin : 'http://localhost:3000';
    const rootId = 'hellodesk-widget-root';

    // Persistent visitor identity
    let visitorId = localStorage.getItem('hellodesk-visitor-id');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('hellodesk-visitor-id', visitorId);
    }

    let conversationId: string | null = localStorage.getItem('hellodesk-conversation-id');
    let emailFallbackSent = localStorage.getItem('hellodesk-email-fallback-sent') === 'true';
    let socket: any = null;
    let isTyping = false;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    let widgetVisible = false;
    let currentAssigneeName: string | null = null;
    let activeTheme = {
        primaryColor: '#2563eb',
        primaryHover: '#1d4ed8',
        accentColor: '#4f46e5',
        bgColor: '#f8fafc',
        cardBg: '#ffffff',
    };

    // ─── Load Socket.IO ────────────────────────────────────────────────
    function loadSocketIO(): Promise<void> {
        return new Promise((resolve) => {
            if ((window as any).io) return resolve();
            const s = document.createElement('script');
            s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            s.onload = () => resolve();
            document.head.appendChild(s);
        });
    }

    // ─── Render message bubble ─────────────────────────────────────────
    function renderMessage(msg: { body: string; senderType: string; readAt?: string | null; createdAt?: string; attachments?: any; mediaType?: string }): HTMLElement {
        const isAgent = msg.senderType === 'agent';
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `display:flex;flex-direction:column;align-self:${isAgent ? 'flex-start' : 'flex-end'};max-width:85%;`;

        const bubble = document.createElement('div');
        bubble.style.cssText = `padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.45;word-break:break-word;${isAgent
            ? 'background:#e2e8f0;color:#0f172a;border-bottom-left-radius:4px;'
            : `background:${activeTheme.primaryColor};color:#fff;border-bottom-right-radius:4px;`
            }`;

        let attachments = [];
        try {
            attachments = Array.isArray(msg.attachments) ? msg.attachments : (typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : []);
        } catch (e) { }
        if (attachments.length > 0) {
            attachments.forEach((att: any) => {
                const url = typeof att === 'string' ? att : att.url;
                if (url) {
                    if (msg.mediaType === 'image' || url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = 'Attachment';
                        img.style.cssText = 'max-width:100%;border-radius:8px;margin-bottom:6px;display:block;';
                        bubble.appendChild(img);
                    } else {
                        const fileLink = document.createElement('a');
                        fileLink.href = url;
                        fileLink.target = '_blank';
                        fileLink.style.cssText = isAgent ? 'color:#2563eb;text-decoration:underline;display:block;margin-bottom:4px;' : 'color:#fff;text-decoration:underline;display:block;margin-bottom:4px;';
                        fileLink.textContent = `📎 ${att.name || 'View Attachment'}`;
                        bubble.appendChild(fileLink);
                    }
                }
            });
            if (msg.body && !msg.body.startsWith('[Attachment:')) {
                const txt = document.createElement('div');
                txt.textContent = msg.body;
                bubble.appendChild(txt);
            }
        } else {
            bubble.textContent = msg.body;
        }

        wrapper.appendChild(bubble);

        const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

        const footer = document.createElement('div');
        footer.style.cssText = `font-size:10px;margin-top:4px;display:flex;gap:6px;align-items:center;${isAgent ? 'color:#94a3b8;justify-content:flex-start;' : 'color:#93c5fd;justify-content:flex-end;'}`;
        footer.innerHTML = `<span>${timeStr}</span>`;

        if (!isAgent && msg.readAt) {
            footer.innerHTML += `<span style="font-weight:600;font-style:italic;">✓ Seen</span>`;
        }

        wrapper.appendChild(footer);
        return wrapper;
    }

    // ─── Init Widget ───────────────────────────────────────────────────
    async function initWidget() {
        await loadSocketIO();

        let root = document.getElementById(rootId);
        if (!root) {
            root = document.createElement('div');
            root.id = rootId;
            document.body.appendChild(root);
        }

        Object.assign(root.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '999999',
            fontFamily: 'system-ui,-apple-system,sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '12px',
        });

        // ── Chat Panel ─────────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.style.cssText = `
            width: min(350px, calc(100vw - 32px));
            height: min(560px, calc(100vh - 100px));
            background: #fff;
            box-shadow: 0 20px 40px -8px rgba(0,0,0,0.18);
            border-radius: 16px;
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            transform: translateY(16px);
            opacity: 0;
            transition: transform 0.25s ease, opacity 0.25s ease;
        `;

        panel.innerHTML = `
          <div id="hd-header" style="background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div>
              <div style="font-weight:700;font-size:17px;">HelloDesk Support</div>
              <div id="hd-presence" style="font-size:12px;opacity:0.85;margin-top:2px;">Checking availability...</div>
            </div>
            <button id="hd-minimize" aria-label="Minimize chat" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">−</button>
          </div>

          <div id="hd-no-agents-banner" style="display:none;background:#fffbeb;color:#b45309;padding:10px 14px;font-size:13px;border-bottom:1px solid #fef3c7;text-align:center;flex-shrink:0;">
            All agents are currently away.
            <a href="#" id="hd-email-fallback-btn" style="color:#b45309;font-weight:600;text-decoration:underline;margin-left:4px;">Leave an email instead</a>
          </div>

          <div id="hd-queue-banner" style="display:none;background:#fffbeb;color:#b45309;padding:10px 14px;font-size:13px;border-bottom:1px solid #fef3c7;text-align:center;flex-shrink:0;">
            You're <strong id="hd-queue-pos">#1</strong> in queue — estimated wait: <span id="hd-queue-time">2</span> min
          </div>

          <div id="hd-messages" style="flex:1;padding:16px;overflow-y:auto;background:#f8fafc;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;">
            <div id="hd-greeting" style="align-self:flex-start;max-width:85%;">
              <div style="padding:10px 14px;border-radius:12px;border-bottom-left-radius:4px;background:#e2e8f0;color:#0f172a;font-size:14px;line-height:1.45;">
                👋 Hi there! How can we help you today?
              </div>
            </div>
          </div>

          <div id="hd-typing-indicator" style="display:none;padding:6px 16px;background:#f8fafc;font-size:12px;color:#64748b;font-style:italic;flex-shrink:0;">Agent is typing…</div>

          <div id="hd-kb-suggestions" style="display:none;padding:10px 14px;background:#fff;border-top:1px solid #e2e8f0;max-height:120px;overflow-y:auto;flex-shrink:0;">
            <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;text-transform:uppercase;font-weight:600;">Suggested Articles</p>
            <ul id="hd-kb-list" style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;"></ul>
          </div>

          <div id="hd-chat-input-area" style="padding:12px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <input id="hd-input" type="text" placeholder="Type a message..." style="flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;outline:none;font-size:14px;transition:border 0.2s;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'" />
            <button id="hd-send" style="background:#2563eb;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Send</button>
          </div>

          <div id="hd-email-fallback-area" style="display:none;padding:16px;background:#fff;border-top:1px solid #e2e8f0;flex-direction:column;gap:10px;flex-shrink:0;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#334155;">Leave us your email and we'll follow up.</p>
            <input id="hd-email-input" type="email" placeholder="Your email address" style="padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;width:100%;box-sizing:border-box;" />
            <textarea id="hd-email-body" placeholder="How can we help?" rows="3" style="padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;outline:none;width:100%;box-sizing:border-box;resize:none;font-family:inherit;"></textarea>
            <div style="display:flex;gap:8px;">
              <button id="hd-email-cancel" style="flex:1;background:#f1f5f9;color:#475569;border:none;padding:10px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;">Cancel</button>
              <button id="hd-email-submit" style="flex:1;background:#2563eb;color:#fff;border:none;padding:10px;border-radius:6px;font-weight:600;cursor:pointer;font-size:14px;transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Send Email</button>
            </div>
          </div>
          
          <div id="hd-email-success-area" style="display:none;padding:16px;text-align:center;color:#15803d;background:#f0fdf4;border-top:1px solid #bbf7d0;font-size:13px;flex-shrink:0;">
            <p style="margin:0 0 8px;font-weight:600;">We have received your query and our team will reply to your email in the next 24hrs.</p>
            <button id="hd-reset-chat-btn" style="background:#2563eb;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Send another message</button>
          </div>
        `;

        // ── FAB Toggle Button ──────────────────────────────────────────
        const fab = document.createElement('button');
        fab.setAttribute('aria-label', 'Open chat');
        fab.style.cssText = `
            width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#4f46e5);
            color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(37,99,235,0.4);
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.2s,box-shadow 0.2s;flex-shrink:0;
        `;
        fab.innerHTML = '💬';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 6px 24px rgba(37,99,235,0.5)'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 16px rgba(37,99,235,0.4)'; };

        root.appendChild(panel);
        root.appendChild(fab);

        // ── Refs ───────────────────────────────────────────────────────
        const messagesEl = panel.querySelector('#hd-messages') as HTMLDivElement;
        const inputEl = panel.querySelector('#hd-input') as HTMLInputElement;
        const sendBtn = panel.querySelector('#hd-send') as HTMLButtonElement;
        const presenceEl = panel.querySelector('#hd-presence') as HTMLElement;
        const typingIndicator = panel.querySelector('#hd-typing-indicator') as HTMLDivElement;
        const queueBanner = panel.querySelector('#hd-queue-banner') as HTMLDivElement;
        const queuePosEl = panel.querySelector('#hd-queue-pos') as HTMLElement;
        const queueTimeEl = panel.querySelector('#hd-queue-time') as HTMLElement;
        const noAgentsBanner = panel.querySelector('#hd-no-agents-banner') as HTMLDivElement;
        const fallbackBtn = panel.querySelector('#hd-email-fallback-btn') as HTMLAnchorElement;
        const chatInputArea = panel.querySelector('#hd-chat-input-area') as HTMLDivElement;
        const emailFallbackArea = panel.querySelector('#hd-email-fallback-area') as HTMLDivElement;
        const emailCancelBtn = panel.querySelector('#hd-email-cancel') as HTMLButtonElement;
        const emailSubmitBtn = panel.querySelector('#hd-email-submit') as HTMLButtonElement;
        const emailInput = panel.querySelector('#hd-email-input') as HTMLInputElement;
        const emailBodyEl = panel.querySelector('#hd-email-body') as HTMLTextAreaElement;
        const emailSuccessArea = panel.querySelector('#hd-email-success-area') as HTMLDivElement;
        const resetChatBtn = panel.querySelector('#hd-reset-chat-btn') as HTMLButtonElement;
        const kbSuggestionsEl = panel.querySelector('#hd-kb-suggestions') as HTMLDivElement;
        const kbListEl = panel.querySelector('#hd-kb-list') as HTMLUListElement;
        const minimizeBtn = panel.querySelector('#hd-minimize') as HTMLButtonElement;

        // Apply email fallback sent block
        if (emailFallbackSent) {
            chatInputArea.style.display = 'none';
            emailSuccessArea.style.display = 'block';
        }

        resetChatBtn?.addEventListener('click', () => {
            localStorage.removeItem('hellodesk-email-fallback-sent');
            emailFallbackSent = false;
            emailSuccessArea.style.display = 'none';
            chatInputArea.style.display = 'flex';
        });

        function markMessagesAsRead() {
            if (conversationId && widgetVisible) {
                fetch(`${apiBase}/api/v1/widget/messages/read`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId, visitorId })
                }).catch(() => {});
            }
        }

        // ── Toggle open/close ──────────────────────────────────────────
        function openPanel() {
            widgetVisible = true;
            panel.style.display = 'flex';
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
            fab.innerHTML = '✕';
            fab.setAttribute('aria-label', 'Close chat');
            void updateStatus();
            markMessagesAsRead();
        }

        function closePanel() {
            widgetVisible = false;
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(16px)';
            setTimeout(() => { panel.style.display = 'none'; }, 260);
            fab.innerHTML = '💬';
            fab.setAttribute('aria-label', 'Open chat');
        }

        fab.addEventListener('click', () => widgetVisible ? closePanel() : openPanel());
        minimizeBtn.addEventListener('click', closePanel);

        // ── Socket.IO connection ───────────────────────────────────────
        socket = (window as any).io(apiBase, {
            transports: ['websocket'],
            auth: { type: 'visitor', visitorId, workspaceId }
        });

        // Fetch initial status and theme on mount
        void updateStatus();

        socket.on('connect', () => {
            void updateStatus();
        });

        socket.on('message:created', (data: any) => {
            // Full refresh to get accurate readAt, avoid duplicates, and apply theme correctly
            if (data.message?.senderType === 'agent' && !data.message?.isAiDraft) {
                void updateStatus();
                if (widgetVisible) {
                    markMessagesAsRead();
                }
            }
        });

        socket.on('message:read', (data: any) => {
            if (data.conversationId === conversationId || !conversationId) {
                void updateStatus();
            }
        });

        socket.on('presence:changed', (data: any) => {
            if (data.workspaceId === workspaceId) {
                void updateStatus();
            }
        });

        socket.on('typing:started', () => { typingIndicator.style.display = 'block'; });
        socket.on('typing:stopped', () => { typingIndicator.style.display = 'none'; });

        socket.on('conversation:updated', (data: any) => {
            if (data.conversationId === conversationId || data.conversation?.id === conversationId || data.conversation?.contact?.visitorId === visitorId) {
                if (!conversationId && data.conversation?.id) {
                    conversationId = String(data.conversation.id);
                    localStorage.setItem('hellodesk-conversation-id', conversationId);
                }
                void updateStatus();
            }
        });

        socket.on('agent:joined', (data: any) => {
            if (data.conversationId === conversationId) {
                const pill = document.createElement('div');
                pill.style.cssText = 'align-self:center;padding:4px 12px;background:#e0f2fe;color:#0369a1;border-radius:99px;font-size:11px;font-weight:600;margin:6px 0;border:1px solid #bae6fd;';
                pill.textContent = `✅ ${data.agentName} has joined the conversation`;
                messagesEl.appendChild(pill);
                messagesEl.scrollTop = messagesEl.scrollHeight;
                // Also refresh to show correct assignee in header
                void updateStatus();
            }
        });

        // ── Email Fallback ─────────────────────────────────────────────
        fallbackBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            chatInputArea.style.display = 'none';
            emailFallbackArea.style.display = 'flex';
        });

        emailCancelBtn.addEventListener('click', () => {
            emailFallbackArea.style.display = 'none';
            chatInputArea.style.display = 'flex';
        });

        emailSubmitBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const body = emailBodyEl.value.trim();
            if (!email || !body) return;
            emailSubmitBtn.disabled = true;
            emailSubmitBtn.textContent = 'Sending…';
            await fetch(`${apiBase}/api/v1/widget/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, visitorId, email, body })
            });

            localStorage.setItem('hellodesk-email-fallback-sent', 'true');
            emailFallbackSent = true;
            emailFallbackArea.style.display = 'none';
            emailSuccessArea.style.display = 'block';

            setTimeout(() => { closePanel(); }, 4000);
        });

        function applyWidgetTheme(themeData: any) {
            if (!themeData) return;
            try {
                if (typeof themeData === 'string') themeData = JSON.parse(themeData);
            } catch (e) { }
            activeTheme = { ...activeTheme, ...themeData };

            if (panel) {
                panel.style.background = activeTheme.cardBg || '#ffffff';
            }

            const headerEl = panel.querySelector('#hd-header') as HTMLElement;
            if (headerEl) {
                headerEl.style.background = `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`;
            }
            fab.style.background = `linear-gradient(135deg, ${activeTheme.primaryColor}, ${activeTheme.accentColor})`;
            fab.style.boxShadow = `0 4px 16px ${activeTheme.primaryColor}66`;

            if (messagesEl) {
                messagesEl.style.background = activeTheme.bgColor || '#f8fafc';
            }

            if (sendBtn) {
                sendBtn.style.background = activeTheme.primaryColor;
                sendBtn.onmouseover = () => { sendBtn.style.background = activeTheme.primaryHover; };
                sendBtn.onmouseout = () => { sendBtn.style.background = activeTheme.primaryColor; };
            }

            if (emailSubmitBtn) {
                emailSubmitBtn.style.background = activeTheme.primaryColor;
            }
            if (resetChatBtn) {
                resetChatBtn.style.background = activeTheme.primaryColor;
            }

            if (inputEl) {
                inputEl.onfocus = () => { inputEl.style.borderColor = activeTheme.primaryColor; };
            }
        }

        // ── Fetch & display status / history ──────────────────────────
        async function updateStatus() {
            let isAgentsOnline = false;
            try {
                const agentRes = await fetch(`${apiBase}/api/v1/widget/status?workspaceId=${workspaceId}`);
                if (agentRes.ok) {
                    const { online, theme: wsTheme } = await agentRes.json();
                    isAgentsOnline = Boolean(online);
                    if (wsTheme) {
                        applyWidgetTheme(wsTheme);
                    }
                }
            } catch {
                isAgentsOnline = false;
            }

            if (!conversationId) {
                presenceEl.textContent = isAgentsOnline ? '🟢 Team online' : '⚪ We are away';
                noAgentsBanner.style.display = isAgentsOnline ? 'none' : 'block';
                queueBanner.style.display = 'none';
                return;
            }

            try {
                const res = await fetch(`${apiBase}/api/v1/widget/history?conversationId=${conversationId}&visitorId=${visitorId}`);
                if (!res.ok) return;
                const data = await res.json();

                currentAssigneeName = data.assigneeName ?? null;

                // Rehydrate messages
                while (messagesEl.children.length > 1) messagesEl.removeChild(messagesEl.lastChild!);
                data.messages?.forEach((m: any) => messagesEl.appendChild(renderMessage(m)));

                if (data.status === 'resolved') {
                    chatInputArea.style.display = 'none';
                    queueBanner.style.display = 'none';
                    noAgentsBanner.style.display = 'none';
                    presenceEl.textContent = '⚪ Resolved';

                    const resolvedMsg = document.createElement('div');
                    resolvedMsg.style.cssText = 'padding:14px;text-align:center;font-size:13px;color:#334155;font-weight:500;background:#f1f5f9;border-radius:12px;margin:10px 0;border:1px solid #e2e8f0;';

                    if (data.rating) {
                        resolvedMsg.innerHTML = `
                            <div style="font-weight:700;margin-bottom:4px;color:#0f172a;">This conversation has been resolved.</div>
                            <div style="color:#d97706;font-weight:700;font-size:14px;margin:4px 0;">${'⭐'.repeat(data.rating)} (${data.rating}/5)</div>
                            ${data.ratingFeedback ? `<div style="font-style:italic;color:#64748b;font-size:12px;margin-top:2px;">"${data.ratingFeedback}"</div>` : ''}
                            <button id="hd-new-chat-btn" style="margin-top:10px;background:${activeTheme.primaryColor};color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Start New Conversation</button>
                        `;
                    } else {
                        resolvedMsg.innerHTML = `
                            <div style="font-weight:700;margin-bottom:6px;color:#0f172a;">This conversation has been resolved.</div>
                            <div style="font-size:12px;color:#64748b;margin-bottom:8px;">How was your support experience?</div>
                            <div id="hd-star-rating" style="display:flex;justify-content:center;gap:6px;font-size:20px;cursor:pointer;margin-bottom:8px;">
                                <span data-star="1">⭐</span>
                                <span data-star="2">⭐</span>
                                <span data-star="3">⭐</span>
                                <span data-star="4">⭐</span>
                                <span data-star="5">⭐</span>
                            </div>
                            <input id="hd-rating-feedback" type="text" placeholder="Optional feedback..." style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;margin-bottom:8px;box-sizing:border-box;outline:none;" />
                            <button id="hd-submit-rating-btn" style="background:${activeTheme.primaryColor};color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;width:100%;">Submit Feedback</button>
                            <button id="hd-new-chat-btn" style="margin-top:8px;background:transparent;color:#64748b;border:1px solid #cbd5e1;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;width:100%;">Start New Conversation</button>
                        `;
                    }

                    messagesEl.appendChild(resolvedMsg);

                    let selectedRating = 5;
                    const starContainer = resolvedMsg.querySelector('#hd-star-rating');
                    if (starContainer) {
                        starContainer.querySelectorAll('span').forEach((starEl, index) => {
                            starEl.addEventListener('click', () => {
                                selectedRating = index + 1;
                                starContainer.querySelectorAll('span').forEach((s, idx) => {
                                    s.style.opacity = idx <= index ? '1' : '0.3';
                                });
                            });
                        });
                    }

                    const submitRatingBtn = resolvedMsg.querySelector('#hd-submit-rating-btn');
                    submitRatingBtn?.addEventListener('click', async () => {
                        const feedbackInput = resolvedMsg.querySelector('#hd-rating-feedback') as HTMLInputElement | null;
                        const feedbackOption = feedbackInput?.value.trim() || undefined;
                        try {
                            await fetch(`${apiBase}/api/v1/conversations/${conversationId}/rate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ rating: selectedRating, feedbackOption })
                            });
                        } catch { /* ignore */ }
                        void updateStatus();
                    });

                    const newChatBtn = resolvedMsg.querySelector('#hd-new-chat-btn');
                    newChatBtn?.addEventListener('click', () => {
                        localStorage.removeItem('hellodesk-conversation-id');
                        conversationId = null;
                        currentAssigneeName = null;
                        while (messagesEl.children.length > 1) messagesEl.removeChild(messagesEl.lastChild!);
                        chatInputArea.style.display = 'flex';
                        void updateStatus();
                    });
                } else if (data.status === 'open') {
                    presenceEl.textContent = data.assigneeName ? `🟢 ${data.assigneeName}` : (isAgentsOnline ? '🟢 Agents available' : '⚪ We are away');
                    noAgentsBanner.style.display = 'none';
                    queueBanner.style.display = 'none';
                    chatInputArea.style.display = 'flex';
                } else if (data.status === 'pending') {
                    noAgentsBanner.style.display = 'none';
                    queueBanner.style.display = 'block';
                    queuePosEl.textContent = `#${data.position ?? '1'}`;
                    queueTimeEl.textContent = `${Math.max(1, Math.ceil((data.estimatedWaitSeconds ?? 120) / 60))}`;
                    presenceEl.textContent = '🟡 Waiting for agent...';
                    chatInputArea.style.display = 'flex';
                } else {
                    presenceEl.textContent = isAgentsOnline ? '🟢 Agents available' : '⚪ We are away';
                    noAgentsBanner.style.display = isAgentsOnline ? 'none' : 'block';
                    queueBanner.style.display = 'none';
                    chatInputArea.style.display = 'flex';
                }

                messagesEl.scrollTop = messagesEl.scrollHeight;
            } catch { /* ignore */ }
        }

        // ── Typing indicator & Debounced KB Suggestions ───────────────
        let kbDebounce: ReturnType<typeof setTimeout> | null = null;

        inputEl.addEventListener('input', () => {
            if (conversationId) {
                if (!isTyping) {
                    isTyping = true;
                    socket.emit('typing:start', { conversationId, visitorId });
                }
                if (typingTimeout) clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    isTyping = false;
                    socket.emit('typing:stop', { conversationId, visitorId });
                }, 2000);
            }

            // Only fetch KB suggestions if no agent is assigned yet
            if (!currentAssigneeName) {
                if (kbDebounce) clearTimeout(kbDebounce);
                kbDebounce = setTimeout(async () => {
                    const q = inputEl.value.trim();
                    if (q.length >= 3) {
                        try {
                            const res = await fetch(`${apiBase}/api/v1/widget/kb-suggestions?workspaceId=${workspaceId}&q=${encodeURIComponent(q)}`);
                            if (res.ok) {
                                const { articles } = await res.json();
                                if (articles && articles.length > 0) {
                                    kbSuggestionsEl.style.display = 'block';
                                    kbListEl.innerHTML = articles.slice(0, 2).map((a: any) =>
                                        `<li><a href="${appHost}/kb/article/${a.slug}?workspaceId=${encodeURIComponent(workspaceId)}" target="_blank" style="color:#2563eb;text-decoration:none;font-size:13px;display:block;padding:4px 0;font-weight:500;">📄 ${a.title}</a></li>`
                                    ).join('');
                                    return;
                                }
                            }
                        } catch { /* ignore */ }
                    }
                    kbSuggestionsEl.style.display = 'none';
                }, 600);
            } else {
                kbSuggestionsEl.style.display = 'none';
            }
        });

        // ── Send message ───────────────────────────────────────────────
        async function sendMessage() {
            const body = inputEl.value.trim();
            if (!body) return;
            inputEl.value = '';
            kbSuggestionsEl.style.display = 'none';

            messagesEl.appendChild(renderMessage({ body, senderType: 'contact' }));
            messagesEl.scrollTop = messagesEl.scrollHeight;

            if (!conversationId) {
                const res = await fetch(`${apiBase}/api/v1/widget/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceId, visitorId, body })
                });
                const data = await res.json();
                conversationId = data.conversation?.id ?? null;
                if (conversationId) {
                    localStorage.setItem('hellodesk-conversation-id', conversationId);
                    void updateStatus();
                }
            } else {
                await fetch(`${apiBase}/api/v1/widget/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId, visitorId, body })
                });
            }
        }

        sendBtn.addEventListener('click', () => { void sendMessage(); });
        inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') void sendMessage(); });
    }

    // Boot
    void initWidget();
})();
