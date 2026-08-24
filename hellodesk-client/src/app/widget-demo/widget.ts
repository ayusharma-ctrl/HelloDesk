// HelloDesk Live Chat Widget with Embedded Real-Time AI, Voice & Cloudinary File Uploads
// Embed: <div id="hellodesk-widget-root"></div><script src="YOUR_CLIENT_URL/widget-demo/widget.js" data-workspace-id="YOUR_WS_ID"></script>

(function () {
    // ── Singleton Guard & Cleanup ──────────────────────────────────────
    if (typeof window !== 'undefined') {
        if ((window as any).__HELLODESK_WIDGET_CLEANUP__) {
            try {
                (window as any).__HELLODESK_WIDGET_CLEANUP__();
            } catch (e) {}
        }
        const existingRoot = document.getElementById('hellodesk-widget-root');
        if (existingRoot) {
            existingRoot.remove();
        }
    }

    const currentScript = (document.currentScript as HTMLScriptElement | null) || (document.querySelector('script[data-workspace-id]') as HTMLScriptElement | null);
    const workspaceId = currentScript?.getAttribute('data-workspace-id') ?? 'demo-workspace';
    const apiBase = (currentScript?.getAttribute('data-api-base') ?? 'http://localhost:3001').replace(/\/$/, '');
    const rootId = 'hellodesk-widget-root';

    // Persistent visitor identity
    let visitorId = localStorage.getItem('hellodesk-visitor-id');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('hellodesk-visitor-id', visitorId);
    }

    let conversationId: string | null = localStorage.getItem('hellodesk-conversation-id');
    let socket: any = null;
    let widgetVisible = false;
    let unreadCount = 0;
    let currentAssigneeName: string | null = null;

    // Full-Screen Voice State
    let isVoiceActive = false;
    let mediaRecorder: MediaRecorder | null = null;
    let audioContext: AudioContext | null = null;
    let voiceSessionId = `widget_voice_${Date.now()}`;

    let activeTheme = {
        primaryColor: '#2563eb',
        primaryHover: '#1d4ed8',
        accentColor: '#4f46e5',
        bgColor: '#f8fafc',
        cardBg: '#ffffff',
    };

    const MIC_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;

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

    // ─── Browser Native Text-To-Speech (Natural Neural Voice) ───────────
    function stopAudioPlayback() {
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }
    }

    function speakText(text: string, onEnd?: () => void) {
        if (!('speechSynthesis' in window) || !text) {
            if (onEnd) onEnd();
            return;
        }
        try {
            window.speechSynthesis.cancel();
            // Clean markdown syntax for crisp, natural speech
            const cleanText = text
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/[*_#`~>]/g, '')
                .replace(/\n+/g, '. ')
                .trim();

            if (!cleanText) {
                if (onEnd) onEnd();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            // Find best available English natural/neural voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith('en') && (
                v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Microsoft') ||
                v.name.includes('Jenny') ||
                v.name.includes('Guy')
            )) || voices.find(v => v.lang.startsWith('en'));

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

            utterance.onend = () => {
                if (onEnd) onEnd();
            };

            utterance.onerror = () => {
                if (onEnd) onEnd();
            };

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('TTS playback error:', err);
            if (onEnd) onEnd();
        }
    }

    // ─── Render Message Bubble ─────────────────────────────────────────
    const renderedMessageIds = new Set<string>();

    function renderMessage(msg: { id?: string; body: string; senderType: string; readAt?: string | null; createdAt?: string; attachments?: any; mediaType?: string }): HTMLElement | null {
        if (msg.id) {
            if (renderedMessageIds.has(msg.id)) {
                return null;
            }
            renderedMessageIds.add(msg.id);
        }

        const isAgent = msg.senderType === 'agent';
        const isBot = msg.senderType === 'bot';
        const isUser = !isAgent && !isBot;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `display:flex;flex-direction:column;align-self:${isUser ? 'flex-end' : 'flex-start'};max-width:85%;`;

        // Sender Badge
        if (isBot) {
            const botBadge = document.createElement('div');
            botBadge.style.cssText = 'font-size:10px;font-weight:700;color:#6366f1;margin-bottom:3px;display:flex;align-items:center;gap:4px;';
            botBadge.innerHTML = '🤖 <span>AI Assistant</span>';
            wrapper.appendChild(botBadge);
        } else if (isAgent) {
            const agentBadge = document.createElement('div');
            agentBadge.style.cssText = 'font-size:10px;font-weight:700;color:#3b82f6;margin-bottom:3px;display:flex;align-items:center;gap:4px;';
            agentBadge.innerHTML = `👤 <span>${currentAssigneeName || 'Support Specialist'}</span>`;
            wrapper.appendChild(agentBadge);
        }

        const bubble = document.createElement('div');
        bubble.style.cssText = `padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.45;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,0.05);${
            isUser
                ? `background:${activeTheme.primaryColor};color:#fff;border-bottom-right-radius:4px;`
                : isBot
                ? 'background:#eef2ff;color:#1e1b4b;border:1px solid #c7d2fe;border-bottom-left-radius:4px;'
                : 'background:#f1f5f9;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px;'
        }`;

        let attachments = [];
        try {
            attachments = Array.isArray(msg.attachments) ? msg.attachments : (typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : []);
        } catch (e) { }

        if (attachments.length > 0) {
            attachments.forEach((att: any) => {
                const url = typeof att === 'string' ? att : att.url;
                if (url) {
                    if (msg.mediaType === 'image' || url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i)) {
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = 'Uploaded Image';
                        img.style.cssText = 'max-width:100%;border-radius:8px;margin-bottom:6px;display:block;cursor:pointer;';
                        img.onclick = () => window.open(url, '_blank');
                        bubble.appendChild(img);
                    } else {
                        const fileLink = document.createElement('a');
                        fileLink.href = url;
                        fileLink.target = '_blank';
                        fileLink.style.cssText = isUser ? 'color:#fff;text-decoration:underline;display:block;margin-bottom:4px;' : 'color:#2563eb;text-decoration:underline;display:block;margin-bottom:4px;'
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
        footer.style.cssText = `font-size:10px;margin-top:4px;display:flex;gap:6px;align-items:center;${isUser ? 'color:#93c5fd;justify-content:flex-end;' : 'color:#94a3b8;justify-content:flex-start;'}`;
        footer.innerHTML = `<span>${timeStr}</span>`;

        if (isUser) {
            const isSeen = !!msg.readAt;
            footer.innerHTML += `<span class="hd-msg-tick" style="font-weight:700;color:${isSeen ? '#93c5fd' : '#cbd5e1'};margin-left:2px;letter-spacing:-1px;" title="${isSeen ? 'Seen' : 'Sent'}">${isSeen ? '✓✓' : '✓'}</span>`;
        }

        wrapper.appendChild(footer);
        return wrapper;
    }

    // ─── Init Widget ───────────────────────────────────────────────────
    async function initWidget() {
        await loadSocketIO();

        let root = document.getElementById(rootId);
        if (root) {
            root.innerHTML = '';
        } else {
            root = document.createElement('div');
            root.id = rootId;
            document.body.appendChild(root);
        }

        Object.assign(root.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '999999',
            fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
        });

        // ── Main Widget Wrapper (Contains Modal + Powered by Footer) ──
        const widgetWrapper = document.createElement('div');
        widgetWrapper.id = 'hd-widget-wrapper';
        widgetWrapper.style.cssText = `
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            transform: translateY(16px);
            opacity: 0;
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        `;

        // ── Chat Panel ─────────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.style.cssText = `
            width: min(370px, calc(100vw - 32px));
            height: min(590px, calc(100vh - 120px));
            background: #fff;
            box-shadow: 0 20px 50px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06);
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            position: relative;
        `;

        panel.innerHTML = `
          <!-- Header with Custom Workspace Logo Support -->
          <div id="hd-header" style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;z-index:10;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div id="hd-header-logo-container" style="width:34px;height:34px;border-radius:12px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;overflow:hidden;flex-shrink:0;">H</div>
              <div>
                <div id="hd-header-title" style="font-weight:700;font-size:15px;letter-spacing:-0.01em;">HelloDesk Support</div>
                <div id="hd-presence" style="font-size:11px;opacity:0.9;">🟢 Autonomous AI Active</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button id="hd-header-voice-btn" title="Toggle Real-Time Voice" style="background:rgba(255,255,255,0.18);border:none;color:#fff;width:32px;height:32px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">${MIC_SVG}</button>
              <button id="hd-minimize" aria-label="Minimize chat" style="background:rgba(255,255,255,0.18);border:none;color:#fff;width:32px;height:32px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">−</button>
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- FULL-SCREEN GEMINI LIVE-STYLE VOICE OVERLAY -->
          <!-- =================================================================== -->
          <div id="hd-voice-overlay" style="display:none;position:absolute;inset:0;top:60px;background:linear-gradient(180deg,#090d16 0%,#0f172a 50%,#1e1b4b 100%);color:#fff;flex-direction:column;align-items:center;justify-content:space-between;padding:24px 20px;z-index:20;">
            <div style="text-align:center;">
              <span style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#818cf8;background:rgba(99,102,241,0.15);padding:4px 10px;border-radius:999px;border:1px solid rgba(99,102,241,0.3);">Gemini-Style Neural Voice</span>
              <h3 id="hd-voice-title" style="font-size:18px;font-weight:800;margin:10px 0 2px;background:linear-gradient(90deg,#93c5fd,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AI Voice Agent</h3>
              <p id="hd-voice-status-text" style="font-size:12px;color:#94a3b8;margin:0;">Listening to your voice...</p>
            </div>

            <!-- Gemini Live Fluid Pulsating Glowing Orb Visualizer -->
            <div style="position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;">
              <div id="hd-orb-ring-3" style="position:absolute;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%);animation:hdPulse 2.5s infinite ease-in-out;"></div>
              <div id="hd-orb-ring-2" style="position:absolute;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,0.35) 0%,transparent 70%);animation:hdPulse 2s infinite ease-in-out reverse;"></div>
              <div id="hd-orb-core" style="position:relative;width:95px;height:95px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#6366f1,#a855f7);box-shadow:0 0 40px rgba(99,102,241,0.6),inset 0 0 20px rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:36px;transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <div id="hd-orb-icon" style="color:#fff;">${MIC_SVG}</div>
              </div>
            </div>

            <!-- Subtitle Transcript Container -->
            <div id="hd-voice-subtitles" style="width:100%;min-height:55px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);font-size:12px;line-height:1.4;color:#e2e8f0;text-align:center;backdrop-blur:md;max-height:80px;overflow-y:auto;">
              "Speak naturally. Real-time STT & neural TTS active."
            </div>

            <!-- Control Action Bar -->
            <div style="display:flex;align-items:center;gap:10px;width:100%;">
              <button id="hd-voice-barge-btn" style="flex:1;background:rgba(239,68,68,0.2);color:#fca5a5;border:1px solid rgba(239,68,68,0.4);padding:10px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;">🛑 Interrupt</button>
              <button id="hd-voice-stop-btn" style="flex:1;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.25);padding:10px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;">💬 Back to Chat</button>
            </div>
          </div>

          <!-- =================================================================== -->
          <!-- TEXT CHAT INTERFACE -->
          <!-- =================================================================== -->
          <!-- Messages Timeline -->
          <div id="hd-messages" style="flex:1;padding:14px;overflow-y:auto;background:#f8fafc;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;">
            <!-- AI Capability & Smart Handoff Banner -->
            <div style="align-self:stretch;padding:8px 12px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:11px;color:#475569;line-height:1.4;text-align:center;">
              ⚡ <strong>Smart AI Assistant:</strong> Trained with pgvector RAG & live domain tools. Inquiries requiring human specialists are automatically evaluated and transferred.
            </div>

            <div id="hd-greeting" style="align-self:flex-start;max-width:85%;">
              <div style="font-size:10px;font-weight:700;color:#6366f1;margin-bottom:3px;">🤖 AI Assistant</div>
              <div style="padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;background:#eef2ff;color:#1e1b4b;border:1px solid #c7d2fe;font-size:13px;line-height:1.45;">
                👋 Hi there! How can I help you today? You can ask questions, upload files, check orders, or tap the mic icon to talk in real-time.
              </div>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div id="hd-typing-indicator" style="display:none;padding:6px 14px;background:#f8fafc;font-size:11px;color:#64748b;font-style:italic;flex-shrink:0;">
            AI Assistant is reasoning…
          </div>

          <!-- Chat Input Area with Attachment Button -->
          <div id="hd-chat-input-area" style="padding:10px 12px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <input type="file" id="hd-file-input" style="display:none;" accept="image/*,.pdf,.doc,.docx,.txt" />
            <button id="hd-attach-btn" title="Attach file or screenshot (Cloudinary)" style="background:#f1f5f9;color:#475569;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;font-size:14px;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">📎</button>
            <input id="hd-input" type="text" placeholder="Type a message or query..." style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;outline:none;font-size:13px;transition:border 0.2s;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'" />
            <button id="hd-mic-btn" title="Speak to Voice Agent" style="background:#f1f5f9;color:#475569;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">${MIC_SVG}</button>
            <button id="hd-send" style="background:#2563eb;color:#fff;border:none;padding:9px 14px;border-radius:10px;font-weight:600;cursor:pointer;font-size:13px;transition:background 0.2s;" onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">Send</button>
          </div>
        `;

        // ── Powered By Badge (Positioned between modal & launcher button) ──
        const poweredByBadge = document.createElement('div');
        poweredByBadge.style.cssText = `
            font-size: 11px;
            color: #64748b;
            text-align: center;
            padding: 2px 8px;
            letter-spacing: 0.02em;
        `;
        poweredByBadge.innerHTML = `⚡ Powered by <a href="https://github.com/ayusharma-ctrl" target="_blank" style="color:#6366f1;font-weight:700;text-decoration:none;">ayusharma-ctrl</a>`;

        widgetWrapper.appendChild(panel);
        widgetWrapper.appendChild(poweredByBadge);

        // ── FAB Toggle Button with Unread Badge ─────────────────────────
        const fabWrapper = document.createElement('div');
        fabWrapper.style.cssText = 'position:relative;display:inline-block;';

        const fab = document.createElement('button');
        fab.id = 'hd-fab-button';
        fab.setAttribute('aria-label', 'Open chat');
        fab.style.cssText = `
            width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#1e40af,#3b82f6);
            color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(37,99,235,0.4);
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.2s,box-shadow 0.2s;flex-shrink:0;
        `;
        fab.innerHTML = '💬';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.08)'; fab.style.boxShadow = '0 8px 26px rgba(37,99,235,0.5)'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'; };

        const badge = document.createElement('div');
        badge.id = 'hd-unread-badge';
        badge.style.cssText = `
            display:none;position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;
            font-size:11px;font-weight:800;padding:2px 7px;border-radius:999px;border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);pointer-events:none;
        `;
        badge.textContent = '0';

        fabWrapper.appendChild(fab);
        fabWrapper.appendChild(badge);

        root.appendChild(widgetWrapper);
        root.appendChild(fabWrapper);

        // ── Inject CSS Animations & Responsive Mobile Styles ────────
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            @keyframes hdPulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.18); opacity: 0.9; }
            }
            @keyframes hdRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @media (max-width: 640px) {
                #hellodesk-widget-root.hd-mobile-open {
                    bottom: 0 !important;
                    right: 0 !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100dvh !important;
                    max-height: 100dvh !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    z-index: 2147483647 !important;
                }
                #hellodesk-widget-root.hd-mobile-open #hd-widget-wrapper {
                    width: 100vw !important;
                    height: 100dvh !important;
                    max-height: 100dvh !important;
                    gap: 0 !important;
                }
                #hellodesk-widget-root.hd-mobile-open #hd-widget-wrapper > div:first-child {
                    width: 100vw !important;
                    height: calc(100dvh - 22px) !important;
                    max-height: 100dvh !important;
                    border-radius: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                #hellodesk-widget-root.hd-mobile-open #hd-fab-button {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(styleTag);

        // ── Refs ───────────────────────────────────────────────────────
        const headerLogoContainer = panel.querySelector('#hd-header-logo-container') as HTMLDivElement;
        const headerTitleEl = panel.querySelector('#hd-header-title') as HTMLDivElement;
        const messagesEl = panel.querySelector('#hd-messages') as HTMLDivElement;
        const inputEl = panel.querySelector('#hd-input') as HTMLInputElement;
        const sendBtn = panel.querySelector('#hd-send') as HTMLButtonElement;
        const micBtn = panel.querySelector('#hd-mic-btn') as HTMLButtonElement;
        const attachBtn = panel.querySelector('#hd-attach-btn') as HTMLButtonElement;
        const fileInput = panel.querySelector('#hd-file-input') as HTMLInputElement;
        const headerVoiceBtn = panel.querySelector('#hd-header-voice-btn') as HTMLButtonElement;
        const presenceEl = panel.querySelector('#hd-presence') as HTMLElement;
        const typingIndicator = panel.querySelector('#hd-typing-indicator') as HTMLDivElement;
        const minimizeBtn = panel.querySelector('#hd-minimize') as HTMLButtonElement;

        // Full-Screen Voice Overlay Refs
        const voiceOverlay = panel.querySelector('#hd-voice-overlay') as HTMLDivElement;
        const voiceOrbCore = panel.querySelector('#hd-orb-core') as HTMLDivElement;
        const voiceStatusText = panel.querySelector('#hd-voice-status-text') as HTMLDivElement;
        const voiceSubtitles = panel.querySelector('#hd-voice-subtitles') as HTMLDivElement;
        const voiceBargeBtn = panel.querySelector('#hd-voice-barge-btn') as HTMLButtonElement;
        const voiceStopBtn = panel.querySelector('#hd-voice-stop-btn') as HTMLButtonElement;

        function updateVoiceVisualState(state: 'listening' | 'thinking' | 'speaking' | 'idle') {
            if (state === 'listening') {
                voiceStatusText.textContent = 'Listening to your voice...';
                voiceOrbCore.style.transform = 'scale(1.1)';
                voiceOrbCore.style.boxShadow = '0 0 50px rgba(56,189,248,0.8), inset 0 0 25px rgba(255,255,255,0.6)';
            } else if (state === 'thinking') {
                voiceStatusText.textContent = 'AI Reasoning & searching tools...';
                voiceOrbCore.style.transform = 'scale(0.95) rotate(180deg)';
                voiceOrbCore.style.boxShadow = '0 0 45px rgba(245,158,11,0.8)';
            } else if (state === 'speaking') {
                voiceStatusText.textContent = 'AI Speaking (Neural TTS)...';
                voiceOrbCore.style.transform = 'scale(1.22)';
                voiceOrbCore.style.boxShadow = '0 0 60px rgba(168,85,247,0.9), inset 0 0 30px rgba(255,255,255,0.8)';
            } else {
                voiceStatusText.textContent = 'Voice Agent Ready';
                voiceOrbCore.style.transform = 'scale(1)';
                voiceOrbCore.style.boxShadow = '0 0 30px rgba(99,102,241,0.5)';
            }
        }

        let speechRecognizer: any = null;

        // ── In-Widget Voice Handlers ──────────────────────────────────
        async function startInWidgetVoice() {
            isVoiceActive = true;
            voiceOverlay.style.display = 'flex';
            updateVoiceVisualState('listening');
            voiceSubtitles.textContent = '"Listening... speak now."';
            voiceSessionId = `widget_voice_${Date.now()}`;

            socket?.emit('voice:session-start', {
                workspaceId,
                conversationId: conversationId || `conv_voice_${Date.now()}`,
                visitorId,
            });

            // 1. Browser Native Speech Recognition (Instant, Zero Latency)
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    speechRecognizer = new SpeechRecognition();
                    speechRecognizer.continuous = true;
                    speechRecognizer.interimResults = true;
                    speechRecognizer.lang = 'en-US';

                    speechRecognizer.onresult = (event: any) => {
                        let interim = '';
                        let final = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                final += event.results[i][0].transcript;
                            } else {
                                interim += event.results[i][0].transcript;
                            }
                        }
                        const currentText = final || interim;
                        if (currentText) {
                            voiceSubtitles.textContent = `"${currentText}"`;
                        }
                        if (final && final.trim()) {
                            updateVoiceVisualState('thinking');
                            voiceSubtitles.textContent = `"${final.trim()}"`;
                            socket?.emit('voice:speech-input', {
                                sessionId: voiceSessionId,
                                text: final.trim(),
                            });
                        }
                    };

                    speechRecognizer.onerror = (err: any) => {
                        console.warn('SpeechRecognition error:', err);
                    };

                    speechRecognizer.start();
                } catch (e) {
                    console.warn('SpeechRecognition init error:', e);
                }
            }

            // 2. Audio Stream Recording fallback
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true }
                });
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && socket) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            if (base64) {
                                socket.emit('voice:audio-chunk', {
                                    sessionId: voiceSessionId,
                                    data: base64,
                                    isFinal: false,
                                });
                            }
                        };
                        reader.readAsDataURL(event.data);
                    }
                };

                mediaRecorder.start(300);
            } catch (err) {
                console.warn('Microphone hardware unavailable in widget', err);
                if (!speechRecognizer) {
                    voiceSubtitles.textContent = '⚠️ Mic hardware not detected. Switching to text chat...';
                    setTimeout(stopInWidgetVoice, 2200);
                }
            }
        }

        function stopInWidgetVoice() {
            isVoiceActive = false;
            voiceOverlay.style.display = 'none';
            stopAudioPlayback();

            if (speechRecognizer) {
                try { speechRecognizer.stop(); } catch {}
                speechRecognizer = null;
            }

            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(t => t.stop());
                mediaRecorder = null;
            }

            socket?.emit('voice:audio-chunk', {
                sessionId: voiceSessionId,
                data: '',
                isFinal: true,
            });
        }

        micBtn?.addEventListener('click', () => {
            if (!isVoiceActive) startInWidgetVoice();
            else stopInWidgetVoice();
        });

        headerVoiceBtn?.addEventListener('click', () => {
            if (!isVoiceActive) startInWidgetVoice();
            else stopInWidgetVoice();
        });

        voiceStopBtn?.addEventListener('click', stopInWidgetVoice);

        voiceBargeBtn?.addEventListener('click', () => {
            socket?.emit('voice:interrupt', { sessionId: voiceSessionId });
            stopAudioPlayback();
            updateVoiceVisualState('listening');
            voiceSubtitles.textContent = '⚡ Interrupted. Listening to you...';
        });

        // ── Attachment / Cloudinary File Upload Handling ──────────────
        attachBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;

            typingIndicator.style.display = 'block';
            typingIndicator.textContent = `Uploading ${file.name}...`;

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('workspaceId', workspaceId);

                const uploadRes = await fetch(`${apiBase}/api/v1/upload`, {
                    method: 'POST',
                    body: formData,
                });

                if (!uploadRes.ok) {
                    throw new Error('Upload failed');
                }

                const uploadData = await uploadRes.json();
                const attachments = [{
                    url: uploadData.url,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                }];

                const msgBody = `Uploaded attachment: ${file.name}`;

                const attMsgEl = renderMessage({
                    body: msgBody,
                    senderType: 'contact',
                    attachments,
                    mediaType: uploadData.mediaType,
                });
                if (attMsgEl) {
                    messagesEl.appendChild(attMsgEl);
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                }

                if (!conversationId) {
                    const startRes = await fetch(`${apiBase}/api/v1/widget/conversations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ workspaceId, visitorId, body: msgBody, attachments, mediaType: uploadData.mediaType })
                    });
                    const startData = await startRes.json();
                    conversationId = startData.conversation?.id ?? null;
                    if (conversationId) {
                        localStorage.setItem('hellodesk-conversation-id', conversationId);
                        void updateStatus();
                    }
                } else {
                    await fetch(`${apiBase}/api/v1/widget/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversationId, visitorId, body: msgBody, attachments, mediaType: uploadData.mediaType })
                    });
                }
            } catch (err) {
                console.error('Attachment upload failed', err);
                alert('Attachment upload failed. Please try again.');
            } finally {
                typingIndicator.style.display = 'none';
                typingIndicator.textContent = 'AI Assistant is reasoning…';
                fileInput.value = '';
            }
        });

        // ── Toggle Widget & Reset Unread Count ──────────────────────────
        function toggleWidget() {
            widgetVisible = !widgetVisible;
            if (widgetVisible) {
                root?.classList.add('hd-mobile-open');
                widgetWrapper.style.display = 'flex';
                setTimeout(() => {
                    widgetWrapper.style.transform = 'translateY(0)';
                    widgetWrapper.style.opacity = '1';
                }, 10);
                fab.innerHTML = '✕';

                // Clear unread count when opened
                unreadCount = 0;
                badge.style.display = 'none';
                badge.textContent = '0';

                if (conversationId) {
                    fetch(`${apiBase}/api/v1/widget/read`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ conversationId, visitorId })
                    }).catch(() => {});
                }

                inputEl.focus();
            } else {
                root?.classList.remove('hd-mobile-open');
                widgetWrapper.style.transform = 'translateY(16px)';
                widgetWrapper.style.opacity = '0';
                setTimeout(() => { widgetWrapper.style.display = 'none'; }, 250);
                fab.innerHTML = '💬';
                if (isVoiceActive) stopInWidgetVoice();
            }
        }

        fab.addEventListener('click', toggleWidget);
        minimizeBtn.addEventListener('click', toggleWidget);

        // Expose global HelloDesk API on window
        (window as any).HelloDesk = {
            open: () => {
                if (!widgetVisible) toggleWidget();
            },
            close: () => {
                if (widgetVisible) toggleWidget();
            },
            toggle: () => {
                toggleWidget();
            }
        };

        // ── Realtime Socket Handling ───────────────────────────────────
        try {
            const socketUrl = apiBase;
            socket = (window as any).io(socketUrl, {
                transports: ['websocket'],
                withCredentials: true,
                auth: { type: 'visitor', visitorId, workspaceId },
                query: { type: 'visitor', visitorId, workspaceId },
            });

            socket.on('connect', () => {
                socket.emit('visitor:join', { visitorId, workspaceId });
            });

            socket.on('voice:session-ready', (data: { sessionId: string }) => {
                if (data.sessionId) {
                    voiceSessionId = data.sessionId;
                }
                updateVoiceVisualState('listening');
                voiceSubtitles.textContent = '"Listening... speak now."';
            });

            socket.on('message:created', (data: any) => {
                if (data.message && data.message.senderType !== 'contact') {
                    const el = renderMessage(data.message);
                    if (el) {
                        messagesEl.appendChild(el);
                        messagesEl.scrollTop = messagesEl.scrollHeight;
                    }

                    // If widget is closed, increment unread count & show badge
                    if (!widgetVisible) {
                        unreadCount++;
                        badge.style.display = 'block';
                        badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
                    }
                }
            });

            const updateAllTicksToSeen = () => {
                const ticks = messagesEl.querySelectorAll('.hd-msg-tick');
                ticks.forEach(t => {
                    t.textContent = '✓✓';
                    (t as HTMLElement).style.color = '#93c5fd';
                    (t as HTMLElement).title = 'Seen';
                });
            };

            socket.on('messages:read', updateAllTicksToSeen);
            socket.on('message:read', updateAllTicksToSeen);

            socket.on('conversation:updated', (data: { conversationId: string; status?: string; conversation?: any }) => {
                const status = data?.conversation?.status || data?.status;
                if (status === 'resolved') {
                    handleConversationResolved();
                }
            });

            socket.on('ai:response-started', () => {
                typingIndicator.style.display = 'block';
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });

            socket.on('ai:response-completed', () => {
                typingIndicator.style.display = 'none';
            });

            // In-Widget Voice Socket Listeners
            socket.on('voice:transcript-final', (data: { text: string }) => {
                if (isVoiceActive && data.text) {
                    voiceSubtitles.textContent = `"${data.text}"`;
                    updateVoiceVisualState('thinking');
                }
            });

            socket.on('voice:agent-thinking', () => {
                updateVoiceVisualState('thinking');
            });

            socket.on('voice:audio-out', (data: { audioBase64?: string; textSnippet?: string; isFinal: boolean }) => {
                if (data.textSnippet) {
                    voiceSubtitles.textContent = `"${data.textSnippet}"`;
                    if (isVoiceActive && data.isFinal) {
                        updateVoiceVisualState('speaking');
                        speakText(data.textSnippet, () => {
                            if (isVoiceActive) {
                                updateVoiceVisualState('listening');
                                voiceSubtitles.textContent = '"Listening... speak now."';
                            }
                        });
                    }
                }
            });

            socket.on('voice:playback-cancelled', () => {
                stopAudioPlayback();
                updateVoiceVisualState('listening');
                voiceSubtitles.textContent = '"Listening... speak now."';
            });
        } catch {}

        // ── Resolved Handler ──────────────────────────────────────────
        function handleConversationResolved() {
            if (isVoiceActive) {
                stopInWidgetVoice();
            }

            // Disable all interactive chat & voice buttons
            inputEl.disabled = true;
            inputEl.placeholder = 'Conversation resolved. Start new chat to message.';
            sendBtn.style.opacity = '0.4';
            sendBtn.style.pointerEvents = 'none';
            attachBtn.style.opacity = '0.4';
            attachBtn.style.pointerEvents = 'none';
            micBtn.style.opacity = '0.4';
            micBtn.style.pointerEvents = 'none';
            headerVoiceBtn.style.opacity = '0.4';
            headerVoiceBtn.style.pointerEvents = 'none';

            if (messagesEl.querySelector('.hd-resolved-banner')) return;

            let selectedRating = 5;

            const banner = document.createElement('div');
            banner.className = 'hd-resolved-banner';
            banner.style.cssText = 'margin:14px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;text-align:center;font-size:12px;color:#475569;box-shadow:0 1px 4px rgba(0,0,0,0.06);';
            banner.innerHTML = `
                <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;justify-content:center;gap:6px;color:#0f172a;font-size:13px;">
                    <span>🔒</span> Conversation Marked as Resolved
                </div>
                <div style="font-size:11px;color:#64748b;margin-bottom:12px;">Our team or AI specialist has concluded this session.</div>
                
                <!-- CSAT Review Box -->
                <div id="hd-csat-box" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:12px;">
                    <div style="font-weight:600;font-size:11px;color:#334155;margin-bottom:6px;">How would you rate our assistance?</div>
                    <div id="hd-star-group" style="display:flex;justify-content:center;gap:8px;font-size:22px;cursor:pointer;user-select:none;margin-bottom:8px;">
                        <span class="hd-csat-star" data-val="1" style="opacity:1;transition:transform 0.15s;">⭐</span>
                        <span class="hd-csat-star" data-val="2" style="opacity:1;transition:transform 0.15s;">⭐</span>
                        <span class="hd-csat-star" data-val="3" style="opacity:1;transition:transform 0.15s;">⭐</span>
                        <span class="hd-csat-star" data-val="4" style="opacity:1;transition:transform 0.15s;">⭐</span>
                        <span class="hd-csat-star" data-val="5" style="opacity:1;transition:transform 0.15s;">⭐</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <input id="hd-review-text" type="text" placeholder="Optional review comment..." style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px;outline:none;" />
                        <button id="hd-submit-csat" style="background:#0f172a;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Send Review</button>
                    </div>
                </div>

                <button id="hd-restart-conv-btn" style="background:#2563eb;color:#ffffff;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 1px 3px rgba(37,99,235,0.25);">
                    Start New Conversation
                </button>
            `;

            messagesEl.appendChild(banner);
            messagesEl.scrollTop = messagesEl.scrollHeight;

            // CSAT Star Hover & Click Handling
            const starElements = banner.querySelectorAll('.hd-csat-star');
            starElements.forEach((star) => {
                star.addEventListener('click', (e: any) => {
                    selectedRating = Number(e.currentTarget.getAttribute('data-val') || 5);
                    starElements.forEach((s, idx) => {
                        (s as HTMLElement).style.opacity = idx < selectedRating ? '1' : '0.35';
                    });
                });
            });

            // Submit CSAT review
            const csatSubmitBtn = banner.querySelector('#hd-submit-csat');
            const reviewInput = banner.querySelector('#hd-review-text') as HTMLInputElement;
            const csatBox = banner.querySelector('#hd-csat-box') as HTMLDivElement;

            if (csatSubmitBtn) {
                csatSubmitBtn.addEventListener('click', async () => {
                    const feedback = reviewInput?.value?.trim() || '';
                    if (conversationId) {
                        try {
                            await fetch(`${apiBase}/api/v1/widget/rate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    conversationId,
                                    visitorId,
                                    rating: selectedRating,
                                    ratingFeedback: feedback
                                })
                            });
                        } catch {}
                    }
                    if (csatBox) {
                        csatBox.innerHTML = `
                            <div style="color:#16a34a;font-weight:700;font-size:12px;padding:6px 0;">
                                🎉 Thank you for your feedback! (Rating: ${selectedRating} / 5)
                            </div>
                        `;
                    }
                });
            }

            const restartBtn = banner.querySelector('#hd-restart-conv-btn');
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    localStorage.removeItem('hellodesk-conversation-id');
                    conversationId = null;
                    renderedMessageIds.clear();
                    while (messagesEl.children.length > 2) {
                        messagesEl.removeChild(messagesEl.lastChild!);
                    }
                    inputEl.disabled = false;
                    inputEl.placeholder = 'Ask a question or type a message...';
                    sendBtn.style.opacity = '1';
                    sendBtn.style.pointerEvents = 'auto';
                    attachBtn.style.opacity = '1';
                    attachBtn.style.pointerEvents = 'auto';
                    micBtn.style.opacity = '1';
                    micBtn.style.pointerEvents = 'auto';
                    headerVoiceBtn.style.opacity = '1';
                    headerVoiceBtn.style.pointerEvents = 'auto';
                    inputEl.focus();
                });
            }
        }

        // ── Fetch Status & History ────────────────────────────────────
        async function updateStatus() {
            try {
                const res = await fetch(`${apiBase}/api/v1/widget/status?workspaceId=${workspaceId}`);
                if (res.ok) {
                    const data = await res.json();

                    // Presence indicator
                    if (presenceEl) {
                        presenceEl.textContent = data.online ? '🟢 Specialists Online' : '🟢 Autonomous AI Active';
                    }

                    // Dynamic Brand Logo & Fallback
                    if (data.logoUrl) {
                        headerLogoContainer.innerHTML = `<img src="${data.logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='H'" />`;
                    } else {
                        headerLogoContainer.innerHTML = 'H';
                    }

                    // Dynamic Workspace Name
                    if (data.shortName || data.workspaceName) {
                        headerTitleEl.textContent = `${data.shortName || data.workspaceName} Support`;
                    }
                }

                if (conversationId) {
                    const histRes = await fetch(`${apiBase}/api/v1/widget/conversations/${conversationId}?visitorId=${visitorId}`);
                    if (histRes.ok) {
                        const histData = await histRes.json();
                        currentAssigneeName = histData.assigneeName;

                        renderedMessageIds.clear();
                        while (messagesEl.children.length > 2) {
                            messagesEl.removeChild(messagesEl.lastChild!);
                        }

                        if (histData.messages && Array.isArray(histData.messages)) {
                            histData.messages.forEach((m: any) => {
                                const el = renderMessage(m);
                                if (el) messagesEl.appendChild(el);
                            });
                            messagesEl.scrollTop = messagesEl.scrollHeight;
                        }

                        if (histData.status === 'resolved') {
                            handleConversationResolved();
                        }
                    }
                }
            } catch {}
        }

        // ── Send Message ──────────────────────────────────────────────
        async function sendMessage() {
            const body = inputEl.value.trim();
            if (!body) return;
            inputEl.value = '';

            const localEl = renderMessage({ body, senderType: 'contact', id: `loc_${Date.now()}` });
            if (localEl) {
                messagesEl.appendChild(localEl);
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }

            // Immediately show typing indicator for visitor feedback
            typingIndicator.style.display = 'block';
            typingIndicator.textContent = 'AI Assistant is reasoning…';

            try {
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
            } catch (err) {
                typingIndicator.style.display = 'none';
            }
        }

        sendBtn.addEventListener('click', () => { void sendMessage(); });
        inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') void sendMessage(); });

        if (typeof window !== 'undefined') {
            (window as any).__HELLODESK_WIDGET_CLEANUP__ = () => {
                if (socket) {
                    try { socket.disconnect(); } catch (e) {}
                }
                stopAudioPlayback();
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    try { mediaRecorder.stop(); } catch (e) {}
                }
                const el = document.getElementById(rootId);
                if (el) el.remove();
            };
        }

        void updateStatus();
    }

    // Boot
    void initWidget();
})();
