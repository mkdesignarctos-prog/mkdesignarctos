import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Delete } from 'lucide-react';
import { Theme } from '../types';
import { getUserId } from '../lib/user';
import { alarmAudio } from '../audio';

interface TimerScreenProps {
  theme: Theme;
  onFinish?: () => void;
}

export function TimerScreen({ theme, onFinish }: TimerScreenProps) {
  const isMasculine = theme === 'masculine';
  
  // input state: up to 6 digits representing hhmmss
  const [inputDigits, setInputDigits] = useState<string>('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const [initialTimeMs, setInitialTimeMs] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch('/api/sync/timers', { headers: { 'x-user-id': getUserId() } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data && inputDigits === '') {
           // We can just load history or something here, but let's keep it simple.
        }
      })
      .catch(() => {});
  }, []);

  const saveToDb = (time: number) => {
    fetch('/api/sync/timers', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
       body: JSON.stringify({ data: { lastTimerTime: time } })
    }).catch(console.error);
  };

  const updateTimer = (time: number) => {
    if (lastTimeRef.current !== undefined) {
      const delta = time - lastTimeRef.current;
      let finished = false;
      
      setTimeRemainingMs(prev => {
        const next = Math.max(0, prev - delta);
        if (next === 0 && prev > 0) {
          finished = true;
        }
        return next;
      });

      if (finished) {
        setIsRunning(false);
        setIsRinging(true);
        alarmAudio.start('radar');
        if (onFinish) setTimeout(onFinish, 0);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        return;
      }
    }
    lastTimeRef.current = time;
    if (isRunning) requestRef.current = requestAnimationFrame(updateTimer);
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

  const handlePadPress = (n: number) => {
    if (isRunning || isRinging) return;
    if (inputDigits.length < 6) {
      setInputDigits(prev => {
        // avoid leading zeros
        if (prev === '' && n === 0) return '';
        return prev + n.toString();
      });
    }
  };

  const handleDelete = () => {
    if (isRunning || isRinging) return;
    setInputDigits(prev => prev.slice(0, -1));
  };

  const handleStartStop = () => {
    if (isRinging) {
      setIsRinging(false);
      alarmAudio.stop();
      setTimeRemainingMs(initialTimeMs);
      return;
    }

    if (isRunning) {
      setIsRunning(false);
    } else {
      if (timeRemainingMs === 0) {
        let h = 0, m = 0, s = 0;
        const padded = inputDigits.padStart(6, '0');
        h = parseInt(padded.slice(0, 2), 10);
        m = parseInt(padded.slice(2, 4), 10);
        s = parseInt(padded.slice(4, 6), 10);
        
        const totalMs = ((h * 3600) + (m * 60) + s) * 1000;
        if (totalMs === 0) return; // do not start 0 timer

        setTimeRemainingMs(totalMs);
        setInitialTimeMs(totalMs);
        setInputDigits('');
        saveToDb(totalMs);
      }
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemainingMs(0);
    setInputDigits('');
    setIsRinging(false);
    alarmAudio.stop();
  };

  const renderDisplay = () => {
    const padded = inputDigits.padStart(6, '0');
    const hh = padded.slice(0, 2);
    const mm = padded.slice(2, 4);
    const ss = padded.slice(4, 6);

    if (timeRemainingMs > 0 || isRunning || isRinging) {
      const ms = Math.floor(timeRemainingMs / 1000);
      const h = Math.floor(ms / 3600);
      const m = Math.floor((ms % 3600) / 60);
      const s = ms % 60;
      
      const msStr = isRunning ? `.${String(Math.floor((timeRemainingMs % 1000)/10)).padStart(2,'0')}` : '';

      return (
        <div className="flex items-baseline gap-1">
          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-7xl font-movie">{String(h).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">h</span>
          </div>
          <span className="text-4xl opacity-20 font-movie mb-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-7xl font-movie">{String(m).padStart(2, '0')}</span>
            <span className="text-[10px] font-bold opacity-40 uppercase">m</span>
          </div>
          <span className="text-4xl opacity-20 font-movie mb-4">:</span>
          <div className="flex flex-col items-center">
            <span className="text-5xl sm:text-7xl font-movie">{String(s).padStart(2, '0')}</span>
            <span className={`text-[10px] font-bold opacity-40 uppercase`}>s{msStr}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1">
        <div className={`flex flex-col items-center group transition-all duration-300 ${hh === '00' ? 'opacity-20 scale-90' : 'opacity-100 scale-100'}`}>
          <span className={`text-5xl sm:text-7xl font-movie tracking-widest ${hh !== '00' ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}>{hh}</span>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${hh !== '00' ? 'text-blue-400' : 'text-zinc-500'}`}>Horas</span>
        </div>
        <span className="text-4xl opacity-10 font-movie mb-6 mx-1">:</span>
        <div className={`flex flex-col items-center group transition-all duration-300 ${mm === '00' && hh === '00' ? 'opacity-20 scale-90' : 'opacity-100 scale-100'}`}>
          <span className={`text-5xl sm:text-7xl font-movie tracking-widest ${mm !== '00' || hh !== '00' ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}>{mm}</span>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${mm !== '00' || hh !== '00' ? 'text-blue-400' : 'text-zinc-500'}`}>Minutos</span>
        </div>
        <span className="text-4xl opacity-10 font-movie mb-6 mx-1">:</span>
        <div className={`flex flex-col items-center group transition-all duration-300 ${ss === '00' && mm === '00' && hh === '00' ? 'opacity-20 scale-90' : 'opacity-100 scale-100'}`}>
          <span className={`text-5xl sm:text-7xl font-movie tracking-widest ${ss !== '00' || mm !== '00' || hh !== '00' ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}>{ss}</span>
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${ss !== '00' || mm !== '00' || hh !== '00' ? 'text-blue-400' : 'text-zinc-500'}`}>Segundos</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full items-center pt-4 overflow-hidden`}>
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={isRinging ? 'ringing' : 'idle'}
            animate={isRinging ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1 } } : {}}
            className={`font-movie font-bold tabular-nums tracking-normal leading-none flex items-baseline justify-center text-transparent bg-clip-text text-center ${
            isMasculine 
              ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]' 
              : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
          } ${isRinging ? '!from-red-300 !via-red-500 !to-red-700 drop-shadow-[0_4px_24px_rgba(239,68,68,0.6)]' : ''}`}>
            {renderDisplay()}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {!isRunning && timeRemainingMs === 0 && !isRinging && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-3 gap-x-3 gap-y-2 mt-4"
            >
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button
                  key={n}
                  onClick={() => handlePadPress(n)}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center text-base font-movie tracking-widest transition-all active:scale-90 ${
                    isMasculine ? 'bg-zinc-900 border border-white/5 text-white shadow-lg' : 'bg-white border border-zinc-200 text-black shadow-sm'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                  onClick={handleReset}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-all active:scale-90 ${
                    isMasculine ? 'bg-zinc-900/40 text-red-500/80' : 'bg-zinc-100 text-red-500'
                  }`}
                >
                  <span className="text-[8px] font-bold uppercase">Limpar</span>
              </button>
              <button
                  onClick={() => handlePadPress(0)}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center text-base font-movie tracking-widest transition-all active:scale-90 ${
                    isMasculine ? 'bg-zinc-900 border border-white/5 text-white shadow-lg' : 'bg-white border border-zinc-200 text-black shadow-sm'
                  }`}
                >
                  0
              </button>
              <button
                  onClick={handleDelete}
                  className={`w-12 h-12 rounded-[18px] flex items-center justify-center transition-all active:scale-90 ${
                    isMasculine ? 'bg-zinc-900/50 border border-white/5 text-zinc-400' : 'bg-zinc-100 border border-zinc-200 text-zinc-600'
                  }`}
                >
                  <Delete size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full flex justify-center pb-36 pt-2">
        <button
          onClick={handleStartStop}
          className={`w-[120px] h-[48px] rounded-full flex items-center justify-center gap-2 text-white transition-all active:scale-95 shadow-xl ${
            (isRunning || isRinging) ? 'bg-red-500 shadow-red-500/20' : 'bg-blue-600 shadow-blue-500/30'
          } ${(!isRunning && timeRemainingMs === 0 && inputDigits.length === 0 && !isRinging) ? 'opacity-30 pointer-events-none grayscale' : ''}`}
        >
          {isRinging ? (
            <>
              <Square fill="currentColor" size={20} />
              <span className="text-xs uppercase font-bold tracking-wider">Parar</span>
            </>
          ) : isRunning ? (
            <>
              <Square fill="currentColor" size={20} />
              <span className="text-xs uppercase font-bold tracking-wider">Pausar</span>
            </>
          ) : (
            <>
              <Play fill="currentColor" size={20} className="ml-1" />
              <span className="text-xs uppercase font-bold tracking-wider">Iniciar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
