import { useRef, useEffect } from 'react';

interface TimeWheelProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  isMasculine: boolean;
}

export function TimeWheel({ options, value, onChange, isMasculine }: TimeWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 64; 
  const scrollTimeout = useRef<number | null>(null);
  const programmaticScroll = useRef(false);

  // Initialize scroll position on mount
  useEffect(() => {
    if (containerRef.current) {
      const idx = options.indexOf(value);
      if (idx !== -1) {
        programmaticScroll.current = true;
        containerRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  }, []); // Only run once on mount

  const handleScroll = () => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }

    if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    
    scrollTimeout.current = window.setTimeout(() => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, options.length - 1));
      
      const newValue = options[clampedIdx];
      if (newValue !== value) {
        onChange(newValue);
      }
    }, 100);
  };

  const handleOptionClick = (opt: string) => {
    onChange(opt);
    const idx = options.indexOf(opt);
    if (idx !== -1 && containerRef.current) {
      programmaticScroll.current = true;
      containerRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative h-[192px] w-[100px] overflow-hidden" 
         style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' }}>
      {/* Glassmorphism selection box */}
      <div className={`absolute top-[64px] left-0 w-full h-[64px] rounded-[16px] pointer-events-none backdrop-blur-2xl border ${
        isMasculine 
          ? 'bg-zinc-700/20 border-white/20 shadow-inner' 
          : 'bg-black/5 border-black/10 shadow-inner'
      }`} />
      
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-contain touch-pan-y"
      >
        <div style={{ height: '64px' }} />
        {options.map(opt => (
          <div 
            key={opt}
            onClick={() => handleOptionClick(opt)}
            className={`h-[64px] cursor-pointer flex items-center justify-center snap-center font-movie tracking-wider font-bold transition-all duration-300 ${
              isMasculine ? 'text-white' : 'text-black'
            } ${value === opt ? 'opacity-100 text-[56px] scale-100' : 'opacity-20 hover:opacity-50 text-[50px] scale-90'}`}
          >
            {opt}
          </div>
        ))}
        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
