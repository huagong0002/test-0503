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

let LOCAL_STORE: Record<string, any[]> = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = (req.query as Record<string, string>).id;

  try {
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    }

    Object.keys(LOCAL_STORE).forEach(uid => {
      LOCAL_STORE[uid] = LOCAL_STORE[uid].filter(m => m.id !== id);
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: error.message });
  }
}