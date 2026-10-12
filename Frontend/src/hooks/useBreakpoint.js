import { useEffect, useState } from 'react';

const calc = () => {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
};

/** mobile < 768 ≤ tablet < 1200 ≤ desktop — os mesmos cortes do protótipo. */
export function useBreakpoint() {
  const [bp, setBp] = useState(calc);
  useEffect(() => {
    const on = () => setBp(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return bp;
}
