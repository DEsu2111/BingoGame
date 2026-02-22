'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const FREE_SRC = '/image/bingo3.jpg'; // lives in public/image/bingo3.jpg
const FALLBACK_EMOJI = '*';

export default function FreeCell() {
  const [useImage, setUseImage] = useState(true);

  // Pre-check the asset so all cards share the same result.
  useEffect(() => {
    if (typeof window === 'undefined' || !useImage) return;
    const img = new window.Image();
    img.src = FREE_SRC;
    img.onload = () => setUseImage(true);
    img.onerror = () => setUseImage(false);
  }, [useImage]);

  if (!useImage) {
    return (
      <div className="free-fallback" role="img" aria-label="Free space">
        {FALLBACK_EMOJI}
      </div>
    );
  }

  return (
    <span className="bingo-free-wrap">
      <Image
        src={FREE_SRC}
        alt="Free space"
        fill
        sizes="54px"
        className="bingo-free-img"
        priority
        onError={() => setUseImage(false)}
      />
      <span className="bingo-free-emoji" aria-hidden="true">
        {FALLBACK_EMOJI}
      </span>
    </span>
  );
}
