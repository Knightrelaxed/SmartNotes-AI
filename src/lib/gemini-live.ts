/**
 * Gemini Live API Bidirectional WebSocket Client
 * Dedicated to real-time speech transcription via 'gemini-3.5-transcribe-live'.
 */

export interface GeminiLiveOptions {
  apiKey: string;
  model?: string;
  languageCodes?: string[];
  systemInstruction?: string;
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
}

export class GeminiLiveClient {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private model: string;
  private languageCodes: string[];
  private systemInstruction: string;
  private isSetupComplete = false;
  private isConnecting = false;
  private hasReceivedInputTranscription = false;
  private accumulatedText = '';

  private onConnected?: () => void;
  private onDisconnected?: (reason?: string) => void;
  private onError?: (error: string) => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;

  constructor(options: GeminiLiveOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'models/gemini-3.5-transcribe-live';
    this.languageCodes = options.languageCodes || ['id-ID', 'id', 'en-US', 'en'];
    this.systemInstruction =
      options.systemInstruction ||
      `PERAN & TUGAS UTAMA:
Kamu adalah mesin Speech-to-Text (Transkriptor Audio Langsung) khusus perkuliahan dan percakapan.
1. Transkripsikan HANYA apa yang diucapkan pembicara secara persis apa adanya dalam Bahasa Indonesia atau Bahasa Inggris.
2. Gunakan HANYA karakter alfabet Latin (A-Z, a-z), angka, dan tanda baca standar.
3. JANGAN PERNAH mengeluarkan huruf/aksara non-Latin (seperti aksara Arab, Hindi/Devanagari, Sirilik, Mandarin, Thai, dll).
4. JANGAN PERNAH merespons percakapan, jangan menjawab pertanyaan, jangan menambahkan kata sapaan, jangan membuat komentar AI sendiri.
5. Jika pembicara hening, atau hanya terdengar desis mikrofon / derau ruangan, JANGAN mengeluarkan teks sama sekali.
6. Pertahankan istilah teknis, medis, ilmiah, dan singkatan akademis secara akurat.`;
    this.onConnected = options.onConnected;
    this.onDisconnected = options.onDisconnected;
    this.onError = options.onError;
    this.onTranscript = options.onTranscript;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        const err = 'API Key Google Gemini tidak ditemukan. Harap masukkan API key di menu Pengaturan.';
        this.onError?.(err);
        return reject(new Error(err));
      }

      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        return resolve();
      }

      this.isConnecting = true;
      this.isSetupComplete = false;
      this.hasReceivedInputTranscription = false;

      let isSettled = false;
      const safeResolve = () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          resolve();
        }
      };
      const safeReject = (err: Error) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      };

      // 10 second connection timeout to prevent hanging UI
      const timeoutId = setTimeout(() => {
        const timeoutErr = new Error('Batas waktu koneksi ke Gemini Live habis (10 detik). Periksa koneksi internet atau validitas API key Anda.');
        this.onError?.(timeoutErr.message);
        this.disconnect();
        safeReject(timeoutErr);
      }, 10000);

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(this.apiKey)}`;

      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.isConnecting = false;
          console.log('[GeminiLive] WebSocket connected, sending setup...');
          this.sendSetup();
        };

        this.socket.onmessage = async (event: MessageEvent) => {
          try {
            const rawData = typeof event.data === 'string'
              ? event.data
              : await (event.data as Blob).text();

            const message = JSON.parse(rawData);

            if (message.error) {
              const errMsg = message.error.message || 'Error dari server Gemini Live';
              console.error('[GeminiLive] Server error received:', errMsg);
              this.onError?.(errMsg);
              this.disconnect();
              safeReject(new Error(errMsg));
              return;
            }

            this.handleServerMessage(message);

            if (!this.isSetupComplete) {
              this.isSetupComplete = true;
              this.onConnected?.();
              safeResolve();
            }
          } catch (e) {
            console.error('[GeminiLive] Error parsing message:', e);
          }
        };

        this.socket.onerror = (event) => {
          console.error('[GeminiLive] WebSocket error:', event);
          const errMsg = 'Koneksi ke Gemini 3.5 Transcribe Live gagal atau ditolak oleh server.';
          this.onError?.(errMsg);
          safeReject(new Error(errMsg));
        };

        this.socket.onclose = (event) => {
          console.log(`[GeminiLive] WebSocket closed: ${event.reason} (code: ${event.code})`);
          const wasReady = this.isSetupComplete;
          this.isSetupComplete = false;
          this.isConnecting = false;
          const closeReason = event.reason || (event.code === 1007 ? 'API key tidak valid' : `Koneksi ditutup (kode ${event.code})`);
          this.onDisconnected?.(closeReason);
          if (!wasReady) {
            this.onError?.(`Gagal terhubung ke Gemini Live: ${closeReason}`);
            safeReject(new Error(closeReason));
          }
        };
      } catch (err: any) {
        this.isConnecting = false;
        const msg = err?.message || 'Gagal menginisialisasi WebSocket Gemini Live.';
        this.onError?.(msg);
        safeReject(err instanceof Error ? err : new Error(msg));
      }
    });
  }

  public sendAudioChunk(base64Pcm: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm,
          },
        ],
      },
    };

    try {
      this.socket.send(JSON.stringify(payload));
    } catch (e) {
      console.warn('[GeminiLive] Error sending audio chunk:', e);
    }
  }

  public disconnect(): void {
    this.isSetupComplete = false;
    this.isConnecting = false;
    this.hasReceivedInputTranscription = false;

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close(1000, 'Normal Closure');
      }
      this.socket = null;
    }
    this.accumulatedText = '';
  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN && this.isSetupComplete;
  }

  public isConnectingActive(): boolean {
    return this.isConnecting;
  }

  private sendSetup(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const formattedModel = this.model.startsWith('models/') ? this.model : `models/${this.model}`;

    const setupMessage = {
      setup: {
        model: formattedModel,
        generationConfig: {
          responseModalities: ['TEXT'],
          inputAudioTranscription: {
            languageCodes: this.languageCodes,
          },
        },
        inputAudioTranscription: {
          languageCodes: this.languageCodes,
        },
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [
            {
              text: this.systemInstruction,
            },
          ],
        },
      },
    };

    try {
      console.log('[GeminiLive] Sending setup message:', JSON.stringify(setupMessage));
      this.socket.send(JSON.stringify(setupMessage));
    } catch (e) {
      console.error('[GeminiLive] Error sending setup message:', e);
    }
  }

  /**
   * Filter out acoustic hallucinations such as Arabic/Hindi scripts,
   * conversational bot greetings, or subtitle artifacts during mic pauses.
   */
  private filterHallucinations(text: string): string {
    if (!text) return '';

    // 1. Discard non-Latin scripts (Arabic, Devanagari/Hindi, Cyrillic, Thai, CJK, etc.)
    const nonLatinRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0900-\u097F\u0400-\u04FF\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
    if (nonLatinRegex.test(text)) {
      console.warn('[GeminiLive] Discarded hallucinated non-Latin script:', text);
      return '';
    }

    // 2. Discard common repetitive YouTube/Whisper/AI hallucination phrases
    const lower = text.trim().toLowerCase();
    const bannedPhrases = [
      'subtitles by',
      'terima kasih telah menonton',
      'terima kasih sudah menonton',
      'jangan lupa subscribe',
      'like and subscribe',
      'thank you for watching',
      'amara.org',
      'halo! apa yang bisa saya bantu',
      'halo, apa yang bisa saya bantu',
      'bagaimana saya bisa membantu',
      'ada yang bisa saya bantu',
      'sure, i am ready',
      'how can i help you today',
    ];

    for (const phrase of bannedPhrases) {
      if (lower === phrase || (lower.startsWith(phrase) && lower.length < phrase.length + 15)) {
        console.warn('[GeminiLive] Discarded bot response/filler hallucination:', text);
        return '';
      }
    }

    return text;
  }

  private handleServerMessage(message: any): void {
    if (!message) return;

    if (message.error) {
      console.error('[GeminiLive] Server returned error:', message.error);
      const errMsg = message.error.message || 'Error dari Gemini Live server';
      this.onError?.(errMsg);
      return;
    }

    const serverContent = message.serverContent || message.server_content;

    // 1. Real-time interim user voice input (speculative partial hypotheses as user speaks - zero delay)
    const interim =
      serverContent?.interimInputTranscription ||
      serverContent?.interim_input_transcription ||
      message?.interimInputTranscription ||
      message?.interim_input_transcription;

    if (interim) {
      const rawText = typeof interim === 'string' ? interim : interim.text || interim.transcript || '';
      const cleanText = this.filterHallucinations(rawText);
      if (cleanText.trim()) {
        this.hasReceivedInputTranscription = true;
        console.log('[GeminiLive] Real-time interim speech:', cleanText);
        this.onTranscript?.(cleanText.trim(), false);
      }
    }

    // 2. Authoritative finalized user voice transcript (emitted on speech pauses / turn completion)
    const finalized =
      serverContent?.inputTranscription ||
      serverContent?.input_transcription ||
      message?.inputTranscription ||
      message?.input_transcription ||
      message?.audioTranscription ||
      message?.audio_transcription;

    if (finalized) {
      const rawText = typeof finalized === 'string' ? finalized : finalized.text || finalized.transcript || '';
      const cleanText = this.filterHallucinations(rawText);
      if (cleanText.trim()) {
        this.hasReceivedInputTranscription = true;
        console.log('[GeminiLive] Finalized speech segment:', cleanText);
        this.onTranscript?.(cleanText.trim(), true);
      }
    }

    // 3. Fallback for modelTurn generation parts
    // ONLY used if inputTranscription is NOT active on this session to avoid duplicate delayed text.
    if (!this.hasReceivedInputTranscription) {
      const modelTurn =
        serverContent?.modelTurn ||
        serverContent?.model_turn ||
        message?.modelTurn ||
        message?.model_turn ||
        message?.candidates?.[0]?.content;

      const turnComplete =
        serverContent?.turnComplete ??
        serverContent?.turn_complete ??
        message?.turnComplete ??
        message?.turn_complete;

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          const rawChunk = part.text || part.transcript || '';
          const cleanChunk = this.filterHallucinations(rawChunk);
          if (cleanChunk) {
            this.accumulatedText += cleanChunk;
            this.onTranscript?.(this.accumulatedText, false);
          }
        }
      }

      if (turnComplete) {
        if (this.accumulatedText.trim()) {
          this.onTranscript?.(this.accumulatedText.trim(), true);
        }
        this.accumulatedText = '';
      }
    }
  }
}
