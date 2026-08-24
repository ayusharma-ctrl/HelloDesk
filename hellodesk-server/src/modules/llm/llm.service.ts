import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { LlmRepository } from './llm.repository.js';
import { testLlmCredentials } from '../../services/langchain.service.js';
import { verifyModelSchema, addModelSchema, updateAiSettingsSchema } from './llm.dto.js';

@Injectable()
export class LlmService {
    constructor(@Inject(LlmRepository) private readonly repository: LlmRepository) {}

    async listModels(workspaceId: string) {
        const workspace = await this.repository.getWorkspaceWithTier(workspaceId);
        const models = await this.repository.listModels(workspaceId);
        return { workspace, models };
    }

    async verifyModel(body: any) {
        const input = verifyModelSchema.parse(body);
        const result = await testLlmCredentials(input.provider, input.modelName, input.apiKey);
        if (!result.success) {
            throw new BadRequestException(result.error || 'Failed to verify API key credentials');
        }
        return { verified: true };
    }

    async addModel(workspaceId: string, body: any) {
        const input = addModelSchema.parse(body);
        const workspace = await this.repository.getWorkspaceTier(workspaceId);
        const maxModels = workspace?.workspaceTier?.maxCustomModels ?? 3;
        const count = await this.repository.countModels(workspaceId);

        if (count >= maxModels) {
            throw new BadRequestException(
                `Workspace tier limit reached: Max ${maxModels} LLM models allowed on ${workspace?.workspaceTier?.name || workspace?.tierKey} tier`,
            );
        }

        const testResult = await testLlmCredentials(input.provider, input.modelName, input.apiKey);
        if (!testResult.success) {
            throw new BadRequestException(testResult.error || 'Credentials verification failed');
        }

        const isDefault = count === 0;
        const model = await this.repository.createModel(workspaceId, input.provider, input.modelName, input.apiKey, isDefault);
        return { model };
    }

    async setDefaultModel(workspaceId: string, modelId: string) {
        await this.repository.setDefaultModel(workspaceId, modelId);
        return { success: true };
    }

    async deleteModel(workspaceId: string, modelId: string) {
        const model = await this.repository.findModel(workspaceId, modelId);
        if (!model) {
            throw new NotFoundException('Model not found');
        }

        await this.repository.deleteModel(modelId);

        if (model.isDefault) {
            const remaining = await this.repository.findFirstModel(workspaceId);
            if (remaining) {
                await this.repository.setModelAsDefault(remaining.id);
            }
        }

        return { success: true };
    }

    async updateAiSettings(workspaceId: string, body: any) {
        const input = updateAiSettingsSchema.parse(body);
        const updated = await this.repository.updateAiSettings(workspaceId, input.aiEnabled);
        return { aiEnabled: updated.aiEnabled };
    }

    async getObservabilityLogs(workspaceId: string) {
        const logs = await this.repository.getObservabilityLogs(workspaceId);
        return { logs };
    }
}
