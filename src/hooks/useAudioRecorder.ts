import { useState, useRef, useCallback, useEffect } from 'react';
import { useRecordStore } from '@/store/recordStore';
import { useSettingsStore } from '@/store/settingsStore';
import { GeminiLiveClient } from '@/lib/gemini-live';
import { AudioPCMStreamer } from '@/lib/audio-pcm-converter';
import { geminiConfig, aiProvidersConfig } from '@/config/app.config';

// Type definitions for Web Speech API
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// Language mapping: settings code → BCP-47 locale for Web Speech API
const LANG_MAP: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
};

function getRecognitionLang(): string {
  const lang = useSettingsStore.getState().transcription.language;
  return LANG_MAP[lang] ?? 'id-ID';
}

interface UseAudioRecorderReturn {
  isSupported: boolean;
  isSpeechSupported: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  audioLevel: number;
  engine: 'gemini-live' | 'web-speech';
  isLiveConnected: boolean;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const engine = useSettingsStore((s) => s.transcription.engine) || 'gemini-live';

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const geminiLiveRef = useRef<GeminiLiveClient | null>(null);
  const audioStreamerRef = useRef<AudioPCMStreamer | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const isManuallyStoppedRef = useRef<boolean>(false);
  const monitorAudioLevelRef = useRef<() => void>(() => {});
  const startSpeechRecognitionRef = useRef<() => void>(() => {});

  const { setAudioLevel, addSegment, updateCurrentText } = useRecordStore();

  // Check for browser support
  useEffect(() => {
    // Check audio recording support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('Browser tidak mendukung audio recording');
    }

    // Check speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
    }
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 128) * 100);

    setAudioLevel(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(() => {
      monitorAudioLevelRef.current();
    });
  }, [setAudioLevel]);

  useEffect(() => {
    monitorAudioLevelRef.current = monitorAudioLevel;
  }, [monitorAudioLevel]);

  // Real Web Speech API recognition function
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = getRecognitionLang();

    lastTranscriptRef.current = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (useRecordStore.getState().state !== 'recording') return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          let bestTranscript = '';
          let bestConfidence = 0;
          for (let j = 0; j < result.length; j++) {
            if (result[j].confidence > bestConfidence) {
              bestConfidence = result[j].confidence;
              bestTranscript = result[j].transcript;
            }
          }
          finalTranscript += bestTranscript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript.trim()) {
        updateCurrentText(interimTranscript.trim());
      }

      if (finalTranscript.trim()) {
        addSegment(finalTranscript.trim(), true);
        lastTranscriptRef.current = finalTranscript;
        updateCurrentText('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition warning:', event.error);

      switch (event.error) {
        case 'no-speech':
          useRecordStore.getState().finalizeSegment();
          break;
        case 'audio-capture':
          setError('Mikrofon tidak ditemukan');
          break;
        case 'not-allowed':
          isManuallyStoppedRef.current = true;
          setError('Izin mikrofon ditolak');
          break;
        case 'network':
          setError('Koneksi speech terputus. Mencoba reconnect...');
          useRecordStore.getState().finalizeSegment();
          break;
        case 'aborted':
          break;
        default:
          console.warn(`Speech recognition status: ${event.error}`);
      }
    };

    recognition.onend = () => {
      const store = useRecordStore.getState();

      if (store.state === 'recording') {
        store.finalizeSegment();
      }

      if (!isManuallyStoppedRef.current && store.state === 'recording') {
        setTimeout(() => {
          if (!isManuallyStoppedRef.current && useRecordStore.getState().state === 'recording') {
            try {
              startSpeechRecognitionRef.current();
            } catch (err) {
              console.warn('Speech recognition restart failed:', err);
            }
          }
        }, 150);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      console.log('Web Speech recognition started');
    } catch (err) {
      console.error('Error starting speech recognition:', err);
    }
  }, [addSegment, updateCurrentText]);

  useEffect(() => {
    startSpeechRecognitionRef.current = startSpeechRecognition;
  }, [startSpeechRecognition]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Browser tidak mendukung audio recording');
      return;
    }

    try {
      setError(null);

      // Clean up previous STT sessions
      if (audioStreamerRef.current) {
        try {
          audioStreamerRef.current.stop();
        } catch {
          // Ignore
        }
        audioStreamerRef.current = null;
      }

      if (geminiLiveRef.current) {
        try {
          geminiLiveRef.current.disconnect();
        } catch {
          // Ignore
        }
        geminiLiveRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // Ignore
        }
        audioContextRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
      }

      lastTranscriptRef.current = '';
      useRecordStore.getState().clearTranscription();

      const audioSettings = useSettingsStore.getState().audio;
      const sampleRateMap: Record<string, number> = {
        low: 16000,
        medium: 44100,
        high: 48000,
      };
      const sampleRate = sampleRateMap[audioSettings.quality] || 44100;

      // Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: audioSettings.noiseReduction,
          autoGainControl: audioSettings.autoGainControl,
          sampleRate: sampleRate,
          sampleSize: 16,
          channelCount: 1,
        } as MediaTrackConstraints,
      });
      streamRef.current = stream;

      // Set up native 16kHz audio context for low latency and zero resampling overhead
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.smoothingTimeConstant = 0.85;
      source.connect(analyserRef.current);

      // Set up media recorder with supported mimeType
      let mimeType = '';
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/aac',
      ];
      for (const candidate of candidateTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        console.log('Recording stopped, blob size:', audioBlob.size);
        (mediaRecorderRef.current as any).audioBlob = audioBlob;
      };

      mediaRecorder.start(1000);

      monitorAudioLevel();

      isManuallyStoppedRef.current = false;
      useRecordStore.getState().resetRecording();
      useRecordStore.getState().startRecording();

      // Launch STT Engine
      const selectedEngine = useSettingsStore.getState().transcription.engine || 'gemini-live';

      if (selectedEngine === 'gemini-live') {
        const geminiApiKey =
          useSettingsStore.getState().ai.geminiApiKey?.trim() ||
          geminiConfig.apiKey ||
          aiProvidersConfig.gemini?.[0]?.key ||
          '';

        if (!geminiApiKey) {
          console.warn('[useAudioRecorder] Gemini API Key tidak ditemukan. Beralih ke Web Speech API.');
          setError('API Key Gemini belum diatur. Menggunakan Web Speech API sebagai cadangan.');
          if (isSpeechSupported) {
            setTimeout(() => {
              startSpeechRecognition();
            }, 100);
          }
        } else {
          try {
            const client = new GeminiLiveClient({
              apiKey: geminiApiKey,
              systemInstruction:
                'Transkripsikan audio perkuliahan yang didengar secara akurat ke dalam bahasa Indonesia atau Inggris. Berikan tanda baca lengkap, kapitalisasi yang tepat, dan pertahankan istilah akademis, ilmiah, atau matematika. Hanya keluarkan teks hasil transkripsi tanpa komentar apapun.',
              onConnected: () => {
                setIsLiveConnected(true);
                console.log('[useAudioRecorder] Gemini 3.5 Transcribe Live aktif.');
              },
              onDisconnected: (reason) => {
                setIsLiveConnected(false);
                console.log('[useAudioRecorder] Gemini Live terputus:', reason);
              },
              onError: (errMsg) => {
                console.error('[useAudioRecorder] Gemini Live error:', errMsg);
                setIsLiveConnected(false);
                setError(`Gemini Live: ${errMsg}`);
                if (useRecordStore.getState().state === 'recording' && !recognitionRef.current && isSpeechSupported) {
                  console.log('[useAudioRecorder] Reverting to Web Speech API fallback...');
                  startSpeechRecognitionRef.current();
                }
              },
              onTranscript: (text, isFinal) => {
                if (useRecordStore.getState().state !== 'recording') return;
                if (isFinal) {
                  if (text.trim()) {
                    addSegment(text.trim(), true);
                  }
                  updateCurrentText('');
                } else {
                  if (text.trim()) {
                    updateCurrentText(text.trim());
                  }
                }
              },
            });

            geminiLiveRef.current = client;
            await client.connect();

            // Stream 16kHz PCM audio sharing the active AudioContext and source node
            const streamer = new AudioPCMStreamer(16000);
            streamer.start(
              stream,
              (base64Chunk) => {
                if (client.isConnected()) {
                  client.sendAudioChunk(base64Chunk);
                }
              },
              audioCtx,
              source
            );
            audioStreamerRef.current = streamer;
          } catch (err: any) {
            console.error('[useAudioRecorder] Gagal menghubungkan Gemini Live:', err);
            setIsLiveConnected(false);
            const userMsg = err?.message || 'Gagal menghubungkan Gemini Live';
            setError(`Gemini Live: ${userMsg}. Menggunakan Web Speech API cadangan...`);
            if (isSpeechSupported) {
              console.log('[useAudioRecorder] Mengaktifkan Web Speech API sebagai fallback...');
              startSpeechRecognition();
            } else {
              setError(`Gemini Live: ${userMsg}. Web Speech API tidak didukung browser.`);
            }
          }
        }
      } else {
        // Web Speech API
        if (isSpeechSupported) {
          setTimeout(() => {
            startSpeechRecognition();
          }, 100);
        } else {
          console.warn('Speech recognition not supported');
        }
      }
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Gagal mengakses mikrofon. Pastikan izin diberikan.');
    }
  }, [isSupported, isSpeechSupported, monitorAudioLevel, startSpeechRecognition, addSegment, updateCurrentText]);

  const stopRecording = useCallback(() => {
    isManuallyStoppedRef.current = true;
    setIsLiveConnected(false);

    // Stop PCM audio streamer
    if (audioStreamerRef.current) {
      try {
        audioStreamerRef.current.stop();
      } catch {
        // Ignore
      }
      audioStreamerRef.current = null;
    }

    // Disconnect Gemini Live client
    if (geminiLiveRef.current) {
      try {
        geminiLiveRef.current.disconnect();
      } catch {
        // Ignore
      }
      geminiLiveRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Reset analyser
    analyserRef.current = null;

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    // Reset last transcript
    lastTranscriptRef.current = '';

    // Finalize any remaining interim text and stop logical recording
    const store = useRecordStore.getState();
    store.finalizeSegment();
    store.stopRecording();

    setAudioLevel(0);
  }, [setAudioLevel]);

  const pauseRecording = useCallback(() => {
    isManuallyStoppedRef.current = true;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    if (audioStreamerRef.current) {
      audioStreamerRef.current.pause();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    useRecordStore.getState().pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    isManuallyStoppedRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    if (audioStreamerRef.current) {
      audioStreamerRef.current.resume();
    }

    monitorAudioLevel();
    useRecordStore.getState().resumeRecording();

    const selectedEngine = useSettingsStore.getState().transcription.engine || 'gemini-live';
    if (selectedEngine === 'web-speech' && isSpeechSupported) {
      startSpeechRecognition();
    }
  }, [monitorAudioLevel, isSpeechSupported, startSpeechRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioStreamerRef.current) {
        try {
          audioStreamerRef.current.stop();
        } catch {
          // Ignore
        }
        audioStreamerRef.current = null;
      }

      if (geminiLiveRef.current) {
        try {
          geminiLiveRef.current.disconnect();
        } catch {
          // Ignore
        }
        geminiLiveRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const { audioLevel } = useRecordStore();

  return {
    isSupported,
    isSpeechSupported,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    audioLevel,
    engine,
    isLiveConnected,
  };
}
