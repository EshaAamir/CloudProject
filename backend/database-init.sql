-- Database initialization script for Cloud Assignment
-- PostgreSQL version

-- =========================
-- USERS TABLE (FIRST)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);


-- =========================
-- FILES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_files_users
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for files
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);


-- =========================
-- NOTES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  "userId" INTEGER NOT NULL,
  "imageUrl" VARCHAR(500),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_users
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS idx_notes_userId ON notes("userId");
CREATE INDEX IF NOT EXISTS idx_notes_createdAt ON notes("createdAt");


-- =========================
-- UPDATE FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- TRIGGERS
-- =========================
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================
-- VERIFY TABLES
-- =========================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
