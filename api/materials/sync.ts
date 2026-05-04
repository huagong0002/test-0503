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

      const record = {
        id: mat.id,
        user_id: mat.userId || userId,
        creator_username: mat.creatorUsername || userId,
        title: mat.title || '未命名',
        audio_url: mat.audioUrl || '',
        script: mat.script || '',
        segments: mat.segments || [],
        last_modified: mat.lastModified || Date.now()
      };

      try {
        console.log(`🔄 Processing material: ${mat.id} - ${mat.title}`);
        
        const { error: updateError } = await supabase
          .from('materials')
          .update(record)
          .eq('id', mat.id);

        if (updateError) {
          console.log(`ℹ️ Update failed, trying insert: ${updateError.message}`);
          
          const { error: insertError } = await supabase
            .from('materials')
            .insert(record);

          if (insertError) {
            console.error(`❌ Insert failed for ${mat.id}:`);
            console.error(`   Code: ${insertError.code}`);
            console.error(`   Message: ${insertError.message}`);
            console.error(`   Hint: ${insertError.hint}`);
            
            failed++;
            const errorMsg = insertError.code === '23505' 
              ? `主键冲突: 材料ID ${mat.id} 已存在`
              : `材料 ${mat.id}: ${insertError.message}`;
            errors.push(errorMsg);
          } else {
            console.log(`✅ Inserted material: ${mat.id}`);
            success++;
          }
        } else {
          console.log(`✅ Updated material: ${mat.id}`);
          success++;
        }
      } catch (err: any) {
        console.error(`❌ Exception processing material ${mat.id}:`);
        console.error(`   Error:`, err);
        failed++;
        errors.push(`材料 ${mat.id}: ${err.message}`);
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