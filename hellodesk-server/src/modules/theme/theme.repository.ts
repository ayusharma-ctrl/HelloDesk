import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ThemeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async updateWorkspaceTheme(workspaceId: string, theme: any) {
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { theme },
        });
    }

    async updateWorkspaceDetails(workspaceId: string, data: any) {
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data,
        });
    }
}
