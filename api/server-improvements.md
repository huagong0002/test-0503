
# 后端 API 改进方案

## 目录
1. [安全改进](#安全改进)
2. [代码组织](#代码组织)
3. [中间件](#中间件)

---

## 安全改进

### 1. 密码哈希（必须）

首先安装 bcrypt：
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

### 2. 改进后的认证处理

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// 输入验证
const validateUsername = (username: string): string | null =&gt; {
  if (!username || username.trim().length === 0) return '用户名不能为空';
  const trimmed = username.trim();
  if (trimmed.length &lt; 3) return '用户名至少需要3个字符';
  if (trimmed.length &gt; 20) return '用户名不能超过20个字符';
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return '用户名只能包含字母、数字、下划线和连字符';
  return null;
};

const validatePassword = (password: string): string | null =&gt; {
  if (!password || password.length === 0) return '密码不能为空';
  if (password.length &lt; 6) return '密码至少需要6个字符';
  return null;
};

// 改进的登录处理
const handleLogin = async (req: any, res: any) =&gt; {
  const { username, password } = req.body;

  // 验证输入
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .maybeSingle();

      if (error) throw error;

      if (user &amp;&amp; user.password) {
        // 验证密码哈希
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (isValidPassword) {
          const { password: _, ...userWithoutPassword } = user;
          return res.json({ success: true, user: userWithoutPassword });
        }
      }
    } else {
      // 本地回退（仅开发环境）
      const user = LOCAL_USERS.find(u =&gt; u.username === username &amp;&amp; u.password === password);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ success: true, user: userWithoutPassword });
      }
    }

    res.status(401).json({ error: '用户名或密码错误' });
  } catch (err: any) {
    console.error('Login Error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
};

// 改进的注册处理
const handleRegister = async (req: any, res: any) =&gt; {
  const { username, password, email } = req.body;

  // 验证输入
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  
  if (usernameError) {
    return res.status(400).json({ error: usernameError });
  }
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    if (supabase) {
      // 检查用户是否已存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username.trim())
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: '该用户名已被占用' });
      }

      // 哈希密码
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // 创建用户
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          id: randomUUID(),
          username: username.trim(),
          password: hashedPassword,
          email: email || '',
          role: 'user',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      if (newUser) {
        const { password: _, ...userWithoutPassword } = newUser;
        return res.json({ success: true, user: userWithoutPassword });
      }
    } else {
      // 本地回退（仅开发环境）
      if (LOCAL_USERS.find(u =&gt; u.username === username)) {
        return res.status(400).json({ error: '该用户名已被占用' });
      }

      const newUser = {
        id: randomUUID(),
        username: username.trim(),
        password, // 注意：生产环境永远不要这样做！
        email: email || '',
        role: 'user'
      };
      LOCAL_USERS.push(newUser);

      const { password: _, ...userWithoutPassword } = newUser;
      return res.json({ success: true, user: userWithoutPassword });
    }

    res.status(500).json({ error: '注册失败' });
  } catch (err: any) {
    console.error('Register Error:', err);
    if (err.code === '23505') {
      res.status(400).json({ error: '该用户名已被占用' });
    } else {
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  }
};
```

---

## 代码组织

建议将 API 拆分为多个模块：

```
api/
├── index.ts              # 入口文件
├── config/
│   └── supabase.ts       # Supabase 配置
├── middleware/
│   ├── cors.ts           # CORS 中间件
│   ├── auth.ts           # 认证中间件
│   └── errorHandler.ts   # 错误处理中间件
├── routes/
│   ├── auth.ts           # 认证路由
│   ├── materials.ts      # 材料路由
│   └── health.ts         # 健康检查路由
├── services/
│   ├── authService.ts    # 认证服务
│   └── materialService.ts# 材料服务
├── utils/
│   ├── validation.ts     # 验证工具
│   └── response.ts       # 响应工具
└── types.ts              # 类型定义
```

### config/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export let supabase: ReturnType&lt;typeof createClient&gt; | null = null;

export function initSupabase() {
  try {
    if (supabaseUrl &amp;&amp; supabaseKey &amp;&amp; !supabaseUrl.includes('your-project')) {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase Client Initialized');
    }
  } catch (error) {
    console.error('❌ Supabase Init Error:', error);
  }
}
```

### middleware/cors.ts
```typescript
import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  'https://www.sd-education.online',
  'http://localhost:3000',
  'http://localhost:5173'
];

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');

  if (origin) {
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Origin, Cookie, X-JSON');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
```

### middleware/errorHandler.ts
```typescript
import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('API Error:', err);

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  } else {
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : err.message
    });
  }
}
```

---

## 路由示例

### routes/auth.ts
```typescript
import express from 'express';
import { handleLogin, handleRegister } from '../services/authService';

const router = express.Router();

router.post('/login', handleLogin);
router.post('/register', handleRegister);

export default router;
```

### routes/materials.ts
```typescript
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  getMaterials, 
  syncMaterials, 
  deleteMaterial 
} from '../services/materialService';

const router = express.Router();

// 所有材料路由都需要认证
router.use(requireAuth);

router.get('/', getMaterials);
router.post('/sync', syncMaterials);
router.delete('/:id', deleteMaterial);

export default router;
```

---

## 使用改进后的代码

在 `api/index.ts` 中：

```typescript
import express from 'express';
import { initSupabase, supabase } from './config/supabase';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import materialRoutes from './routes/materials';
import healthRoutes from './routes/health';

// 初始化
initSupabase();

const app = express();

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(corsMiddleware);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api', healthRoutes);

// 错误处理（必须放在最后）
app.use(errorHandler);

export default app;
```

