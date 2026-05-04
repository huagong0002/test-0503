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

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      console.error(`❌ Method not allowed: ${req.method}`);
      return res.status(405).json({ error: '只支持POST方法' });
    }

    const { materials, userId } = req.body;

    console.log(`=== SYNC REQUEST START ===`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`User ID: ${userId}`);
    console.log(`Materials count: ${materials?.length || 0}`);

    if (!userId) {
      console.error('❌ Missing userId');
      return res.status(400).json({ error: '缺少用户ID' });
    }

    if (!materials || !Array.isArray(materials)) {
      console.error('❌ materials is not an array');
      return res.status(400).json({ error: 'materials必须是数组' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

    console.log(`Supabase URL configured: ${!!supabaseUrl}`);
    console.log(`Supabase Key configured: ${!!supabaseKey}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ 
        error: '数据库配置未完成',
        details: 'SUPABASE_URL 或 SUPABASE_KEY 环境变量未配置'
      });
    }

    let supabase;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client created successfully');
    } catch (clientError) {
      console.error('❌ Failed to create Supabase client:', clientError);
      return res.status(500).json({ error: '创建数据库客户端失败', details: clientError.message });
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const mat of materials) {
      if (!mat.id) {
        console.error('❌ Material missing ID');
        failed++;
        errors.push('材料缺少ID');
        continue;
      }

      const record: any = {
        id: mat.id,
        user_id: mat.userId || userId,
        creator_username: mat.creatorUsername || '未知用户',
        title: mat.title || '未命名',
        audio_url: mat.audioUrl || '',
        script: mat.script || '',
        segments: mat.segments || [],
        last_modified: toTimestamp(mat.lastModified)
      };

      try {
        console.log(`🔄 Processing material: ${mat.id} - ${mat.title}`);
        
        // 策略：先尝试更新，如果没有更新任何行，再尝试插入
        console.log(`   First trying to update...`);
        const { error: updateError, status } = await supabase
          .from('materials')
          .update(record)
          .eq('id', mat.id)
          .select();

        if (!updateError && status === 200) {
          console.log(`✅ Updated material: ${mat.id}`);
          success++;
          continue;
        }

        // 更新失败或没有更新任何行，尝试插入
        console.log(`   Update failed or no rows affected, trying to insert...`);
        const { error: insertError } = await supabase
          .from('materials')
          .insert(record);

        if (!insertError) {
          console.log(`✅ Inserted material: ${mat.id}`);
          success++;
        } else if (insertError.code === '23505') {
          // 主键冲突，说明记录已存在，再次尝试更新
          console.log(`   🔄 Primary key conflict, retrying update...`);
          const { error: retryUpdateError } = await supabase
            .from('materials')
            .update(record)
            .eq('id', mat.id)
            .select();

          if (!retryUpdateError) {
            console.log(`✅ Retry update successful: ${mat.id}`);
            success++;
          } else {
            console.error(`❌ Retry update failed for ${mat.id}:`, retryUpdateError);
            failed++;
            errors.push(`主键冲突后重试更新失败: ${retryUpdateError.message}`);
          }
        } else {
          console.error(`❌ Insert failed for ${mat.id}:`, insertError);
          failed++;
          errors.push(`插入材料 ${mat.id} 失败: ${insertError.message}`);
        }
      } catch (err: any) {
        console.error(`❌ Exception processing material ${mat.id}:`);
        console.error(`   Error:`, err);
        failed++;
        errors.push(`处理材料 ${mat.id} 异常: ${err.message}`);
      }
    }

    const total = materials.length;
    console.log(`=== SYNC COMPLETE ===`);
    console.log(`Total: ${total}, Success: ${success}, Failed: ${failed}`);

    return res.json({ 
      success: failed === 0, 
      count: success, 
      total: total,
      failed: failed,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (err: any) {
    console.error('💥 Handler error:', err);
    console.error('💥 Error stack:', err.stack);
    return res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
