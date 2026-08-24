import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testEmailCredentials, getEmailProvider, EmailOptions } from '../../services/email.service.js';
import { verifyEmailDto, saveEmailConfigDto, sendTestEmailDto } from './email.dto.js';
import { logger } from '../../lib/logger.js';

@Injectable()
export class WorkspaceEmailService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async getConfig(workspaceId: string) {
        const config = await this.prisma.workspaceEmailConfig.findUnique({
            where: { workspaceId },
        });

        const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

        if (!config) {
            return {
                isConfigured: false,
                provider: null,
                credentials: null,
                webhooks: {
                    resend: `${baseUrl}/api/v1/webhooks/email/resend?workspaceId=${workspaceId}`,
                    sendgrid: `${baseUrl}/api/v1/webhooks/email/sendgrid?workspaceId=${workspaceId}`,
                    mailgun: `${baseUrl}/api/v1/webhooks/email/mailgun?workspaceId=${workspaceId}`,
                },
            };
        }

        const creds = config.credentials as any;
        const maskedCreds: Record<string, string> = {};

        if (config.provider === 'resend') {
            maskedCreds.apiKey = creds.apiKey ? `re_${creds.apiKey.slice(-6)}` : '';
            maskedCreds.fromEmail = creds.fromEmail || '';
            maskedCreds.replyTo = creds.replyTo || '';
        } else if (config.provider === 'sendgrid') {
            maskedCreds.apiKey = creds.apiKey ? `SG.••••••••${creds.apiKey.slice(-4)}` : '';
            maskedCreds.fromEmail = creds.fromEmail || '';
            maskedCreds.replyTo = creds.replyTo || '';
        } else if (config.provider === 'mailgun') {
            maskedCreds.apiKey = creds.apiKey ? `••••••••${creds.apiKey.slice(-4)}` : '';
            maskedCreds.domain = creds.domain || '';
            maskedCreds.fromEmail = creds.fromEmail || '';
            maskedCreds.region = creds.region || 'us';
            maskedCreds.replyTo = creds.replyTo || '';
        }

        return {
            id: config.id,
            isConfigured: true,
            provider: config.provider,
            credentials: maskedCreds,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            webhooks: {
                resend: `${baseUrl}/api/v1/webhooks/email/resend?workspaceId=${workspaceId}`,
                sendgrid: `${baseUrl}/api/v1/webhooks/email/sendgrid?workspaceId=${workspaceId}`,
                mailgun: `${baseUrl}/api/v1/webhooks/email/mailgun?workspaceId=${workspaceId}`,
            },
        };
    }

    async verifyConfig(body: any) {
        const input = verifyEmailDto.parse(body);

        if (input.provider === 'resend') {
            const { apiKey, fromEmail } = input.credentials;
            if (!apiKey || !fromEmail) {
                throw new BadRequestException('Resend requires apiKey and fromEmail (e.g. support@yourdomain.com)');
            }
        } else if (input.provider === 'sendgrid') {
            const { apiKey, fromEmail } = input.credentials;
            if (!apiKey || !fromEmail) {
                throw new BadRequestException('SendGrid requires apiKey and fromEmail');
            }
        } else if (input.provider === 'mailgun') {
            const { apiKey, domain, fromEmail } = input.credentials;
            if (!apiKey || !domain || !fromEmail) {
                throw new BadRequestException('Mailgun requires apiKey, domain, and fromEmail');
            }
        }

        const result = await testEmailCredentials(input.provider, input.credentials);
        if (!result.success) {
            throw new BadRequestException(result.error || 'Failed to verify email provider credentials');
        }

        return { verified: true, message: `Successfully verified ${input.provider} API credentials.` };
    }

    async saveConfig(workspaceId: string, body: any) {
        const input = saveEmailConfigDto.parse(body);

        // Pre-flight live verification
        await this.verifyConfig(input);

        const config = await this.prisma.workspaceEmailConfig.upsert({
            where: { workspaceId },
            create: {
                workspaceId,
                provider: input.provider,
                credentials: input.credentials,
                isActive: true,
            },
            update: {
                provider: input.provider,
                credentials: input.credentials,
                isActive: true,
            },
        });

        return {
            success: true,
            provider: config.provider,
            message: `Custom email provider ${config.provider} connected successfully.`,
        };
    }

    async deleteConfig(workspaceId: string) {
        await this.prisma.workspaceEmailConfig.deleteMany({
            where: { workspaceId },
        });

        return {
            success: true,
            message: 'Email platform configuration removed. Outbound email service is now disabled.',
        };
    }

    async sendTestEmail(workspaceId: string, body: any) {
        const input = sendTestEmailDto.parse(body);

        const config = await this.prisma.workspaceEmailConfig.findUnique({
            where: { workspaceId },
        });

        if (!config || !config.isActive) {
            throw new BadRequestException('No email provider is configured for this workspace.');
        }

        const provider = getEmailProvider({
            provider: config.provider,
            credentials: config.credentials as any,
        });

        if (!provider) {
            throw new BadRequestException('Failed to initialize email provider.');
        }

        const res = await provider.sendEmail({
            to: input.recipientEmail,
            subject: 'HelloDesk Email Integration Test',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #0f172a; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #2563eb; margin-top: 0;">🎉 Email Provider Connected!</h2>
                    <p>Your <strong>${config.provider.toUpperCase()}</strong> email platform has been verified and connected to HelloDesk successfully.</p>
                    <p style="font-size: 13px; color: #64748b;">Outbound replies, AI summaries, and invite notifications will now be routed through your verified domain.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #94a3b8;">Sent via HelloDesk Bring-Your-Own-Email Engine</p>
                </div>
            `,
            text: `HelloDesk Email Integration Test: Your ${config.provider.toUpperCase()} email provider is working properly.`,
        });

        if (!res.success) {
            throw new BadRequestException(res.error || 'Failed to send test email');
        }

        return {
            success: true,
            messageId: res.id,
            message: `Test email sent to ${input.recipientEmail} via ${config.provider}.`,
        };
    }

    async sendWorkspaceEmail(workspaceId: string, options: EmailOptions): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
        const config = await this.prisma.workspaceEmailConfig.findUnique({
            where: { workspaceId },
        });

        if (!config || !config.isActive) {
            logger.warn({ workspaceId, to: options.to }, 'Email skipped: No email platform configured by workspace owner');
            return { sent: false, reason: 'NO_EMAIL_CONFIG' };
        }

        const provider = getEmailProvider({
            provider: config.provider,
            credentials: config.credentials as any,
        });

        if (!provider) {
            logger.warn({ workspaceId, provider: config.provider }, 'Failed to instantiate configured email provider');
            return { sent: false, reason: 'INVALID_PROVIDER' };
        }

        const result = await provider.sendEmail(options);
        if (!result.success) {
            logger.error({ workspaceId, err: result.error }, 'Failed to send workspace email');
            return { sent: false, reason: result.error };
        }

        return { sent: true, messageId: result.id };
    }
}
