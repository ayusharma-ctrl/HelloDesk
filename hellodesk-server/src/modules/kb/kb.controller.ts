import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { KbService } from './kb.service.js';
import type { AuthUser } from '../../lib/auth.js';

@Controller('kb')
export class KbController {
    constructor(@Inject(KbService) private readonly kbService: KbService) {}

    @Get('public/search')
    async publicSearch(@Query('q') q?: string, @Query('workspaceId') workspaceId?: string, @Headers('host') hostHeader?: string, @Headers('x-forwarded-host') fwdHost?: string) {
        const host = fwdHost ? String(fwdHost) : hostHeader;
        return this.kbService.publicSearch(q ?? '', workspaceId, host);
    }

    @Get('public/articles/:slug')
    async publicGetBySlug(@Param('slug') slug: string, @Query('workspaceId') workspaceId?: string, @Headers('host') hostHeader?: string, @Headers('x-forwarded-host') fwdHost?: string) {
        const host = fwdHost ? String(fwdHost) : hostHeader;
        const article = await this.kbService.publicGetBySlug(slug, workspaceId, host);
        return { article };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Get('categories')
    async listCategories(@CurrentUser() user: AuthUser) {
        const categories = await this.kbService.listCategories(user.workspaceId);
        return { categories };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Post('categories')
    async createCategory(@CurrentUser() user: AuthUser, @Body() body: any) {
        const category = await this.kbService.createCategory(user.workspaceId, body);
        return { category };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Get('articles')
    async listArticles(@CurrentUser() user: AuthUser) {
        const articles = await this.kbService.listArticles(user.workspaceId);
        return { articles };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Post('articles')
    async createArticle(@CurrentUser() user: AuthUser, @Body() body: any) {
        const article = await this.kbService.createArticle(user.workspaceId, body);
        return { article };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Put('articles/:id')
    async updateArticle(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
        const article = await this.kbService.updateArticle(id, user.workspaceId, body);
        return { article };
    }

    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('kb:manage')
    @Delete('articles/:id')
    async deleteArticle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.kbService.deleteArticle(id, user.workspaceId);
    }
}
