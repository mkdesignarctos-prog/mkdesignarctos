import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alarm } from '../types';

const MOTIVATIONS = [
  "Levante-se e conquiste o seu dia.",
  "Cada manhã é uma nova oportunidade.",
  "Acredite em si mesmo e tudo será possível.",
  "O sucesso é construído a cada novo despertar.",
  "Sua jornada para o sucesso começa agora.",
  "Hoje é o dia perfeito para dar o seu melhor."
];

interface RingingScreenProps {
  alarm: Alarm;
  theme: 'masculine' | 'feminine';
  isConfirmation?: boolean;
  onDismiss: (solvedMath: boolean, isConfirmation: boolean) => void;
}

export function RingingScreen({ alarm, theme, isConfirmation = false, onDismiss }: RingingScreenProps) {
  const [problem, setProblem] = useState({ a: 0, b: 0, operator: '+', answer: 0 });
  const [inputAnswer, setInputAnswer] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    if (!isConfirmation && alarm.challenge === 'math') {
      const isAddition = Math.random() > 0.5;
      if (isAddition) {
        const a = Math.floor(Math.random() * 50) + 15;
        const b = Math.floor(Math.random() * 50) + 15;
        setProblem({ a, b, operator: '+', answer: a + b });
      } else {
        const a = Math.floor(Math.random() * 50) + 30;
        const b = Math.floor(Math.random() * (a - 5)) + 1; // Ensure positive result
        setProblem({ a, b, operator: '-', answer: a - b });
      }
    }
  }, [alarm, isConfirmation]);

  const handleDismiss = () => {
    if (isConfirmation) {
      onDismiss(false, true);
      return;
    }

    if (alarm.challenge === 'none') {
      onDismiss(false, false);
      return;
    }

    if (parseInt(inputAnswer.trim(), 10) === problem.answer) {
      onDismiss(true, false);
    } else {
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 500);
      setInputAnswer(''); // clear on mistake
    }
  };

  const isMasculine = theme === 'masculine';
  const motivation = useMemo(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)], []);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-between pt-24 pb-16 px-6 ${
      isMasculine 
        ? 'bg-black text-white' 
        : 'bg-[#F2F2F7] text-black'
    }`}>
      {/* Time & Label */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex justify-center text-center flex-col items-center"
      >
         <div className={`text-[25vw] sm:text-[120px] font-movie font-bold tabular-nums tracking-wider leading-none pb-2 text-transparent bg-clip-text drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] ${
            isMasculine 
              ? 'bg-gradient-to-br from-blue-100 via-blue-500 to-indigo-600 drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]' 
              : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 drop-shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
          }`}>
            {alarm.time}
         </div>
         <div className="text-lg mt-2 font-medium opacity-80">
            {isConfirmation ? 'Verificação de Despertar' : (alarm.label || 'Alarme')}
         </div>
      </motion.div>

      {/* Challenge or Empty Space */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {isConfirmation ? (
           <motion.div
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="text-2xl font-semibold text-center mt-8 px-6"
           >
             Você acordou mesmo?
           </motion.div>
        ) : alarm.challenge === 'math' ? (
          <motion.div 
            className="w-full max-w-sm flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <p className="text-sm opacity-60 mb-2 uppercase tracking-wider font-semibold">
              Desafio Matemático
            </p>
            <div className="text-3xl font-bold mb-6 font-mono bg-black/10 dark:bg-white/10 px-6 py-4 rounded-2xl w-full text-center">
              {problem.a} {problem.operator} {problem.b} = <span className="opacity-40">?</span>
            </div>
            
            <motion.div
              animate={errorVisible ? { x: [-10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <input 
                type="number"
                value={inputAnswer}
                onChange={(e) => setInputAnswer(e.target.value)}
                autoFocus
                placeholder="Resposta"
                className={`w-full text-center text-[28px] py-4 rounded-[18px] outline-none transition-colors border ${
                  isMasculine 
                    ? 'bg-[#1C1C1E] text-white border-[#38383A] focus:border-blue-500 placeholder-[#8E8E93]' 
                    : 'bg-white text-black border-[#C6C6C8] focus:border-blue-500 placeholder-[#C6C6C8]'
                }`}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl sm:text-3xl text-center px-4 font-serif italic ${isMasculine ? 'text-white/90 drop-shadow-md' : 'text-black/80'}`}
          >
            "{motivation}"
          </motion.div>
        )}
      </div>

      {/* Dismiss Button */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs flex flex-col gap-4"
      >
        <button
          onClick={handleDismiss}
          className={`w-full py-4 rounded-full font-semibold text-xl transition-all active:scale-95 text-white shadow-lg bg-blue-500 shadow-blue-500/20`}
        >
          {isConfirmation ? 'Sim, estou de pé!' : (alarm.challenge === 'math' ? 'Verificar e Parar' : 'Parar')}
        </button>
      </motion.div>
    </div>
  );
}
