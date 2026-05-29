export type Theme = 'masculine' | 'feminine';

export type ChallengeType = 'none' | 'math';

export type RingtoneId = 'heavy_buzzer' | 'steel_bell' | 'radar' | 'magic_bells' | 'soft_wake' | 'bird' | 'custom';

export interface Alarm {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
  days: number[]; // 0 = Sunday, 1 = Monday, etc. Empty array means just once.
  challenge: ChallengeType;
  sound: RingtoneId;
  customSoundId?: string;
  customSoundName?: string;
  smartWake?: boolean;
}
