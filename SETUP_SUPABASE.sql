-- E-Listen Supabase 初始化脚本
-- 请在 Supabase SQL Editor 中运行以下代码

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 听力材料表
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY, 
  user_id TEXT, 
  creator_username TEXT,
  title TEXT NOT NULL,
  audio_url TEXT,
  script TEXT,
  segments JSONB DEFAULT '[]'::jsonb,
  last_modified BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 禁用 RLS（行级安全）以确保所有用户都能读写数据
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- 4. 初始管理员账号
INSERT INTO users (id, username, password, role, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'admin123', 'admin', 'admin@e-listen.com')
ON CONFLICT (username) DO NOTHING;

-- 5. 如果表已存在但缺少字段，添加字段
ALTER TABLE materials ADD COLUMN IF NOT EXISTS creator_username TEXT;
