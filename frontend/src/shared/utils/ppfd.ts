/**
 * อรรถประโยชน์สำหรับการคำนวณความเข้มแสงพืช (PPFD)
 * ค่ามาตรฐานในการแปลงแสงอาทิตย์ธรรมชาติ (Daylight) คือ 0.0185
 */
export const DEFAULT_MULTIPLIER = 0.0299;

export function convertLuxToPpfd(lux: number, multiplier: number = DEFAULT_MULTIPLIER): number {
  return parseFloat((lux * multiplier).toFixed(2));
}

export function formatFormulaText(lux: number, multiplier: number = DEFAULT_MULTIPLIER): string {
  const result = convertLuxToPpfd(lux, multiplier);
  return `${lux.toLocaleString()} LUX × ${multiplier} (ตัวคูณแสงแดดธรรมชาติ) = ${result} μmol/m²/s (PPFD)`;
}
