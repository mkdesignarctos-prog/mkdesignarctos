import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Alarm, Theme } from '../types';

interface SleepTrackerScreenProps {
  alarms: Alarm[];
  theme: Theme;
  onClose: () => void;
  onWakeUp: (alarmId: string) => void;
}

export function SleepTrackerScreen({ alarms, theme, onClose, onWakeUp }: SleepTrackerScreenProps) {
  const [timeStr, setTimeStr] = useState('');
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Next alarm estimation
  const nextSmartAlarm = useMemo(() => {
    const now = new Date();
    let closestTime = Infinity;
    let closestAlarm: Alarm | null = null;

    alarms.filter(a => a.enabled && a.smartWake).forEach(a => {
      const parts = a.time.split(':');
      const d = new Date(now);
      d.setHours(parseInt(parts[0], 10));
      d.setMinutes(parseInt(parts[1], 10));
      d.setSeconds(0);
      d.setMilliseconds(0);
      
      if (d.getTime() < now.getTime()) {
        d.setDate(d.getDate() + 1);
      }
      if (a.days.length > 0) {
        let diff = d.getDay() - now.getDay();
        if (diff < 0) diff += 7;
        if (diff === 0 && d.getTime() < now.getTime()) diff = 7;
        d.setDate(d.getDate() + diff);
      }
      if (d.getTime() < closestTime) {
        closestTime = d.getTime();
        closestAlarm = a;
      }
    });
    
    return closestAlarm ? { alarm: closestAlarm, timeMs: closestTime } : null;
  }, [alarms]);

  useEffect(() => {
    const startTracking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        setIsTracking(true);
        
        // request WakeLock
        if ('wakeLock' in navigator) {
          try {
            await (navigator as any).wakeLock.request('screen');
          } catch (err) {
            console.error('WakeLock falhou', err);
          }
        }
      } catch (err) {
        console.error("Microphone access denied or error", err);
        alert("Precisa de acesso ao microfone para monitorar o sono.");
        onClose();
      }
    };
    startTracking();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  useEffect(() => {
    if (!isTracking || !analyserRef.current || !dataArrayRef.current) return;

    let lastUpdate = 0;

    const tick = (timestamp: number) => {
      if (timestamp - lastUpdate > 200) { // Limit to 5fps to avoid React freezing
        const now = new Date();
        setTimeStr(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

        analyserRef.current!.getByteFrequencyData(dataArrayRef.current!);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current!.length; i++) {
          sum += dataArrayRef.current![i];
        }
        const avg = sum / dataArrayRef.current!.length;
        setNoiseLevel(avg);

        // Smart Wake Logic
        if (nextSmartAlarm) {
          const diffMs = nextSmartAlarm.timeMs - now.getTime();
          const diffMins = diffMs / 1000 / 60;

          // Se estiver dentro da janela de 30 mins, e detectar pico de som (movimento)
          if (diffMins > 0 && diffMins <= 30) {
             if (avg > 30) { // Threshold de movimento
                onWakeUp(nextSmartAlarm.alarm.id);
             }
          } else if (diffMins <= 0 && diffMins > -1) {
             // Chegou na hora e não acordou
             onWakeUp(nextSmartAlarm.alarm.id);
          }
        }
        
        lastUpdate = timestamp;
      }

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isTracking, nextSmartAlarm, onWakeUp]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full flex flex-col items-center justify-center flex-1"
      >
         <div className="absolute top-12 opacity-30 text-xs tracking-[0.2em] uppercase">
            Modo Cabeceira
         </div>
         
         <div className="text-[120px] font-movie font-bold tabular-nums tracking-wider leading-none text-white/20 select-none">
            {timeStr || '00:00'}
         </div>
         
         <div className="mt-8 flex flex-col items-center opacity-30">
            {nextSmartAlarm ? (
               <>
                  <div className="text-sm font-medium">Próximo Alarme Inteligente</div>
                  <div className="text-2xl font-bold font-movie mt-1">{nextSmartAlarm.alarm.time}</div>
               </>
            ) : (
               <div className="text-sm font-medium">Nenhum alarme inteligente para hoje</div>
            )}
         </div>

         {/* Visualizador de ruído sutil */}
         <div className="absolute bottom-32 h-16 flex items-end gap-1 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
               <motion.div 
                  key={i}
                  animate={{ height: isTracking ? Math.max(4, (noiseLevel / 2) * (Math.random() + 0.5)) : 4 }}
                  className="w-2 bg-white rounded-full"
               />
            ))}
         </div>
      </motion.div>
      
      <button 
        onClick={onClose}
        className="absolute bottom-8 py-3 px-8 rounded-full border border-white/20 text-white/50 text-sm font-medium active:bg-white/10"
      >
         Parar Monitoramento
      </button>
    </div>
  );
}
