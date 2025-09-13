import React, { useEffect, useState } from 'react';

export function Duration({ from, to }: { from: number; to?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = typeof to === 'number' ? to : now;
  const ms = Math.max(0, end - from);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return <span className="font-mono">{mm}:{ss}</span>;
}


