import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import type { RegisterDomainInput } from './domains.schema.js';
import crypto from 'crypto';

function generateVerificationToken(): string {
    return 'verify-' + crypto.randomBytes(32).toString('hex');
}

export async function registerDomain(workspaceId: string, input: RegisterDomainInput) {
    const existing = await prisma.customDomain.findUnique({ where: { domain: input.domain } });
    if (existing) {
        const err = new Error('Domain already registered') as any;
        err.status = 409;
        throw err;
    }

    const record = await prisma.customDomain.create({
        data: {
            workspaceId,
            domain: input.domain,
            verificationToken: generateVerificationToken(),
        },
    });

    logger.info({ workspaceId, domain: input.domain }, 'domain registered');
    return record;
}

export async function verifyDomain(id: string, workspaceId: string) {
    const record = await prisma.customDomain.findFirst({ where: { id, workspaceId } });
    if (!record) {
        const err = new Error('Domain not found') as any;
        err.status = 404;
        throw err;
    }

    if (record.verificationStatus === 'verified') {
        return record;
    }

    // Attempt DNS TXT lookup to check verification token
    let verified = false;
    try {
        const { promises: dns } = await import('dns');
        const txtRecords = await dns.resolveTxt(`_hellodesk.${record.domain}`).catch(() => []);
        verified = txtRecords.some((r) => r.join('').includes(record.verificationToken));
    } catch (err) {
        logger.warn({ id, domain: record.domain }, 'DNS lookup failed');
    }

    if (verified) {
        const updated = await prisma.customDomain.update({
            where: { id },
            data: { verificationStatus: 'verified', sslIssuedAt: new Date() },
        });
        logger.info({ id, domain: record.domain }, 'domain verified');
        return updated;
    } else {
        const updated = await prisma.customDomain.update({
            where: { id },
            data: { verificationStatus: 'failed' },
        });
        logger.warn({ id, domain: record.domain }, 'domain verification failed');
        return updated;
    }
}

export async function getDomainForWorkspace(workspaceId: string) {
    return prisma.customDomain.findUnique({ where: { workspaceId } });
}
