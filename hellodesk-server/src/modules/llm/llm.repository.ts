import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { testLlmCredentials } from '../../services/langchain.service.js';

@Injectable()
export class LlmRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getWorkspaceWithTier(workspaceId: string) {
        return this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                aiEnabled: true,
                tierKey: true,
                freeTierTokensUsed: true,
                freeTierResetAt: true,
                workspaceTier: true,
            },
        });
    }

    async getWorkspaceTier(workspaceId: string) {
        return this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { workspaceTier: true },
        });
    }

    async listModels(workspaceId: string) {
        return this.prisma.llmModel.findMany({
            where: { workspaceId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
    }

    async countModels(workspaceId: string) {
        return this.prisma.llmModel.count({ where: { workspaceId } });
    }

    async createModel(workspaceId: string, provider: string, modelName: string, apiKey: string, isDefault: boolean) {
        return this.prisma.llmModel.create({
            data: {
                workspaceId,
                provider,
                modelName,
                apiKey,
                isDefault,
                status: 'verified',
            },
        });
    }

    async setDefaultModel(workspaceId: string, modelId: string) {
        return this.prisma.$transaction([
            this.prisma.llmModel.updateMany({
                where: { workspaceId },
                data: { isDefault: false },
            }),
            this.prisma.llmModel.update({
                where: { id: modelId },
                data: { isDefault: true },
            }),
        ]);
    }

    async findModel(workspaceId: string, modelId: string) {
        return this.prisma.llmModel.findFirst({
            where: { id: modelId, workspaceId },
        });
    }

    async deleteModel(modelId: string) {
        return this.prisma.llmModel.delete({ where: { id: modelId } });
    }

    async findFirstModel(workspaceId: string) {
        return this.prisma.llmModel.findFirst({ where: { workspaceId } });
    }

    async setModelAsDefault(modelId: string) {
        return this.prisma.llmModel.update({
            where: { id: modelId },
            data: { isDefault: true },
        });
    }

    async updateAiSettings(workspaceId: string, aiEnabled?: boolean) {
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { ...(aiEnabled !== undefined ? { aiEnabled: Boolean(aiEnabled) } : {}) },
        });
    }

    async getObservabilityLogs(workspaceId: string) {
        return this.prisma.llmRequestLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
}
