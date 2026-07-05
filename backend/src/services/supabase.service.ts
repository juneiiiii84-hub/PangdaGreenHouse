import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ คำเตือน: ไม่พบข้อมูลเชื่อมต่อ Supabase ในไฟล์ .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
