import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Complete and unmount after text animation finishes
    const finish = setTimeout(() => {
      onCompleteRef.current();
    }, 2800);
    
    return () => { clearTimeout(finish); };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-950"
        >
          <h1 className="text-5xl sm:text-7xl font-movie font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_24px_rgba(59,130,246,0.6)] uppercase">
            Motivação
          </h1>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
