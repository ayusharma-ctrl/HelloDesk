import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class WebhooksRepository {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async findWorkspace(id: string) {
        return this.prisma.workspace.findUnique({ where: { id } });
    }

    async findThreadConversation(workspaceId: string, threadCandidates: string[]) {
        return this.prisma.conversation.findFirst({
            where: {
                workspaceId,
                channel: 'email',
                messages: { some: { OR: [{ emailMessageId: { in: threadCandidates } }, { emailInReplyTo: { in: threadCandidates } }] } },
            },
        });
    }

    async findContactByEmail(workspaceId: string, email: string) {
        return this.prisma.contact.findFirst({ where: { workspaceId, email } });
    }

    async createContact(workspaceId: string, email: string, name: string) {
        return this.prisma.contact.create({ data: { workspaceId, email, name } });
    }

    async createConversation(workspaceId: string, contactId: string) {
        return this.prisma.conversation.create({
            data: { workspaceId, contactId, channel: 'email', status: 'open' },
        });
    }

    async createMessage(data: { conversationId: string; senderType: string; body: string; emailMessageId?: string; emailInReplyTo?: string }) {
        return this.prisma.message.create({
            data: {
                ...data,
                senderType: data.senderType as any,
            },
        });
    }

    async updateConversationOnInbound(id: string, contactId: string, lastMessageId: string, isNew: boolean) {
        return this.prisma.conversation.update({
            where: { id },
            data: { contactId, lastMessageId, updatedAt: new Date(), ...(isNew ? {} : { status: 'open' }) },
        });
    }
}
