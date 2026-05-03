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
  title TEXT NOT NULL,
  audio_url TEXT,
  script TEXT,
  segments JSONB DEFAULT '[]'::jsonb,
  last_modified BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 4. 允许匿名和认证用户访问 (简化配置以便测试)
DROP POLICY IF EXISTS "Enable all access for now" ON users;
CREATE POLICY "Enable all access for now" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for materials" ON materials;
CREATE POLICY "Enable all access for materials" ON materials FOR ALL USING (true) WITH CHECK (true);
