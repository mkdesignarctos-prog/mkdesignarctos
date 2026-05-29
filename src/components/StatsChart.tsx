import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Theme } from '../types';

interface StatsChartProps {
  stats: Record<string, number>;
  theme: Theme;
}

export function StatsChart({ stats, theme }: StatsChartProps) {
  const isMasculine = theme === 'masculine';
  
  // Generate last 7 days data
  const data = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return {
      day: dayNames[d.getDay()],
      value: stats[dateStr] || 0
    };
  });

  return (
    <div className={`w-full p-4 rounded-3xl mt-4 mb-4 backdrop-blur-xl border shadow-lg ${
      isMasculine ? 'bg-zinc-900/30 border-white/10 shadow-black/40' : 'bg-white/40 border-white/60 shadow-black/5'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold tracking-wide uppercase ${isMasculine ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Desafios Resolvidos
        </h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          isMasculine ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
        }`}>
          7 Dias
        </span>
      </div>
      
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: isMasculine ? '#A1A1AA' : '#71717A' }} 
              dy={10}
            />
            <Tooltip 
              cursor={{ fill: isMasculine ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              contentStyle={{ 
                backgroundColor: isMasculine ? '#18181B' : '#FFFFFF', 
                border: 'none', 
                borderRadius: '12px',
                fontSize: '12px',
                color: isMasculine ? '#FFF' : '#000'
              }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ color: isMasculine ? '#3B82F6' : '#2563EB', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value} acertos`, '']}
            />
            <Bar 
              dataKey="value" 
              fill={isMasculine ? '#3B82F6' : '#2563EB'} 
              radius={[4, 4, 4, 4]} 
              barSize={20}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
