import { Server } from 'socket.io';
import { NextRequest, NextResponse } from 'next/server';
import { getUserBySessionId, createMessage, updateUserActivity } from '@/lib/db';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '@/lib/socket/types';

// Map pour stocker les connexions socket actives
const connectedUsers = new Map();

// Fonction pour initialiser Socket.IO
function initSocketIO() {
  // Vérifier si Socket.IO est déjà initialisé
  if ((global as any).io) {
    return (global as any).io;
  }

  // Créer une nouvelle instance de Socket.IO
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
    path: '/api/socketio',
    addTrailingSlash: false,
  });

  // Middleware d'authentification
  io.use(async (socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      return next(new Error('Session non autorisée'));
    }

    try {
      const user = await getUserBySessionId(sessionId);
      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      // Stocker les informations utilisateur dans le socket
      socket.data.userId = user.id;
      socket.data.username = user.username;
      
      // Mettre à jour l'activité de l'utilisateur
      await updateUserActivity(user.id);
      
      // Ajouter l'utilisateur à la map des utilisateurs connectés
      connectedUsers.set(user.id, socket.id);
      
      next();
    } catch (error) {
      console.error('Erreur d\'authentification socket:', error);
      next(new Error('Erreur d\'authentification'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    console.log(`Utilisateur connecté: ${socket.data.username} (${socket.data.userId})`);

    // Rejoindre un salon
    socket.on('joinRoom', async (roomId) => {
      // Quitter tous les autres salons (sauf les salons privés)
      socket.rooms.forEach((room) => {
        if (room !== socket.id && !room.startsWith('private:')) {
          socket.leave(room);
        }
      });

      // Rejoindre le nouveau salon
      const roomName = `room:${roomId}`;
      socket.join(roomName);
      console.log(`${socket.data.username} a rejoint le salon ${roomId}`);

      // Notifier les autres utilisateurs
      socket.to(roomName).emit('userJoined', {
        id: socket.data.userId,
        username: socket.data.username,
      });
    });

    // Quitter un salon
    socket.on('leaveRoom', (roomId) => {
      const roomName = `room:${roomId}`;
      socket.leave(roomName);
      console.log(`${socket.data.username} a quitté le salon ${roomId}`);

      // Notifier les autres utilisateurs
      socket.to(roomName).emit('userLeft', socket.data.userId);
    });

    // Envoyer un message dans un salon
    socket.on('sendMessage', async ({ content, roomId }) => {
      try {
        // Enregistrer le message dans la base de données
        const message = await createMessage(
          content,
          socket.data.userId,
          roomId,
          false,
          null
        );

        // Envoyer le message à tous les utilisateurs dans le salon
        const roomName = `room:${roomId}`;
        io.to(roomName).emit('message', {
          id: message.id,
          content: message.content,
          userId: socket.data.userId,
          username: socket.data.username,
          roomId: roomId,
          createdAt: message.created_at,
        });
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
      }
    });

    // Envoyer un message privé
    socket.on('sendPrivateMessage', async ({ content, recipientId }) => {
      try {
        // Enregistrer le message dans la base de données
        const message = await createMessage(
          content,
          socket.data.userId,
          0, // 0 pour les messages privés
          true,
          recipientId
        );

        // Créer un identifiant unique pour la conversation privée
        const privateRoomId = [socket.data.userId, recipientId].sort().join(':');
        const privateRoom = `private:${privateRoomId}`;

        // Rejoindre la salle privée si ce n'est pas déjà fait
        if (!socket.rooms.has(privateRoom)) {
          socket.join(privateRoom);
        }

        // Récupérer le socket du destinataire
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          const recipientSocket = io.sockets.sockets.get(recipientSocketId);
          if (recipientSocket) {
            recipientSocket.join(privateRoom);
          }
        }

        // Envoyer le message à l'expéditeur et au destinataire
        io.to(privateRoom).emit('privateMessage', {
          id: message.id,
          content: message.content,
          userId: socket.data.userId,
          username: socket.data.username,
          recipientId: recipientId,
          createdAt: message.created_at,
        });
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message privé:', error);
      }
    });

    // Demande de webcam
    socket.on('requestWebcam', ({ roomId, recipientId }) => {
      if (roomId) {
        // Demande dans un salon
        const roomName = `room:${roomId}`;
        socket.to(roomName).emit('webcamRequest', {
          userId: socket.data.userId,
          username: socket.data.username,
          roomId: roomId,
        });
      } else if (recipientId) {
        // Demande privée
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('webcamRequest', {
            userId: socket.data.userId,
            username: socket.data.username,
          });
        }
      }
    });

    // Acceptation de webcam
    socket.on('acceptWebcam', (userId) => {
      const userSocketId = connectedUsers.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('webcamAccepted', socket.data.userId);
      }
    });

    // Refus de webcam
    socket.on('rejectWebcam', (userId) => {
      const userSocketId = connectedUsers.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('webcamRejected', socket.data.userId);
      }
    });

    // Signal WebRTC
    socket.on('sendWebcamSignal', ({ userId, data }) => {
      const userSocketId = connectedUsers.get(userId);
      if (userSocketId) {
        io.to(userSocketId).emit('webcamSignal', {
          userId: socket.data.userId,
          data: data,
        });
      }
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${socket.data.username}`);
      
      // Supprimer l'utilisateur de la map des utilisateurs connectés
      connectedUsers.delete(socket.data.userId);
      
      // Notifier tous les salons que l'utilisateur a quitté
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          io.to(room).emit('userLeft', socket.data.userId);
        }
      });
    });
  });

  // Stocker l'instance de Socket.IO dans l'objet global
  (global as any).io = io;
  
  return io;
}

export async function GET(req: NextRequest) {
  // Initialiser Socket.IO
  const io = initSocketIO();
  
  return NextResponse.json({ success: true });
}
