import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { testLlmCredentials } from '../../services/langchain.service.js';

export async function listModels(req: Request, res: Response) {
    try {
        const workspaceId = req.user!.workspaceId;
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                aiEnabled: true,
                tier: true,
                freeTierTokensUsed: true,
                freeTierTokenLimit: true,
                freeTierResetAt: true,
            }
        });

        const models = await prisma.llmModel.findMany({
            where: { workspaceId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });

        return res.json({ workspace, models });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to list LLM models' });
    }
}

export async function verifyModel(req: Request, res: Response) {
    try {
        const { provider, modelName, apiKey } = req.body;
        if (!provider || !modelName || !apiKey) {
            return res.status(400).json({ error: 'Provider, modelName, and apiKey are required' });
        }

        const result = await testLlmCredentials(provider, modelName, apiKey);
        if (!result.success) {
            return res.status(400).json({ error: result.error || 'Failed to verify API key credentials' });
        }

        return res.json({ verified: true });
    } catch (err: any) {
        return res.status(400).json({ error: err?.message ?? 'Verification failed' });
    }
}

export async function addModel(req: Request, res: Response) {
    try {
        const { provider, modelName, apiKey } = req.body;
        const workspaceId = req.user!.workspaceId;

        const count = await prisma.llmModel.count({ where: { workspaceId } });
        if (count >= 5) {
            return res.status(400).json({ error: 'Workspace limit reached: Max 5 LLM models allowed' });
        }

        // Test credentials before adding
        const testResult = await testLlmCredentials(provider, modelName, apiKey);
        if (!testResult.success) {
            return res.status(400).json({ error: testResult.error || 'Credentials verification failed' });
        }

        const isDefault = count === 0; // First added model becomes default automatically

        const newModel = await prisma.llmModel.create({
            data: {
                workspaceId,
                provider,
                modelName,
                apiKey,
                isDefault,
                status: 'verified',
            }
        });

        return res.status(201).json({ model: newModel });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to add model' });
    }
}

export async function setDefaultModel(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const workspaceId = req.user!.workspaceId;

        await prisma.$transaction([
            prisma.llmModel.updateMany({
                where: { workspaceId },
                data: { isDefault: false }
            }),
            prisma.llmModel.update({
                where: { id },
                data: { isDefault: true }
            })
        ]);

        return res.json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to set default model' });
    }
}

export async function deleteModel(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const workspaceId = req.user!.workspaceId;

        const model = await prisma.llmModel.findFirst({ where: { id, workspaceId } });
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        await prisma.llmModel.delete({ where: { id } });

        // If deleted model was default, make remaining model default
        if (model.isDefault) {
            const remaining = await prisma.llmModel.findFirst({ where: { workspaceId } });
            if (remaining) {
                await prisma.llmModel.update({
                    where: { id: remaining.id },
                    data: { isDefault: true }
                });
            }
        }

        return res.json({ success: true });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to delete model' });
    }
}

export async function updateAiSettings(req: Request, res: Response) {
    try {
        const { aiEnabled } = req.body;
        const workspaceId = req.user!.workspaceId;

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { ...(aiEnabled !== undefined ? { aiEnabled: Boolean(aiEnabled) } : {}) }
        });

        return res.json({ aiEnabled: updated.aiEnabled });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to update AI settings' });
    }
}

export async function getObservabilityLogs(req: Request, res: Response) {
    try {
        const workspaceId = req.user!.workspaceId;
        const logs = await prisma.llmRequestLog.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return res.json({ logs });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message ?? 'Failed to fetch observability logs' });
    }
}
