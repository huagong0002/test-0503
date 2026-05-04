import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

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

let LOCAL_USERS: any[] = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin', name: 'Jerry Admin' },
  { id: '2', username: 'test', password: 'password', role: 'user', name: 'Test User' }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password, email } = req.body;

  try {
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
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
      const existingUser = LOCAL_USERS.find(u => u.username === username);
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
      LOCAL_USERS.push(newUser);
      const { password: _, ...userWithoutPassword } = newUser;
      return res.json({ success: true, user: userWithoutPassword });
    }
  } catch (error: any) {
    console.error('Register Error:', error);
    res.status(500).json({ error: error.message });
  }
}