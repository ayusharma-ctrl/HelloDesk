import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/users.routes.js';
import { conversationRouter } from './modules/conversations/conversations.routes.js';
import { knowledgeBaseRouter } from './modules/kb/kb.routes.js';
import { widgetRouter } from './modules/widget/widget.routes.js';
import { webhookRouter } from './modules/webhooks/webhooks.routes.js';
import { domainRouter } from './modules/domains/domains.routes.js';
import { agentRouter } from './modules/agents/agents.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { requireAuth, verifyToken } from './lib/auth.js';
import { setAgentStatus } from './lib/redis.js';
import { startAiWorkers } from './services/ai.worker.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.APP_BASE_URL }
});

// Start AI Workers
startAiWorkers(io);

(global as any).io = io;

app.set('io', io);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (e.g. Postman, server-to-server)
      // if (!origin) {
      //   return callback(null, true);
      // }

      // Do not allow
      if (!origin) {
        return callback(new Error("Not allowed by CORS"));
      }

      if (origin === process.env.APP_BASE_URL) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

// health check route
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hellodesk-server' });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/kb', knowledgeBaseRouter);
app.use('/api/v1/widget', widgetRouter);
app.use('/api/v1/webhooks', webhookRouter);
app.use('/api/v1/domains', domainRouter);
app.use('/api/v1/agents', agentRouter);
app.use('/api/v1/dashboard', dashboardRouter);

io.use(async (socket, next) => {
  const type = socket.handshake.auth?.type;

  if (type === 'visitor') {
    const { visitorId, workspaceId } = socket.handshake.auth;
    if (!visitorId || !workspaceId) {
      return next(new Error('Visitor missing credentials'));
    }
    // Verify workspace exists
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) return next(new Error('Invalid workspace'));

    socket.data.isVisitor = true;
    socket.data.visitorId = visitorId;
    socket.data.workspaceId = workspaceId;
    return next();
  }

  const token = typeof socket.handshake.auth?.token === 'string'
    ? socket.handshake.auth.token
    : typeof socket.handshake.headers.authorization === 'string'
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
      : null;

  if (!token) {
    return next(new Error('Unauthorized'));
  }

  try {
    const user = verifyToken(token);
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!dbUser || !dbUser.isActive) {
      return next(new Error('Unauthorized'));
    }

    socket.data.userId = dbUser.id;
    socket.data.workspaceId = dbUser.workspaceId;
    socket.data.roleName = dbUser.role.name;
    next();
  } catch (error) {
    logger.warn({ error }, 'socket auth failed');
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id, isVisitor: socket.data.isVisitor }, 'socket connected');

  if (socket.data.isVisitor) {
    socket.join(`visitor:${socket.data.visitorId}`);
  } else if (socket.data.workspaceId && socket.data.userId) {
    socket.join(`workspace:${socket.data.workspaceId}`);
    void setAgentStatus(socket.data.workspaceId, socket.data.userId, 'available');
    io.to(`workspace:${socket.data.workspaceId}`).emit('presence:changed', {
      workspaceId: socket.data.workspaceId,
      userId: socket.data.userId,
      status: 'available'
    });
  }

  socket.on('join-workspace', async ({ workspaceId }: { workspaceId?: string }) => {
    if (socket.data.isVisitor) return;
    const targetWorkspaceId = workspaceId ?? socket.data.workspaceId;
    if (!targetWorkspaceId) return;
    socket.join(`workspace:${targetWorkspaceId}`);
    socket.data.workspaceId = targetWorkspaceId;
    if (socket.data.userId) {
      await setAgentStatus(targetWorkspaceId, socket.data.userId, 'available');
      io.to(`workspace:${targetWorkspaceId}`).emit('presence:changed', { workspaceId: targetWorkspaceId, userId: socket.data.userId, status: 'available' });
    }
  });

  socket.on('presence:update', async ({ workspaceId, status }: { workspaceId?: string; status?: string }) => {
    if (socket.data.isVisitor) return;
    const targetWorkspaceId = workspaceId ?? socket.data.workspaceId;
    if (!targetWorkspaceId || !socket.data.userId || !status) return;
    await setAgentStatus(targetWorkspaceId, socket.data.userId, status);
    io.to(`workspace:${targetWorkspaceId}`).emit('presence:changed', { workspaceId: targetWorkspaceId, userId: socket.data.userId, status });
  });

  socket.on('typing:start', ({ conversationId, visitorId }: { conversationId?: string; visitorId?: string }) => {
    if (!conversationId) return;
    if (socket.data.isVisitor) {
      if (socket.data.workspaceId) socket.to(`workspace:${socket.data.workspaceId}`).emit('typing:started', { conversationId, visitorId: socket.data.visitorId });
    } else {
      if (visitorId) socket.to(`visitor:${visitorId}`).emit('typing:started', { conversationId, userId: socket.data.userId });
      socket.to(`workspace:${socket.data.workspaceId}`).emit('typing:started', { conversationId, userId: socket.data.userId });
    }
  });

  socket.on('typing:stop', ({ conversationId, visitorId }: { conversationId?: string; visitorId?: string }) => {
    if (!conversationId) return;
    if (socket.data.isVisitor) {
      if (socket.data.workspaceId) socket.to(`workspace:${socket.data.workspaceId}`).emit('typing:stopped', { conversationId, visitorId: socket.data.visitorId });
    } else {
      if (visitorId) socket.to(`visitor:${visitorId}`).emit('typing:stopped', { conversationId, userId: socket.data.userId });
      socket.to(`workspace:${socket.data.workspaceId}`).emit('typing:stopped', { conversationId, userId: socket.data.userId });
    }
  });

  socket.on('disconnect', async () => {
    if (socket.data.userId && socket.data.workspaceId) {
      await setAgentStatus(socket.data.workspaceId, socket.data.userId, 'offline');
      io.to(`workspace:${socket.data.workspaceId}`).emit('presence:changed', { workspaceId: socket.data.workspaceId, userId: socket.data.userId, status: 'offline' });
    }
    logger.info({ socketId: socket.id }, 'socket disconnected');
  });
});

const port = Number(process.env.PORT ?? 3001);

server.listen(port, async () => {
  logger.info({ port }, 'HelloDesk server listening');
  await prisma.$connect();
  logger.info('Prisma connected');
});
