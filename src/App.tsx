import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Moon, Sun, Activity, AlarmClock, TimerReset, Hourglass, Gauge, Map } from 'lucide-react';
import { Theme, Alarm } from './types';
import { AddAlarmSheet } from './components/AddAlarmSheet';
import { RingingScreen } from './components/RingingScreen';
import { CustomClockIcon } from './components/CustomClockIcon';
import { StatsChart } from './components/StatsChart';
import { SleepTrackerScreen } from './components/SleepTrackerScreen';
import { PermissionsModal } from './components/PermissionsModal';
import { UserCounter } from './components/UserCounter';
import { IntroScreen } from './components/IntroScreen';
import { alarmAudio } from './audio';

import { StopwatchScreen } from './components/StopwatchScreen';
import { TimerScreen } from './components/TimerScreen';
import { ActivityScreen } from './components/ActivityScreen';
// LoginScreen removed for automatic auth

import { getUserId } from './lib/user';

type TabType = 'alarms' | 'stopwatch' | 'timer' | 'odometer' | 'speedometer';

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Helper to calculate time until the next alarm
function getTimeUntilNextAlarm(alarmTime: string, days: number[], now: Date): string {
  const [h, m] = alarmTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);

  if (days.length === 0) {
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
  } else {
    const currentDay = now.getDay();
    let addDays = 0;
    while (addDays <= 7) {
      if (days.includes((currentDay + addDays) % 7)) {
        let check = new Date(target);
        check.setDate(check.getDate() + addDays);
        if (check.getTime() > now.getTime()) {
          target.setTime(check.getTime());
          break;
        } else if (addDays === 7) {
           // Edge case: if it already passed today and today is the only day, it's next week
           target.setTime(check.getTime());
        }
      }
      addDays++;
    }
  }

  let diffMs = target.getTime() - now.getTime();
  if (diffMs < 0) {
    diffMs += 7 * 24 * 60 * 60 * 1000;
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  
  if (diffHours > 0 && remainingMins > 0) {
    return `Daqui a ${diffHours}h e ${remainingMins}m`;
  } else if (diffHours > 0) {
    return `Daqui a ${diffHours}h`;
  } else if (remainingMins > 0) {
    return `Daqui a ${remainingMins} min`;
  } else {
    return `Agora`;
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme_cache') as Theme) || 'masculine';
  });
  const [currentTab, setCurrentTab] = useState<TabType>('alarms');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userId, setUserId] = useState<string>(getUserId());
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    try {
      const stored = localStorage.getItem('alarms_cache');
      return stored ? JSON.parse(stored) : [];
    } catch {
       return [];
    }
  });
  const [alarmsLoaded, setAlarmsLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [ringingAlarmId, setRingingAlarmId] = useState<string | null>(null);
  const [isConfirmationRing, setIsConfirmationRing] = useState(false);
  const [isSleepTracking, setIsSleepTracking] = useState(false);
  const [alarmToDelete, setAlarmToDelete] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('intro_seen');
  });
  const [mathStats, setMathStats] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('mathStats');
      return stored ? JSON.parse(stored) : {};
    } catch {
       return {};
    }
  });
  const [pendingConfirmations, setPendingConfirmations] = useState<{alarmId: string, timestamp: number}[]>([]);
  const [timerFinished, setTimerFinished] = useState(false);

  useEffect(() => {
    const permissionsGranted = localStorage.getItem('permissions_granted');
    if (!permissionsGranted) {
      setShowPermissions(true);
    }
  }, []);

  useEffect(() => {
    if (!userId || userId === 'null' || userId === 'undefined') return;

    const fetchUserData = async () => {
       try {
         // Fetch Alarms
         const alarmRes = await fetch('/api/sync/alarms', { 
           headers: { 'x-user-id': String(userId).trim() } 
         });
         if (alarmRes.ok) {
            const data = await alarmRes.json();
            if (data.alarms) setAlarms(data.alarms);
         }

         // Fetch Preferences (Theme)
         const prefRes = await fetch('/api/sync/preferences', { 
           headers: { 'x-user-id': String(userId).trim() } 
         });
         if (prefRes.ok) {
            const prefData = await prefRes.json();
            if (prefData.data?.theme) setTheme(prefData.data.theme);
         }
       } catch (e) {
         console.error('Failed to remote sync data', e);
       } finally {
         setAlarmsLoaded(true);
       }
    };
    fetchUserData();
  }, [userId]);

  useEffect(() => {
    if (!alarmsLoaded || !userId || userId === 'null' || userId === 'undefined') return;
    
    const cleanUserId = String(userId).trim();

    // Cache Alarms Locally
    localStorage.setItem('alarms_cache', JSON.stringify(alarms));

    // Save Alarms
    fetch('/api/sync/alarms', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-user-id': cleanUserId },
       body: JSON.stringify({ alarms })
    }).catch(e => console.error(e));

    // Save Preferences
    localStorage.setItem('theme_cache', theme);
    fetch('/api/sync/preferences', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'x-user-id': cleanUserId },
       body: JSON.stringify({ data: { theme } })
    }).catch(e => console.error(e));
  }, [alarms, alarmsLoaded, userId, theme]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      alarmAudio.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Clock tick & Alarm checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check alarms only exactly when minute changes
      if (now.getSeconds() === 0) {
        const timeStr = formatTime(now);
        const day = now.getDay();
        
        const alarmToRing = alarms.find(a => {
          if (!a.enabled) return false;
          if (a.time !== timeStr) return false;
          if (a.days.length > 0 && !a.days.includes(day)) return false;
          return true;
        });

        if (alarmToRing) {
          setRingingAlarmId(alarmToRing.id);
          setIsConfirmationRing(false);
          alarmAudio.start(alarmToRing.sound, alarmToRing.customSoundId);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Alarme!', { body: alarmToRing.label || 'O seu alarme está tocando.' });
          }
        }
      }

      // Check pending confirmations
      pendingConfirmations.forEach((conf) => {
         if (now.getTime() >= conf.timestamp) {
            setRingingAlarmId(conf.alarmId);
            setIsConfirmationRing(true);
            const alarm = alarms.find(a => a.id === conf.alarmId);
            if (alarm) {
               alarmAudio.start(alarm.sound, alarm.customSoundId);
            } else {
               alarmAudio.start('radar');
            }
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Confirmação de Despertar', { body: 'Você já acordou mesmo?' });
            }
            setPendingConfirmations(prev => prev.filter(c => c !== conf));
         }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, pendingConfirmations]);

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const dismissAlarm = (solvedMath: boolean, isConfirmation: boolean) => {
    if (solvedMath) {
       const d = new Date();
       const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
       setMathStats(prev => {
          const newStats = { ...prev, [dateStr]: (prev[dateStr] || 0) + 1 };
          localStorage.setItem('mathStats', JSON.stringify(newStats));
          return newStats;
       });
    }

    if (!isConfirmation && ringingAlarmId) {
       // Schedule confirmation in 5 minutes
       setPendingConfirmations(prev => [...prev, { alarmId: ringingAlarmId, timestamp: Date.now() + 5 * 60 * 1000 }]);
    }

    // If it was a one-time alarm, disable it (only if not confirmation, or maybe after confirmation)
    if (!isConfirmation) {
      setAlarms(prev => prev.map(a => {
        if (a.id === ringingAlarmId && a.days.length === 0) {
          return { ...a, enabled: false };
        }
        return a;
      }));
    }

    setRingingAlarmId(null);
    setIsConfirmationRing(false);
    alarmAudio.stop();
  };

  const isMasculine = theme === 'masculine';
  
  const DAYS = ['D','S','T','Q','Q','S','S'];

  return (
    <div className={`h-[100dvh] w-full select-none transition-colors duration-500 ease-out font-sans flex justify-center relative overflow-hidden overscroll-none ${
      isMasculine ? 'bg-zinc-950 text-white' : 'bg-[#E5E5EA] text-black'
    }`}>
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-10 overflow-hidden blur-[2px]">
        <h1 className={`text-[14vw] sm:text-[70px] font-movie font-bold leading-[0.9] text-center tracking-[0.15em] ${
          isMasculine ? 'text-white' : 'text-black'
        }`}>
          NUNCA<br/>DESISTA
        </h1>
        <p className={`mt-8 text-[3vw] sm:text-[10px] tracking-[0.4em] font-bold ${
          isMasculine ? 'text-white' : 'text-black'
        }`}>
          @mkdesignarctos_mj
        </p>
      </div>

      {/* Mobile container constraint for desktop viewing */}
      <div className={`w-full max-w-md h-full flex flex-col relative z-10 bg-transparent`}>
        
        {/* iOS Top Bar */}
        <div className="px-6 pt-14 pb-2 flex justify-between items-center z-10">
          <div className="w-[50px]"></div>
          
          <div className={`flex rounded-lg p-0.5 ${
            isMasculine ? 'bg-[#1C1C1E]' : 'bg-[#E5E5EA]'
          }`}>
            <button
              onClick={() => setTheme('masculine')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                isMasculine ? 'bg-[#636366] text-white shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('feminine')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                !isMasculine ? 'bg-white text-black shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              Light
            </button>
          </div>

          <button onClick={() => setIsAdding(true)} className="text-blue-500 w-[50px] flex justify-end">
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        <h1 className={`px-6 mt-1 mb-4 text-[20px] font-movie tracking-[0.08em] ${
          isMasculine ? 'text-white' : 'text-black'
        }`}>
          {currentTab === 'alarms' ? 'Alarmes' : 
           currentTab === 'stopwatch' ? 'Cronômetro' : 
           currentTab === 'timer' ? 'Temporizador' :
           currentTab === 'odometer' ? 'Odômetro' : 'Velocímetro'}
        </h1>

        {/* Dynamic Screen Rendering */}
        {currentTab === 'alarms' && (
          <>
            <section className="px-6 py-4 flex flex-col items-center justify-center border-b border-transparent shrink-0">
              <h2 className={`font-movie font-bold tabular-nums tracking-wider leading-none pb-2 flex items-baseline justify-center text-transparent bg-clip-text ${
                isMasculine 
                  ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.25)]' 
                  : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
              }`}>
                <span className="text-[20vw] sm:text-[80px]">{formatTime(currentTime)}</span>
                <span className={`text-[6vw] sm:text-[24px] ml-1 mb-2 ${isMasculine ? 'text-blue-400/80 drop-shadow-none' : 'text-blue-600/80 drop-shadow-none'}`}>
                  :{String(currentTime.getSeconds()).padStart(2, '0')}
                </span>
              </h2>
              <p className={`text-sm mt-1 uppercase tracking-widest ${isMasculine ? 'text-zinc-500' : 'text-zinc-500'}`}>
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </section>

            <section className="flex-1 px-6 py-2 overflow-y-auto pb-24">
              <div className="space-y-4">
                <StatsChart stats={mathStats} theme={theme} />
                <AnimatePresence mode="popLayout">
                  {alarms.map((alarm, idx) => (
                <motion.div
                  key={alarm.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 30,
                    opacity: { duration: 0.3 }
                  }}
                  className={`relative flex items-center justify-between p-4 rounded-2xl group border backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    alarm.enabled 
                      ? (isMasculine 
                          ? 'bg-zinc-900/40 border-white/10 shadow-lg shadow-black/40 scale-100' 
                          : 'bg-white/40 border-white/60 shadow-lg shadow-black/5 scale-100')
                      : (isMasculine 
                          ? 'bg-zinc-950/20 border-white/5 opacity-60 grayscale-[50%] scale-[0.98]' 
                          : 'bg-white/20 border-white/20 opacity-60 grayscale-[50%] scale-[0.98]')
                  }`}
                >
                  <div className="flex-1 transition-transform duration-500">
                    <div className={`text-[42px] font-movie font-bold tabular-nums tracking-wider leading-none mb-1 transition-all duration-500 ${
                        alarm.enabled 
                          ? (isMasculine ? 'text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]' : 'text-black drop-shadow-sm')
                          : 'text-zinc-500/50'
                      }`}>
                      {alarm.time}
                    </div>
                    <div className={`text-sm tracking-wide font-medium truncate max-w-[240px] transition-all duration-500 ${
                        alarm.enabled 
                          ? (isMasculine ? 'text-zinc-400' : 'text-rose-500 opacity-80')
                          : 'opacity-40 text-zinc-500'
                      }`}>
                      {alarm.label || 'Alarme'} {alarm.challenge === 'math' && '• Desafio'}
                    </div>
                    {alarm.enabled && (
                      <div className={`text-xs mt-1 transition-all duration-500 ${isMasculine ? 'text-blue-400' : 'text-blue-600'}`}>
                        {getTimeUntilNextAlarm(alarm.time, alarm.days, currentTime)}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions & Toggle */}
                  <div className="flex flex-col items-end gap-3 justify-center">
                    <button
                      onClick={() => toggleAlarm(alarm.id)}
                      className={`relative w-[51px] h-[31px] rounded-full transition-colors flex items-center shrink-0 ${
                        alarm.enabled
                          ? 'bg-blue-500 shadow-inner' /* iOS Green */
                          : (isMasculine ? 'bg-[#39393D]' : 'bg-[#E9E9EA]')
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-[27px] h-[27px] rounded-full mx-[2px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)]"
                        animate={{ x: alarm.enabled ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => setAlarmToDelete(alarm.id)}
                        className="text-red-500 hover:text-red-400 font-medium text-xs opacity-70 hover:opacity-100 transition-opacity"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setEditingAlarm(alarm)}
                        className={`font-medium text-xs opacity-70 hover:opacity-100 transition-opacity ${isMasculine ? 'text-white' : 'text-black'}`}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {alarms.length === 0 && (
              <div className="text-center py-10 opacity-50 text-sm font-medium tracking-wide">
                Nenhum alarme configurado.
              </div>
            )}
            
            {alarms.some(a => a.smartWake && a.enabled) && !isSleepTracking && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsSleepTracking(true)}
                className={`w-full py-4 mt-6 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                  isMasculine
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
                    : 'bg-blue-100 text-blue-600 border border-blue-200 hover:bg-blue-200'
                }`}
              >
                <Moon size={20} />
                Iniciar Monitoramento de Sono
              </motion.button>
            )}
          </div>
        </section>
          </>
        )}

        {currentTab === 'stopwatch' && <StopwatchScreen theme={theme} userId={userId!} />}
        {currentTab === 'timer' && <TimerScreen theme={theme} userId={userId!} onFinish={() => setTimerFinished(true)} />}
        {(currentTab === 'odometer' || currentTab === 'speedometer') && <ActivityScreen theme={theme} mode={currentTab as 'odometer' | 'speedometer'} userId={userId!} />}

        {/* Bottom Tab Bar */}
        <div className={`absolute bottom-0 w-full px-6 pb-6 pt-4 border-t z-40 backdrop-blur-3xl flex justify-around items-center ${
          isMasculine ? 'bg-zinc-950/80 border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'bg-[#E5E5EA]/80 border-zinc-200  shadow-[0_-5px_20px_rgba(0,0,0,0.05)]'
        }`}>
          <button 
            onClick={() => setCurrentTab('alarms')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentTab === 'alarms' ? 'text-blue-500 scale-105' : (isMasculine ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500')}`}
          >
            <AlarmClock size={26} strokeWidth={currentTab === 'alarms' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Alarme</span>
          </button>
          
          <button 
            onClick={() => setCurrentTab('stopwatch')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentTab === 'stopwatch' ? 'text-blue-500 scale-105' : (isMasculine ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500')}`}
          >
            <TimerReset size={26} strokeWidth={currentTab === 'stopwatch' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Cronômetro</span>
          </button>

          <button 
            onClick={() => setCurrentTab('timer')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentTab === 'timer' ? 'text-blue-500 scale-105' : (isMasculine ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500')}`}
          >
            <Hourglass size={26} strokeWidth={currentTab === 'timer' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Timer</span>
          </button>

          <button 
            onClick={() => setCurrentTab('odometer')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentTab === 'odometer' ? 'text-blue-500 scale-105' : (isMasculine ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500')}`}
          >
            <Map size={26} strokeWidth={currentTab === 'odometer' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Odômetro</span>
          </button>

          <button 
            onClick={() => setCurrentTab('speedometer')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentTab === 'speedometer' ? 'text-blue-500 scale-105' : (isMasculine ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-500')}`}
          >
            <Gauge size={26} strokeWidth={currentTab === 'speedometer' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Veloz</span>
          </button>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {showPermissions && (
            <PermissionsModal 
              theme={theme} 
              onComplete={() => setShowPermissions(false)} 
            />
          )}

          {timerFinished && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-full max-w-sm rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center ${
                  isMasculine ? 'bg-[#1C1C1E] text-white border border-[#38383A]' : 'bg-white text-black border border-[#C6C6C8]'
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 mb-6 drop-shadow">
                  <Hourglass size={40} className="animate-pulse" />
                </div>
                <h2 className="text-3xl font-movie tracking-wider text-blue-500 mb-2">Temporizador</h2>
                <p className="text-lg opacity-80 mb-8">O tempo acabou!</p>
                <button
                  onClick={() => {
                    alarmAudio.stop();
                    setTimerFinished(false);
                  }}
                  className="w-full py-4 text-lg font-semibold rounded-2xl bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
                >
                  Parar
                </button>
              </motion.div>
            </div>
          )}

          {isSleepTracking && (
            <SleepTrackerScreen 
              alarms={alarms}
              theme={theme}
              onClose={() => setIsSleepTracking(false)}
              onWakeUp={(alarmId) => {
                 setRingingAlarmId(alarmId);
                 setIsConfirmationRing(false);
                 const alarm = alarms.find(a => a.id === alarmId);
                 if (alarm) alarmAudio.start(alarm.sound, alarm.customSoundId);
                 setIsSleepTracking(false);
              }}
            />
          )}

          {isAdding && (
            <AddAlarmSheet 
              theme={theme}
              onClose={() => setIsAdding(false)} 
              onSave={(alarm) => {
                setAlarms(prev => [...prev, alarm].sort((a,b) => a.time.localeCompare(b.time)));
                setIsAdding(false);
              }} 
            />
          )}

          {editingAlarm && (
            <AddAlarmSheet 
              theme={theme}
              initialAlarm={editingAlarm}
              onClose={() => setEditingAlarm(null)} 
              onSave={(updatedAlarm) => {
                setAlarms(prev => {
                  const items = prev.filter(a => a.id !== updatedAlarm.id);
                  return [...items, updatedAlarm].sort((a,b) => a.time.localeCompare(b.time));
                });
                setEditingAlarm(null);
              }} 
            />
          )}

          {alarmToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`w-full max-w-sm rounded-[24px] p-6 shadow-2xl ${
                  isMasculine ? 'bg-[#1C1C1E] text-white border border-[#38383A]' : 'bg-white text-black border border-[#C6C6C8]'
                }`}
              >
                <h3 className={`text-xl font-semibold mb-2 text-center`}>
                  Excluir Alarme?
                </h3>
                <p className={`mb-6 opacity-80 text-sm text-center`}>
                  Tem certeza que deseja excluir este alarme permanentemente?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      deleteAlarm(alarmToDelete);
                      setAlarmToDelete(null);
                    }}
                    className="w-full py-3.5 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Excluir
                  </button>
                  <button
                    onClick={() => setAlarmToDelete(null)}
                    className={`w-full py-3.5 rounded-xl font-medium transition-colors ${
                      isMasculine ? 'bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]' : 'bg-[#F2F2F7] text-black hover:bg-[#E5E5EA]'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {ringingAlarmId && (
            <RingingScreen
              theme={theme}
              alarm={alarms.find(a => a.id === ringingAlarmId)!}
              isConfirmation={isConfirmationRing}
              onDismiss={dismissAlarm}
            />
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {showIntro && (
          <IntroScreen onComplete={() => {
            setShowIntro(false);
            sessionStorage.setItem('intro_seen', 'true');
          }} />
        )}
      </AnimatePresence>

      <UserCounter />
    </div>
  );
}
