import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Check, Music, Upload } from 'lucide-react';
import { Alarm, ChallengeType, Theme, RingtoneId } from '../types';
import { alarmAudio } from '../audio';
import { TimeWheel } from './TimeWheel';

interface AddAlarmSheetProps {
  onSave: (alarm: Alarm) => void;
  onClose: () => void;
  theme: Theme;
  initialAlarm?: Alarm;
}

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function AddAlarmSheet({ onSave, onClose, theme, initialAlarm }: AddAlarmSheetProps) {
  const isMasculine = theme === 'masculine';

  const [hours, setHours] = useState(() => {
    if (initialAlarm) return initialAlarm.time.split(':')[0];
    const d = new Date();
    return String(d.getHours()).padStart(2, '0');
  });
  const [minutes, setMinutes] = useState(() => {
    if (initialAlarm) return initialAlarm.time.split(':')[1];
    const d = new Date();
    return String(d.getMinutes()).padStart(2, '0');
  });
  const [label, setLabel] = useState(initialAlarm?.label || '');
  const [days, setDays] = useState<number[]>(initialAlarm?.days || []);

  const [challenge, setChallenge] = useState<ChallengeType>(initialAlarm?.challenge || 'none');
  const [showMathWarning, setShowMathWarning] = useState(false);
  const [sound, setSound] = useState<RingtoneId>(initialAlarm?.sound || (isMasculine ? 'radar' : 'magic_bells'));
  const [customSoundId, setCustomSoundId] = useState<string | undefined>(initialAlarm?.customSoundId);
  const [customSoundName, setCustomSoundName] = useState<string | undefined>(initialAlarm?.customSoundName);
  const [smartWake, setSmartWake] = useState(initialAlarm?.smartWake || false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const masculineSounds: {id: RingtoneId, name: string}[] = [
    {id: 'heavy_buzzer', name: 'Buzzer Pesado'},
    {id: 'steel_bell', name: 'Sino de Aço'},
    {id: 'radar', name: 'Radar'}
  ];
  const feminineSounds: {id: RingtoneId, name: string}[] = [
    {id: 'magic_bells', name: 'Sinos Mágicos'},
    {id: 'soft_wake', name: 'Suave'},
    {id: 'bird', name: 'Pássaros'}
  ];

  const availableSounds = isMasculine ? masculineSounds : feminineSounds;

  const toggleDay = (idx: number) => {
    if (days.includes(idx)) {
      setDays(days.filter((d) => d !== idx));
    } else {
      setDays([...days, idx].sort());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("O arquivo de música deve ter menos de 100MB");
        return;
      }
      setIsUploading(true);
      try {
        const id = await alarmAudio.saveCustomSound(file);
        setCustomSoundId(id);
        setCustomSoundName(file.name);
        setSound('custom');
        
        // Vibrate for feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(20);
        }
        alert("Música salva e selecionada com sucesso!");
      } catch (err) {
        console.error(err);
        alert("Falha ao salvar a música");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    const time = `${hours}:${minutes}`;
    onSave({
      id: initialAlarm ? initialAlarm.id : Math.random().toString(36).substring(7),
      time,
      label,
      enabled: initialAlarm ? initialAlarm.enabled : true,
      days,
      challenge,
      sound,
      customSoundId,
      customSoundName,
      smartWake
    });
    alert("Alarme salvo com sucesso!");
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-center items-end sm:items-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: 500, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 500, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-0 shadow-2xl h-[90vh] sm:h-auto overflow-hidden flex flex-col ${
          isMasculine ? 'bg-[#1C1C1E] text-white' : 'bg-[#F2F2F7] text-black'
        }`}
      >
        {/* iOS Sheet Header */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${isMasculine ? 'border-[#38383A] bg-[#1C1C1E]' : 'border-[#C6C6C8] bg-[#F2F2F7]'} sticky top-0 z-10`}>
          <button onClick={onClose} className="text-[17px] font-medium transition-opacity active:opacity-50 text-blue-500">
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold">
            {initialAlarm ? 'Editar Alarme' : 'Adicionar Alarme'}
          </h2>
          <button onClick={handleSave} className="text-[17px] font-semibold transition-opacity active:opacity-50 text-blue-500">
            Salvar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Time Picker */}
          <div className={`flex justify-center gap-4 py-4 rounded-[20px] backdrop-blur-xl border relative shadow-inner ${
            isMasculine ? 'bg-zinc-800/50 border-white/5' : 'bg-[#E5E5EA]/50 border-black/5'
          }`}>
            <TimeWheel 
              options={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))} 
              value={hours} 
              onChange={setHours} 
              isMasculine={isMasculine} 
            />
            <div className={`flex items-center text-4xl font-movie font-bold pb-2 ${isMasculine ? 'text-white' : 'text-black'}`}>:</div>
            <TimeWheel 
              options={Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))} 
              value={minutes} 
              onChange={setMinutes} 
              isMasculine={isMasculine} 
            />
          </div>

          {/* Group 1: Label & Repeating */}
          <div className={`rounded-[14px] overflow-hidden ${isMasculine ? 'bg-[#2C2C2E]' : 'bg-white'}`}>
            {/* Label row */}
            <div className={`flex items-center px-4 py-3 border-b ${isMasculine ? 'border-[#38383A]' : 'border-[#C6C6C8]'}`}>
              <span className="w-1/3 text-[17px]">Etiqueta</span>
              <input
                type="text"
                placeholder="Alarme"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-1 bg-transparent text-right text-[17px] outline-none placeholder-[#8E8E93]"
              />
            </div>

            {/* Days */}
            <div className="px-4 py-3">
              <p className="text-[17px] mb-3">Repetir</p>
              <div className="flex justify-between gap-1">
                {DAYS.map((day, idx) => {
                  const isSelected = days.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 aspect-square max-h-11 rounded-full flex items-center justify-center font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : (isMasculine ? 'bg-[#3A3A3C] text-[#8E8E93]' : 'bg-[#E5E5EA] text-[#8E8E93]')
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Group 2: Sounds */}
          <div className={`rounded-[14px] py-3 px-4 ${isMasculine ? 'bg-[#2C2C2E]' : 'bg-white'}`}>
            <p className="text-[17px] font-medium mb-3">Toque / Música</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {availableSounds.map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => setSound(snd.id)}
                  className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                    sound === snd.id
                      ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                      : (isMasculine ? 'border-[#3A3A3C] opacity-70' : 'border-[#E5E5EA] opacity-70')
                  }`}
                >
                  <Music size={16} className={sound === snd.id ? "opacity-100" : "opacity-30"} />
                  <span className="text-sm text-left truncate">{snd.name}</span>
                </button>
              ))}
            </div>
            
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                sound === 'custom'
                  ? 'bg-blue-500/10 text-blue-500'
                  : (isMasculine ? 'bg-[#3A3A3C] text-white hover:bg-[#3A3A3C]/80' : 'bg-[#E5E5EA] text-black hover:bg-[#E5E5EA]/80')
              }`}
            >
              <Upload size={18} className={sound === 'custom' ? "opacity-100" : "opacity-50"} />
              <div className="flex-1 text-left overflow-hidden">
                <div className={`text-[17px] ${sound === 'custom' ? 'font-medium' : ''}`}>Escolher uma música</div>
                {sound === 'custom' && customSoundName && (
                  <div className={`text-xs truncate opacity-70 mt-0.5`}>
                    {customSoundName}
                  </div>
                )}
                {isUploading && <div className="text-xs opacity-70">Carregando...</div>}
              </div>
            </button>
          </div>

          {/* Group 3: Smart Feature */}
          <div className={`rounded-[14px] overflow-hidden ${isMasculine ? 'bg-[#2C2C2E]' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isMasculine ? 'border-[#38383A]' : 'border-[#C6C6C8]'}`}>
              <div>
                <span className="text-[17px] font-medium block">Monitoramento de Sono</span>
                <span className={`text-[13px] ${isMasculine ? 'text-zinc-400' : 'text-zinc-500'}`}>Acorda no momento ideal (requer tela ligada)</span>
              </div>
              <button
                onClick={() => setSmartWake(!smartWake)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  smartWake ? 'bg-blue-500' : (isMasculine ? 'bg-[#3A3A3C]' : 'bg-[#E5E5EA]')
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    smartWake ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="px-4 py-3 pb-4">
              <p className="text-[17px] mb-3">Desafio para Desligar</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setChallenge('none')}
                  className={`flex-1 p-3 rounded-lg border flex items-center gap-2 justify-center transition-colors ${
                    challenge === 'none'
                      ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                      : (isMasculine ? 'border-[#3A3A3C] opacity-50' : 'border-[#E5E5EA] opacity-50')
                  }`}
                >
                  {challenge === 'none' && <Check size={16} />}
                  Fácil
                </button>
                <button
                  onClick={() => setShowMathWarning(true)}
                  className={`flex-1 p-3 rounded-lg border flex items-center gap-2 justify-center transition-colors ${
                    challenge === 'math'
                      ? 'border-blue-500 text-blue-500 bg-blue-500/10'
                      : (isMasculine ? 'border-[#3A3A3C] opacity-50' : 'border-[#E5E5EA] opacity-50')
                  }`}
                >
                  {challenge === 'math' && <Check size={16} />}
                  Matemática
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Math Challenge Warning Dialog */}
      {showMathWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-full max-w-sm rounded-[24px] p-6 shadow-2xl ${
              isMasculine ? 'bg-[#1C1C1E] text-white border border-[#38383A]' : 'bg-white text-black border border-[#C6C6C8]'
            }`}
          >
            <h3 className={`text-xl font-semibold mb-3 text-center text-blue-500`}>
              Desafio Matemático
            </h3>
            <p className={`mb-6 opacity-90 text-[15px] leading-relaxed text-center`}>
              Para que você acorde de verdade, não será possível desligar o alarme pressionando um botão apenas. Você terá que solucionar uma <strong>soma ou subtração</strong> corretamente.
              <br /><br />
              Tem certeza que deseja ativar essa opção?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setChallenge('math');
                  setShowMathWarning(false);
                }}
                className="w-full py-3.5 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Entendi, ativar matemática
              </button>
              <button
                onClick={() => setShowMathWarning(false)}
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
    </div>
  );
}
