export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      console.error(`❌ Method not allowed: ${req.method}`);
      return res.status(405).json({ error: '只支持POST方法' });
    }

    const { materials, userId } = req.body;

    console.log(`=== SYNC REQUEST ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Materials count: ${materials?.length || 0}`);
    console.log(`Request body keys: ${Object.keys(req.body || {})}`);

    if (!userId) {
      console.error('❌ Missing userId');
      return res.status(400).json({ error: '缺少用户ID' });
    }

    if (!materials || !Array.isArray(materials)) {
      console.error('❌ materials is not an array:', materials);
      return res.status(400).json({ error: 'materials必须是数组' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return res.status(500).json({ error: '数据库配置未完成' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('✅ Supabase client created successfully');

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const mat of materials) {
      if (!mat.id) {
        console.error('❌ Material missing ID:', mat);
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
            console.error(`❌ Insert failed for ${mat.id}:`, insertError);
            failed++;
            errors.push(`材料 ${mat.id}: ${insertError.message}`);
          } else {
            console.log(`✅ Inserted material: ${mat.id}`);
            success++;
          }
        } else {
          console.log(`✅ Updated material: ${mat.id}`);
          success++;
        }
      } catch (err: any) {
        console.error(`❌ Error processing material ${mat.id}:`, err);
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
    return res.status(500).json({ error: err.message });
  }
}