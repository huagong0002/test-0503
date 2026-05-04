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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let dbStatus = 'Not Attempted';
  
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      dbStatus = error ? `Error: ${error.message}` : 'Connected';
    } catch (err) {
      dbStatus = `Exception: ${(err as Error).message}`;
    }
  }

  res.json({
    status: 'ok',
    supabaseConnected: !!supabaseUrl && !!supabaseKey,
    databaseConnection: dbStatus,
    env: {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV
    },
    time: new Date().toISOString()
  });
}