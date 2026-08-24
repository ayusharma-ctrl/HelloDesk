import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type AuthUser } from '../../lib/auth.js';
import { ToolRegistryService } from './tools/tool-registry.service.js';
import { CustomToolService } from './tools/custom-tool.service.js';
import { HybridRetrieverService } from './retrieval/hybrid-retriever.service.js';
import { AgentRuntimeService } from './agent/agent-runtime.service.js';
import { EvaluationService } from './eval/evaluation.service.js';
import { CostAccountingService } from './cost/cost-accounting.service.js';
import { z } from 'zod';

const executeAgentSchema = z.object({
    conversationId: z.string().uuid(),
    message: z.string().min(1),
    channel: z.enum(['chat', 'email', 'voice']).optional().default('chat')
});

const searchSchema = z.object({
    query: z.string().min(1),
    topK: z.number().optional().default(4)
});

const createCustomToolSchema = z.object({
    name: z.string().min(2),
    description: z.string().min(5),
    endpointUrl: z.string().url(),
    httpMethod: z.enum(['GET', 'POST']).default('GET'),
    headers: z.record(z.string()).optional(),
    paramsSchema: z.array(z.object({
        name: z.string(),
        type: z.enum(['string', 'number', 'boolean']),
        description: z.string(),
        required: z.boolean()
    })).optional()
});

const testCustomToolSchema = z.object({
    endpointUrl: z.string().url(),
    httpMethod: z.enum(['GET', 'POST']).default('GET'),
    headers: z.record(z.string()).optional(),
    testParams: z.record(z.any()).optional()
});

@Controller('ai')
export class AiController {
    constructor(
        @Inject(ToolRegistryService) private readonly toolRegistry: ToolRegistryService,
        @Inject(CustomToolService) private readonly customToolService: CustomToolService,
        @Inject(HybridRetrieverService) private readonly hybridRetriever: HybridRetrieverService,
        @Inject(AgentRuntimeService) private readonly agentRuntime: AgentRuntimeService,
        @Inject(EvaluationService) private readonly evalService: EvaluationService,
        @Inject(CostAccountingService) private readonly costService: CostAccountingService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Get('tools')
    listTools() {
        return { tools: this.toolRegistry.listTools() };
    }

    @UseGuards(JwtAuthGuard)
    @Get('custom-tools')
    async listCustomTools(@CurrentUser() user: AuthUser) {
        const tools = await this.customToolService.listCustomTools(user.workspaceId);
        return { tools };
    }

    @UseGuards(JwtAuthGuard)
    @Post('custom-tools')
    async createCustomTool(@CurrentUser() user: AuthUser, @Body() body: any) {
        const input = createCustomToolSchema.parse(body);
        const tool = await this.customToolService.createCustomTool(user.workspaceId, input);
        return { tool };
    }

    @UseGuards(JwtAuthGuard)
    @Post('custom-tools/test')
    async testCustomTool(@Body() body: any) {
        const input = testCustomToolSchema.parse(body);
        return this.customToolService.testCustomTool(
            input.endpointUrl,
            input.httpMethod,
            input.headers,
            input.testParams
        );
    }

    @UseGuards(JwtAuthGuard)
    @Patch('custom-tools/:id/status')
    async toggleCustomToolStatus(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() body: { isActive: boolean }
    ) {
        const tool = await this.customToolService.toggleStatus(user.workspaceId, id, body.isActive);
        return { tool };
    }

    @UseGuards(JwtAuthGuard)
    @Delete('custom-tools/:id')
    async deleteCustomTool(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.customToolService.deleteCustomTool(user.workspaceId, id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('retrieval/search')
    async testSearch(@CurrentUser() user: AuthUser, @Body() body: any) {
        const input = searchSchema.parse(body);
        return this.hybridRetriever.retrieve(user.workspaceId, input.query, input.topK);
    }

    @UseGuards(JwtAuthGuard)
    @Post('agent/execute')
    async executeAgent(@CurrentUser() user: AuthUser, @Body() body: any) {
        const input = executeAgentSchema.parse(body);
        const state = await this.agentRuntime.runAgent(
            user.workspaceId,
            input.conversationId,
            input.message,
            input.channel
        );

        return {
            finalResponse: state.finalResponse,
            iterations: state.iterationCount,
            toolCalls: state.toolCalls,
            tokensUsed: state.tokensUsed,
            isHandoffRequested: state.isHandoffRequested,
            fastPathMatched: state.fastPathMatched
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('eval/run')
    async runEvaluation(@CurrentUser() user: AuthUser) {
        return this.evalService.runBenchmark(user.workspaceId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('cost/analytics')
    async getCostAnalytics(@CurrentUser() user: AuthUser) {
        return this.costService.getWorkspaceAnalytics(user.workspaceId);
    }
}
