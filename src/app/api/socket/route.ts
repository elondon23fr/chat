import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponseWithSocket, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '@/lib/socket/types';
import { getUserBySessionId, createMessage, updateUserActivity } from '@/lib/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

const SocketHandler = async (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log('Socket.IO déjà en cours d\'exécution');
    res.end();
    return;
  }

  console.log('Initialisation de Socket.IO');
  const httpServer: NetServer = res.socket.server as any;
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    path: '/api/socket',
  });
  res.socket.server.io = io;

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
      socket.join(`room:${roomId}`);
      console.log(`${socket.data.username} a rejoint le salon ${roomId}`);

      // Notifier les autres utilisateurs
      socket.to(`room:${roomId}`).emit('userJoined', {
        id: socket.data.userId,
        username: socket.data.username,
      });
    });

    // Quitter un salon
    socket.on('leaveRoom', (roomId) => {
      socket.leave(`room:${roomId}`);
      console.log(`${socket.data.username} a quitté le salon ${roomId}`);

      // Notifier les autres utilisateurs
      socket.to(`room:${roomId}`).emit('userLeft', socket.data.userId);
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
        io.to(`room:${roomId}`).emit('message', {
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
        socket.to(`room:${roomId}`).emit('webcamRequest', {
          userId: socket.data.userId,
          username: socket.data.username,
          roomId: roomId,
        });
      } else if (recipientId) {
        // Demande privée
        const privateRoomId = [socket.data.userId, recipientId].sort().join(':');
        socket.to(`private:${privateRoomId}`).emit('webcamRequest', {
          userId: socket.data.userId,
          username: socket.data.username,
        });
      }
    });

    // Acceptation de webcam
    socket.on('acceptWebcam', (userId) => {
      io.to(userId.toString()).emit('webcamAccepted', socket.data.userId);
    });

    // Refus de webcam
    socket.on('rejectWebcam', (userId) => {
      io.to(userId.toString()).emit('webcamRejected', socket.data.userId);
    });

    // Signal WebRTC
    socket.on('sendWebcamSignal', ({ userId, data }) => {
      io.to(userId.toString()).emit('webcamSignal', {
        userId: socket.data.userId,
        data: data,
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`Utilisateur déconnecté: ${socket.data.username}`);
      
      // Notifier tous les salons que l'utilisateur a quitté
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          io.to(room).emit('userLeft', socket.data.userId);
        }
      });
    });
  });

  res.end();
};

export default SocketHandler;
