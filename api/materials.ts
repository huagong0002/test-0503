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
  console.log(`=== ${req.method} /api/materials ===`);
  console.log(`Body:`, req.body);
  
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库配置未完成' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');

    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      console.log(`🔍 Fetching materials for userId: ${userId}`);
      
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });

      if (error) {
        console.error('❌ Supabase GET error:', error);
        throw error;
      }

      const mappedData = data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        creatorUsername: item.creator_username || null,
        title: item.title,
        audioUrl: item.audio_url,
        script: item.script,
        segments: item.segments,
        lastModified: item.last_modified
      }));

      console.log(`✅ Successfully fetched ${mappedData.length} materials`);
      return res.json(mappedData);
    }

    if (req.method === 'POST') {
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
          // 先尝试更新
          const { error: updateError } = await supabase
            .from('materials')
            .update(record)
            .eq('id', material.id);

          if (updateError) {
            // 如果更新失败，尝试插入
            const { error: insertError } = await supabase
              .from('materials')
              .insert(record);

            if (insertError) {
              console.error(`❌ Failed to process material ${material.id}:`, insertError);
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Error processing material ${material.id}:`, err);
        }
      }

      console.log(`✅ Successfully synced ${successCount} out of ${materials.length} materials`);
      return res.json({ success: true, count: successCount });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}