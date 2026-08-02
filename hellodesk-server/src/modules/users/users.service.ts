import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import crypto from 'crypto';
import type { InviteInput, UpdateRoleInput, UpdateStatusInput } from './users.schema.js';

async function sendInviteEmail(to: string, name: string, tempPassword: string, appBaseUrl: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) {
        logger.warn({ to }, 'RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping invite email');
        return;
    }

    const response = await withRetry(() => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from,
            to: [to],
            subject: 'You have been invited to HelloDesk',
            text: `Hi ${name},\n\nYou have been invited to HelloDesk. Log in at:\n${appBaseUrl}/login\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nPlease change your password after first login.\n\nThe HelloDesk team`,
        }),
    }));

    if (!response.ok) {
        const text = await response.text();
        logger.warn({ to, status: response.status, text }, 'Resend invite email failed');
    } else {
        logger.info({ to }, 'Invite email sent');
    }
}

export async function listUsers(workspaceId: string) {
    return prisma.user.findMany({
        where: { workspaceId },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
    });
}

export async function inviteUser(input: InviteInput, workspaceId: string) {
    const roleRecord = await prisma.role.findUnique({ where: { name: input.role } });
    if (!roleRecord) {
        const err = new Error('Unknown role') as any;
        err.status = 400;
        throw err;
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
        const err = new Error('User already exists with that email') as any;
        err.status = 409;
        throw err;
    }

    // Generate a secure random temporary password using Node crypto
    const tempPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);

    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
        data: { workspaceId, roleId: roleRecord.id, name: input.name, email: input.email, passwordHash },
        include: { role: true },
    });

    const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

    logger.info({ email: input.email, tempPassword }, 'tempPassword');

    // send invite email asynchronously
    sendInviteEmail(user.email, user.name, tempPassword, appBaseUrl);

    logger.info({ userId: user.id, workspaceId }, 'user invited');

    return user;
}

export async function updateRole(userId: string, workspaceId: string, input: UpdateRoleInput) {
    const target = await prisma.user.findFirst({ where: { id: userId, workspaceId } });
    if (!target) {
        const err = new Error('User not found') as any;
        err.status = 404;
        throw err;
    }

    const roleRecord = await prisma.role.findUnique({ where: { name: input.role } });
    if (!roleRecord) {
        const err = new Error('Unknown role') as any;
        err.status = 400;
        throw err;
    }

    return prisma.user.update({ where: { id: userId }, data: { roleId: roleRecord.id }, include: { role: true } });
}

export async function updateStatus(userId: string, workspaceId: string, input: UpdateStatusInput) {
    const target = await prisma.user.findFirst({ where: { id: userId, workspaceId } });
    if (!target) {
        const err = new Error('User not found') as any;
        err.status = 404;
        throw err;
    }

    return prisma.user.update({ where: { id: userId }, data: { isActive: input.isActive }, include: { role: true } });
}
