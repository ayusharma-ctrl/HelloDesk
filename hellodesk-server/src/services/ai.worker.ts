import { Worker, Queue, Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { generateContent } from '../lib/gemini.js';
import { redis } from '../lib/redis.js';
import { Server } from 'socket.io';

export const aiSummaryQueue = new Queue('ai-summary', { connection: redis });
export const aiDraftQueue = new Queue('ai-draft', { connection: redis });

export async function requestAiSummary(conversationId: string) {
    await aiSummaryQueue.add('summarize', { conversationId }, { removeOnComplete: true });
}

export async function requestAiDraft(conversationId: string) {
    await aiDraftQueue.add('draft', { conversationId }, { removeOnComplete: true });
}

const workerOptions = { connection: redis };

export function startAiWorkers(io: Server) {
    // SUMMARY WORKER
    new Worker('ai-summary', async (job: Job) => {
        const { conversationId } = job.data;
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                contact: true
            }
        });

        if (!conversation) return;

        const transcript = conversation.messages
            .map(m => `${m.senderType.toUpperCase()}: ${m.body}`)
            .join('\\n');

        const prompt = `Summarize the following customer support conversation in 1-2 concise sentences. Be direct and helpful.\\n\\nTranscript:\\n${transcript}`;

        const aiSummary = await generateContent(prompt);

        if (aiSummary) {
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { aiSummary, aiSummaryAt: new Date() }
            });

            logger.info({ conversationId }, 'AI summary generated');

            if (io) {
                io.to(`workspace:${conversation.workspaceId}`).emit('ai:summary-ready', { conversationId, summary: aiSummary });
            }
        }
    }, workerOptions);

    // DRAFT WORKER
    new Worker('ai-draft', async (job: Job) => {
        const { conversationId } = job.data;
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                contact: true
            }
        });

        if (!conversation) return;

        const transcript = conversation.messages
            .map(m => `${m.senderType.toUpperCase()}: ${m.body}`)
            .join('\\n');

        const prompt = `You are a helpful customer support agent. Below is the transcript of a conversation. Write a polite, helpful reply to the customer (CONTACT). Keep it relatively brief.\\n\\nTranscript:\\n${transcript}\\n\\nAgent draft reply:`;

        const draftText = await generateContent(prompt);

        if (draftText) {
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderType: 'agent',
                    body: draftText.trim(),
                    isAiDraft: true
                }
            });

            logger.info({ conversationId }, 'AI draft generated');

            if (io) {
                // Do not send draft into the visitor socket, ONLY to workspace
                io.to(`workspace:${conversation.workspaceId}`).emit('ai:draft-ready', { conversationId, draft: message });
            }
        }
    }, workerOptions);
}
