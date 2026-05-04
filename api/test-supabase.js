import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

async function testSupabase() {
  console.log('=== Testing Supabase Connection ===');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'NOT CONFIGURED');
  console.log('Supabase Key:', supabaseKey ? 'Configured' : 'NOT CONFIGURED');
  console.log('SUPABASE_URL env:', process.env.SUPABASE_URL);
  console.log('SUPABASE_KEY env:', process.env.SUPABASE_KEY);
  console.log('SUPABASE_ANON_KEY env:', process.env.SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Environment variables not set');
    return;
  }

  try {
    console.log('\n🔄 Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('✅ Client created successfully');

    console.log('\n🔄 Testing connection...');
    const { data, error } = await supabase.from('materials').select('id').limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error hint:', error.hint);
      return;
    }

    console.log('✅ Connection test successful');
    console.log('Sample data:', data);

    console.log('\n🔄 Testing insert...');
    const testRecord = {
      id: 'test-id-' + Date.now(),
      user_id: 'test-user',
      creator_username: 'test-user',
      title: 'Test Material',
      audio_url: '',
      script: '',
      segments: [],
      last_modified: Date.now()
    };

    const { error: insertError } = await supabase.from('materials').insert(testRecord);
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      console.error('Error code:', insertError.code);
      console.error('Error hint:', insertError.hint);
      return;
    }

    console.log('✅ Insert test successful');

    console.log('\n🔄 Testing update...');
    const { error: updateError } = await supabase.from('materials')
      .update({ title: 'Updated Test' })
      .eq('id', testRecord.id);
    
    if (updateError) {
      console.error('❌ Update test failed:', updateError);
      return;
    }

    console.log('✅ Update test successful');

    console.log('\n🔄 Cleaning up test data...');
    const { error: deleteError } = await supabase.from('materials')
      .delete()
      .eq('id', testRecord.id);
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
      return;
    }

    console.log('✅ Cleanup successful');

    console.log('\n🎉 All tests passed!');

  } catch (err) {
    console.error('💥 Unexpected error:', err);
    console.error('Stack:', err.stack);
  }
}

testSupabase();