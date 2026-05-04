-- E-Listen Supabase 数据库初始化脚本
-- 运行此脚本来创建所需的表结构

-- 1. 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建 materials 表
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  audio_url TEXT,
  script TEXT,
  segments JSONB DEFAULT '[]'::jsonb,
  last_modified BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_materials_author_id ON materials(author_id);
CREATE INDEX IF NOT EXISTS idx_materials_last_modified ON materials(last_modified DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 4. 启用 RLS (Row Level Security) - 可选但推荐
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略（示例，根据需要调整）
-- 允许用户查看自己的数据
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- 允许用户查看和管理自己的材料
CREATE POLICY "Users can view their own materials" ON materials
  FOR SELECT USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can create their own materials" ON materials
  FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

CREATE POLICY "Users can update their own materials" ON materials
  FOR UPDATE USING (auth.uid()::text = author_id::text);

CREATE POLICY "Users can delete their own materials" ON materials
  FOR DELETE USING (auth.uid()::text = author_id::text);

-- 注意：以上 RLS 策略使用了 Supabase 的 auth.uid() 函数
-- 如果您不使用 Supabase Auth，可以删除或修改这些策略

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库表创建完成！';
  RAISE NOTICE '📋 表列表: users, materials';
  RAISE NOTICE '🔒 RLS: 已启用（如不需要可禁用）';
END $$;
