import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { Socket } from 'socket.io-client';

// Types pour Socket.IO
export interface ServerToClientEvents {
  userJoined: (user: { id: number; username: string }) => void;
  userLeft: (userId: number) => void;
  message: (message: {
    id: number;
    content: string;
    userId: number;
    username: string;
    roomId: number;
    createdAt: string;
  }) => void;
  privateMessage: (message: {
    id: number;
    content: string;
    userId: number;
    username: string;
    recipientId: number;
    createdAt: string;
  }) => void;
  webcamRequest: (request: {
    userId: number;
    username: string;
    roomId?: number;
  }) => void;
  webcamAccepted: (userId: number) => void;
  webcamRejected: (userId: number) => void;
  webcamSignal: (signal: { userId: number; data: any }) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: number) => void;
  leaveRoom: (roomId: number) => void;
  sendMessage: (message: { content: string; roomId: number }) => void;
  sendPrivateMessage: (message: { content: string; recipientId: number }) => void;
  requestWebcam: (request: { roomId?: number; recipientId?: number }) => void;
  acceptWebcam: (userId: number) => void;
  rejectWebcam: (userId: number) => void;
  sendWebcamSignal: (signal: { userId: number; data: any }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: number;
  username: string;
}

// Type pour le socket côté serveur
export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >;
    };
  };
};

// Singleton pour le socket côté client
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = () => socket;

export const initSocket = (socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>) => {
  socket = socketInstance;
  return socket;
};
