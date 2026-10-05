CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, 
  email TEXT UNIQUE NOT NULL, 
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')), 
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL, 
  school TEXT NOT NULL, 
  subjects TEXT[] NOT NULL,
  experience_years INTEGER NOT NULL, 
  age_group TEXT NOT NULL, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contents (
  id SERIAL PRIMARY KEY, 
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('questions', 'typing_text')), 
  title TEXT NOT NULL,
  description TEXT, 
  topic TEXT NOT NULL, 
  level INTEGER NOT NULL DEFAULT 1, 
  data JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE, 
  likes_count INTEGER DEFAULT 0, 
  plays_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY, 
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE IF NOT EXISTS typing_results (
  id SERIAL PRIMARY KEY, 
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL, 
  language TEXT NOT NULL, 
  level TEXT NOT NULL, 
  wpm INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL, 
  time_sec NUMERIC(6,2) NOT NULL, 
  text_length INTEGER NOT NULL,
  place INTEGER, 
  room_code TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labyrinth_results (
  id SERIAL PRIMARY KEY, 
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_mode TEXT NOT NULL, 
  level TEXT NOT NULL, 
  time_sec NUMERIC(6,2) NOT NULL, 
  score INTEGER NOT NULL,
  correct_answers INTEGER DEFAULT 0, 
  wrong_answers INTEGER DEFAULT 0, 
  powerups_collected INTEGER DEFAULT 0,
  place INTEGER, 
  room_code TEXT, 
  labyrinth_seed TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labyrinth_rooms (
  id SERIAL PRIMARY KEY, 
  host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, 
  level TEXT NOT NULL, 
  topic TEXT, 
  labyrinth_seed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', 
  duration_minutes INTEGER DEFAULT 5, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labyrinth_players (
  id SERIAL PRIMARY KEY, 
  room_id INTEGER REFERENCES labyrinth_rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id), 
  device TEXT, 
  nickname TEXT NOT NULL,
  position_x INTEGER DEFAULT 0, 
  position_y INTEGER DEFAULT 0, 
  lives INTEGER DEFAULT 3,
  score INTEGER DEFAULT 0, 
  powerups JSONB DEFAULT '[]'::jsonb, 
  finished BOOLEAN DEFAULT FALSE,
  finished_at TIMESTAMPTZ, 
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY, 
  host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content_id INTEGER REFERENCES contents(id), 
  code TEXT UNIQUE NOT NULL, 
  game_type TEXT NOT NULL,
  topic TEXT, 
  level INTEGER DEFAULT 1, 
  status TEXT NOT NULL DEFAULT 'waiting',
  duration_minutes INTEGER DEFAULT 40, 
  round INTEGER DEFAULT 0, 
  question JSONB,
  expires_at TIMESTAMPTZ, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_players (
  id SERIAL PRIMARY KEY, 
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id), 
  device TEXT, 
  nickname TEXT NOT NULL,
  score INTEGER DEFAULT 0, 
  correct INTEGER DEFAULT 0, 
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY, 
  teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, 
  description TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_students (
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(), 
  PRIMARY KEY(class_id, user_id)
);
