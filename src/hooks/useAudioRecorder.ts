import { useState, useRef, useCallback, useEffect } from 'react';
import { useRecordStore } from '@/store/recordStore';
import { useSettingsStore } from '@/store/settingsStore';

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

interface UseAudioRecorderReturn {

  isSupported: boolean;
  isSpeechSupported: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  audioLevel: number;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lastTranscriptRef = useRef<string>('');
  
  const { setAudioLevel, addSegment, updateCurrentText } = useRecordStore();

  // Language mapping: settings code → BCP-47 locale for Web Speech API
  const LANG_MAP: Record<string, string> = {
    id: 'id-ID',
    en: 'en-US',
  };

  const getRecognitionLang = () => {
    const lang = useSettingsStore.getState().transcription.language;
    return LANG_MAP[lang] ?? 'id-ID';
  };


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
    
    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, [setAudioLevel]);

  // Real Speech Recognition function
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    
    // ─── Optimal configuration for Web Speech API ───
    recognition.continuous = true;        // Keep listening without manual restart
    recognition.interimResults = true;    // Show live interim text as user speaks
    recognition.maxAlternatives = 3;      // Pick best of 3 alternatives for accuracy
    
    // Dynamically assign correct language
    recognition.lang = getRecognitionLang();
    
    // Reset transcript tracking
    lastTranscriptRef.current = '';
    
    // Handle recognition results - FIX: Handle both interim and final results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Pengecekan krusial: Jika tidak sedang merekam, ignore/buang input teksnya
      if (useRecordStore.getState().state !== 'recording') return;

      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Pick highest-confidence alternative for better accuracy
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
      
      // Update interim text for real-time display
      if (interimTranscript.trim()) {
        updateCurrentText(interimTranscript.trim());
      }
      
      // Add final transcripts to the store
      if (finalTranscript.trim()) {
        console.log('Speech recognized (final):', finalTranscript);
        addSegment(finalTranscript.trim(), true);
        lastTranscriptRef.current = finalTranscript;
        // Clear interim text after final result
        updateCurrentText('');
      }
    };

    
    // Handle errors with auto-restart mechanism (BUG FIX #5, #12)
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          // Auto-restart quickly so recognition doesn't lag
          useRecordStore.getState().finalizeSegment();
          setTimeout(() => {
            if (useRecordStore.getState().state === 'recording' && recognitionRef.current) {
              try {
                recognitionRef.current.lang = getRecognitionLang();
                recognitionRef.current.start();
              } catch {
                // Ignore restart errors
              }
            }
          }, 200);
          break;
        case 'audio-capture':
          setError('Mikrofon tidak ditemukan');
          break;
        case 'not-allowed':
          setError('Izin mikrofon ditolak');
          break;
        case 'network':
          setError('Error jaringan. Mencoba ulang...');
          // Auto-restart on network error after delay without losing text
          useRecordStore.getState().finalizeSegment();
          setTimeout(() => {
            if (useRecordStore.getState().state === 'recording' && recognitionRef.current) {
              try {
                recognitionRef.current.lang = getRecognitionLang();
                recognitionRef.current.start();
              } catch {
                // Ignore restart errors
              }
            }
          }, 2000);
          break;
        case 'aborted':
          // Don't show error for user-initiated abort
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };
    
    // Handle end - restart recognition if still recording
    recognition.onend = () => {
      const store = useRecordStore.getState();
      
      // Finalize any stuck interim text before restarting so we don't lose words
      if (store.state === 'recording') {
        store.finalizeSegment();
      }
      
      if (store.state === 'recording' && recognitionRef.current) {
        // Add small delay before restart to prevent rapid restart loops
        setTimeout(() => {
          if (useRecordStore.getState().state === 'recording' && recognitionRef.current) {
            try {
              recognitionRef.current.lang = getRecognitionLang();
              recognitionRef.current.start();
            } catch (e) {
              // Ignore restart errors
            }
          }
        }, 100);
      }
    };
    
    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      console.log('Speech recognition started');
    } catch (err) {
      console.error('Error starting speech recognition:', err);
    }
  }, [addSegment, updateCurrentText]);



  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Browser tidak mendukung audio recording');
      return;
    }

    try {
      setError(null);
      
      // Clean up any existing recording resources first
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
      
      // Reset transcript tracking
      lastTranscriptRef.current = '';
      
      // Clear any previous transcription
      useRecordStore.getState().clearTranscription();
      
      // Get current audio settings
      const audioSettings = useSettingsStore.getState().audio;
      
      // Map quality setting to sample rate
      const sampleRateMap: Record<string, number> = {
        low: 16000,
        medium: 44100,
        high: 48000
      };
      const sampleRate = sampleRateMap[audioSettings.quality] || 44100;

      // Get microphone access with maximized audio quality for recognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,         // Always ON — removes speaker echo
          noiseSuppression: audioSettings.noiseReduction, // User setting
          autoGainControl: audioSettings.autoGainControl, // User setting
          sampleRate: sampleRate,
          sampleSize: 16,                 // 16-bit audio for cleaner signal
          channelCount: 1,                // Mono — better for speech recognition
        } as MediaTrackConstraints,
      });
      streamRef.current = stream;

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext({ sampleRate: sampleRate });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;        // Higher resolution frequency data
      analyserRef.current.smoothingTimeConstant = 0.85; // Smoother audio visualizer
      source.connect(analyserRef.current);

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      // Store audio blob for potential use
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Recording stopped, blob size:', audioBlob.size);
        (mediaRecorderRef.current as any).audioBlob = audioBlob;
      };

      mediaRecorder.start(1000); // Collect data every second
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      // Update store state - reset first to ensure clean state
      useRecordStore.getState().resetRecording();
      useRecordStore.getState().startRecording();
      
      // Start real speech recognition if supported
      if (isSpeechSupported) {
        // Small delay to ensure clean state
        setTimeout(() => {
          startSpeechRecognition();
        }, 100);
      } else {
        console.warn('Speech recognition not supported');
      }
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Gagal mengakses mikrofon. Pastikan izin diberikan.');
    }
  }, [isSupported, isSpeechSupported, monitorAudioLevel, startSpeechRecognition]);

  const stopRecording = useCallback(() => {
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
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null;
    }

    // Reset last transcript
    lastTranscriptRef.current = '';

    // Finalize any remaining interim text and stop logical recording,
    // but keep segments & timing so they can be saved.
    const store = useRecordStore.getState();
    store.finalizeSegment();
    store.stopRecording();

    setAudioLevel(0);
  }, [setAudioLevel]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    useRecordStore.getState().pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    monitorAudioLevel();
    useRecordStore.getState().resumeRecording();
  }, [monitorAudioLevel]);

  // BUG FIX #12: Cleanup on unmount - stop recording if active
  useEffect(() => {
    return () => {
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop media recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Stop speech recognition
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
  };
}
