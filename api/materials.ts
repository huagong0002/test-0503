import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'GET') {
      const userId = req.query.userId as string;
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('last_modified', { ascending: false });

      if (error) throw error;

      const mappedData = data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        audioUrl: item.audio_url,
        script: item.script,
        segments: item.segments,
        lastModified: item.last_modified
      }));

      return res.json(mappedData);
    }

    if (req.method === 'POST') {
      const { materials, userId } = req.body;

      if (!userId || !Array.isArray(materials)) {
        return res.status(400).json({ error: '数据格式不正确或缺少用户ID' });
      }

      const records = materials.map((m: any) => ({
        id: m.id,
        user_id: m.userId || userId,
        title: m.title || '未命名资料',
        audio_url: m.audioUrl || '',
        script: m.script || '',
        segments: m.segments || [],
        last_modified: m.lastModified || Date.now()
      }));

      const { error } = await supabase
        .from('materials')
        .upsert(records, { onConflict: 'id' });

      if (error) throw error;

      return res.json({ success: true, count: records.length });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}