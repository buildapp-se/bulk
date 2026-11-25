'use client';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { Kit } from '@/lib/data';

const v = process.env.NEXT_PUBLIC_V;

/** Transparent gouache bowl for a kit; falls back to the kit colour until its art exists. */
export function KitArt({ kit, size, spin = false, className = '' }: { kit: Kit; size: number; spin?: boolean; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <motion.span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, '--hue': kit.hue } as React.CSSProperties}
      animate={{ rotate: spin ? 0 : -14, scale: spin ? 1 : 0.94 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      {missing ? (
        <span className="kit-bg block h-full w-full rounded-full" />
      ) : (
        // Plain img: static export has no image optimizer. 256 px WebP for small art (≤ 85 px at 3x), 640 px for the big ones.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/bulk/kits/${kit.id}.webp?v=${v}`} srcSet={`/bulk/kits/256/${kit.id}.webp?v=${v} 256w, /bulk/kits/${kit.id}.webp?v=${v} 640w`} sizes={`${size}px`} alt="" width={size} height={size} loading="lazy" decoding="async"
          onError={() => setMissing(true)} className="h-full w-full drop-shadow-[0_6px_10px_rgba(35,33,29,.18)]" />
      )}
    </motion.span>
  );
}
