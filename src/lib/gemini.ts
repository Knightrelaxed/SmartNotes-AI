import { aiManager } from './ai-manager';
import { aiProvidersConfig, geminiConfig } from '@/config/app.config';
import { extractSafeJSON } from './json-sanitizer';
import { useSettingsStore } from '@/store/settingsStore';

// Check if any AI provider is configured (settings key, env config, or app config)
const isGeminiConfigured = () => {
  const aiSettings = useSettingsStore.getState().ai;
  const userGemini = aiSettings.geminiApiKey?.trim();
  const userOpenRouter = aiSettings.openrouterApiKey?.trim();
  return !!(
    userGemini ||
    userOpenRouter ||
    geminiConfig.apiKey ||
    (aiProvidersConfig.gemini && aiProvidersConfig.gemini.some(g => g.key)) ||
    aiProvidersConfig.openrouter?.key
  );
};


// ==================== TYPES ====================

export interface AIProcessResult {
  summary: string;
  keywords: string[];
  outline: string[];
  flashcards?: { question: string; answer: string }[];
  error?: string;
  success?: boolean;
}

export interface TranscriptionCorrectionResult {
  correctedText: string;
  changes: string[];
}

// ==================== MAIN AI PROCESSING ====================

export const processTranscriptionWithAI = async (
  transcription: string,
  options: {
    generateSummary?: boolean;
    extractKeywords?: boolean;
    createOutline?: boolean;
    generateFlashcards?: boolean;
    language?: string;
  } = {}
): Promise<AIProcessResult> => {
  const {
    generateSummary = true,
    extractKeywords = true,
    createOutline = true,
    generateFlashcards = false,
    language = 'id'
  } = options;

  const result: AIProcessResult = {
    summary: '',
    keywords: [],
    outline: [],
  };

  if (!isGeminiConfigured()) {
    result.error = 'Gemini AI not configured';
    return result;
  }

  // Jika tidak ada opsi yang dipilih, langsung kembalikan result kosong
  if (!generateSummary && !extractKeywords && !createOutline && !generateFlashcards) {
    return result;
  }

  try {

    const langName = language === 'id' ? 'Bahasa Indonesia' : 'English';
    
    // Limit transcription to avoid token limit
    const limitedTranscription = transcription.slice(0, 8000);

    // Siapkan struktur JSON dinamis sesuai dengan opsi yang diminta user
    const requestedFields: string[] = [];
    if (generateSummary) requestedFields.push(`"summary": "Berikan ringkasan 3-5 kalimat dari transkripsi"`);
    if (extractKeywords) requestedFields.push(`"keywords": ["kata kunci 1", "kata kunci 2", "maksimal 10 kata kunci"]`);
    if (createOutline) requestedFields.push(`"outline": ["Poin utama 1", "Poin utama 2", "maksimal 7 poin"]`);
    if (generateFlashcards) requestedFields.push(`"flashcards": [{"question": "pertanyaan", "answer": "jawaban"}] // buat 5 flashcards`);

    // GABUNGKAN SEMUA PERINTAH DALAM SATU PROMPT (Satu kali request untuk menghemat kuota / Rate Limit 429)
    const masterPrompt = `Analisis transkripsi kuliah berikut dalam ${langName}.
Berikan balasan HANYA dalam format JSON murni tanpa tambahan teks apapun.
Struktur JSON yang WAJIB kamu hasilkan:
{
  ${requestedFields.join(',\n  ')}
}

Transkripsi:
"""
${limitedTranscription}
"""`;

    // AIManager handles all retries and fallbacks internally (Gemini 1 → Gemini 2 → OpenRouter)
    // No extra retryWithBackoff needed here — it would delay fallback unnecessarily
    const responseText = await aiManager.generateContent(masterPrompt);

    // Parse JSON dengan aman via json-sanitizer
    try {
      const parsedData = extractSafeJSON(responseText);
      
      if (generateSummary) result.summary = parsedData.summary || 'Ringkasan tidak tersedia.';
      if (extractKeywords) result.keywords = Array.isArray(parsedData.keywords) ? parsedData.keywords : [];
      if (createOutline) result.outline = Array.isArray(parsedData.outline) ? parsedData.outline : [];
      if (generateFlashcards) result.flashcards = Array.isArray(parsedData.flashcards) ? parsedData.flashcards : [];
      
      result.success = true;
    } catch (parseError: any) {
      console.error('[AI] Gagal parse JSON dari response AI:', parseError, '\nRaw:', responseText);
      result.error = 'Gagal memproses data dari AI — format tidak sesuai.';
    }

  } catch (error: any) {
    console.error('Gemini AI Error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
};

// ==================== TRANSCRIPTION CORRECTION ====================

export const correctTranscription = async (
  transcription: string,
  language: string = 'id'
): Promise<TranscriptionCorrectionResult> => {
  if (!isGeminiConfigured()) {
    return {
      correctedText: transcription,
      changes: []
    };
  }

  try {
    const langName = language === 'id' ? 'Bahasa Indonesia' : 'English';
    
    const prompt = `Perbaiki dan format transkripsi kuliah berikut dalam ${langName}.
Tambahkan tanda baca yang tepat, perbaiki kesalahan ejaan, dan format menjadi paragraf yang rapi.
JANGAN mengubah makna atau menambahkan informasi baru.

Transkripsi asli:
"""
${transcription}
"""

Berikan hasil dalam format:
[HASIL]
Teks yang sudah diperbaiki
[/HASIL]

[PERUBAHAN]
- Daftar perubahan yang dilakukan
[/PERUBAHAN]`;
    const text = await aiManager.generateContent(prompt); // uses full fallback chain
    
    // Extract corrected text
    const resultMatch = text.match(/\[HASIL\]([\s\S]*?)\[\/HASIL\]/);
    const changesMatch = text.match(/\[PERUBAHAN\]([\s\S]*?)\[\/PERUBAHAN\]/);
    
    const correctedText = resultMatch ? resultMatch[1].trim() : transcription;
    const changesText = changesMatch ? changesMatch[1].trim() : '';
    
    const changes = changesText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.startsWith('-'))
      .map((line: string) => line.substring(1).trim());
    
    return {
      correctedText,
      changes
    };
  } catch (error) {
    console.error('Transcription correction error:', error);
    return {
      correctedText: transcription,
      changes: []
    };
  }
};

// ==================== STREAMING (REAL-TIME) ====================

export const streamTranscriptionCorrection = async (
  transcription: string,
  onChunk: (chunk: string) => void,
  language: string = 'id'
): Promise<void> => {
  if (!isGeminiConfigured()) {
    onChunk(transcription);
    return;
  }

    const langName = language === 'id' ? 'Bahasa Indonesia' : 'English';
    const prompt = `Perbaiki dan format transkripsi kuliah berikut dalam ${langName}.
Tambahkan tanda baca yang tepat dan perbaiki kesalahan ejaan.

Transkripsi:
${transcription}`;

    // Since OpenRouter fallback doesn't cleanly support stream through our simple fetch,
    // we use gemini directly here. If it fails, we fall back to non-streaming response.
    // Stream only attempts the primary provider (for realtime UI)
    try {
      const gStreamProvider = aiManager.getProviderStream('gemini_primary');
      if (!gStreamProvider) throw new Error('Primary Gemini stream not available');
      const result = await gStreamProvider(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        onChunk(chunkText);
      }
    } catch (streamError) {
      console.warn('Streaming failed, falling back to full request...', streamError);
      const fullResponse = await aiManager.generateContent(prompt);
      onChunk(fullResponse);
    }
};

// ==================== QUESTION ANSWERING ====================

export const askQuestionAboutNotes = async (
  notes: string,
  question: string,
  language: string = 'id'
): Promise<string> => {
  if (!isGeminiConfigured()) {
    return 'Maaf, fitur AI tidak tersedia.';
  }

  try {
    const langName = language === 'id' ? 'Bahasa Indonesia' : 'English';
    
    const prompt = `Berdasarkan catatan kuliah berikut, jawab pertanyaan yang diajukan dalam ${langName}.

Catatan:
"""
${notes.slice(0, 6000)}
"""

Pertanyaan: ${question}

Jawaban:`;

    const responseText = await aiManager.generateContent(prompt);
    return responseText.trim();
  } catch (error) {
    console.error('Q&A error:', error);
    return 'Maaf, terjadi kesalahan saat memproses pertanyaan.';
  }
};

// ==================== EXPORT ====================

export { isGeminiConfigured };
export default aiManager;
