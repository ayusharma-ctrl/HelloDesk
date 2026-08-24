import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { logger } from '../../../lib/logger.js';

export interface CreateCustomToolDto {
    name: string;
    description: string;
    endpointUrl: string;
    httpMethod: 'GET' | 'POST';
    headers?: Record<string, string>;
    paramsSchema?: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean';
        description: string;
        required: boolean;
    }>;
}

@Injectable()
export class CustomToolService {
    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

    /**
     * Pre-flight credential and endpoint validation.
     * Ensures endpoint is reachable and returns HTTP 2xx before registering.
     */
    async testCustomTool(
        endpointUrl: string,
        httpMethod: 'GET' | 'POST' = 'GET',
        headers?: Record<string, string>,
        testParams?: Record<string, any>
    ): Promise<{ success: boolean; statusCode: number; sampleResponse: any; error?: string; latencyMs: number }> {
        const startTime = Date.now();

        try {
            // URL validation
            const urlObj = new URL(endpointUrl);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('Endpoint URL must use HTTP or HTTPS protocol');
            }

            let requestUrl = endpointUrl;
            let requestBody: string | undefined = undefined;

            const reqHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'HelloDesk-Agent-Tool/1.0',
                ...(headers || {}),
            };

            if (httpMethod === 'GET' && testParams) {
                const searchParams = new URLSearchParams();
                for (const [k, v] of Object.entries(testParams)) {
                    if (v !== undefined && v !== null) {
                        searchParams.append(k, String(v));
                    }
                }
                const queryString = searchParams.toString();
                if (queryString) {
                    requestUrl += (requestUrl.includes('?') ? '&' : '?') + queryString;
                }
            } else if (httpMethod === 'POST') {
                requestBody = JSON.stringify(testParams || {});
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(requestUrl, {
                method: httpMethod,
                headers: reqHeaders,
                body: requestBody,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const latencyMs = Date.now() - startTime;
            const text = await res.text();
            let sampleResponse: any = null;

            try {
                sampleResponse = JSON.parse(text);
            } catch {
                sampleResponse = text.slice(0, 500);
            }

            if (!res.ok) {
                return {
                    success: false,
                    statusCode: res.status,
                    sampleResponse,
                    error: `Endpoint returned HTTP ${res.status}: ${typeof sampleResponse === 'string' ? sampleResponse : JSON.stringify(sampleResponse)}`,
                    latencyMs,
                };
            }

            return {
                success: true,
                statusCode: res.status,
                sampleResponse,
                latencyMs,
            };
        } catch (err: any) {
            const latencyMs = Date.now() - startTime;
            return {
                success: false,
                statusCode: 0,
                sampleResponse: null,
                error: err.name === 'AbortError' ? 'Connection timed out after 5000ms' : err.message,
                latencyMs,
            };
        }
    }

    async createCustomTool(workspaceId: string, dto: CreateCustomToolDto) {
        // Sanitize tool name for LLM function calling (alphanumeric and underscores only)
        const sanitizedName = dto.name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        if (sanitizedName.length < 2) {
            throw new BadRequestException('Tool name must be at least 2 alphanumeric characters');
        }

        // Run pre-flight test validation
        const testResult = await this.testCustomTool(dto.endpointUrl, dto.httpMethod, dto.headers);
        if (!testResult.success) {
            throw new BadRequestException(`Endpoint verification failed: ${testResult.error || 'Endpoint did not return 2xx status'}`);
        }

        return this.prisma.customTool.create({
            data: {
                workspaceId,
                name: sanitizedName,
                description: dto.description.trim(),
                endpointUrl: dto.endpointUrl.trim(),
                httpMethod: dto.httpMethod,
                headers: dto.headers ?? undefined,
                paramsSchema: dto.paramsSchema ?? undefined,
                isActive: true,
            },
        });
    }

    async listCustomTools(workspaceId: string) {
        return this.prisma.customTool.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async toggleStatus(workspaceId: string, toolId: string, isActive: boolean) {
        const tool = await this.prisma.customTool.findFirst({
            where: { id: toolId, workspaceId },
        });
        if (!tool) throw new NotFoundException('Custom tool not found');

        return this.prisma.customTool.update({
            where: { id: toolId },
            data: { isActive },
        });
    }

    async deleteCustomTool(workspaceId: string, toolId: string) {
        const tool = await this.prisma.customTool.findFirst({
            where: { id: toolId, workspaceId },
        });
        if (!tool) throw new NotFoundException('Custom tool not found');

        await this.prisma.customTool.delete({
            where: { id: toolId },
        });

        return { ok: true };
    }

    async executeCustomTool(tool: any, params: Record<string, any>) {
        const startTime = Date.now();
        const testResult = await this.testCustomTool(
            tool.endpointUrl,
            tool.httpMethod,
            tool.headers as any,
            params
        );

        return {
            success: testResult.success,
            data: testResult.sampleResponse,
            error: testResult.error,
            latencyMs: Date.now() - startTime,
        };
    }
}
