import { useAuth } from '@/lib/auth';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, sendMessage, joinRoom } from '@/lib/socket/client';
import { Room } from '@/lib/db/schema';
import WebcamComponent from '@/components/chat/WebcamComponent';

interface Message {
  id: number;
  content: string;
  userId: number;
  username: string;
  roomId: number;
  createdAt: string;
}

export default function RoomChat({ params }: { params: { roomId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const roomId = parseInt(params.roomId, 10);
  
  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);
  
  // Charger les informations du salon
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/chat/rooms?roomId=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setRoom(data);
        } else {
          setError('Salon non trouvé');
        }
      } catch (err) {
        console.error('Erreur lors du chargement du salon:', err);
        setError('Erreur lors du chargement du salon');
      }
    };
    
    if (roomId) {
      fetchRoom();
    }
  }, [roomId]);
  
  // Charger les messages précédents
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages?roomId=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        } else {
          setError('Erreur lors du chargement des messages');
        }
      } catch (err) {
        console.error('Erreur lors du chargement des messages:', err);
        setError('Erreur lors du chargement des messages');
      } finally {
        setLoading(false);
      }
    };
    
    if (roomId) {
      fetchMessages();
    }
  }, [roomId]);
  
  // Connecter au socket et rejoindre le salon
  useEffect(() => {
    if (!user) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Rejoindre le salon
    joinRoom(roomId);
    
    // Écouter les nouveaux messages
    socket.on('message', (message) => {
      if (message.roomId === roomId) {
        setMessages((prevMessages) => [message, ...prevMessages]);
      }
    });
    
    // Écouter les utilisateurs qui rejoignent
    socket.on('userJoined', (joinedUser) => {
      // Ajouter une notification système
      const systemMessage = {
        id: Date.now(),
        content: `${joinedUser.username} a rejoint le salon`,
        userId: 0, // 0 pour les messages système
        username: 'Système',
        roomId: roomId,
        createdAt: new Date().toISOString(),
      };
      setMessages((prevMessages) => [systemMessage, ...prevMessages]);
    });
    
    // Écouter les utilisateurs qui partent
    socket.on('userLeft', (userId) => {
      // Trouver le nom d'utilisateur correspondant
      const leftUser = messages.find((msg) => msg.userId === userId)?.username || 'Un utilisateur';
      
      // Ajouter une notification système
      const systemMessage = {
        id: Date.now(),
        content: `${leftUser} a quitté le salon`,
        userId: 0,
        username: 'Système',
        roomId: roomId,
        createdAt: new Date().toISOString(),
      };
      setMessages((prevMessages) => [systemMessage, ...prevMessages]);
    });
    
    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [user, roomId, messages]);
  
  // Faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !user) return;
    
    // Envoyer le message via socket
    sendMessage(inputMessage, roomId);
    
    // Effacer l'input
    setInputMessage('');
  };
  
  const toggleWebcam = () => {
    setShowWebcam(!showWebcam);
  };
  
  if (!user) {
    return null; // Redirection gérée par useEffect
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">
              {loading ? 'Chargement...' : room ? `# ${room.name}` : 'Salon'}
            </h1>
            <p className="text-sm text-gray-500">
              {room?.type === 'public' ? 'Salon public' : 'Salon privé'}
            </p>
            <button 
              onClick={() => router.push('/chat/general')} 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Retour au salon général
            </button>
          </div>
          <button
            onClick={toggleWebcam}
            className={`px-4 py-2 rounded-md ${showWebcam ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {showWebcam ? 'Masquer webcam' : 'Proposer webcam'}
          </button>
        </div>
      </div>
      
      {/* Webcam */}
      {showWebcam && (
        <div className="p-4 border-b border-gray-200">
          <WebcamComponent roomId={roomId} isPrivateChat={false} />
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`mb-4 ${message.userId === user.id ? 'ml-auto' : ''} ${message.userId === 0 ? 'mx-auto italic text-gray-500 text-sm' : ''}`}
            >
              {message.userId !== 0 && (
                <div className={`flex items-center mb-1 ${message.userId === user.id ? 'justify-end' : ''}`}>
                  <span className="font-medium text-sm">{message.username}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div 
                className={`p-3 rounded-lg max-w-md ${
                  message.userId === 0 
                    ? 'bg-gray-100' 
                    : message.userId === user.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
