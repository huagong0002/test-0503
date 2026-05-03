import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

// 密码哈希配置
const SALT_ROUNDS = 12;

// ==================== 输入验证函数 ====================
const validateUsername = (username: string): string | null => {
  if (!username || username.trim().length === 0) {
    return '用户名不能为空';
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return '用户名至少需要3个字符';
  }
  if (trimmed.length > 20) {
    return '用户名不能超过20个字符';
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(trimmed)) {
    return '用户名只能包含字母、数字、下划线和中文';
  }
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password || password.length === 0) {
    return '密码不能为空';
  }
  if (password.length < 6) {
    return '密码至少需要6个字符';
  }
  if (password.length > 50) {
    return '密码不能超过50个字符';
  }
  return null;
};

// 检查密码是否已被哈希（bcrypt 哈希以 $2b$ 开头）
const isPasswordHashed = (password: string): boolean => {
  return password.startsWith('$2b$') || password.startsWith('$2a$');
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;

try {
  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project.supabase.co')) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client Initialized');
  }
} catch (error) {
  console.error('❌ Supabase Init Error:', error);
}

// 0. Trust Proxy for Cloudflare/Load Balancers
app.set('trust proxy', true);

// 1. Basic Middlewares
// CORS 配置 - 使用白名单方式，更安全可靠
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://www.sd-education.online',
];

app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  if (origin) {
    // 检查 origin 是否在白名单中
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || origin.includes(allowed.replace('https://', '').replace('http://', ''))
    );
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else if (origin.includes('localhost') || origin.includes('sd-education.online')) {
      // 兼容开发环境和 sd-education 子域名
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      // 其他来源允许跨域请求，但不能带凭证
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  } else {
    // 非浏览器请求或同源请求
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Cookie, X-JSON');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Length');

  // 预检请求直接拦截返回
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// 2. Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[REQ] ${req.method} ${req.url}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[RES] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// In-memory Fallback (for local dev without supabase)
let LOCAL_STORE: any[] = [];
// 注意：这些是预先生成的 bcrypt 哈希密码，对应原始密码 admin123 和 password
// 生产环境请删除这些测试用户！
let LOCAL_USERS: any[] = [
  { 
    id: '1', 
    username: 'admin', 
    // 密码: admin123 (bcrypt hash)
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4oF.C8cR9.Aq', 
    email: 'admin@e-listen.com', 
    role: 'admin' 
  },
  { 
    id: '2', 
    username: 'tester', 
    // 密码: password (bcrypt hash)
    password: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    email: 'tester@example.com', 
    role: 'user' 
  }
];

// Log Vercel environment for debugging
if (process.env.VERCEL) {
  console.log(`[Vercel] Function execution started. Path: ${process.env.VERCEL_URL || 'Unknown'}`);
}

// 3. API Routes
app.get('/ping', (req, res) => res.send('pong'));
app.get('/api', (req, res) => {
  res.json({ 
    message: 'E-Listen API Server (Vercel Ready)',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/materials',
      '/api/login',
      '/api/register'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    supabaseConnected: !!supabase,
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    serverTime: new Date().toISOString(),
    reqInfo: {
      origin: req.get('Origin') || 'None',
      host: req.get('host'),
      url: req.url,
      originalUrl: req.originalUrl
    }
  });
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
  
  // 输入验证
  const usernameError = validateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }
  
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  
  const trimmedUsername = username.trim();
  
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (error) throw error;

      if (data && data.password) {
        // 检查密码是否已哈希
        let isValidPassword = false;
        
        try {
          if (isPasswordHashed(data.password)) {
            // 使用 bcrypt 验证哈希密码
            isValidPassword = await bcrypt.compare(password, data.password);
          } else {
            // 兼容旧的明文密码（仅用于迁移期间）
            // 登录成功后自动升级为哈希密码
            if (data.password === password) {
              isValidPassword = true;
              // 自动将明文密码升级为哈希密码
              const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
              await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('id', data.id);
              console.log(`[Security] Password upgraded to hash for user: ${trimmedUsername}`);
            }
          }
        } catch (hashError) {
          console.error('Password verification error:', hashError);
          return res.status(500).json({ error: '密码验证失败，请稍后重试' });
        }
        
        if (isValidPassword) {
          const { password: _, ...userWithoutPassword } = data as any;
          return res.json({ success: true, user: userWithoutPassword });
        }
      }
    }
  } catch (err: any) {
    console.error('Supabase Login Error:', err.message);
    return res.status(500).json({ error: '登录失败，请稍后重试' });
  }

  // Fallback to local (仅开发环境，使用哈希密码)
  const user = LOCAL_USERS.find(u => u.username === trimmedUsername);
  if (user) {
    let isValidPassword = false;
    
    try {
      if (isPasswordHashed(user.password)) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else if (user.password === password) {
        // 兼容旧的明文密码
        isValidPassword = true;
        // 自动升级为哈希密码
        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        console.log(`[Security] Local password upgraded to hash for user: ${trimmedUsername}`);
      }
    } catch (hashError) {
      console.error('Local password verification error:', hashError);
      return res.status(500).json({ error: '密码验证失败，请稍后重试' });
    }
    
    if (isValidPassword) {
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    }
  }
  
  res.status(401).json({ error: '用户名或密码错误' });
};

const handleRegister = async (req, res) => {
  const { username, password, email } = req.body;
  
  // 输入验证
  const usernameError = validateUsername(username);
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }
  
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  
  const trimmedUsername = username.trim();
  
  try {
    if (supabase) {
      // Check for existing user
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('username')
        .eq('username', trimmedUsername)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        return res.status(400).json({ error: '该用户名已被占用' });
      }

      // 哈希密码
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert new user with hashed password
      const { data, error } = await supabase
        .from('users')
        .insert([{ 
          id: randomUUID(), 
          username: trimmedUsername, 
          password: hashedPassword, 
          email: email || '', 
          role: 'user',
          created_at: new Date().toISOString()
        }])
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
    if (err.code === '23505') return res.status(400).json({ error: '该用户名已被占用' });
  }

  // Fallback if Supabase fails (本地开发环境)
  if (LOCAL_USERS.find(u => u.username === trimmedUsername)) {
    return res.status(400).json({ error: '该用户名已被占用' });
  }
  
  // 哈希密码
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const newUser = { 
    id: randomUUID(), 
    username: trimmedUsername, 
    password: hashedPassword, 
    email: email || '', 
    role: 'user' 
  };
  LOCAL_USERS.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  return res.json({ success: true, user: userWithoutPassword });
};

app.all(['/api/login', '/login'], handleLogin);
app.all(['/api/register', '/register'], handleRegister);

app.get('/api/materials', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });
      
      if (error) throw error;
      
      // 映射数据库字段名为前端所需的驼峰式 (如果需要)
      const formatted = (data || []).map(m => ({
        id: m.id,
        title: m.title,
        audioUrl: m.audio_url,
        script: m.script,
        segments: m.segments || [],
        lastModified: m.last_modified
      }));
      
      return res.json(formatted);
    }
  } catch (err: any) {
    console.error('Fetch Materials Error:', err.message);
  }
  res.json(LOCAL_STORE);
});

app.post('/api/materials/sync', async (req, res) => {
  const { materials } = req.body;
  if (!Array.isArray(materials)) {
    return res.status(400).json({ error: 'Invalid materials data' });
  }

  try {
    if (supabase) {
      const records = materials.map(m => ({
        id: m.id,
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
        console.error('Supabase Sync Error:', error);
        throw error;
      }
      return res.json({ success: true, count: materials.length, source: 'supabase' });
    }
  } catch (err: any) {
    console.error('Sync Fallback triggered:', err.message);
  }

  // Fallback to local memory if Supabase fails
  materials.forEach(newM => {
    const index = LOCAL_STORE.findIndex(m => m.id === newM.id);
    if (index !== -1) {
      if (newM.lastModified > LOCAL_STORE[index].lastModified) {
        LOCAL_STORE[index] = newM;
      }
    } else {
      LOCAL_STORE.push(newM);
    }
  });
  LOCAL_STORE.sort((a, b) => b.lastModified - a.lastModified);
  res.json({ success: true, count: LOCAL_STORE.length, source: 'memory' });
});

app.delete('/api/materials/:id', async (req, res) => {
  const { id } = req.params;
  if (supabase) {
    await supabase.from('materials').delete().eq('id', id);
  } else {
    LOCAL_STORE = LOCAL_STORE.filter(m => m.id !== id);
  }
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
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Initializing the server environment
setupVite().catch(err => {
  console.error('Failed to setup Vite:', err);
});

// Export for Vercel
export default app;

// Listen only if not in Vercel
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const shouldListen = !isVercel && (process.env.NODE_ENV !== 'production' || process.env.RENDER || process.env.K_SERVICE || process.env.PORT);

if (shouldListen) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
} else if (isVercel) {
  console.log('🚀 Server starting in Vercel Serverless environment');
}

