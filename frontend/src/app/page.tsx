'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        <span className="text-xs text-slate-500 font-medium tracking-widest uppercase">Connecting to Mohan Looms...</span>
      </div>
    </div>
  );
}
