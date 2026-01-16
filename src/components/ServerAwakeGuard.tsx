'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Zap, Coffee } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_SERVER_ENDPOINT || 'http://localhost:4000';

export default function ServerAwakeGuard({ children }: { children: React.ReactNode }) {
  const [isAwake, setIsAwake] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // 1. 헬스 체크 요청
    const wakeUpServer = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
          setIsAwake(true);
        }
      } catch (error) {
        console.error("서버가 잠에서 깨지 못했나봐요...", error);
        // 실패 시 2초 뒤 재시도 (재귀 호출)
        setTimeout(wakeUpServer, 2000);
      }
    };

    wakeUpServer();

    // 2. 경과 시간 타이머 (사용자 지루함 방지용)
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // 서버가 깨어났을 때
  if (isAwake) {
    return <>{children}</>;
  }

  // 서버 깨우는 중 화면
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-6 max-w-md p-6">
        
        {/* 아이콘 애니메이션 */}
        <div className="relative flex justify-center items-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bg-indigo-500/30 blur-3xl w-32 h-32 rounded-full"
          />
          <Server size={64} className="text-slate-300 relative z-10" />
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -top-4 -right-4"
          >
            <div className="text-xl font-bold text-yellow-400">Zzz...</div>
          </motion.div>
        </div>

        {/* 텍스트 메시지 */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold animate-pulse">서버를 깨우고 있어요! ⏰</h2>
          <p className="text-slate-400">
            무료 서버라 잠들어 있었네요.<br/>
            일어나는데 약 30~50초 정도 걸립니다.
          </p>
        </div>

        {/* 진행 상태 표시 */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Coffee className="text-amber-500" size={20} />
                <span className="text-sm text-slate-300">서버 모닝커피 마시는 중...</span>
            </div>
            <span className="font-mono text-indigo-400">{elapsed}s</span>
        </div>

        {/* 팁 */}
        <div className="text-xs text-slate-500 pt-4">
          <Zap size={12} className="inline mr-1" />
          한 번 깨어나면 이후엔 엄청 빠릅니다!
        </div>
      </div>
    </div>
  );
}