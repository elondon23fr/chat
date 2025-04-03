import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { generateUsername } from '@/lib/auth/useAuthentication';

export default function LoginForm() {
  const { user, login, error: authError } = useAuth();
  const router = useRouter();
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUsername, setGeneratedUsername] = useState<string>('');

  // Générer un nom d'utilisateur temporaire à l'affichage du formulaire
  useEffect(() => {
    setGeneratedUsername(generateUsername());
  }, []);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (user) {
      router.push('/chat/general');
    }
  }, [user, router]);

  // Mettre à jour l'erreur si authError change
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (age === '' || !gender) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (typeof age === 'number' && age < 13) {
      setError('Vous devez avoir au moins 13 ans pour utiliser cette application');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(Number(age), gender);
      // La redirection est gérée par l'effet useEffect ci-dessus
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateUsername = () => {
    setGeneratedUsername(generateUsername());
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Bienvenue sur l'application de chat</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pseudo temporaire
          </label>
          <div className="flex">
            <div className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-700">
              {generatedUsername}
            </div>
            <button
              type="button"
              onClick={handleRegenerateUsername}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-r-md"
            >
              Changer
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Ce pseudo vous sera attribué automatiquement</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Âge
          </label>
          <input
            id="age"
            type="number"
            min="13"
            value={age}
            onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Sélectionnez votre genre</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Connexion en cours...' : 'Commencer à discuter'}
        </button>
      </form>
    </div>
  );
}
