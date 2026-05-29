import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users } from 'lucide-react';

export function UserCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleCounter = async () => {
      try {
        const hasDownloaded = localStorage.getItem('has_downloaded_app');
        
        if (!hasDownloaded) {
          // Increment count
          const res = await fetch('/api/counter/increment', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            setCount(data.count);
            localStorage.setItem('has_downloaded_app', 'true');
          }
        } else {
          // Just fetch count
          const res = await fetch('/api/counter');
          if (res.ok) {
            const data = await res.json();
            setCount(data.count);
          }
        }
      } catch (err) {
        console.error("Counter error", err);
      }
    };
    
    handleCounter();
  }, []);

  return (
    <div className="fixed bottom-24 right-2 z-[100]">
      <div className="relative">
        <AnimatePresence>
          {isOpen && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.8, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.8, y: 10 }}
               className="absolute bottom-8 right-0 mb-2 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-2 shadow-2xl"
             >
               <Users size={12} className="text-blue-400" />
               <span className="font-mono">{count ?? '...'} Usuários Reais</span>
             </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-6 h-6 rounded-full flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm border border-white/10"
        >
          <div className="w-1 h-1 rounded-full bg-white/50" />
        </button>
      </div>
    </div>
  );
}
