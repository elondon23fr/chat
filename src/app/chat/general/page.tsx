import { useAuth } from '@/lib/auth';
import { useState, useEffect, useRef } from 'react';
import { connectSocket, sendMessage, joinRoom } from '@/lib/socket/client';
import { getMessagesByRoomId } from '@/lib/db';

interface Message {
  id: number;
  content: string;
  user_id: number;
  username: string;
  created_at: string;
}

export default function GeneralChatRoom() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Connecter au socket et rejoindre le salon general
  useEffect(() => {
    if (!user) return;
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;
    
    // Connecter au socket
    const socket = connectSocket(sessionId);
    
    // Charger les messages précédents
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/chat/messages?roomId=1');
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
      }
    };
    
    loadMessages();
    
    // Rejoindre le salon general (id: 1)
    joinRoom(1);
    setConnected(true);
    
    // Écouter les nouveaux messages
    socket.on('message', (message) => {
      setMessages((prevMessages) => [message, ...prevMessages]);
    });
    
    // Écouter les utilisateurs qui rejoignent
    socket.on('userJoined', (joinedUser) => {
      // Ajouter une notification système
      const systemMessage = {
        id: Date.now(),
        content: `${joinedUser.username} a rejoint le salon`,
        user_id: 0, // 0 pour les messages système
        username: 'Système',
        created_at: new Date().toISOString(),
      };
      setMessages((prevMessages) => [systemMessage, ...prevMessages]);
    });
    
    // Écouter les utilisateurs qui partent
    socket.on('userLeft', (userId) => {
      // Trouver le nom d'utilisateur correspondant
      const leftUser = messages.find((msg) => msg.user_id === userId)?.username || 'Un utilisateur';
      
      // Ajouter une notification système
      const systemMessage = {
        id: Date.now(),
        content: `${leftUser} a quitté le salon`,
        user_id: 0,
        username: 'Système',
        created_at: new Date().toISOString(),
      };
      setMessages((prevMessages) => [systemMessage, ...prevMessages]);
    });
    
    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [user]);
  
  // Faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !connected) return;
    
    // Envoyer le message via socket
    sendMessage(inputMessage, 1); // 1 est l'ID du salon general
    
    // Effacer l'input
    setInputMessage('');
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold"># general</h1>
        <p className="text-sm text-gray-500">Salon public par défaut</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
        <div ref={messagesEndRef} />
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 ${message.user_id === user?.id ? 'ml-auto' : ''} ${message.user_id === 0 ? 'mx-auto italic text-gray-500 text-sm' : ''}`}
          >
            {message.user_id !== 0 && (
              <div className={`flex items-center mb-1 ${message.user_id === user?.id ? 'justify-end' : ''}`}>
                <span className="font-medium text-sm">{message.username}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
            )}
            <div 
              className={`p-3 rounded-lg max-w-md ${
                message.user_id === 0 
                  ? 'bg-gray-100' 
                  : message.user_id === user?.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
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
            disabled={!connected}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
