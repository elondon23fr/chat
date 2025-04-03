"use client";

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirection gérée par useEffect
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Chat App</h2>
          <p className="text-sm text-gray-500 mt-1">Connecté en tant que {user.username}</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Salons publics</h3>
            <ul>
              <li>
                <a href="/chat/general" className="flex items-center px-2 py-2 text-sm rounded-md hover:bg-gray-100 text-blue-600 bg-blue-50">
                  # general
                </a>
              </li>
              {/* Autres salons publics seront ajoutés dynamiquement */}
            </ul>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Messages privés</h3>
            <ul>
              {/* Liste des messages privés sera ajoutée dynamiquement */}
              <li className="text-sm text-gray-500 italic px-2 py-1">
                Aucun message privé
              </li>
            </ul>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button 
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            onClick={() => router.push('/chat/rooms/new')}
          >
            Créer un salon
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
