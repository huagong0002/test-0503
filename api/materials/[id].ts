import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  console.log(`=== DELETE Request Received ===`);
  console.log(`URL: ${req.url}`);
  console.log(`Query:`, JSON.stringify(req.query));
  console.log(`Params:`, JSON.stringify(req.params));
  console.log(`Method: ${req.method}`);
  
  if (req.method !== 'DELETE') {
    console.log(`❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 在 Vercel Serverless Functions 中，路径参数通过 req.query 获取
  // /api/materials/xxx 会被解析为 req.query.id = 'xxx'
  let materialId = req.query.id;
  
  // 如果没有，尝试从 URL 中提取
  if (!materialId && req.url) {
    const match = req.url.match(/\/api\/materials\/([^/?]+)/);
    if (match) {
      materialId = match[1];
    }
  }
  
  console.log(`Material ID from query: "${materialId}"`);
  
  if (!materialId) {
    console.error('❌ Missing material ID');
    return res.status(400).json({ error: '缺少材料ID' });
  }

  console.log(`🗑️ Attempting to delete material with ID: "${materialId}"`);

  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库未配置' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`🔄 Connecting to Supabase...`);
    
    // 删除材料
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }

    console.log(`✅ Successfully deleted material with ID: "${materialId}"`);
    
    res.json({ success: true, deletedId: materialId });
    
  } catch (error: any) {
    console.error('💥 Delete Error:', error.message || error);
    res.status(500).json({ 
      error: error.message,
      deletedId: materialId
    });
  }
}
