'use client';
import { useEffect, useState } from 'react';
import { sastDay } from '../lib/tech/jobs.mjs';
export default function useSastDay() {
  const [day, setDay] = useState(() => sastDay());
  useEffect(() => {
    const refresh = () => setDay(sastDay());
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  return day;
}
