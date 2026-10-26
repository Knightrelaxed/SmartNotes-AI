// Note types
export interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  duration: number; // in seconds
  wordCount: number;
  summary?: string;
  keywords?: string[];
  outline?: string[];
  flashcards?: { question: string; answer: string }[];
}

// Recording state types
export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export interface TranscriptionSegment {
  id: string;
  timestamp: Date;
  text: string;
  isFinal: boolean;
}

// Settings types
export interface AudioSettings {
  inputDevice: string;
  quality: 'low' | 'medium' | 'high';
  noiseReduction: boolean;
  autoGainControl: boolean;
}

export interface TranscriptionSettings {
  engine?: 'gemini-live' | 'web-speech';
  language: string;
  modelQuality: 'fast' | 'balanced' | 'best';
  autoPunctuation: boolean;
  speakerDiarization: boolean;
}

export interface AISettings {
  engine: 'gemini' | 'openrouter' | 'auto';
  geminiApiKey?: string;
  openrouterApiKey?: string;
  autoSummarize: boolean;
  autoExtractKeywords: boolean;
  autoCreateOutline: boolean;
  generateFlashcards: boolean;
}

export interface InterfaceSettings {
  theme: 'auto' | 'light' | 'dark';
  language: string;
  autoSaveInterval: number; // in seconds
  saveLocation?: string;
}

export interface AppSettings {
  audio: AudioSettings;
  transcription: TranscriptionSettings;
  ai: AISettings;
  interface: InterfaceSettings;
}

// Statistics types
export interface DailyStats {
  date: string;
  duration: number;
  noteCount: number;
}

export interface SubjectStats {
  subject: string;
  totalDuration: number;
  noteCount: number;
}

export interface HourlyStats {
  hour: number;
  count: number;
}

export interface AppStatistics {
  totalHours: number;
  totalNotes: number;
  totalCourses: number;
  dailyStats: DailyStats[];
  subjectStats: SubjectStats[];
  hourlyStats: HourlyStats[];
  wordCountTrend: { date: string; count: number }[];
}

// Navigation types
export type Page = 'record' | 'notes' | 'search' | 'stats' | 'settings';

// Search types
export interface SearchResult {
  noteId: string;
  noteTitle: string;
  subject: string;
  createdAt: Date;
  excerpt: string;
  matchIndices: number[];
}

// UI types
export interface SidebarItem {
  id: Page;
  label: string;
  icon: string;
  badge?: number | string;
}

// Audio types
export interface AudioLevel {
  level: number;
  peak: number;
}

// Subject/Course types
export interface Subject {
  id: string;
  name: string;
  color: string;
  noteCount: number;
}
