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

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

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
            this.handleServerMessage(message);

            if (!this.isSetupComplete) {
              this.isSetupComplete = true;
              this.onConnected?.();
              resolve();
            }
          } catch (e) {
            console.error('[GeminiLive] Error parsing message:', e);
          }
        };

        this.socket.onerror = (event) => {
          console.error('[GeminiLive] WebSocket error:', event);
          const errMsg = 'Koneksi ke Gemini 3.5 Transcribe Live terputus atau gagal.';
          this.onError?.(errMsg);
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error(errMsg));
          }
        };

        this.socket.onclose = (event) => {
          console.log(`[GeminiLive] WebSocket closed: ${event.reason} (code: ${event.code})`);
          this.isSetupComplete = false;
          this.isConnecting = false;
          this.onDisconnected?.(event.reason || `Code ${event.code}`);
        };
      } catch (err: any) {
        this.isConnecting = false;
        const msg = err?.message || 'Gagal menginisialisasi WebSocket Gemini Live.';
        this.onError?.(msg);
        reject(err);
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

  private sendSetup(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: this.model,
        generationConfig: {
          responseModalities: ['TEXT'],
          temperature: 0.2,
        },
        systemInstruction: {
          parts: [
            {
              text: this.systemInstruction,
            },
          ],
        },
      },
    };

    this.socket.send(JSON.stringify(setupMessage));
  }

  private handleServerMessage(message: any): void {
    if (!message) return;

    if (message.error) {
      console.error('[GeminiLive] Server returned error:', message.error);
      const errMsg = message.error.message || 'Error dari Gemini Live server';
      this.onError?.(errMsg);
      return;
    }

    // Server content turn
    if (message.serverContent) {
      const { modelTurn, turnComplete } = message.serverContent;

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.text) {
            this.accumulatedText += part.text;
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
