import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ConversationsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async countConversations(whereClause: any) {
        return this.prisma.conversation.count({ where: whereClause });
    }

    async findManyConversations(whereClause: any, skip: number, limit: number) {
        return this.prisma.conversation.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
                contact: true,
                assignee: { include: { role: true } },
                messages: { where: { isAiDraft: false }, orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findConversationById(id: string, workspaceId: string) {
        return this.prisma.conversation.findFirst({
            where: { id, workspaceId },
            include: {
                contact: true,
                assignee: { include: { role: true } },
                messages: {
                    where: { isAiDraft: false },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
    }

    async findConversationSimple(id: string, workspaceId: string) {
        return this.prisma.conversation.findFirst({
            where: { id, workspaceId },
            include: { contact: true },
        });
    }

    async createMessage(data: { conversationId: string; senderType: string; senderUserId?: string; body: string; isInternalNote?: boolean; mediaType?: string; attachments?: any }) {
        return this.prisma.message.create({
            data: {
                ...data,
                senderType: data.senderType as any,
            },
        });
    }

    async updateConversationDate(id: string) {
        return this.prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
    }

    async updateConversationStatus(id: string, status: string) {
        return this.prisma.conversation.update({
            where: { id },
            data: { status: status as any, updatedAt: new Date() },
            include: { contact: true, assignee: { include: { role: true } } },
        });
    }

    async updateConversationAssignee(id: string, assigneeId: string | null) {
        return this.prisma.conversation.update({
            where: { id },
            data: { assigneeId, updatedAt: new Date() },
            include: { contact: true, assignee: { include: { role: true } } },
        });
    }

    async updateMessagesAsRead(conversationId: string) {
        return this.prisma.message.updateMany({
            where: { conversationId, senderType: 'contact', readAt: null },
            data: { readAt: new Date() },
        });
    }

    async findAiSummary(conversationId: string) {
        return this.prisma.message.findFirst({
            where: { conversationId, senderType: 'system', isAiDraft: false },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAiDraft(conversationId: string) {
        return this.prisma.message.findFirst({
            where: { conversationId, isAiDraft: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateRating(id: string, rating: number, feedbackOption: string) {
        return this.prisma.conversation.update({
            where: { id },
            data: {
                rating,
                ratingFeedback: feedbackOption,
                updatedAt: new Date(),
            },
            include: { contact: true, assignee: { include: { role: true } } },
        });
    }
}
