import { createClient } from '@supabase/supabase-js';

type VercelRequest = {
  method: string;
  body: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST方法' });
  }

  try {
    const { materials, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'materials必须是数组' });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return res.status(500).json({ error: '数据库配置未完成' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let success = 0;

    for (const mat of materials) {
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

      const { error } = await supabase
        .from('materials')
        .upsert(record, { onConflict: 'id' });

      if (!error) success++;
    }

    return res.json({ success: true, count: success, total: materials.length });
    
  } catch (err: any) {
    console.error('Sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}