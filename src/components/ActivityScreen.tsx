import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gauge, Map as MapIcon, Play, Square, RotateCcw, Activity } from 'lucide-react';
import { Theme } from '../types';
import { getUserId } from '../lib/user';

interface ActivityScreenProps {
  theme: Theme;
  mode: 'odometer' | 'speedometer';
  userId: string;
}

interface ActivityData {
  totalDistance: number; // in meters
  trips: { distance: number; date: string }[];
}

export function ActivityScreen({ theme, mode, userId }: ActivityScreenProps) {
  const isMasculine = theme === 'masculine';
  const [speed, setSpeed] = useState(0); // in km/h
  const [sessionDistance, setSessionDistance] = useState(0); // in meters
  const [totalDistance, setTotalDistance] = useState(0); // in meters
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastPos = useRef<GeolocationCoordinates | null>(null);

  useEffect(() => {
    if (!userId || userId === 'null' || userId === 'undefined') return;
    const cleanUserId = String(userId).trim();
    // Load persisted data
    fetch('/api/sync/activity', { headers: { 'x-user-id': cleanUserId } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data) {
          setTotalDistance(data.data.totalDistance || 0);
        }
      })
      .catch(() => {});
  }, [userId]);

  const saveToDb = (totalDist: number) => {
    if (!userId || userId === 'null' || userId === 'undefined') return;
    const cleanUserId = String(userId).trim();
    fetch('/api/sync/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': cleanUserId },
      body: JSON.stringify({ data: { totalDistance: totalDist } })
    }).catch(e => console.error(e));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  };

  useEffect(() => {
    if (isTracking) {
      if ('geolocation' in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, speed: geoSpeed } = position.coords;
            
            // Speed from GPS is in m/s, convert to km/h
            if (geoSpeed !== null) {
              setSpeed(Math.max(0, geoSpeed * 3.6));
            }

            if (lastPos.current) {
              const dist = calculateDistance(
                lastPos.current.latitude,
                lastPos.current.longitude,
                latitude,
                longitude
              );
              
              // Only count if accuracy is decent and distance is reasonable (> 5m to avoid gps jitter)
              if (dist > 5 && position.coords.accuracy < 30) {
                setSessionDistance(prev => prev + dist);
                setTotalDistance(prev => {
                  const newTotal = prev + dist;
                  saveToDb(newTotal);
                  return newTotal;
                });
              }
            }
            lastPos.current = position.coords;
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      }
    } else {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      lastPos.current = null;
      setSpeed(0);
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [isTracking]);

  const toggleTracking = () => {
    setIsTracking(!isTracking);
  };

  const resetSession = () => {
    setSessionDistance(0);
    if (!isTracking) {
       setSpeed(0);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters.toFixed(0)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  return (
    <div className={`flex flex-col h-full items-center pt-8 overflow-hidden`}>
      <AnimatePresence mode="wait">
        {mode === 'speedometer' ? (
          <motion.div
            key="speed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <div className="relative group">
               <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000 ${isTracking ? 'bg-blue-500 animate-pulse' : 'bg-zinc-500'}`} />
               <h2 className={`font-movie font-bold tabular-nums tracking-wider leading-none flex items-baseline justify-center text-transparent bg-clip-text relative ${
                isMasculine 
                  ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]' 
                  : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
              }`}>
                <span className="text-[25vw] sm:text-[100px]">{speed.toFixed(0)}</span>
                <span className={`text-[6vw] sm:text-[24px] ml-1 mb-4 ${isMasculine ? 'text-blue-400/80' : 'text-blue-600/80'}`}>km/h</span>
              </h2>
            </div>
            <p className={`text-sm uppercase tracking-[0.2em] font-bold mt-2 ${isMasculine ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Velocidade Atual
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="odo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center"
          >
            <h2 className={`font-movie font-bold tabular-nums tracking-wider leading-none flex items-baseline justify-center text-transparent bg-clip-text ${
              isMasculine 
                ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]' 
                : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
            }`}>
              <span className="text-[18vw] sm:text-[75px]">{formatDistance(sessionDistance)}</span>
            </h2>
            <p className={`text-sm uppercase tracking-[0.2em] font-bold mt-2 ${isMasculine ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Distância na Viagem
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-8 mt-12 mb-8">
        <button
          onClick={resetSession}
          className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center transition-all active:scale-90 ${
            isMasculine 
              ? 'bg-[#1C1C1E] text-white border border-[#38383A]' 
              : 'bg-white text-black border border-[#C6C6C8] shadow-sm'
          }`}
        >
          <RotateCcw size={28} />
          <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 opacity-70">
            Reiniciar
          </span>
        </button>

        <button
          onClick={toggleTracking}
          className={`w-[80px] h-[80px] rounded-full flex flex-col items-center justify-center text-white transition-all active:scale-90 shadow-lg shadow-blue-500/20 ${
            isTracking ? 'bg-red-500 bg-gradient-to-b from-red-400 to-red-600' : 'bg-blue-500 bg-gradient-to-b from-blue-400 to-blue-600'
          }`}
        >
          {isTracking ? <Square fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
          <span className="text-[10px] uppercase font-semibold tracking-wider mt-1 opacity-90">
            {isTracking ? 'Parar' : 'Iniciar'}
          </span>
        </button>
      </div>

      <div className="flex-1 w-full px-6 flex flex-col items-center justify-start space-y-6 pb-28 overflow-y-auto scrollbar-hide">
        <div className={`w-full p-6 rounded-[28px] border backdrop-blur-xl relative overflow-hidden ${
          isMasculine ? 'bg-zinc-900/40 border-white/10 text-white' : 'bg-white/60 border-white/80 text-black shadow-sm'
        }`}>
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
               <Activity size={20} />
             </div>
             <span className="text-xs uppercase font-bold tracking-widest opacity-60">Status de Atividade</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-40 mb-1">Total Acumulado</span>
              <span className="text-2xl font-movie tabular-nums">{formatDistance(totalDistance)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-40 mb-1">Precisão GPS</span>
              <span className={`text-2xl font-movie tabular-nums ${isTracking ? 'text-green-500' : 'opacity-40'}`}>
                {isTracking ? 'Alta' : '--'}
              </span>
            </div>
          </div>

          {!isTracking && (
            <p className="text-[10px] mt-6 leading-relaxed opacity-50 font-medium">
              Acompanhe sua velocidade e distância em tempo real. O odômetro acumula o total percorrido mesmo entre sessões.
            </p>
          )}
        </div>
        
        {isTracking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full p-4 rounded-2xl flex items-center gap-4 border ${
              isMasculine ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50/50 border-blue-200/50'
            }`}
          >
             <div className="relative">
               <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
               <div className="w-3 h-3 bg-blue-500 rounded-full relative z-10" />
             </div>
             <p className={`text-xs font-semibold tracking-wide ${isMasculine ? 'text-blue-400' : 'text-blue-600'}`}>
               Monitorando movimentos via GPS...
             </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
