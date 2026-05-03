import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

let : any = null;

try {
  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client Initialized');
  } else {
    console.warn(`⚠️ Supabase URL or Key missing. URL present: ${!!supabaseUrl}, Key present: ${!!supabaseKey}`);
  }
} catch (error) {
  console.error('❌ Supabase Init Error:', error);
}

// Global Error Handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 0. Trust Proxy
app.set('trust proxy', true);

// 1. CORS Middleware
app.use(cors({
  origin: true, // Allow all origins for debugging, or keep your logic
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin', 'Cookie', 'X-JSON'],
  exposedHeaders: ['Set-Cookie', 'Content-Length']
}));

app.use(express.json({ limit: '50mb' }));

// 2. Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Fallbacks with User Isolation
let LOCAL_STORE: Record<string, any[]> = {}; // Map of userId -> materials[]
let LOCAL_USERS: any[] = [
  { id: '1', username: 'admin', password: 'admin123', email: 'admin@e-listen.com', role: 'admin' },
  { id: '2', username: 'tester', password: 'password', email: 'tester@example.com', role: 'user' }
];

// 3. API Routes
app.get('/api/health', async (req, res) => {
  try {
    let dbTest = 'Not Attempted';
    let dbError = null;
    
    if (supabase) {
      const { data, error } = await supabase.from('users').select('count');
      if (error) {
        dbTest = 'Failed';
        dbError = error.message;
      } else {
        dbTest = 'Success';
      }
    }

    res.json({ 
      status: 'ok', 
      supabase: !!supabase,
      databaseConnection: dbTest,
      databaseError: dbError,
      env: {
        hasUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
        urlPrefix: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').substring(0, 10) + '...',
        hasKey: !!process.env.SUPABASE_KEY || !!process.env.VITE_SUPABASE_KEY,
        keyLength: (process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '').length,
        nodeEnv: process.env.NODE_ENV,
        allKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      },
      time: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cors-test', (req, res) => {
  res.json({ 
    message: 'CORS is working', 
    origin: req.get('Origin'),
    headers: req.headers
  });
});

app.get('/debug/host', (req, res) => {
  res.json({
    host: req.get('host'),
    origin: req.get('origin'),
    headers: req.headers,
    env: process.env.NODE_ENV,
    url: req.url
  });
});

const handleLogin = async (req, res) => {
  const { username, password } = req.method === 'GET' ? req.query : req.body;
  
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const { password: _, ...userWithoutPassword } = data as any;
        return res.json({ success: true, user: userWithoutPassword });
      }
    }
  } catch (err: any) {
    console.error('Supabase Login Error:', err.message);
    if (err.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        error: '数据库表 "users" 未找到。', 
        suggestion: '请先运行 SETUP_SUPABASE.sql 脚本。' 
      });
    }
  }

  // Fallback to local
  const user = LOCAL_USERS.find(u => u.username === username && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  }
  
  res.status(401).json({ error: '用户名或密码错误' });
};

const handleRegister = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    if (supabase) {
      // Check for existing user
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        return res.status(400).json({ error: '该用户名已被占用' });
      }

      // Insert new user
      const { data, error } = await supabase
        .from('users')
        .insert([{ id: randomUUID(), username, password, email: '', role: 'user' }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const { password: _, ...userWithoutPassword } = data as any;
        return res.json({ success: true, user: userWithoutPassword });
      }
    }
  } catch (err: any) {
    console.error('Supabase Register Error:', err.message);
    if (err.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        error: '数据库表 "users" 未找到。', 
        suggestion: '请先运行 SETUP_SUPABASE.sql 脚本。' 
      });
    }
    if (err.code === '23505') return res.status(400).json({ error: '该用户名已被占用' });
  }

  // Fallback if Supabase fails
  if (LOCAL_USERS.find(u => u.username === username)) {
    return res.status(400).json({ error: '该用户名已被占用' });
  }
  const newUser = { id: randomUUID(), username, password, email: '', role: 'user' };
  LOCAL_USERS.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({ success: true, user: userWithoutPassword });
};

app.all(['/api/login', '/login'], handleLogin);
app.all(['/api/register', '/register'], handleRegister);

app.get('/api/materials', async (req, res) => {
  try {
    if (supabase) {
      // Return ALL materials for a shared library experience
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });
      
      if (error) throw error;
      
      const formatted = (data || []).map(m => ({
        id: m.id,
        title: m.title,
        audioUrl: m.audio_url,
        script: m.script,
        segments: m.segments || [],
        lastModified: m.last_modified,
        userId: m.user_id
      }));
      
      return res.json(formatted);
    }
  } catch (err: any) {
    console.error('Fetch Materials Error:', err.message);
  }
  
  // Flatten local store for everyone to see everything in memory fallback
  const allLocal = Object.values(LOCAL_STORE).flat();
  res.json(allLocal.sort((a,b) => b.lastModified - a.lastModified));
});

app.post('/api/materials/sync', async (req, res) => {
  const { materials, userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  if (!Array.isArray(materials)) {
    return res.status(400).json({ error: 'Invalid materials data' });
  }

  try {
    if (supabase) {
      const records = materials.map(m => ({
        id: m.id,
        user_id: m.userId || userId, // Preserve original creator if exists
        title: m.title || 'Untitled',
        audio_url: m.audioUrl,
        script: m.script || '',
        segments: Array.isArray(m.segments) ? m.segments : [],
        last_modified: m.lastModified || Date.now()
      }));

      const { error } = await supabase
        .from('materials')
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error('❌ Supabase Upsert Error Detail:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details
        });
        throw error;
      }
      return res.json({ success: true, count: materials.length });
    } else {
      console.warn('⚠️ Supabase client not initialized, using memory fallback');
    }
  } catch (err: any) {
    console.error('Sync Error Trace:', err);
  }

  // Fallback to local memory (shared)
  if (!LOCAL_STORE['shared']) LOCAL_STORE['shared'] = [];
  
  materials.forEach(newM => {
    const index = LOCAL_STORE['shared'].findIndex(m => m.id === newM.id);
    if (index !== -1) {
      if (newM.lastModified > LOCAL_STORE['shared'][index].lastModified) {
        LOCAL_STORE['shared'][index] = { ...newM, user_id: userId };
      }
    } else {
      LOCAL_STORE['shared'].push({ ...newM, user_id: userId });
    }
  });
  
  LOCAL_STORE['shared'].sort((a, b) => b.lastModified - a.lastModified);
  res.json({ success: true, count: LOCAL_STORE['shared'].length });
});

app.delete('/api/materials/:id', async (req, res) => {
  const { id } = req.params;
  const username = req.query.username as string;

  // ONLY admin can delete
  if (username !== 'admin') {
    return res.status(403).json({ error: '只有管理员可以删除库文件' });
  }

  try {
    if (supabase) {
      await supabase.from('materials').delete().eq('id', id);
    }
  } catch (e) {
    console.error('Delete Error:', e);
  }

  // Also remove from local fallback
  Object.keys(LOCAL_STORE).forEach(uid => {
    LOCAL_STORE[uid] = LOCAL_STORE[uid].filter(m => m.id !== id);
  });
  
  res.json({ success: true });
});

// API 404 handler - MUST be before the Vite/Static fallback
app.all('/api/*', (req, res) => {
  console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API 接口不存在', 
    method: req.method,
    path: req.originalUrl 
  });
});

// Vite middleware for development
async function startServer() {
  const isVercel = !!process.env.VERCEL;
  
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('✅ Vite middleware initialized');
    } catch (e) {
      console.error('❌ Failed to load Vite:', e);
    }
  } else if (!isVercel) {
    // Only serve static files if NOT on Vercel (Vercel handles this via vercel.json)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not on Vercel
  if (!isVercel) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running locally on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else {
    console.log('🚀 Server running in Vercel environment');
  }
}

// Start the server
startServer().catch(err => {
  console.error('Failed to start server:', err);
});

// Export for Vercel
app.use((err, req, res, next) => {
  console.error('💥 Global Error Handler:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;

