import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './prisma.js';
import { logger } from './logger.js';

export type AuthUser = {
  id: string;
  email: string;
  workspaceId: string;
  roleName: string;
};

export const hashPassword = async (password: string) => argon2.hash(password);
export const verifyPassword = async (password: string, hash: string) => argon2.verify(hash, password);

export const signToken = (payload: AuthUser) =>
  jwt.sign(payload, process.env.JWT_SECRET ?? 'dev-secret', { expiresIn: '7d' });

export const verifyToken = (token: string) => jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret') as AuthUser;

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = verifyToken(header.slice(7));
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = { id: dbUser.id, email: dbUser.email, workspaceId: dbUser.workspaceId, roleName: dbUser.role.name } as AuthUser;
    next();
  } catch (error) {
    logger.warn({ error }, 'invalid auth token');
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requirePermission = (permissionKey: string) => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const role = await prisma.role.findFirst({
    where: { name: req.user.roleName },
    include: { rolePermissions: { include: { permission: true } } }
  });

  const hasPermission = role?.rolePermissions.some((entry) => entry.permission.key === permissionKey);
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
