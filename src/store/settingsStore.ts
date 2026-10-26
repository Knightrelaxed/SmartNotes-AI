import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';

const defaultSettings: AppSettings = {
  audio: {
    inputDevice: 'default',
    quality: 'high',
    noiseReduction: true,
    autoGainControl: true,
  },
  transcription: {
    engine: 'gemini-live',
    language: 'id',
    modelQuality: 'balanced',
    autoPunctuation: true,
    speakerDiarization: false,
  },
  ai: {
    engine: 'auto',
    geminiApiKey: '',
    openrouterApiKey: '',
    autoSummarize: true,
    autoExtractKeywords: true,
    autoCreateOutline: true,
    generateFlashcards: false,
  },
  interface: {
    theme: 'auto',
    language: 'id',
    autoSaveInterval: 10, // in minutes
    saveLocation: undefined,
  },
};

interface SettingsState extends AppSettings {
  updateAudio: (settings: Partial<AppSettings['audio']>) => void;
  updateTranscription: (settings: Partial<AppSettings['transcription']>) => void;
  updateAI: (settings: Partial<AppSettings['ai']>) => void;
  updateInterface: (settings: Partial<AppSettings['interface']>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateAudio: (settings) =>
        set((state) => ({ audio: { ...state.audio, ...settings } })),
      updateTranscription: (settings) =>
        set((state) => ({ transcription: { ...state.transcription, ...settings } })),
      updateAI: (settings) =>
        set((state) => ({ ai: { ...state.ai, ...settings } })),
      updateInterface: (settings) =>
        set((state) => ({ interface: { ...state.interface, ...settings } })),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'smartnotes-settings',
    }
  )
);
