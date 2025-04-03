import { User, Room, Message, RoomMember } from './schema';

// Fonctions pour les utilisateurs
export async function createUser(username: string, age: number, gender: string, session_id: string) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `INSERT INTO users (username, age, gender, session_id) 
     VALUES (?, ?, ?, ?) RETURNING *`
  )
  .bind(username, age, gender, session_id)
  .run();
  
  return result.results[0] as User;
}

export async function getUserBySessionId(session_id: string) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT * FROM users WHERE session_id = ?`
  )
  .bind(session_id)
  .run();
  
  return result.results[0] as User | undefined;
}

export async function updateUserActivity(user_id: number) {
  const db = process.env.DB as any;
  await db.prepare(
    `UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?`
  )
  .bind(user_id)
  .run();
}

// Fonctions pour les salons
export async function getPublicRooms() {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT * FROM rooms WHERE type = 'public' ORDER BY created_at DESC`
  )
  .run();
  
  return result.results as Room[];
}

export async function getRoomById(room_id: number) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT * FROM rooms WHERE id = ?`
  )
  .bind(room_id)
  .run();
  
  return result.results[0] as Room | undefined;
}

export async function createRoom(name: string, type: 'public' | 'private', created_by: number) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `INSERT INTO rooms (name, type, created_by) 
     VALUES (?, ?, ?) RETURNING *`
  )
  .bind(name, type, created_by)
  .run();
  
  return result.results[0] as Room;
}

// Fonctions pour les messages
export async function getMessagesByRoomId(room_id: number, limit = 50) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT m.*, u.username 
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.room_id = ? AND m.is_private = 0
     ORDER BY m.created_at DESC
     LIMIT ?`
  )
  .bind(room_id, limit)
  .run();
  
  return result.results as (Message & { username: string })[];
}

export async function createMessage(content: string, user_id: number, room_id: number, is_private = false, recipient_id: number | null = null) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `INSERT INTO messages (content, user_id, room_id, is_private, recipient_id) 
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  )
  .bind(content, user_id, room_id, is_private ? 1 : 0, recipient_id)
  .run();
  
  return result.results[0] as Message;
}

export async function getPrivateMessages(user_id: number, recipient_id: number, limit = 50) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT m.*, u.username 
     FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.is_private = 1 
     AND ((m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?))
     ORDER BY m.created_at DESC
     LIMIT ?`
  )
  .bind(user_id, recipient_id, recipient_id, user_id, limit)
  .run();
  
  return result.results as (Message & { username: string })[];
}

// Fonctions pour les membres des salons
export async function addRoomMember(room_id: number, user_id: number) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `INSERT INTO room_members (room_id, user_id) 
     VALUES (?, ?) RETURNING *`
  )
  .bind(room_id, user_id)
  .run();
  
  return result.results[0] as RoomMember;
}

export async function getRoomMembers(room_id: number) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT rm.*, u.username, u.id as user_id
     FROM room_members rm
     JOIN users u ON rm.user_id = u.id
     WHERE rm.room_id = ?`
  )
  .bind(room_id)
  .run();
  
  return result.results as (RoomMember & { username: string })[];
}

export async function isRoomMember(room_id: number, user_id: number) {
  const db = process.env.DB as any;
  const result = await db.prepare(
    `SELECT * FROM room_members WHERE room_id = ? AND user_id = ?`
  )
  .bind(room_id, user_id)
  .run();
  
  return result.results.length > 0;
}
