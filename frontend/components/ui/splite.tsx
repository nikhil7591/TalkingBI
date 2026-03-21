'use client';

import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
