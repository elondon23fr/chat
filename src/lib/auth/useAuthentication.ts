import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Fonction pour générer un pseudo temporaire
export function generateUsername() {
  const adjectives = [
    'Joyeux', 'Curieux', 'Rapide', 'Brillant', 'Calme', 'Doux', 'Élégant', 'Fier',
    'Grand', 'Habile', 'Intrépide', 'Jovial', 'Loyal', 'Malin', 'Noble', 'Optimiste',
    'Patient', 'Rusé', 'Sage', 'Tranquille', 'Unique', 'Vif', 'Zélé'
  ];
  
  const nouns = [
    'Panda', 'Lion', 'Tigre', 'Dauphin', 'Aigle', 'Renard', 'Loup', 'Ours',
    'Hibou', 'Phénix', 'Dragon', 'Licorne', 'Éléphant', 'Baleine', 'Faucon',
    'Jaguar', 'Koala', 'Lynx', 'Panthère', 'Requin', 'Tortue', 'Zèbre'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// Hook personnalisé pour gérer l'authentification
export function useAuthentication() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem('sessionId');
      
      if (sessionId) {
        try {
          const response = await fetch(`/api/auth/login?sessionId=${sessionId}`);
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Session invalide, supprimer du localStorage
            localStorage.removeItem('sessionId');
          }
        } catch (err) {
          console.error('Erreur lors de la vérification de l\'authentification:', err);
          setError('Erreur de connexion au serveur');
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // Fonction de connexion
  const login = async (age, gender) => {
    setLoading(true);
    setError(null);
    
    try {
      // Générer un pseudo temporaire
      const username = generateUsername();
      
      // Générer un ID de session unique
      const sessionId = uuidv4();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, age, gender, sessionId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la connexion');
      }
      
      const userData = await response.json();
      
      // Stocker l'ID de session dans le localStorage
      localStorage.setItem('sessionId', sessionId);
      
      setUser(userData);
      return userData;
    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      setError(err.message || 'Erreur lors de la connexion');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('sessionId');
    setUser(null);
  };
  
  return { user, loading, error, login, logout };
}
