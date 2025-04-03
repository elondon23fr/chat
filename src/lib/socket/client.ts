import { io } from 'socket.io-client';
import { initSocket, ServerToClientEvents, ClientToServerEvents } from './types';

export const connectSocket = (sessionId: string) => {
  const socket = io({
    auth: {
      sessionId
    }
  });

  // Initialiser le singleton
  initSocket(socket as unknown as any);

  return socket;
};

export const disconnectSocket = () => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.disconnect();
  }
};

// Fonctions d'aide pour les événements socket
export const joinRoom = (roomId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('joinRoom', roomId);
  }
};

export const leaveRoom = (roomId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('leaveRoom', roomId);
  }
};

export const sendMessage = (content: string, roomId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('sendMessage', { content, roomId });
  }
};

export const sendPrivateMessage = (content: string, recipientId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('sendPrivateMessage', { content, recipientId });
  }
};

export const requestWebcam = (roomId?: number, recipientId?: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('requestWebcam', { roomId, recipientId });
  }
};

export const acceptWebcam = (userId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('acceptWebcam', userId);
  }
};

export const rejectWebcam = (userId: number) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('rejectWebcam', userId);
  }
};

export const sendWebcamSignal = (userId: number, data: any) => {
  const socket = initSocket(null as any);
  if (socket) {
    socket.emit('sendWebcamSignal', { userId, data });
  }
};
