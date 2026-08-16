import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class WidgetRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findWorkspace(id: string) {
        return this.prisma.workspace.findUnique({ where: { id } });
    }

    async upsertContact(visitorId: string, workspaceId: string, email?: string, name?: string) {
        return this.prisma.contact.upsert({
            where: { visitorId },
            update: { ...(email ? { email } : {}), ...(name ? { name } : {}) },
            create: { workspaceId, visitorId, email, name },
        });
    }

    async createConversation(workspaceId: string, contactId: string, channel: any) {
        return this.prisma.conversation.create({
            data: { workspaceId, contactId, channel, status: 'open' },
        });
    }

    async createMessage(data: { conversationId: string; senderType: string; body: string; attachments?: any; mediaType?: string }) {
        return this.prisma.message.create({
            data: {
                ...data,
                senderType: data.senderType as any,
                mediaType: data.mediaType as any,
            },
        });
    }

    async updateConversationLastMessage(id: string, lastMessageId: string) {
        return this.prisma.conversation.update({
            where: { id },
            data: { lastMessageId, updatedAt: new Date() },
        });
    }

    async findConversationWithDetails(id: string) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: { contact: true, assignee: true },
        });
    }

    async findConversationSimple(id: string) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: { contact: true },
        });
    }

    async findConversationHistory(conversationId: string, visitorId: string) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, contact: { visitorId } },
            include: {
                messages: {
                    where: { isAiDraft: false },
                    orderBy: { createdAt: 'asc' },
                },
                contact: true,
            },
        });
        return conversation;
    }

    async findKbSuggestions(query: string, workspaceId?: string) {
        return this.prisma.article.findMany({
            where: {
                status: 'published',
                ...(workspaceId ? { workspaceId } : {}),
                ...(query
                    ? {
                          OR: [
                              { title: { contains: query, mode: 'insensitive' } },
                              { content: { contains: query, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
            },
            take: 5,
        });
    }
}
