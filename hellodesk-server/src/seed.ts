import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

const permissions = [
  'conversation:reply',
  'conversation:reassign',
  'conversation:status:update',
  'dashboard:view',
  'agent:manage',
  'kb:manage',
  'domain:manage',
  'team:view',
];

async function main() {
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
  const agentRole = await prisma.role.upsert({ where: { name: 'agent' }, update: {}, create: { name: 'agent' } });

  for (const permission of permissions) {
    await prisma.permission.upsert({ where: { key: permission }, update: {}, create: { key: permission, description: permission } });
  }

  const permissionRecords = await prisma.permission.findMany();
  const adminPermissions = permissionRecords.filter((permission) => permission.key !== 'conversation:reply' || permission.key === 'conversation:reply');
  const agentPermissions = permissionRecords.filter((permission) => ['conversation:reply', 'conversation:status:update', 'dashboard:view', 'team:view'].includes(permission.key));

  for (const role of [adminRole, agentRole]) {
    const existing = await prisma.rolePermission.findMany({ where: { roleId: role.id } });
    const permissionsToAssign = role.name === 'admin' ? adminPermissions : agentPermissions;
    for (const permission of permissionsToAssign) {
      if (!existing.some(item => item.permissionId === permission.id)) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
      }
    }
  }

  const workspace = await prisma.workspace.upsert({ where: { name: 'demo-workspace' }, update: {}, create: { name: 'demo-workspace' } });
  const existingUser = await prisma.user.findUnique({ where: { email: 'admin@hellodesk.io' } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        roleId: adminRole.id,
        name: 'Admin',
        email: 'admin@hellodesk.io',
        passwordHash: await hashPassword('password123')
      }
    });
  }
}

main().then(() => process.exit(0));
