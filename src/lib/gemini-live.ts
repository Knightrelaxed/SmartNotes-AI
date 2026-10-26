/**
 * Gemini Live API Bidirectional WebSocket Client
 * Dedicated to real-time speech transcription via 'gemini-3.5-transcribe-live'.
 */

export interface GeminiLiveOptions {
  apiKey: string;
  model?: string;
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
  private systemInstruction: string;
  private isSetupComplete = false;
  private isConnecting = false;
  private accumulatedText = '';

  private onConnected?: () => void;
  private onDisconnected?: (reason?: string) => void;
  private onError?: (error: string) => void;
  private onTranscript?: (text: string, isFinal: boolean) => void;

  constructor(options: GeminiLiveOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || 'models/gemini-3.5-transcribe-live';
    this.systemInstruction =
      options.systemInstruction ||
      'Transkripsikan audio perkuliahan yang didengar secara akurat ke dalam bahasa Indonesia atau Inggris. Berikan tanda baca lengkap, kapitalisasi yang tepat, dan pertahankan istilah ilmiah, teknis, atau matematika. Hanya keluarkan teks hasil transkripsi tanpa komentar.';
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
        },
        inputAudioTranscription: {},
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

  private handleServerMessage(message: any): void {
    if (!message) return;

    if (message.error) {
      console.error('[GeminiLive] Server returned error:', message.error);
      const errMsg = message.error.message || 'Error dari Gemini Live server';
      this.onError?.(errMsg);
      return;
    }

    const serverContent = message.serverContent || message.server_content;

    // 1. Check user voice input transcription (from inputAudioTranscription)
    const inputTranscription =
      serverContent?.inputTranscription ||
      serverContent?.input_transcription ||
      message?.inputTranscription ||
      message?.input_transcription ||
      message?.audioTranscription ||
      message?.audio_transcription;

    if (inputTranscription) {
      let inputTransText = '';
      let isTransFinal = false;

      if (typeof inputTranscription === 'string') {
        inputTransText = inputTranscription;
      } else if (typeof inputTranscription === 'object') {
        inputTransText = inputTranscription.text || inputTranscription.transcript || '';
        isTransFinal = !!(inputTranscription.isFinal || inputTranscription.is_final || inputTranscription.final);
      }

      if (inputTransText) {
        console.log('[GeminiLive] User voice transcription:', inputTransText, 'final:', isTransFinal);
        this.onTranscript?.(inputTransText, isTransFinal);
      }
    }

    // 2. Check model generated output transcription
    const outputTranscription =
      serverContent?.outputTranscription ||
      serverContent?.output_transcription ||
      message?.outputTranscription ||
      message?.output_transcription;

    if (outputTranscription) {
      const outputText = typeof outputTranscription === 'string'
        ? outputTranscription
        : outputTranscription.text || outputTranscription.transcript || '';
      if (outputText) {
        console.log('[GeminiLive] Output transcription:', outputText);
        this.onTranscript?.(outputText, false);
      }
    }

    // 3. Check modelTurn conversational parts
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
        const textChunk = part.text || part.transcript || '';
        if (textChunk) {
          this.accumulatedText += textChunk;
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
