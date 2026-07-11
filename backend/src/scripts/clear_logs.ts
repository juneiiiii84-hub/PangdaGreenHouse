import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function main() {
  console.log('🧹 กำลังล้างข้อมูลตาราง sensor_logs ในฐานข้อมูล Supabase...');
  const { error } = await supabase
    .from('sensor_logs')
    .delete()
    .neq('id', 0); // ลบทุกแถวที่ไอดีไม่เท่ากับ 0 (ลบทั้งหมด)

  if (error) {
    console.error('❌ เกิดข้อผิดพลาดในการล้างข้อมูล:', error.message);
  } else {
    console.log('✅ ล้างข้อมูลตาราง sensor_logs สำเร็จเรียบร้อย! ดาต้าเบสสะอาดแล้วครับ');
  }
}

main();
