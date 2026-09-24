'use client';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect } from 'react';
import { nf } from '@/lib/calc';

/** A number that rolls to its new value on a spring. */
export function Num({ v, d = 0, suffix = '', className }: { v: number; d?: number; suffix?: string; className?: string }) {
  const reduce = useReducedMotion();
  const s = useSpring(v, { stiffness: 140, damping: 22, mass: 0.6 });
  useEffect(() => { if (reduce) s.jump(v); else s.set(v); }, [v, s, reduce]);
  const text = useTransform(s, (x) => nf(x, d) + suffix);
  return <motion.span className={`num ${className ?? ''}`}>{text}</motion.span>;
}
