'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_SERVER_ENDPOINT || 'http://localhost:4000';

// 무료 호스팅 서버가 깨어나는 데 걸리는 대략적인 시간(초)
const EXPECTED_WAKE_SECONDS = 50;

export default function ServerAwakeGuard({ children }: { children: React.ReactNode }) {
  const [isAwake, setIsAwake] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout>;
    const startTime = Date.now();

    const wakeUpServer = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok && !cancelled) {
          setIsAwake(true);
          return;
        }
      } catch {
        // 서버가 잠든 동안 연결 실패는 정상이라 기록하지 않고 재시도
      }
      if (!cancelled) retry = setTimeout(wakeUpServer, 2000);
    };

    wakeUpServer();

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(retry);
      clearInterval(timer);
    };
  }, []);

  if (isAwake) return <>{children}</>;

  // 예상 시간을 넘기면 끝까지 차지 않고 92%에서 멈춤
  const progress = Math.min(elapsed / EXPECTED_WAKE_SECONDS, 0.92);
  const overdue = elapsed > EXPECTED_WAKE_SECONDS;

  return (
    <div className="fixed inset-0 z-50 flex items-center bg-paper px-6">
      <div className="mx-auto w-full max-w-[440px]" role="status" aria-live="polite">
        <p className="font-display text-[56px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          {elapsed}
          <span className="ml-1 text-2xl text-ink-soft">초</span>
        </p>

        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <h1 className="mt-8 text-lg font-semibold">서버를 깨우는 중이에요</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          {overdue
            ? '평소보다 오래 걸리고 있어요. 2초마다 다시 연결을 시도하고 있으니 조금만 더 기다려 주세요.'
            : '무료 호스팅이라 한동안 접속이 없으면 서버가 잠들어요. 첫 접속에 30~50초 정도 걸리고, 한 번 깨어나면 바로 열려요.'}
        </p>
      </div>
    </div>
  );
}
