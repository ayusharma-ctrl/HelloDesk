import { Request, Response } from 'express';
import { signupSchema, loginSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { logger } from '../../lib/logger.js';

export async function signup(req: Request, res: Response) {
    try {
        const input = signupSchema.parse(req.body);
        const result = await authService.signup(input);
        return res.status(201).json(result);
    } catch (err: any) {
        logger.warn({ err }, 'signup error');
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid signup payload' });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const input = loginSchema.parse(req.body);
        const result = await authService.login(input);
        return res.json(result);
    } catch (err: any) {
        logger.warn({ err }, 'login error');
        return res.status(err?.status ?? 400).json({ error: err?.message ?? 'Invalid login payload' });
    }
}

export async function getMe(req: Request, res: Response) {
    try {
        const user = await authService.getMe(req.user!.id);
        return res.json({ user });
    } catch (err: any) {
        return res.status(err?.status ?? 500).json({ error: err?.message ?? 'Server error' });
    }
}
