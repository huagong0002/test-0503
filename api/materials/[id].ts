import { createClient } from '@supabase/supabase-js';

type VercelRequest = {
  method: string;
  body: any;
  query: Record<string, string | string[] | undefined>;
  url?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`=== DELETE Request Received ===`);
  console.log(`URL: ${req.url}`);
  console.log(`Query:`, JSON.stringify(req.query));
  console.log(`Method: ${req.method}`);
  
  if (req.method !== 'DELETE') {
    console.log(`❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query.id;
  console.log(`ID from query:`, id, `(Type: ${typeof id})`);
  
  if (!id) {
    console.error('❌ Missing material ID');
    return res.status(400).json({ error: '缺少材料ID' });
  }

  const materialId = Array.isArray(id) ? id[0] : id;
  console.log(`🗑️ Attempting to delete material with ID: "${materialId}"`);

  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库未配置' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`🔄 Connecting to Supabase...`);
    
    // First, check if the material exists
    const { data: existingData, error: fetchError } = await supabase
      .from('materials')
      .select('id')
      .eq('id', materialId);
    
    if (fetchError) {
      console.error('❌ Failed to check material existence:', fetchError);
      throw fetchError;
    }
    
    console.log(`📋 Existing materials with this ID:`, existingData?.length || 0);

    // Now delete
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted material with ID: "${materialId}"`);
    
    // Verify deletion
    const { data: remainingData } = await supabase
      .from('materials')
      .select('id')
      .eq('id', materialId);
    
    console.log(`🔍 After deletion, remaining materials:`, remainingData?.length || 0);
    
    res.json({ success: true, deletedId: materialId });
    
  } catch (error: any) {
    console.error('💥 Delete Error:', error.message || error);
    res.status(500).json({ 
      error: error.message,
      deletedId: materialId,
      query: req.query
    });
  }
}