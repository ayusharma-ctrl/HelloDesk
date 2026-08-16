import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { setAgentStatus, redis } from './lib/redis.js';
import { processQueue } from './modules/assignment/assignment.service.js';
import { verifyToken } from './lib/auth.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

let ioInstance: Server | null = null;
export function getIoInstance(): Server | null {
    return ioInstance;
}

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    afterInit(server: Server) {
        ioInstance = server;

        server.use(async (socket: Socket, next) => {
            const type = socket.handshake.auth?.type;

            if (type === 'visitor') {
                const { visitorId, workspaceId } = socket.handshake.auth || {};
                if (!visitorId || !workspaceId) {
                    return next(new Error('Visitor missing credentials'));
                }
                const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
                if (!ws) return next(new Error('Invalid workspace'));

                socket.data.isVisitor = true;
                socket.data.visitorId = visitorId;
                socket.data.workspaceId = workspaceId;
                return next();
            }

            const token =
                typeof socket.handshake.auth?.token === 'string'
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
                    include: { role: true },
                });

                if (!dbUser || !dbUser.isActive) {
                    return next(new Error('Unauthorized'));
                }

                socket.data.userId = dbUser.id;
                socket.data.workspaceId = dbUser.workspaceId;
                socket.data.roleName = dbUser.role.name;
                next();
            } catch (error) {
                logger.warn({ error }, 'Socket auth failed');
                next(new Error('Unauthorized'));
            }
        });
    }

    async handleConnection(socket: Socket) {
        if (socket.data.isVisitor) {
            socket.join(`visitor:${socket.data.visitorId}`);
            logger.info({ visitorId: socket.data.visitorId, socketId: socket.id }, 'Visitor socket connected');
            return;
        }

        if (socket.data.workspaceId && socket.data.userId) {
            socket.join(`workspace:${socket.data.workspaceId}`);
            await setAgentStatus(socket.data.workspaceId, socket.data.userId, 'available');
            this.server.to(`workspace:${socket.data.workspaceId}`).emit('presence:changed', {
                workspaceId: socket.data.workspaceId,
                userId: socket.data.userId,
                status: 'available',
            });
            await processQueue(socket.data.workspaceId);
            logger.info({ workspaceId: socket.data.workspaceId, userId: socket.data.userId, socketId: socket.id }, 'Agent socket connected & room joined');
        }
    }

    async handleDisconnect(socket: Socket) {
        const { workspaceId, userId } = socket.data || {};
        if (workspaceId && userId && !socket.data.isVisitor) {
            await setAgentStatus(workspaceId, userId, 'offline');
            this.server.to(`workspace:${workspaceId}`).emit('presence:changed', { workspaceId, userId, status: 'offline' });
            logger.info({ workspaceId, userId, socketId: socket.id }, 'Agent socket disconnected & set offline');
        }
    }

    @SubscribeMessage('join-workspace')
    async handleJoinWorkspace(@MessageBody() data: { workspaceId?: string }, @ConnectedSocket() socket: Socket) {
        if (socket.data.isVisitor) return;
        const targetWorkspaceId = data?.workspaceId ?? socket.data.workspaceId;
        if (!targetWorkspaceId) return;
        socket.join(`workspace:${targetWorkspaceId}`);
        socket.data.workspaceId = targetWorkspaceId;
        if (socket.data.userId) {
            await setAgentStatus(targetWorkspaceId, socket.data.userId, 'available');
            await processQueue(targetWorkspaceId);
            this.server.to(`workspace:${targetWorkspaceId}`).emit('presence:changed', {
                workspaceId: targetWorkspaceId,
                userId: socket.data.userId,
                status: 'available',
            });
        }
    }

    @SubscribeMessage('presence:update')
    async handlePresenceUpdate(@MessageBody() data: { workspaceId?: string; status?: string }, @ConnectedSocket() socket: Socket) {
        if (socket.data.isVisitor) return;
        const targetWorkspaceId = data?.workspaceId ?? socket.data.workspaceId;
        const status = data?.status;
        if (!targetWorkspaceId || !socket.data.userId || !status) return;
        await setAgentStatus(targetWorkspaceId, socket.data.userId, status);
        if (status === 'available') {
            await processQueue(targetWorkspaceId);
        }
        this.server.to(`workspace:${targetWorkspaceId}`).emit('presence:changed', {
            workspaceId: targetWorkspaceId,
            userId: socket.data.userId,
            status,
        });
    }

    @SubscribeMessage('typing:start')
    handleTypingStart(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const { conversationId, visitorId } = data || {};
        if (!conversationId) return;
        if (socket.data.isVisitor) {
            if (socket.data.workspaceId) {
                this.server.to(`workspace:${socket.data.workspaceId}`).emit('typing:started', { conversationId, visitorId: socket.data.visitorId });
            }
        } else {
            if (visitorId) {
                this.server.to(`visitor:${visitorId}`).emit('typing:started', { conversationId, userId: socket.data.userId });
            }
            if (socket.data.workspaceId) {
                this.server.to(`workspace:${socket.data.workspaceId}`).emit('typing:started', { conversationId, userId: socket.data.userId });
            }
        }
    }

    @SubscribeMessage('typing:stop')
    handleTypingStop(@MessageBody() data: any, @ConnectedSocket() socket: Socket) {
        const { conversationId, visitorId } = data || {};
        if (!conversationId) return;
        if (socket.data.isVisitor) {
            if (socket.data.workspaceId) {
                this.server.to(`workspace:${socket.data.workspaceId}`).emit('typing:stopped', { conversationId, visitorId: socket.data.visitorId });
            }
        } else {
            if (visitorId) {
                this.server.to(`visitor:${visitorId}`).emit('typing:stopped', { conversationId, userId: socket.data.userId });
            }
            if (socket.data.workspaceId) {
                this.server.to(`workspace:${socket.data.workspaceId}`).emit('typing:stopped', { conversationId, userId: socket.data.userId });
            }
        }
    }
}
