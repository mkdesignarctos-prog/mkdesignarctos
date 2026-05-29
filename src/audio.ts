import localforage from 'localforage';
import { RingtoneId } from './types';
import { getUserId } from './lib/user';

class AlarmAudio {
  private ctx: AudioContext | null = null;
  private interval: number | null = null;
  private initialized = false;
  private audioElement: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private masterGain: GainNode | null = null;
  private audioFadeInterval: number | null = null;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext failed to initialize");
    }
  }

  async saveCustomSound(file: File): Promise<string> {
    const id = `custom_sound_${Date.now()}`;
    await localforage.setItem(id, file);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
         const base64 = reader.result;
         await fetch('/api/sync/music', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
            body: JSON.stringify({ music_id: id, base64 })
         });
      };
      reader.readAsDataURL(file);
    } catch(e) {
      console.error("Failed to sync custom sound to remote", e);
    }

    return id;
  }

  async start(sound: RingtoneId = 'radar', customSoundId?: string) {
    if (!this.ctx) this.init();
    if (this.interval) return;

    if (this.audioElement) {
      this.stop();
    }

    if (sound === 'custom' && customSoundId) {
      try {
        let file = await localforage.getItem<File>(customSoundId);
        
        if (!file && customSoundId) {
           const res = await fetch(`/api/sync/music/${customSoundId}`, {
              headers: { 'x-user-id': getUserId() }
           });
           if (res.ok) {
              const data = await res.json();
              if (data.base64) {
                 const fRes = await fetch(data.base64);
                 file = await fRes.blob() as File;
                 await localforage.setItem(customSoundId, file);
              }
           }
        }

        if (file) {
          this.objectUrl = URL.createObjectURL(file);
          this.audioElement = new Audio(this.objectUrl);
          this.audioElement.loop = true;
          this.audioElement.volume = 0; // Começa no zero
          
          let vol = 0;
          this.audioFadeInterval = window.setInterval(() => {
            vol += 1 / 150; // Fade in de ~30 segundos com passo de 200ms
            if (vol >= 1) {
              vol = 1;
              if (this.audioFadeInterval) window.clearInterval(this.audioFadeInterval);
            }
            if (this.audioElement) this.audioElement.volume = vol;
          }, 200);

          await this.audioElement.play();
          return;
        }
      } catch (e) {
        console.error("Failed to load custom sound", e);
      }
    }

    // Gradual volume ramp for predefined sounds
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 30);
    }

    // Predefined sequences
    this.interval = window.setInterval(() => {
      if (sound === 'heavy_buzzer') this.playHeavyBuzzer();
      else if (sound === 'steel_bell') this.playSteelBell();
      else if (sound === 'radar') this.playRadar();
      else if (sound === 'magic_bells') this.playMagicBells();
      else if (sound === 'soft_wake') this.playSoftWake();
      else if (sound === 'bird') this.playBird();
      else this.playRadar();
    }, sound === 'heavy_buzzer' ? 1000 : sound === 'bird' ? 2000 : sound === 'steel_bell' ? 2500 : sound === 'magic_bells' ? 1500 : sound === 'soft_wake' ? 3000 : 1000);
    
    // Play the first note immediately
    if (sound === 'heavy_buzzer') this.playHeavyBuzzer();
    else if (sound === 'steel_bell') this.playSteelBell();
    else if (sound === 'radar') this.playRadar();
    else if (sound === 'magic_bells') this.playMagicBells();
    else if (sound === 'soft_wake') this.playSoftWake();
    else if (sound === 'bird') this.playBird();
    else this.playRadar();
  }

  // MASCULINE

  private playHeavyBuzzer() {
    if (!this.ctx) return;
    const playTone = (freq: number, startOff: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + startOff);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + startOff);
      gain.gain.linearRampToValueAtTime(0.4, this.ctx!.currentTime + startOff + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + startOff + 0.3);
      osc.start(this.ctx!.currentTime + startOff);
      osc.stop(this.ctx!.currentTime + startOff + 0.3);
    };
    playTone(150, 0);
    playTone(150, 0.4);
  }

  private playSteelBell() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime); // A4
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);
    
    osc.start(this.ctx.currentTime);
    osc2.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 2.0);
    osc2.stop(this.ctx.currentTime + 2.0);
  }

  private playRadar() {
    if (!this.ctx) return;
    const playTone = (startOff: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.ctx!.currentTime + startOff);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + startOff);
      gain.gain.linearRampToValueAtTime(0.2, this.ctx!.currentTime + startOff + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + startOff + 0.15);
      osc.start(this.ctx!.currentTime + startOff);
      osc.stop(this.ctx!.currentTime + startOff + 0.15);
    };
    playTone(0);
    playTone(0.2);
    playTone(0.4);
  }

  // FEMININE

  private playMagicBells() {
    if (!this.ctx) return;
    const playTone = (freq: number, startOff: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + startOff);
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + startOff);
      gain.gain.linearRampToValueAtTime(0.3, this.ctx!.currentTime + startOff + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + startOff + 0.8);
      osc.start(this.ctx!.currentTime + startOff);
      osc.stop(this.ctx!.currentTime + startOff + 0.8);
    };
    playTone(1046.50, 0); // C6
    playTone(1318.51, 0.15); // E6
    playTone(1567.98, 0.3); // G6
    playTone(2093.00, 0.5); // C7
  }

  private playSoftWake() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(392.00, this.ctx.currentTime); // G4
    osc.frequency.linearRampToValueAtTime(440.00, this.ctx.currentTime + 1.0); // A4
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.5);
    
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 2.5);
  }

  private playBird() {
    if (!this.ctx) return;
    const playChirp = (startOff: number) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000, this.ctx!.currentTime + startOff);
      osc.frequency.exponentialRampToValueAtTime(3500, this.ctx!.currentTime + startOff + 0.1);
      osc.frequency.exponentialRampToValueAtTime(2000, this.ctx!.currentTime + startOff + 0.2);
      
      gain.gain.setValueAtTime(0, this.ctx!.currentTime + startOff);
      gain.gain.linearRampToValueAtTime(0.3, this.ctx!.currentTime + startOff + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + startOff + 0.2);
      
      osc.start(this.ctx!.currentTime + startOff);
      osc.stop(this.ctx!.currentTime + startOff + 0.2);
    };
    playChirp(0);
    playChirp(0.15);
  }

  stop() {
    if (this.audioFadeInterval) {
      window.clearInterval(this.audioFadeInterval);
      this.audioFadeInterval = null;
    }
    if (this.interval) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
    }
  }
}

export const alarmAudio = new AlarmAudio();
