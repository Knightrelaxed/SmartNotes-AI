import { useState, useCallback } from 'react';
import {
  processTranscriptionWithAI,
  correctTranscription,
  askQuestionAboutNotes,
  isGeminiConfigured,
  type AIProcessResult,
  type TranscriptionCorrectionResult
} from '@/lib/gemini';
import { useUIStore } from '@/store/uiStore';

interface UseAIReturn {
  // State
  isConfigured: boolean;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  
  // Functions
  processNote: (
    transcription: string,
    options?: {
      generateSummary?: boolean;
      extractKeywords?: boolean;
      createOutline?: boolean;
      generateFlashcards?: boolean;
      language?: string;
    }
  ) => Promise<AIProcessResult>;
  
  correctText: (
    transcription: string,
    language?: string
  ) => Promise<TranscriptionCorrectionResult>;
  
  askQuestion: (
    notes: string,
    question: string,
    language?: string
  ) => Promise<string>;
}

export function useAI(): UseAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { addToast } = useUIStore();
  const isConfigured = isGeminiConfigured();

  // Process note with AI
  const processNote = useCallback(async (
    transcription: string,
    options: {
      generateSummary?: boolean;
      extractKeywords?: boolean;
      createOutline?: boolean;
      generateFlashcards?: boolean;
      language?: string;
    } = {}
  ): Promise<AIProcessResult> => {
    if (!isConfigured) {
      console.warn('Gemini not configured');
      addToast({
        type: 'warning',
        message: 'AI tidak tersedia. Tambahkan API key di pengaturan.'
      });
      return {
        summary: '',
        keywords: [],
        outline: [],
        error: 'Gemini not configured'
      };
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(20);
      
      const result = await processTranscriptionWithAI(transcription, options);
      
      setProgress(100);
      
      if (result.error) {
        setError(result.error);
        addToast({
          type: 'error',
          message: `AI Error: ${result.error.includes('429') || result.error.includes('quota') ? 'Limit API Gratis Habis (429 Too Many Requests)' : result.error}`
        });
      } else {
        addToast({
          type: 'success',
          message: 'AI berhasil memproses catatan'
        });
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addToast({
        type: 'error',
        message: 'Error AI: ' + errorMessage
      });
      return {
        summary: '',
        keywords: [],
        outline: [],
        error: errorMessage
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isConfigured, addToast]);

  // Correct transcription text
  const correctText = useCallback(async (
    transcription: string,
    language: string = 'id'
  ): Promise<TranscriptionCorrectionResult> => {
    if (!isConfigured) {
      return {
        correctedText: transcription,
        changes: []
      };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await correctTranscription(transcription, language);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        correctedText: transcription,
        changes: []
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isConfigured]);

  // Ask question about notes
  const askQuestion = useCallback(async (
    notes: string,
    question: string,
    language: string = 'id'
  ): Promise<string> => {
    if (!isConfigured) {
      return 'Maaf, fitur AI tidak tersedia.';
    }

    setIsProcessing(true);
    setError(null);

    try {
      const answer = await askQuestionAboutNotes(notes, question, language);
      return answer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return 'Maaf, terjadi kesalahan saat memproses pertanyaan.';
    } finally {
      setIsProcessing(false);
    }
  }, [isConfigured]);

  return {
    isConfigured,
    isProcessing,
    progress,
    error,
    processNote,
    correctText,
    askQuestion
  };
}
