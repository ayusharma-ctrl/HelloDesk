import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { inviteSchema, updateRoleSchema, updateStatusSchema } from './users.schema.js';
import { hashPassword } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';
import { withRetry } from '../../lib/retry.js';
import crypto from 'crypto';

@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    private async sendInviteEmail(to: string, name: string, tempPassword: string, appBaseUrl: string): Promise<void> {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL;

        if (!apiKey || !from) {
            logger.warn({ to }, 'RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping invite email');
            return;
        }

        const response = await withRetry(() =>
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from,
                    to: [to],
                    subject: 'You have been invited to HelloDesk',
                    text: `Hi ${name},\n\nYou have been invited to HelloDesk. Log in at:\n${appBaseUrl}/login\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nPlease change your password after first login.\n\nThe HelloDesk team`,
                }),
            }),
        );

        if (!response.ok) {
            const text = await response.text();
            logger.warn({ to, status: response.status, text }, 'Resend invite email failed');
        } else {
            logger.info({ to }, 'Invite email sent');
        }
    }

    async listUsers(workspaceId: string) {
        return this.usersRepository.listUsers(workspaceId);
    }

    async inviteUser(workspaceId: string, body: any) {
        const input = inviteSchema.parse(body);
        const roleRecord = await this.usersRepository.findRoleByName(input.role);
        if (!roleRecord) {
            throw new BadRequestException('Unknown role');
        }

        const existing = await this.usersRepository.findUserByEmail(input.email);
        if (existing) {
            throw new ConflictException('User already exists with that email');
        }

        const tempPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);
        const passwordHash = await hashPassword(tempPassword);

        const user = await this.usersRepository.createUser({
            workspaceId,
            roleId: roleRecord.id,
            name: input.name,
            email: input.email,
            passwordHash,
        });

        const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
        this.sendInviteEmail(user.email, user.name, tempPassword, appBaseUrl);
        logger.info({ userId: user.id, workspaceId }, 'user invited');

        return user;
    }

    async updateRole(userId: string, workspaceId: string, body: any) {
        const input = updateRoleSchema.parse(body);
        const target = await this.usersRepository.findUserInWorkspace(userId, workspaceId);
        if (!target) {
            throw new NotFoundException('User not found');
        }

        const roleRecord = await this.usersRepository.findRoleByName(input.role);
        if (!roleRecord) {
            throw new BadRequestException('Unknown role');
        }

        return this.usersRepository.updateUserRole(userId, roleRecord.id);
    }

    async updateStatus(userId: string, workspaceId: string, body: any) {
        const input = updateStatusSchema.parse(body);
        const target = await this.usersRepository.findUserInWorkspace(userId, workspaceId);
        if (!target) {
            throw new NotFoundException('User not found');
        }

        return this.usersRepository.updateUserStatus(userId, input.isActive);
    }
}
