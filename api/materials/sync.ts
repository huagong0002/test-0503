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
  console.log(`=== ${req.method} /api/materials/sync ===`);
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持POST方法' });
    }

    const { materials, userId } = req.body;
    
    console.log(`📤 Sync request received: userId=${userId}, materials count=${materials?.length || 0}`);

    if (!userId) {
      console.error('❌ Missing userId');
      return res.status(400).json({ error: '缺少用户ID' });
    }

    if (!Array.isArray(materials)) {
      console.error('❌ materials is not an array:', materials);
      return res.status(400).json({ error: 'materials 必须是数组格式' });
    }

    if (materials.length === 0) {
      console.log('📭 No materials to sync');
      return res.json({ success: true, count: 0 });
    }

    // 检查 Supabase 凭证
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      // 返回成功但记录错误日志
      console.log(`⚠️ 跳过数据库同步，共 ${materials.length} 个材料`);
      return res.json({ success: true, count: materials.length, skipped: true, reason: '数据库未配置' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');

    // 逐个处理材料
    let successCount = 0;
    for (const material of materials) {
      const record = {
        id: material.id,
        user_id: material.userId || userId,
        creator_username: material.creatorUsername || userId,
        title: material.title || '未命名资料',
        audio_url: material.audioUrl || '',
        script: material.script || '',
        segments: material.segments || [],
        last_modified: material.lastModified || Date.now()
      };

      try {
        const { data: existingData } = await supabase
          .from('materials')
          .select('id')
          .eq('id', material.id)
          .limit(1);

        const exists = existingData && existingData.length > 0;

        if (exists) {
          const { error: updateError } = await supabase
            .from('materials')
            .update(record)
            .eq('id', material.id);

          if (!updateError) successCount++;
        } else {
          const { error: insertError } = await supabase
            .from('materials')
            .insert(record);

          if (!insertError) successCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing material ${material.id}:`, err);
      }
    }

    console.log(`✅ Successfully synced ${successCount} out of ${materials.length} materials`);
    return res.json({ success: true, count: successCount });
    
  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}