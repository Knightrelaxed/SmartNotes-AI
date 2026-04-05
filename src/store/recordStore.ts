import { create } from 'zustand';
import type { RecordingState, TranscriptionSegment } from '@/types';

interface RecordState {
  // Recording state
  state: RecordingState;
  startTime: Date | null;
  pausedTime: number; // accumulated paused time in ms
  currentSubject: string;
  
  // Transcription
  segments: TranscriptionSegment[];
  currentText: string;
  
  // Audio
  audioLevel: number;
  isMuted: boolean;
  
  // Actions
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setProcessing: () => void;
  resetRecording: () => void;
  
  // Transcription actions
  addSegment: (text: string, isFinal?: boolean) => void;
  updateCurrentText: (text: string) => void;
  finalizeSegment: () => void;
  clearTranscription: () => void;
  
  // Audio actions
  setAudioLevel: (level: number) => void;
  toggleMute: () => void;
  
  // Subject
  setCurrentSubject: (subject: string) => void;
  
  // Getters
  getDuration: () => number;
  getWordCount: () => number;
  getFullTranscription: () => string;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  state: 'idle',
  startTime: null,
  pausedTime: 0,
  currentSubject: 'Kalkulus',
  segments: [],
  currentText: '',
  audioLevel: 0,
  isMuted: false,

  startRecording: () => {
    set({
      state: 'recording',
      startTime: new Date(),
      pausedTime: 0,
      segments: [],
      currentText: '',
    });
  },

  pauseRecording: () => {
    const { startTime, pausedTime } = get();
    if (startTime) {
      const elapsed = Date.now() - startTime.getTime();
      set({
        state: 'paused',
        pausedTime: pausedTime + elapsed,
      });
    }
  },

  resumeRecording: () => {
    set({
      state: 'recording',
      startTime: new Date(),
    });
  },

  stopRecording: () => {
    const { startTime, pausedTime } = get();
    if (startTime) {
      const elapsed = Date.now() - startTime.getTime();
      set({
        state: 'idle',
        pausedTime: pausedTime + elapsed,
        startTime: null, // BUG FIX: Reset startTime to prevent duration calculation issues
      });
    }
  },

  setProcessing: () => {
    set({ state: 'processing' });
  },

  resetRecording: () => {
    set({
      state: 'idle',
      startTime: null,
      pausedTime: 0,
      segments: [],
      currentText: '',
      audioLevel: 0,
    });
  },

  addSegment: (text, isFinal = true) => {
    const segment: TranscriptionSegment = {
      id: Date.now().toString(),
      timestamp: new Date(),
      text,
      isFinal,
    };
    set((state) => ({ segments: [...state.segments, segment] }));
  },

  updateCurrentText: (text) => {
    set({ currentText: text });
  },

  finalizeSegment: () => {
    const { currentText } = get();
    if (currentText.trim()) {
      get().addSegment(currentText, true);
      set({ currentText: '' });
    }
  },

  clearTranscription: () => {
    set({ segments: [], currentText: '' });
  },

  setAudioLevel: (level) => {
    set({ audioLevel: level });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  setCurrentSubject: (subject) => {
    set({ currentSubject: subject });
  },

  getDuration: () => {
    const { startTime, pausedTime, state } = get();
    if (!startTime) return pausedTime / 1000;
    if (state === 'paused') return pausedTime / 1000;
    return (pausedTime + (Date.now() - startTime.getTime())) / 1000;
  },

  getWordCount: () => {
    const { segments, currentText } = get();
    const allText = segments.map((s) => s.text).join(' ') + ' ' + currentText;
    return allText.trim().split(/\s+/).filter(Boolean).length;
  },

  getFullTranscription: () => {
    const { segments, currentText } = get();
    // Join internal segments with a space for continuous paragraph flow
    let fullText = segments.map((s) => s.text.trim()).filter(Boolean).join(' ');
    
    if (currentText.trim()) {
      fullText += (fullText ? ' ' : '') + currentText.trim();
    }
    
    // Auto-capitalize the very first letter of the entire transcription
    if (fullText) {
      fullText = fullText.charAt(0).toUpperCase() + fullText.slice(1);
    }
    
    return fullText;
  },
}));
