import { useEffect, useState } from 'react';

export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 500);
    const t2 = setTimeout(() => setPhase('exit'), 5500);
    const t3 = setTimeout(() => onDone(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-all duration-500 ${
        phase === 'exit' ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-50/60 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center">
        <div
          className={`transition-all duration-700 ease-out ${
            phase === 'enter' ? 'opacity-0 scale-50 -translate-y-8' : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary-100/40 blur-xl animate-pulse" />
            <img
              src="/teachlink-logo.png"
              alt="TeachLink"
              className="relative h-20 w-[280px] object-contain"
            />
          </div>
        </div>

        <div
          className={`mt-8 transition-all duration-700 delay-300 ${
            phase === 'enter' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary-500"
                style={{
                  animation: `splashDot 1s ${i * 0.15}s infinite ease-in-out`,
                }}
              />
            ))}
          </div>
        </div>

        <p
          className={`mt-4 text-sm text-gray-400 font-medium transition-all duration-700 delay-500 ${
            phase === 'enter' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          Connecting teachers and schools
        </p>
      </div>

      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
