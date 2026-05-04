import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();

// --- 1. Supabase 核心初始化 ---
const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseKey: string = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

try {
  // 仅在环境便利存在且格式正确时初始化，防止启动崩溃
  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client Initialized Successfully');
  } else {
    console.warn('⚠️ Supabase credentials missing or invalid. Check Environment Variables.');
  }
} catch (error) {
  console.error('❌ Supabase Initialization Error:', error);
}

// --- 2. 中间件配置 (Middleware) ---
app.set('trust proxy', true);

// 跨域配置：允许所有来源以便调试，支持凭证
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-JSON']
}));

// 解析 JSON 请求体，设置 50mb 上限以支持大型资料同步
app.use(express.json({ limit: '50mb' }));

// 简易日志记录器
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- 3. 内存备用数据库 (当数据库连接失败或未配置时保证程序不崩) ---
let LOCAL_STORE: Record<string, any[]> = {}; // 用户 ID -> 资料数组
let LOCAL_USERS: any[] = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'Jerry Admin' },
  { id: '2', username: 'test', password: 'password', role: 'user', name: 'Test User' }
];

// --- 4. API 路由定义 ---

/**
 * [GET] 健康检查
 * 用于排查 Vercel 环境变量和数据库连接状态
 */
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'Not Attempted';
  if (supabase) {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    dbStatus = error ? `Error: ${error.message}` : 'Connected';
  }

  res.json({
    status: 'ok',
    supabaseConnected: !!supabase,
    databaseConnection: dbStatus,
    env: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV
    },
    time: new Date().toISOString()
  });
});

/**
 * [POST] 用户登录
 */
app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (data) {
        const { password: _, ...userWithoutPassword } = data;
        return res.json({ success: true, user: userWithoutPassword });
      }
    }
  } catch (err) {
    console.error('Database Login Error:', err);
  }

  // 备用逻辑：检查本地模拟数据库
  const user = LOCAL_USERS.find(u => u.username === username && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  }
  
  res.status(401).json({ error: '用户名或密码错误' });
});

/**
 * [GET] 获取所有资料库内容
 */
app.get('/api/materials', async (req: Request, res: Response) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });
      
      if (data) return res.json(data);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Fetch Materials Error:', err);
  }
  
  // 备用逻辑：返回内存中的所有资料
  res.json(Object.values(LOCAL_STORE).flat().sort((a, b) => b.lastModified - a.lastModified));
});

/**
 * [POST] 同步资料库 (批量 Upsert)
 */
app.post('/api/materials/sync', async (req: Request, res: Response) => {
  const { materials, userId } = req.body;

  if (!userId || !Array.isArray(materials)) {
    return res.status(400).json({ error: '无效的数据格式或缺少用户ID' });
  }

  try {
    if (supabase) {
      const records = materials.map(m => ({
        id: m.id,
        user_id: userId,
        title: m.title || '无标题资料',
        audio_url: m.audioUrl,
        script: m.script || '',
        segments: Array.isArray(m.segments) ? m.segments : [],
        last_modified: m.lastModified || Date.now()
      }));

      const { error } = await supabase.from('materials').upsert(records, { onConflict: 'id' });
      if (error) throw error;
      
      return res.json({ success: true, count: materials.length });
    }
  } catch (err) {
    console.error('Sync Error:', err);
  }

  // 备用逻辑：存入本地内存
  LOCAL_STORE[userId] = materials;
  res.json({ success: true, count: materials.length, storage: 'memory' });
});

/**
 * [DELETE] 删除资料 (仅限管理员或所有者逻辑可在此扩展)
 */
app.delete('/api/materials/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    if (supabase) {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    }
  } catch (err) {
    console.error('Delete Error:', err);
  }

  // 备用逻辑：从内存清理
  Object.keys(LOCAL_STORE).forEach(uid => {
    LOCAL_STORE[uid] = LOCAL_STORE[uid].filter(m => m.id !== id);
  });

  res.json({ success: true });
});

// --- 5. 统一错误处理与导出 ---

// 处理未匹配的 API 路径
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `接口 ${req.originalUrl} 未找到` });
});

// 全局 500 错误捕获
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Critical Server Error:', err);
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: process.env.NODE_ENV === 'development' ? err.message : '请检查服务器日志'
  });
});

// 导出给 Vercel 使用
export default app;
