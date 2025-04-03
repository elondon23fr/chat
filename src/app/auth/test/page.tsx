import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';

export default function AuthTest() {
  const { user, loading, error } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testAuthentication = async () => {
    setTesting(true);
    setTestError(null);
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        setTestError('Aucune session trouvée');
        return;
      }
      
      const response = await fetch(`/api/auth/test?sessionId=${sessionId}`);
      const data = await response.json();
      
      setTestResult(data);
    } catch (err) {
      console.error('Erreur lors du test d\'authentification:', err);
      setTestError('Erreur lors du test d\'authentification');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Test d'authentification</h2>
      
      <div className="mb-4 p-4 bg-gray-100 rounded-md">
        <h3 className="font-medium mb-2">État actuel:</h3>
        {loading ? (
          <p>Chargement...</p>
        ) : user ? (
          <div>
            <p className="text-green-600 font-medium">Connecté</p>
            <p>Utilisateur: {user.username}</p>
            <p>ID: {user.id}</p>
            <p>Âge: {user.age}</p>
            <p>Genre: {user.gender}</p>
          </div>
        ) : (
          <p className="text-red-600">Non connecté</p>
        )}
        
        {error && (
          <p className="text-red-600 mt-2">Erreur: {error}</p>
        )}
      </div>
      
      <div className="mb-4">
        <button
          onClick={testAuthentication}
          disabled={testing || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? 'Test en cours...' : 'Tester l\'authentification'}
        </button>
      </div>
      
      {testError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {testError}
        </div>
      )}
      
      {testResult && (
        <div className="p-4 border border-gray-200 rounded-md">
          <h3 className="font-medium mb-2">Résultat du test:</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-auto text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
