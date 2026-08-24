import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { calculateCostUsd } from './pricing-matrix.js';

export interface WorkspaceCostAnalytics {
    workspaceId: string;
    totalTokens: number;
    estimatedCostUsd: number;
    totalRequests: number;
    breakdownByTask: Record<string, { requests: number; tokens: number; costUsd: number }>;
    fastPathCount: number;
}

@Injectable()
export class CostAccountingService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    async getWorkspaceAnalytics(workspaceId: string): Promise<WorkspaceCostAnalytics> {
        const logs = await this.prisma.llmRequestLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        let totalTokens = 0;
        let estimatedCostUsd = 0;
        const breakdown: Record<string, { requests: number; tokens: number; costUsd: number }> = {};

        for (const log of logs) {
            const cost = calculateCostUsd(log.modelName, log.promptTokens, log.responseTokens);
            totalTokens += log.totalTokens;
            estimatedCostUsd += cost;

            if (!breakdown[log.taskType]) {
                breakdown[log.taskType] = { requests: 0, tokens: 0, costUsd: 0 };
            }
            breakdown[log.taskType].requests += 1;
            breakdown[log.taskType].tokens += log.totalTokens;
            breakdown[log.taskType].costUsd += cost;
        }

        // Round cost values
        estimatedCostUsd = Number(estimatedCostUsd.toFixed(4));
        for (const key of Object.keys(breakdown)) {
            breakdown[key].costUsd = Number(breakdown[key].costUsd.toFixed(4));
        }

        return {
            workspaceId,
            totalTokens,
            estimatedCostUsd,
            totalRequests: logs.length,
            breakdownByTask: breakdown,
            fastPathCount: 0
        };
    }
}
