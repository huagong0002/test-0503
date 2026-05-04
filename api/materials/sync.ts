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
  console.log('=== POST /api/materials/sync ===');
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持POST方法' });
    }

    const { materials, userId } = req.body;
    
    console.log('📤 Sync request:', { userId, count: materials?.length });

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    if (!Array.isArray(materials)) {
      return res.status(400).json({ error: 'materials必须是数组' });
    }

    // 检查Supabase配置
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials NOT configured!');
      return res.status(500).json({ error: '数据库配置未完成，请联系管理员' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');

    let successCount = 0;
    const results = [];

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
        // 首先查询是否存在
        const { data: existing, error: fetchError } = await supabase
          .from('materials')
          .select('id')
          .eq('id', material.id)
          .limit(1);

        if (fetchError) {
          console.error(`❌ Fetch error for ${material.id}:`, fetchError);
          results.push({ id: material.id, status: 'error', error: fetchError.message });
          continue;
        }

        const exists = existing && existing.length > 0;

        if (exists) {
          // 更新现有记录
          const { error: updateError } = await supabase
            .from('materials')
            .update(record)
            .eq('id', material.id);

          if (updateError) {
            console.error(`❌ Update error for ${material.id}:`, updateError);
            results.push({ id: material.id, status: 'error', error: updateError.message });
          } else {
            console.log(`✅ Updated material ${material.id}`);
            successCount++;
            results.push({ id: material.id, status: 'updated' });
          }
        } else {
          // 插入新记录
          const { error: insertError } = await supabase
            .from('materials')
            .insert(record);

          if (insertError) {
            console.error(`❌ Insert error for ${material.id}:`, insertError);
            results.push({ id: material.id, status: 'error', error: insertError.message });
          } else {
            console.log(`✅ Inserted material ${material.id}`);
            successCount++;
            results.push({ id: material.id, status: 'inserted' });
          }
        }
      } catch (err) {
        console.error(`❌ Exception processing ${material.id}:`, err);
        results.push({ id: material.id, status: 'error', error: String(err) });
      }
    }

    // 验证一下数据是否真的保存了
    const { data: verificationData, error: verifyError } = await supabase
      .from('materials')
      .select('id, title')
      .order('last_modified', { ascending: false })
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      console.log('📋 Recent materials:', verificationData);
    }

    console.log(`✅ Final result: ${successCount}/${materials.length} materials synced`);
    return res.json({ 
      success: true, 
      count: successCount, 
      total: materials.length,
      results: results,
      recent: verificationData
    });
    
  } catch (error: any) {
    console.error('💥 Unexpected error:', error);
    return res.status(500).json({ error: error.message || '服务器内部错误' });
  }
}