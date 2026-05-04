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
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

function toTimestamp(value: any): number {
  if (!value) return Date.now();
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  
  return Date.now();
}

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
        creatorUsername: item.creator_username,
        title: item.title,
        audioUrl: item.audio_url,
        script: item.script,
        segments: item.segments,
        lastModified: toTimestamp(item.last_modified)
      }));

      console.log(`✅ Successfully fetched ${mappedData.length} materials`);
      console.log(`📅 Sample lastModified values:`, mappedData.slice(0, 2).map(m => ({ id: m.id, lastModified: m.lastModified, type: typeof m.lastModified })));
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

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      for (const material of materials) {
        if (!material.id) {
          console.error('❌ Material missing ID');
          failedCount++;
          errors.push('材料缺少ID');
          continue;
        }

        const record: any = {
          id: material.id,
          user_id: material.userId || userId,
          creator_username: material.creatorUsername || '未知用户',
          title: material.title || '未命名资料',
          audio_url: material.audioUrl || '',
          script: material.script || '',
          segments: material.segments || [],
          last_modified: toTimestamp(material.lastModified)
        };

        try {
          console.log(`🔄 Processing material: ${material.id} - ${material.title}`);
          
          const { data: existingRecords, error: fetchError } = await supabase
            .from('materials')
            .select('id')
            .eq('id', material.id);

          if (fetchError) {
            console.error(`❌ Failed to check material ${material.id}:`, fetchError);
            failedCount++;
            errors.push(`检查材料 ${material.id} 失败: ${fetchError.message}`);
            continue;
          }

          const exists = existingRecords && existingRecords.length > 0;
          console.log(`   Material exists: ${exists}`);

          if (exists) {
            console.log(`   Updating existing material`);
            const { error: updateError } = await supabase
              .from('materials')
              .update(record)
              .eq('id', material.id);

            if (updateError) {
              console.error(`❌ Update failed for ${material.id}:`, updateError);
              failedCount++;
              errors.push(`更新材料 ${material.id} 失败: ${updateError.message}`);
            } else {
              console.log(`   ✅ Updated successfully`);
              successCount++;
            }
          } else {
            console.log(`   Inserting new material`);
            const { error: insertError } = await supabase
              .from('materials')
              .insert(record);

            if (insertError) {
              console.error(`❌ Insert failed for ${material.id}:`, insertError);
              failedCount++;
              errors.push(`插入材料 ${material.id} 失败: ${insertError.message}`);
            } else {
              console.log(`   ✅ Inserted successfully`);
              successCount++;
            }
          }
        } catch (err: any) {
          console.error(`💥 Exception for ${material.id}:`, err);
          failedCount++;
          errors.push(`处理材料 ${material.id} 异常: ${err.message}`);
        }
      }

      console.log(`\n📊 Sync Summary:`);
      console.log(`   ✅ Success: ${successCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      if (errors.length > 0) {
        console.log(`   Errors:`, errors);
      }

      return res.json({
        success: true,
        count: successCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error: any) {
    console.error('💥 API Error:', error);
    res.status(500).json({ error: error.message || '服务器错误' });
  }
}
