import { useState, useEffect } from 'react';

export type ThemePeriod = 'day' | 'night';

/**
 * ตรวจสอบว่าเวลาปัจจุบันอยู่ในช่วงกลางวัน (06:30-18:30) หรือกลางคืน (18:30-06:30)
 */
const getTimePeriod = (): ThemePeriod => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // กลางวัน: 06:30 (390 นาที) ถึง 18:30 (1110 นาที)
  if (totalMinutes >= 390 && totalMinutes < 1110) {
    return 'day';
  }
  return 'night';
};

/**
 * กรองข้อมูลตามช่วงเวลา (กลางวัน/กลางคืน) จาก created_at
 */
export const isDayTime = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes >= 390 && totalMinutes < 1110;
};

export const isNightTime = (dateStr: string): boolean => {
  return !isDayTime(dateStr);
};

/**
 * Hook สลับธีมกลางวัน/กลางคืนอัตโนมัติ
 * เช็คเวลาทุก 1 นาที
 */
export const useTheme = () => {
  const [period, setPeriod] = useState<ThemePeriod>(getTimePeriod());

  useEffect(() => {
    const interval = setInterval(() => {
      setPeriod(getTimePeriod());
    }, 60_000); // เช็คทุก 1 นาที

    return () => clearInterval(interval);
  }, []);

  return period;
};
