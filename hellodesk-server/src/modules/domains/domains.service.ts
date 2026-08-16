import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DomainsRepository } from './domains.repository.js';
import { registerDomainSchema } from './domains.schema.js';
import { logger } from '../../lib/logger.js';
import crypto from 'crypto';

@Injectable()
export class DomainsService {
    constructor(private readonly repository: DomainsRepository) {}

    private generateVerificationToken(): string {
        return 'verify-' + crypto.randomBytes(32).toString('hex');
    }

    async registerDomain(workspaceId: string, body: any) {
        const input = registerDomainSchema.parse(body);
        const existing = await this.repository.findUniqueDomain(input.domain);
        if (existing) {
            throw new ConflictException('Domain already registered');
        }

        const record = await this.repository.createCustomDomain(workspaceId, input.domain, this.generateVerificationToken());
        logger.info({ workspaceId, domain: input.domain }, 'domain registered');
        return record;
    }

    async verifyDomain(id: string, workspaceId: string) {
        const record = await this.repository.findDomainInWorkspace(id, workspaceId);
        if (!record) {
            throw new NotFoundException('Domain not found');
        }

        if (record.verificationStatus === 'verified') {
            return record;
        }

        let verified = false;
        try {
            const { promises: dns } = await import('dns');
            const txtRecords = await dns.resolveTxt(`_hellodesk.${record.domain}`).catch(() => []);
            verified = txtRecords.some((r) => r.join('').includes(record.verificationToken));
        } catch (err) {
            logger.warn({ id, domain: record.domain }, 'DNS lookup failed');
        }

        if (verified) {
            const updated = await this.repository.updateVerificationStatus(id, 'verified', new Date());
            logger.info({ id, domain: record.domain }, 'domain verified');
            return updated;
        } else {
            const updated = await this.repository.updateVerificationStatus(id, 'failed');
            logger.warn({ id, domain: record.domain }, 'domain verification failed');
            return updated;
        }
    }

    async getDomainForWorkspace(workspaceId: string) {
        const domain = await this.repository.findDomainForWorkspace(workspaceId);
        return domain ?? null;
    }
}
