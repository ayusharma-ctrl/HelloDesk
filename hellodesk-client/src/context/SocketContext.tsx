"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/api/me';

interface SocketContextType {
    socket: Socket | null;
    agentStatus: string;
    updateStatus: (status: string) => Promise<void>;
    typingUsers: Record<string, boolean>; // conversationId -> isVisitorTyping
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    agentStatus: 'offline',
    updateStatus: async () => { },
    typingUsers: {},
});

export const useSocket = () => useContext(SocketContext);

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const { data: me } = useCurrentUser();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [agentStatus, setAgentStatus] = useState<string>('available');
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

    // Fetch initial status on login
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !me) return;

        fetch(`${API_URL}/api/v1/agents/me/status`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.status) setAgentStatus(data.status);
            })
            .catch(console.error);
    }, [me]);

    // Socket lifecycle
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !me) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const newSocket = io(API_URL, {
            auth: { token },
            transports: ['websocket'],
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('SocketConnected as agent');
        });

        newSocket.on('message:created', (data: { conversationId: string; message: any }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
        });

        newSocket.on('conversation:updated', (data: { conversationId: string; conversation: any }) => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
            if (me?.workspace?.id) {
                queryClient.invalidateQueries({ queryKey: ['presence', me.workspace.id] });
            }
        });

        newSocket.on('presence:changed', (data: { workspaceId: string; userId: string; status: string }) => {
            if (data.userId === me.id) {
                setAgentStatus(data.status);
            }
            queryClient.invalidateQueries({ queryKey: ['presence', data.workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['team'] });
        });

        newSocket.on('typing:started', (data: { conversationId: string; visitorId?: string; userId?: string }) => {
            if (data.visitorId) {
                setTypingUsers((prev) => ({ ...prev, [data.conversationId]: true }));
            }
        });

        newSocket.on('typing:stopped', (data: { conversationId: string; visitorId?: string; userId?: string }) => {
            if (data.visitorId) {
                setTypingUsers((prev) => ({ ...prev, [data.conversationId]: false }));
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [me, queryClient]);

    const updateStatus = async (status: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/v1/agents/me/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                setAgentStatus(status);
                if (socket) {
                    socket.emit('presence:update', { workspaceId: me?.workspace?.id, status });
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, agentStatus, updateStatus, typingUsers }}>
            {children}
        </SocketContext.Provider>
    );
}
