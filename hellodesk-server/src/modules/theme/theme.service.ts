import { Injectable } from '@nestjs/common';
import { ThemeRepository } from './theme.repository.js';

@Injectable()
export class ThemeService {
    constructor(private readonly repository: ThemeRepository) {}

    async updateTheme(workspaceId: string, body: any) {
        const { primaryColor, primaryHover, accentColor, bgColor, cardBg } = body || {};
        const updated = await this.repository.updateWorkspaceTheme(workspaceId, {
            primaryColor: primaryColor || '#2563eb',
            primaryHover: primaryHover || '#1d4ed8',
            accentColor: accentColor || '#4f46e5',
            bgColor: bgColor || '#f8fafc',
            cardBg: cardBg || '#ffffff',
        });
        return { theme: updated.theme };
    }

    async updateWorkspaceDetails(workspaceId: string, body: any) {
        const { name, shortName, logoUrl } = body || {};
        const updated = await this.repository.updateWorkspaceDetails(workspaceId, {
            ...(name ? { name: name.toLowerCase().trim().replace(/\s+/g, '-') } : {}),
            ...(shortName !== undefined ? { shortName: shortName.trim() } : {}),
            ...(logoUrl !== undefined ? { logoUrl } : {}),
        });
        return { workspace: updated };
    }
}
