import { Suspense } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Page() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 sm:py-14">
      <Suspense fallback={<p className="mx-auto max-w-[1080px] text-ink-soft">불러오는 중…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
