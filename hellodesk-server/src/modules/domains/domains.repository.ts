import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class DomainsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findUniqueDomain(domain: string) {
        return this.prisma.customDomain.findUnique({ where: { domain } });
    }

    async createCustomDomain(workspaceId: string, domain: string, verificationToken: string) {
        return this.prisma.customDomain.create({
            data: {
                workspaceId,
                domain,
                verificationToken,
            },
        });
    }

    async findDomainInWorkspace(id: string, workspaceId: string) {
        return this.prisma.customDomain.findFirst({ where: { id, workspaceId } });
    }

    async updateVerificationStatus(id: string, status: 'verified' | 'failed', sslIssuedAt?: Date) {
        return this.prisma.customDomain.update({
            where: { id },
            data: {
                verificationStatus: status,
                ...(sslIssuedAt ? { sslIssuedAt } : {}),
            },
        });
    }

    async findDomainForWorkspace(workspaceId: string) {
        return this.prisma.customDomain.findUnique({ where: { workspaceId } });
    }
}
