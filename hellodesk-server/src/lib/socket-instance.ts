import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function getIoInstance(): Server | null {
    return ioInstance;
}

export function setIoInstance(io: Server) {
    ioInstance = io;
}
