import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AgentTool, ToolExecutionContext, ToolExecutionResult } from './tool.interface.js';
import { SearchKbTool } from './implementations/search-kb.tool.js';
import { GetCustomerProfileTool } from './implementations/get-customer-profile.tool.js';
import { GetBillingInfoTool } from './implementations/get-billing-info.tool.js';
import { CheckSystemStatusTool } from './implementations/check-system-status.tool.js';
import { GetWorkspacePolicyTool } from './implementations/get-workspace-policy.tool.js';
import { AssignToHumanAgentTool } from './implementations/assign-to-human.tool.js';
import { CustomToolService } from './custom-tool.service.js';
import { logger } from '../../../lib/logger.js';

@Injectable()
export class ToolRegistryService {
    private builtInTools = new Map<string, AgentTool>();

    constructor(
        @Inject(PrismaService) private readonly prisma: PrismaService,
        @Inject(SearchKbTool) private readonly searchKbTool?: SearchKbTool,
        @Inject(GetCustomerProfileTool) private readonly getCustomerProfileTool?: GetCustomerProfileTool,
        @Inject(GetBillingInfoTool) private readonly getBillingInfoTool?: GetBillingInfoTool,
        @Inject(CheckSystemStatusTool) private readonly checkSystemStatusTool?: CheckSystemStatusTool,
        @Inject(GetWorkspacePolicyTool) private readonly getWorkspacePolicyTool?: GetWorkspacePolicyTool,
        @Inject(AssignToHumanAgentTool) private readonly assignToHumanAgentTool?: AssignToHumanAgentTool,
        @Optional() @Inject(CustomToolService) private readonly customToolService?: CustomToolService
    ) {
        if (this.searchKbTool) this.register(this.searchKbTool);
        if (this.getCustomerProfileTool) this.register(this.getCustomerProfileTool);
        if (this.getBillingInfoTool) this.register(this.getBillingInfoTool);
        if (this.checkSystemStatusTool) this.register(this.checkSystemStatusTool);
        if (this.getWorkspacePolicyTool) this.register(this.getWorkspacePolicyTool);
        if (this.assignToHumanAgentTool) this.register(this.assignToHumanAgentTool);
    }

    register(tool?: AgentTool): void {
        if (tool && tool.name) {
            this.builtInTools.set(tool.name, tool);
        }
    }

    getTool(name: string): AgentTool | undefined {
        return this.builtInTools.get(name);
    }

    listTools(): Array<{ name: string; description: string; riskLevel: string }> {
        return Array.from(this.builtInTools.values()).map(t => ({
            name: t.name,
            description: t.description,
            riskLevel: t.riskLevel
        }));
    }

    /**
     * Generate prompt guidance for tool calling, including built-in domain tools
     * and active tenant custom tools.
     */
    async getToolDescriptionsPrompt(workspaceId?: string): Promise<string> {
        const toolList = Array.from(this.builtInTools.values()).map(t => {
            return `- ${t.name}: ${t.description}`;
        });

        // If workspace has custom API tools active, dynamically append them
        if (workspaceId) {
            try {
                const customTools = await this.prisma.customTool.findMany({
                    where: { workspaceId, isActive: true }
                });
                for (const ct of customTools) {
                    toolList.push(`- ${ct.name}: ${ct.description} (Custom API Integration: ${ct.httpMethod} ${ct.endpointUrl})`);
                }
            } catch {}
        }

        return `Available Approved Tools:\n${toolList.join('\n')}\n\nTo call a tool, respond with JSON format:\n{"action": "tool_call", "toolName": "<name>", "parameters": {...}}\nIf no tool is needed or sufficient information is present, respond with:\n{"action": "final_response", "message": "<your answer>"}`;
    }

    /**
     * Safely execute a registered built-in or custom tool with tenant authorization and audit logging.
     */
    async executeTool(
        name: string,
        context: ToolExecutionContext,
        rawParams: any,
        timeoutMs = 5000
    ): Promise<ToolExecutionResult> {
        const startTime = Date.now();

        // 1. Check if built-in tool exists
        const builtInTool = this.builtInTools.get(name);
        if (builtInTool) {
            try {
                const validatedInput = builtInTool.inputSchema.parse(rawParams);
                const executePromise = builtInTool.execute(context, validatedInput);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Tool ${name} timed out after ${timeoutMs}ms`)), timeoutMs)
                );

                const result = await Promise.race([executePromise, timeoutPromise]);
                const latencyMs = Date.now() - startTime;

                try {
                    await this.prisma.toolExecutionLog.create({
                        data: {
                            agentRunId: context.agentRunId,
                            workspaceId: context.workspaceId,
                            toolName: name,
                            inputParams: rawParams ?? {},
                            outputData: result ?? {},
                            status: 'success',
                            latencyMs
                        }
                    });
                } catch {}

                return { success: true, data: result, latencyMs };
            } catch (err: any) {
                const latencyMs = Date.now() - startTime;
                logger.warn({ toolName: name, err: err.message }, 'Built-in tool error');
                return { success: false, error: err.message || 'Tool execution failed', latencyMs };
            }
        }

        // 2. Check if custom tool exists for this workspace
        if (this.customToolService) {
            try {
                const customTool = await this.prisma.customTool.findFirst({
                    where: { workspaceId: context.workspaceId, name, isActive: true }
                });

                if (customTool) {
                    const customResult = await this.customToolService.executeCustomTool(customTool, rawParams);

                    try {
                        await this.prisma.toolExecutionLog.create({
                            data: {
                                agentRunId: context.agentRunId,
                                workspaceId: context.workspaceId,
                                toolName: name,
                                inputParams: rawParams ?? {},
                                outputData: customResult.data ?? { error: customResult.error },
                                status: customResult.success ? 'success' : 'error',
                                latencyMs: customResult.latencyMs
                            }
                        });
                    } catch {}

                    return customResult;
                }
            } catch (customErr: any) {
                logger.warn({ toolName: name, err: customErr.message }, 'Custom tool execution error');
            }
        }

        return {
            success: false,
            error: `Tool "${name}" is not registered or is inactive`,
            latencyMs: 0
        };
    }
}
