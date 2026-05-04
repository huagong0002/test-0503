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

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-JSON']
}));

app.use(express.json({ limit: '50mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- 3. 内存备用数据库 ---
let LOCAL_STORE: Record<string, any[]> = {};
let LOCAL_USERS: any[] = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'Jerry Admin' },
  { id: '2', username: 'test', password: 'password', role: 'user', name: 'Test User' }
];

// --- 4. API 路由定义 ---

app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'Not Attempted';
  if (supabase) {
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      dbStatus = error ? `Error: ${error.message}` : 'Connected';
    } catch (err) {
      dbStatus = `Exception: ${(err as Error).message}`;
    }
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
        const mappedUser = {
          id: userWithoutPassword.id,
          username: userWithoutPassword.username,
          email: userWithoutPassword.email,
          role: userWithoutPassword.role
        };
        return res.json({ success: true, user: mappedUser });
      }
    }
  } catch (err) {
    console.error('Database Login Error:', err);
  }

  const user = LOCAL_USERS.find(u => u.username === username && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  }
  
  res.status(401).json({ error: '用户名或密码错误' });
});

app.post('/api/register', async (req: Request, res: Response) => {
  const { username, password, email } = req.body;
  
  try {
    if (supabase) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      
      if (existingUser) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      
      const newUser = {
        id: randomUUID(),
        username,
        password,
        email: email || '',
        role: 'user'
      };
      
      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();
      
      if (data) {
        const { password: _, ...userWithoutPassword } = data;
        const mappedUser = {
          id: userWithoutPassword.id,
          username: userWithoutPassword.username,
          email: userWithoutPassword.email,
          role: userWithoutPassword.role
        };
        return res.json({ success: true, user: mappedUser });
      }
      if (error) throw error;
    } else {
      const newUser = {
        id: randomUUID(),
        username,
        password,
        email: email || '',
        role: 'user'
      };
      LOCAL_USERS.push(newUser);
      const { password: _, ...userWithoutPassword } = newUser;
      return res.json({ success: true, user: userWithoutPassword });
    }
  } catch (err) {
    console.error('Database Register Error:', err);
    return res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

app.get('/api/materials', async (req: Request, res: Response) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });
      
      if (data) {
        const mappedData = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          title: item.title,
          audioUrl: item.audio_url,
          script: item.script,
          segments: item.segments,
          lastModified: item.last_modified
        }));
        return res.json(mappedData);
      }
      if (error) throw error;
    }
  } catch (err) {
    console.error('Fetch Materials Error:', err);
  }
  
  res.json(Object.values(LOCAL_STORE).flat().sort((a, b) => b.lastModified - a.lastModified));
});

app.post('/api/materials/sync', async (req: Request, res: Response) => {
  const { materials, userId } = req.body;

  if (!userId || !Array.isArray(materials)) {
    return res.status(400).json({ error: '数据格式不正确或缺少用户ID' });
  }

  if (!supabase) {
    return res.status(500).json({ error: '数据库未连接' });
  }

  try {
    const records = materials.map((m: any) => ({
      id: m.id,
      user_id: m.userId || userId,
      title: m.title || '未命名资料',
      audio_url: m.audioUrl || '',
      script: m.script || '',
      segments: m.segments || [],
      last_modified: m.lastModified || Date.now()
    }));

    console.log(`准备同步 ${records.length} 条数据到 Supabase...`);

    const { data, error } = await supabase
      .from('materials')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error('❌ Supabase 同步详细报错:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.message,
        details: error.details 
      });
    }

    console.log('✅ 数据同步成功');
    res.json({ success: true, count: records.length });

  } catch (err: any) {
    console.error('💥 服务器同步逻辑崩溃:', err);
    res.status(500).json({ error: err.message });
  }
});

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

  Object.keys(LOCAL_STORE).forEach(uid => {
    LOCAL_STORE[uid] = LOCAL_STORE[uid].filter(m => m.id !== id);
  });

  res.json({ success: true });
});

app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `接口 ${req.originalUrl} 未找到` });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Critical Server Error:', err);
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: process.env.NODE_ENV === 'development' ? err.message : '请检查服务器日志'
  });
});

// Vercel Serverless Function 兼容导出
export default app;

// 开发环境启动（ES Module 兼容）
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}