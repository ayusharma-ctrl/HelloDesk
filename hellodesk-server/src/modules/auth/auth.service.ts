import { prisma } from '../../lib/prisma.js';
import { hashPassword, signToken, verifyPassword } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';
import type { AuthResponse, AuthUserDto } from './auth.types.js';
import type { SignupInput, LoginInput } from './auth.schema.js';

export async function getPermissionFlags(roleName: string): Promise<string[]> {
    const role = await prisma.role.findFirst({
        where: { name: roleName },
        include: { rolePermissions: { include: { permission: true } } },
    });
    return role?.rolePermissions.map((rp) => rp.permission.key) ?? [];
}

export async function signup(input: SignupInput): Promise<AuthResponse> {
    const workspaceName = input.workspaceName.toLowerCase().trim().replace(/\s+/g, '-');

    let workspace = await prisma.workspace.findUnique({ where: { name: workspaceName } });
    let adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (!adminRole) {
        adminRole = await prisma.role.create({ data: { name: 'admin' } });
    }

    const isNewWorkspace = !workspace;
    if (isNewWorkspace) {
        workspace = await prisma.workspace.create({ data: { name: workspaceName } });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
        const err = new Error('A user with that email already exists') as any;
        err.status = 409;
        throw err;
    }

    if (!workspace) throw new Error('Workspace could not be created');

    const agentRole = await prisma.role.findUnique({ where: { name: 'agent' } });
    const roleId = isNewWorkspace ? adminRole.id : (agentRole?.id ?? adminRole.id);

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
        data: { workspaceId: workspace.id, roleId, email: input.email, name: input.name, passwordHash },
        include: { role: true },
    });

    const permissions = await getPermissionFlags(user.role.name);
    const token = signToken({ id: user.id, email: user.email, workspaceId: workspace.id, roleName: user.role.name });
    logger.info({ workspaceId: workspace.id, userId: user.id }, 'signup succeeded');

    return {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role.name, workspace: { id: workspace.id, name: workspace.name } },
        permissions,
    };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { role: true, workspace: true },
    });

    if (!user || !user.isActive || !user.workspace.isActive) {
        const err = new Error('Invalid credentials') as any;
        err.status = 401;
        throw err;
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
        const err = new Error('Invalid credentials') as any;
        err.status = 401;
        throw err;
    }

    const permissions = await getPermissionFlags(user.role.name);
    const token = signToken({ id: user.id, email: user.email, workspaceId: user.workspaceId, roleName: user.role.name });

    return {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role.name, workspace: { id: user.workspaceId, name: user.workspace.name } },
        permissions,
    };
}

export async function getMe(userId: string): Promise<AuthUserDto & { permissions: string[] }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true, workspace: true },
    });

    if (!user) {
        const err = new Error('User not found') as any;
        err.status = 404;
        throw err;
    }

    const permissions = await getPermissionFlags(user.role.name);
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        workspace: { id: user.workspace.id, name: user.workspace.name },
        permissions,
    };
}
