import { useState, useEffect, useRef } from 'react';
import { WebRTCManager } from '@/lib/webrtc';
import { useAuth } from '@/lib/auth';
import { connectSocket, acceptWebcam, rejectWebcam, sendWebcamSignal } from '@/lib/socket/client';

interface WebcamProps {
  userId?: number;
  roomId?: number;
  isPrivateChat?: boolean;
}

export default function WebcamComponent({ userId, roomId, isPrivateChat = false }: WebcamProps) {
  const { user } = useAuth();
  const [webRTCManager, setWebRTCManager] = useState<WebRTCManager | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Initialiser le gestionnaire WebRTC
  useEffect(() => {
    const manager = new WebRTCManager();
    setWebRTCManager(manager);
    
    return () => {
      // Nettoyer les ressources lors du démontage du composant
      if (manager) {
        manager.destroyAllPeers();
      }
    };
  }, []);
  
  // Mettre à jour les flux vidéo dans les éléments HTML
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);
  
  // Fonction pour démarrer la webcam locale
  const startWebcam = async () => {
    if (!webRTCManager) return;
    
    try {
      setError(null);
      const stream = await webRTCManager.initLocalStream();
      setLocalStream(stream);
      setWebcamActive(true);
      
      // Si c'est un chat privé, on peut directement proposer la webcam
      if (isPrivateChat && userId) {
        requestWebcam();
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation de la webcam:', err);
      setError('Impossible d\'accéder à votre webcam. Veuillez vérifier les permissions.');
    }
  };
  
  // Fonction pour arrêter la webcam
  const stopWebcam = () => {
    if (!webRTCManager) return;
    
    webRTCManager.stopLocalStream();
    webRTCManager.destroyAllPeers();
    setLocalStream(null);
    setRemoteStream(null);
    setWebcamActive(false);
    setRequestPending(false);
  };
  
  // Fonction pour demander l'activation de la webcam
  const requestWebcam = () => {
    if (!webRTCManager || !localStream) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Envoyer une demande via Socket.IO
    if (isPrivateChat && userId) {
      // Demande pour un chat privé
      socket.emit('requestWebcam', { recipientId: userId });
    } else if (roomId) {
      // Demande pour un salon
      socket.emit('requestWebcam', { roomId });
    }
    
    setRequestPending(true);
  };
  
  // Fonction pour accepter une demande de webcam
  const acceptWebcamRequest = (requesterId: number) => {
    if (!webRTCManager) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Démarrer la webcam locale si ce n'est pas déjà fait
    if (!localStream) {
      startWebcam().then(() => {
        // Accepter la demande via Socket.IO
        socket.emit('acceptWebcam', requesterId);
        
        // Créer un pair pour l'utilisateur qui a fait la demande
        const peer = webRTCManager.createPeer(requesterId, (stream) => {
          setRemoteStream(stream);
        });
        
        // Envoyer le signal au demandeur
        peer.on('signal', (data) => {
          socket.emit('sendWebcamSignal', { userId: requesterId, data });
        });
      });
    } else {
      // Accepter la demande via Socket.IO
      socket.emit('acceptWebcam', requesterId);
      
      // Créer un pair pour l'utilisateur qui a fait la demande
      const peer = webRTCManager.createPeer(requesterId, (stream) => {
        setRemoteStream(stream);
      });
      
      // Envoyer le signal au demandeur
      peer.on('signal', (data) => {
        socket.emit('sendWebcamSignal', { userId: requesterId, data });
      });
    }
  };
  
  // Fonction pour rejeter une demande de webcam
  const rejectWebcamRequest = (requesterId: number) => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    socket.emit('rejectWebcam', requesterId);
  };
  
  // Écouter les événements Socket.IO liés à la webcam
  useEffect(() => {
    if (!user) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Écouter les demandes de webcam
    socket.on('webcamRequest', (request) => {
      // Afficher une notification ou une boîte de dialogue pour accepter/rejeter
      if (confirm(`${request.username} souhaite démarrer une conversation vidéo. Accepter?`)) {
        acceptWebcamRequest(request.userId);
      } else {
        rejectWebcamRequest(request.userId);
      }
    });
    
    // Écouter les acceptations de webcam
    socket.on('webcamAccepted', (userId) => {
      if (!webRTCManager || !localStream) return;
      
      // Créer un pair pour l'utilisateur qui a accepté
      const peer = webRTCManager.createPeer(userId, (stream) => {
        setRemoteStream(stream);
      });
      
      // Envoyer le signal à l'utilisateur qui a accepté
      peer.on('signal', (data) => {
        socket.emit('sendWebcamSignal', { userId, data });
      });
      
      setRequestPending(false);
    });
    
    // Écouter les rejets de webcam
    socket.on('webcamRejected', () => {
      alert('Votre demande de webcam a été rejetée.');
      setRequestPending(false);
    });
    
    // Écouter les signaux WebRTC
    socket.on('webcamSignal', ({ userId, data }) => {
      if (!webRTCManager) return;
      
      // Si nous n'avons pas encore de pair pour cet utilisateur, en créer un
      if (!webRTCManager.hasPeer(userId)) {
        const peer = webRTCManager.acceptPeer(userId, data, (stream) => {
          setRemoteStream(stream);
        });
        
        // Envoyer notre signal en retour
        peer.on('signal', (signalData) => {
          socket.emit('sendWebcamSignal', { userId, data: signalData });
        });
      } else {
        // Sinon, transmettre le signal au pair existant
        webRTCManager.signalPeer(userId, data);
      }
    });
    
    return () => {
      socket.off('webcamRequest');
      socket.off('webcamAccepted');
      socket.off('webcamRejected');
      socket.off('webcamSignal');
    };
  }, [user, webRTCManager, localStream]);
  
  return (
    <div className="webcam-container">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-col space-y-4">
        {!webcamActive ? (
          <button
            onClick={startWebcam}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Activer ma webcam
          </button>
        ) : (
          <>
            <div className="webcam-videos grid grid-cols-2 gap-4">
              <div className="local-video-container relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-auto rounded-md bg-black"
                />
                <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                  Vous
                </div>
              </div>
              
              {remoteStream && (
                <div className="remote-video-container relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto rounded-md bg-black"
                  />
                  <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
                    Interlocuteur
                  </div>
                </div>
              )}
            </div>
            
            <div className="webcam-controls flex space-x-2">
              <button
                onClick={stopWebcam}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Arrêter ma webcam
              </button>
              
              {isPrivateChat && userId && !requestPending && !remoteStream && (
                <button
                  onClick={requestWebcam}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Proposer un appel vidéo
                </button>
              )}
              
              {roomId && !isPrivateChat && !requestPending && !remoteStream && (
                <button
                  onClick={requestWebcam}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Proposer ma webcam au salon
                </button>
              )}
              
              {requestPending && (
                <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md">
                  Demande en attente...
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
