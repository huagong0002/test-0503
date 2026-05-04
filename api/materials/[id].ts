import { createClient } from '@supabase/supabase-js';

type VercelRequest = {
  method: string;
  body: any;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[DELETE] Request received: ${JSON.stringify(req.query)}`);
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  
  if (!id) {
    console.error('❌ Missing material ID');
    return res.status(400).json({ error: '缺少材料ID' });
  }

  const materialId = Array.isArray(id) ? id[0] : id;
  console.log(`🗑️ Attempting to delete material with ID: ${materialId}`);

  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库未配置' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted material with ID: ${materialId}`);
    res.json({ success: true, deletedId: materialId });
    
  } catch (error: any) {
    console.error('💥 Delete Error:', error);
    res.status(500).json({ 
      error: error.message,
      deletedId: materialId,
      query: req.query
    });
  }
}