import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, HardDrive, ShieldCheck, MonitorPlay, Mic } from 'lucide-react';
import { Theme } from '../types';

interface PermissionsModalProps {
  theme: Theme;
  onComplete: () => void;
}

export function PermissionsModal({ theme, onComplete }: PermissionsModalProps) {
  const isMasculine = theme === 'masculine';
  
  const [step, setStep] = useState(0);
  
  const handleNext = async () => {
    if (step === 0) {
      // Notifications
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
      setStep(1);
    } else if (step === 1) {
      // Storage (Persistent)
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }
      setStep(2);
    } else if (step === 2) {
      // Wait to request Mic until they actually monitor sleep, 
      // but we inform them here.
      // Wakelock also is requested when needed, this is just to inform
      onComplete();
      localStorage.setItem('permissions_granted', 'true');
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 backdrop-blur-md ${
      isMasculine ? 'bg-black/80' : 'bg-white/80'
    }`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl border ${
          isMasculine ? 'bg-[#1C1C1E] border-white/10 text-white' : 'bg-white border-black/10 text-black'
        }`}
      >
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isMasculine ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
          }`}>
            <ShieldCheck size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2 font-movie">Permissões Essenciais</h2>
        <p className={`text-center text-sm mb-8 ${isMasculine ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Para o funcionamento seguro do seu alarme, precisamos de algumas permissões do seu dispositivo. As permissões não violam sua privacidade.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4">
             <Bell className={step === 0 ? 'text-blue-500' : (step > 0 ? 'text-green-500' : 'text-zinc-400')} />
             <div>
               <p className="font-semibold text-sm">Notificações</p>
               <p className="text-[11px] opacity-60">Para alertar quando um alarme tocar.</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <HardDrive className={step === 1 ? 'text-blue-500' : (step > 1 ? 'text-green-500' : 'text-zinc-400')} />
             <div>
               <p className="font-semibold text-sm">Armazenamento</p>
               <p className="text-[11px] opacity-60">Para salvar seus alarmes e históricos com segurança.</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <MonitorPlay className={step >= 2 ? 'text-blue-500' : 'text-zinc-400'} />
             <div>
               <p className="font-semibold text-sm">Tela & Microfone</p>
               <p className="text-[11px] opacity-60">Solicitados apenas durante o monitoramento de sono.</p>
             </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          className="w-full py-4 rounded-xl bg-blue-500 text-white font-semibold flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
        >
          {step === 0 ? 'Permitir Notificações' : step === 1 ? 'Permitir Armazenamento' : 'Concluir'}
        </button>
      </motion.div>
    </div>
  );
}
