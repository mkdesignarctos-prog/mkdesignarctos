export const CustomClockIcon = ({ isMasculine, className }: { isMasculine: boolean, className?: string }) => {
  const gradId = isMasculine ? 'clockGradMasculine' : 'clockGradFeminine';
  return (
    <svg viewBox="0 0 100 100" className={className} width="32" height="32">
      <defs>
        <linearGradient id="clockGradMasculine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
          <stop offset="100%" stopColor="#3b82f6" /> {/* blue-500 */}
        </linearGradient>
        <linearGradient id="clockGradFeminine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f43f5e" /> {/* rose-500 */}
          <stop offset="100%" stopColor="#fb7185" /> {/* rose-400 */}
        </linearGradient>
      </defs>
      
      <g fill={`url(#${gradId})`}>
        {/* Ticks */}
        <rect x="46" y="10" width="8" height="15" transform="rotate(0 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(45 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(90 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(135 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(180 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(225 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(270 50 50)" />
        <rect x="46" y="10" width="8" height="15" transform="rotate(315 50 50)" />
        
        {/* Hands */}
        <rect x="47" y="25" width="6" height="25" />
        <rect x="47" y="47" width="28" height="6" />
      </g>
      
      {/* Center circle ring */}
      <circle 
        cx="50" cy="50" r="6" 
        stroke={`url(#${gradId})`} 
        strokeWidth="6" 
        fill="transparent" 
      />
    </svg>
  );
};
