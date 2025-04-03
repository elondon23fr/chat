import { createContext, useContext, ReactNode } from 'react';
import { User } from '../db/schema';
import { useAuthentication } from './auth/useAuthentication';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (age: number, gender: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, error, login, logout } = useAuthentication();

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
