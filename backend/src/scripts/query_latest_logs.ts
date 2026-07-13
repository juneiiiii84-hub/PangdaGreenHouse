import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function main() {
  console.log('🔍 กำลังดึงข้อมูลล่าสุดจาก Supabase...');
  const { data, error } = await supabase
    .from('sensor_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } else if (!data || data.length === 0) {
    console.log('📭 ไม่พบข้อมูลใดๆ ในตาราง sensor_logs');
  } else {
    console.log('✅ พบข้อมูลล่าสุด 15 แถว:');
    data.forEach((row, idx) => {
      console.log(`[${idx + 1}] ID: ${row.id} | โซน: ${row.zone} | เวลา: ${row.created_at} | Temp: ${row.temperature} | Hum: ${row.humidity} | Lux/PPFD-column: ${row.ppfd}`);
    });
  }
}

main();
