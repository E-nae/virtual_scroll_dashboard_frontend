import { Suspense } from 'react';
import Dashboard from '@/components/Dashboard';

export default function Page() {
  return (
    <main className="p-8 min-h-screen bg-slate-50/50">
      <Suspense fallback={<div className="p-8">Loading Dashboard Interface...</div>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}