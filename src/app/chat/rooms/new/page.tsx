import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateRoom() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Veuillez entrer un nom pour le salon');
      return;
    }

    if (!user) {
      setError('Vous devez être connecté pour créer un salon');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type,
          created_by: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du salon');
      }

      const roomData = await response.json();
      
      // Rediriger vers le nouveau salon
      router.push(`/chat/rooms/${roomData.id}`);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la création du salon');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">Créer un nouveau salon</h1>
        <button 
          onClick={() => router.back()} 
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Retour
        </button>
      </div>
      
      {/* Form */}
      <div className="flex-1 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom du salon
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Discussions Tech"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de salon
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="roomType"
                  value="public"
                  checked={type === 'public'}
                  onChange={() => setType('public')}
                  className="mr-2"
                />
                <span>Public (accessible à tous)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="roomType"
                  value="private"
                  checked={type === 'private'}
                  onChange={() => setType('private')}
                  className="mr-2"
                />
                <span>Privé (sur invitation)</span>
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Création en cours...' : 'Créer le salon'}
          </button>
        </form>
      </div>
    </div>
  );
}
