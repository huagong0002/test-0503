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
  console.log(`Body:`, req.body);
  
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库配置未完成' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');

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

    // 逐个处理材料，避免 PGRST204 错误
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
        // 先检查是否存在
        const { data: existingData, error: checkError } = await supabase
          .from('materials')
          .select('id')
          .eq('id', material.id)
          .limit(1);

        if (checkError) {
          console.error(`❌ Error checking material ${material.id}:`, checkError);
          continue;
        }

        const exists = existingData && existingData.length > 0;

        if (exists) {
          // 更新现有记录
          const { error: updateError } = await supabase
            .from('materials')
            .update(record)
            .eq('id', material.id);

          if (updateError) {
            console.error(`❌ Failed to update material ${material.id}:`, updateError);
          } else {
            successCount++;
          }
        } else {
          // 插入新记录
          const { error: insertError } = await supabase
            .from('materials')
            .insert(record);

          if (insertError) {
            console.error(`❌ Failed to insert material ${material.id}:`, insertError);
          } else {
            successCount++;
          }
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