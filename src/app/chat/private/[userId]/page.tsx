import { useAuth } from '@/lib/auth';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { connectSocket, sendPrivateMessage } from '@/lib/socket/client';
import { User } from '@/lib/db/schema';
import WebcamComponent from '@/components/chat/WebcamComponent';

interface PrivateMessage {
  id: number;
  content: string;
  userId: number;
  username: string;
  recipientId: number;
  createdAt: string;
}

export default function PrivateChat({ params }: { params: { userId: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [recipient, setRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const recipientId = parseInt(params.userId, 10);
  
  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);
  
  // Charger les informations du destinataire
  useEffect(() => {
    const fetchRecipient = async () => {
      try {
        const response = await fetch(`/api/users/${recipientId}`);
        if (response.ok) {
          const data = await response.json();
          setRecipient(data);
        } else {
          setError('Utilisateur non trouvé');
        }
      } catch (err) {
        console.error('Erreur lors du chargement du destinataire:', err);
        setError('Erreur lors du chargement du destinataire');
      }
    };
    
    if (recipientId) {
      fetchRecipient();
    }
  }, [recipientId]);
  
  // Charger les messages précédents
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/chat/private-messages?userId=${user.id}&recipientId=${recipientId}`);
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
    
    if (user && recipientId) {
      fetchMessages();
    }
  }, [user, recipientId]);
  
  // Connecter au socket et écouter les messages privés
  useEffect(() => {
    if (!user) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Écouter les messages privés
    socket.on('privateMessage', (message) => {
      if (
        (message.userId === user.id && message.recipientId === recipientId) ||
        (message.userId === recipientId && message.recipientId === user.id)
      ) {
        setMessages((prevMessages) => [message, ...prevMessages]);
      }
    });
    
    return () => {
      socket.off('privateMessage');
    };
  }, [user, recipientId]);
  
  // Faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !user) return;
    
    // Envoyer le message via socket
    sendPrivateMessage(inputMessage, recipientId);
    
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
              {loading ? 'Chargement...' : recipient ? recipient.username : 'Conversation privée'}
            </h1>
            <button 
              onClick={() => router.back()} 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Retour
            </button>
          </div>
          <button
            onClick={toggleWebcam}
            className={`px-4 py-2 rounded-md ${showWebcam ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {showWebcam ? 'Masquer webcam' : 'Afficher webcam'}
          </button>
        </div>
      </div>
      
      {/* Webcam */}
      {showWebcam && (
        <div className="p-4 border-b border-gray-200">
          <WebcamComponent userId={recipientId} isPrivateChat={true} />
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
              className={`mb-4 ${message.userId === user.id ? 'ml-auto' : ''}`}
            >
              <div className={`flex items-center mb-1 ${message.userId === user.id ? 'justify-end' : ''}`}>
                <span className="font-medium text-sm">{message.username}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div 
                className={`p-3 rounded-lg max-w-md ${
                  message.userId === user.id 
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
