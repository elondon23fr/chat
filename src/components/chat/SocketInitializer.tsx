import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocketInitializer() {
  const router = useRouter();

  useEffect(() => {
    // Initialiser le serveur Socket.IO
    const initSocket = async () => {
      try {
        await fetch('/api/socketio');
        console.log('Socket.IO initialisé avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de Socket.IO:', error);
      }
    };

    initSocket();
  }, []);

  return null;
}
