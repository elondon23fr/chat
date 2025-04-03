-- Migration number: 0001 	 2025-04-03
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS room_members;

-- Table des utilisateurs temporaires
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des salons de discussion
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public', 'private')),
  created_by INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT 0,
  recipient_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Table des membres des salons (pour les salons privés)
CREATE TABLE IF NOT EXISTS room_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(room_id, user_id)
);

-- Données initiales
INSERT INTO rooms (name, type, created_by) VALUES 
  ('general', 'public', NULL);

-- Création des index
CREATE INDEX idx_users_session_id ON users(session_id);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
