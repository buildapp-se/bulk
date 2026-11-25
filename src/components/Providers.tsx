'use client';
import { MotionConfig } from 'motion/react';

/** Motion follows the OS "reduce motion" setting: transforms and layout jump, only opacity fades (default is "never"). */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
