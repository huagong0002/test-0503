import { createClient } from '@supabase/supabase-js';

type VercelRequest = {
  method: string;
  body: any;
  query: Record<string, string | string[]>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

const LOCAL_USERS = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'Jerry Admin' },
  { id: '2', username: 'test', password: 'password', role: 'user', name: 'Test User' }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
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

    const user = LOCAL_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    }

    res.status(401).json({ error: '用户名或密码错误' });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
}