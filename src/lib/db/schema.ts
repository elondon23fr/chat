// Définition des types pour la base de données
export interface User {
  id: number;
  username: string;
  age: number;
  gender: string;
  session_id: string;
  created_at: string;
  last_active: string;
}

export interface Room {
  id: number;
  name: string;
  type: 'public' | 'private';
  created_by: number | null;
  created_at: string;
}

export interface Message {
  id: number;
  content: string;
  user_id: number;
  room_id: number;
  is_private: boolean;
  recipient_id: number | null;
  created_at: string;
}

export interface RoomMember {
  id: number;
  room_id: number;
  user_id: number;
  joined_at: string;
}

// Fonctions d'accès à la base de données
export async function getDb() {
  return process.env.DB;
}
