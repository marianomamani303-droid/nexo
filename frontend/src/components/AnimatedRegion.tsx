import type { ReactNode } from 'react';
import { useEntrance } from '../animations/useMotion';
export function AnimatedRegion({
  children,
  identity,
  className = '',
}: {
  children: ReactNode;
  identity: string;
  className?: string;
}) {
  const ref = useEntrance<HTMLDivElement>(identity);
  return (
    <div ref={ref} className={className} data-motion-scope>
      {children}
    </div>
  );
}
