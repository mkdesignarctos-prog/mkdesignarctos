import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Flag, RotateCcw } from 'lucide-react';
import { Theme } from '../types';
import { getUserId } from '../lib/user';

interface StopwatchScreenProps {
  theme: Theme;
}

export function StopwatchScreen({ theme }: StopwatchScreenProps) {
  const isMasculine = theme === 'masculine';
  const [isRunning, setIsRunning] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    // Basic sync load
    fetch('/api/sync/stopwatch', { headers: { 'x-user-id': getUserId() } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data) {
          setLaps(data.data.laps || []);
          // Not restoring running state directly to avoid jumping numbers incorrectly without a reference point, but if user wants we can save state.
        }
      })
      .catch(() => {});
  }, []);

  const saveToDb = (newLaps: number[]) => {
    fetch('/api/sync/stopwatch', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
       body: JSON.stringify({ data: { laps: newLaps } })
    }).catch(e => console.error(e));
  };

  const updateTimer = (time: number) => {
    if (lastTimeRef.current != undefined) {
      const delta = time - lastTimeRef.current;
      setTimeMs(prev => prev + delta);
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(updateTimer);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleLapReset = () => {
    if (isRunning) {
      const newLaps = [timeMs, ...laps];
      setLaps(newLaps);
      saveToDb(newLaps);
    } else {
      setTimeMs(0);
      setLaps([]);
      saveToDb([]);
    }
  };

  const formatDisplay = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return {
      min: String(minutes).padStart(2, '0'),
      sec: String(seconds).padStart(2, '0'),
      ms: String(milliseconds).padStart(2, '0')
    };
  };

  const display = formatDisplay(timeMs);

  return (
    <div className={`flex flex-col h-full items-center pt-8 overflow-hidden`}>
      <h2 className={`font-movie font-bold tabular-nums tracking-wider leading-none flex items-baseline justify-center text-transparent bg-clip-text ${
        isMasculine 
          ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]' 
          : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
      }`}>
        <span className="text-[20vw] sm:text-[80px]">{display.min}:{display.sec}</span>
        <span className={`text-[6vw] sm:text-[24px] ml-1 mb-2 ${isMasculine ? 'text-blue-400/80 drop-shadow-none' : 'text-blue-600/80 drop-shadow-none'}`}>
          :{display.ms}
        </span>
      </h2>

      <div className="flex gap-8 mt-12 mb-8">
        <button
          onClick={handleLapReset}
          className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center transition-all active:scale-90 ${
            isMasculine 
              ? 'bg-[#1C1C1E] text-white border border-[#38383A]' 
              : 'bg-white text-black border border-[#C6C6C8] shadow-sm'
          }`}
        >
          {isRunning ? <Flag size={28} /> : <RotateCcw size={28} />}
          <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 opacity-70">
            {isRunning ? 'Volta' : 'Zerar'}
          </span>
        </button>

        <button
          onClick={handleStartStop}
          className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center text-white transition-all active:scale-90 shadow-lg shadow-blue-500/20 ${
            isRunning ? 'bg-red-500 bg-gradient-to-b from-red-400 to-red-600' : 'bg-blue-500 bg-gradient-to-b from-blue-400 to-blue-600'
          }`}
        >
          {isRunning ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
          <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 opacity-90">
            {isRunning ? 'Parar' : 'Iniciar'}
          </span>
        </button>
      </div>

      <div className="flex-1 w-full px-6 overflow-y-auto mb-6 scrollbar-hide space-y-2 pb-28">
        {laps.map((lapMs, i) => {
          const l = formatDisplay(lapMs);
          const diffMs = i < laps.length - 1 ? lapMs - laps[i+1] : lapMs;
          const d = formatDisplay(diffMs);
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              key={laps.length - i}
              className={`flex justify-between p-4 rounded-xl text-sm font-semibold tracking-wide border ${
                isMasculine ? 'bg-zinc-900/50 border-white/5 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
              }`}
            >
              <span className={`opacity-60`}>Volta {laps.length - i}</span>
              <div className="flex gap-4">
                <span className={`opacity-50`}>+{d.min}:{d.sec}.{d.ms}</span>
                <span className={`tabular-nums ${isMasculine ? 'text-white' : 'text-black'}`}>
                  {l.min}:{l.sec}.{l.ms}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
