import { logger } from '../lib/logger.js';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    replyTo?: string;
}

export interface EmailProvider {
    sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }>;
    verify(): Promise<{ success: boolean; error?: string }>;
}

export interface ResendCredentials {
    apiKey: string;
    fromEmail: string;
    replyTo?: string;
}

export interface SendGridCredentials {
    apiKey: string;
    fromEmail: string;
    replyTo?: string;
}

export interface MailgunCredentials {
    apiKey: string;
    domain: string;
    fromEmail: string;
    region?: 'us' | 'eu';
    replyTo?: string;
}

// ─── Resend Provider ────────────────────────────────────────────────────────
export class ResendEmailProvider implements EmailProvider {
    constructor(private credentials: ResendCredentials) {}

    async sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.credentials.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.credentials.fromEmail,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html || options.text,
                    reply_to: options.replyTo || this.credentials.replyTo,
                    headers: options.headers,
                }),
            });

            const data = (await res.json()) as any;
            if (!res.ok) {
                return { success: false, error: data?.message || `Resend error HTTP ${res.status}` };
            }
            return { success: true, id: data?.id };
        } catch (err: any) {
            logger.error({ err }, 'Resend send error');
            return { success: false, error: err.message || 'Failed to send email via Resend' };
        }
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('https://api.resend.com/api-keys', {
                headers: { Authorization: `Bearer ${this.credentials.apiKey}` },
            });
            if (res.ok) {
                return { success: true };
            }
            const data = (await res.json().catch(() => ({}))) as any;
            return { success: false, error: data?.message || `Resend key verification failed (HTTP ${res.status})` };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to verify Resend API key' };
        }
    }
}

// ─── SendGrid Provider ──────────────────────────────────────────────────────
export class SendGridEmailProvider implements EmailProvider {
    constructor(private credentials: SendGridCredentials) {}

    async sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const body: any = {
                personalizations: [{ to: [{ email: options.to }] }],
                from: { email: this.credentials.fromEmail },
                subject: options.subject,
                content: [
                    {
                        type: options.html ? 'text/html' : 'text/plain',
                        value: options.html || options.text || '',
                    },
                ],
            };

            if (options.replyTo || this.credentials.replyTo) {
                body.reply_to = { email: options.replyTo || this.credentials.replyTo };
            }

            if (options.headers) {
                body.headers = options.headers;
            }

            const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.credentials.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (res.status >= 200 && res.status < 300) {
                const messageId = res.headers.get('x-message-id') || `sg_${Date.now()}`;
                return { success: true, id: messageId };
            }

            const errData = await res.json().catch(() => ({}));
            return { success: false, error: JSON.stringify(errData) || `SendGrid error HTTP ${res.status}` };
        } catch (err: any) {
            logger.error({ err }, 'SendGrid send error');
            return { success: false, error: err.message || 'Failed to send email via SendGrid' };
        }
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('https://api.sendgrid.com/v3/scopes', {
                headers: { Authorization: `Bearer ${this.credentials.apiKey}` },
            });
            if (res.ok) {
                return { success: true };
            }
            return { success: false, error: `SendGrid API key verification failed (HTTP ${res.status})` };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to verify SendGrid API key' };
        }
    }
}

// ─── Mailgun Provider ───────────────────────────────────────────────────────
export class MailgunEmailProvider implements EmailProvider {
    private baseUrl: string;

    constructor(private credentials: MailgunCredentials) {
        const isEu = credentials.region?.toLowerCase() === 'eu';
        this.baseUrl = isEu ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';
    }

    async sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const domain = this.credentials.domain;
            const url = `${this.baseUrl}/${encodeURIComponent(domain)}/messages`;

            const form = new URLSearchParams();
            form.append('from', this.credentials.fromEmail);
            form.append('to', options.to);
            form.append('subject', options.subject);
            if (options.text) form.append('text', options.text);
            if (options.html) form.append('html', options.html);
            if (options.replyTo || this.credentials.replyTo) {
                form.append('h:Reply-To', options.replyTo || this.credentials.replyTo!);
            }
            if (options.headers) {
                for (const [k, v] of Object.entries(options.headers)) {
                    form.append(`h:${k}`, v);
                }
            }

            const authHeader = `Basic ${Buffer.from(`api:${this.credentials.apiKey}`).toString('base64')}`;

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: form.toString(),
            });

            const data = (await res.json()) as any;
            if (!res.ok) {
                return { success: false, error: data?.message || `Mailgun error HTTP ${res.status}` };
            }
            return { success: true, id: data?.id };
        } catch (err: any) {
            logger.error({ err }, 'Mailgun send error');
            return { success: false, error: err.message || 'Failed to send email via Mailgun' };
        }
    }

    async verify(): Promise<{ success: boolean; error?: string }> {
        try {
            const domain = this.credentials.domain;
            const url = `${this.baseUrl}/domains/${encodeURIComponent(domain)}`;
            const authHeader = `Basic ${Buffer.from(`api:${this.credentials.apiKey}`).toString('base64')}`;

            const res = await fetch(url, {
                headers: { Authorization: authHeader },
            });

            if (res.ok) {
                return { success: true };
            }
            const data = (await res.json().catch(() => ({}))) as any;
            return { success: false, error: data?.message || `Mailgun domain verification failed (HTTP ${res.status})` };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to verify Mailgun credentials' };
        }
    }
}

// ─── Credential Testing Factory ─────────────────────────────────────────────
export async function testEmailCredentials(provider: string, credentials: any): Promise<{ success: boolean; error?: string }> {
    if (provider === 'resend') {
        const p = new ResendEmailProvider(credentials);
        return p.verify();
    } else if (provider === 'sendgrid') {
        const p = new SendGridEmailProvider(credentials);
        return p.verify();
    } else if (provider === 'mailgun') {
        const p = new MailgunEmailProvider(credentials);
        return p.verify();
    }
    return { success: false, error: `Unknown email provider: ${provider}` };
}

// ─── Multi-Tenant Resolver (No Fallback) ────────────────────────────────────
export function getEmailProvider(customConfig?: { provider: string; credentials: any } | null): EmailProvider | null {
    if (!customConfig || !customConfig.credentials) {
        return null; // Strict rule: No fallback if not configured by workspace owner
    }

    if (customConfig.provider === 'resend') {
        return new ResendEmailProvider(customConfig.credentials);
    }
    if (customConfig.provider === 'sendgrid') {
        return new SendGridEmailProvider(customConfig.credentials);
    }
    if (customConfig.provider === 'mailgun') {
        return new MailgunEmailProvider(customConfig.credentials);
    }

    return null;
}
