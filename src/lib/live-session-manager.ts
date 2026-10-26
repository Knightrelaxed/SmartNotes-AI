import { GeminiLiveClient } from './gemini-live';

export interface LiveSessionManagerOptions {
  clientFactory: (
    onTranscript: (text: string, isFinal: boolean) => void,
    onDisconnected: (reason: string) => void,
    onError: (errMsg: string) => void
  ) => GeminiLiveClient;
  onTranscript: (text: string, isFinal: boolean) => void;
  onStatusChange?: (isConnected: boolean, message?: string) => void;
  onError?: (errorMsg: string) => void;
}

/**
 * Manages Gemini Live streaming sessions:
 * 1. Buffers audio chunks before connection to eliminate dropped first words.
 * 2. Automatically rotates sessions at the 8.5-minute mark to prevent Google's ~10-minute session timeout.
 * 3. Transparently reconnects on unexpected drops without losing audio chunks.
 * 4. Gracefully flushes audio at stop so trailing sentences are never cut off.
 */
export class LiveSessionManager {
  private activeClient: GeminiLiveClient | null = null;
  private queue: string[] = [];
  private readonly MAX_QUEUE = 1200; // ~2 minutes of 100ms audio chunks
  private rotationTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private isStopped = true;
  private isRotating = false;
  private retryCount = 0;

  // Google Gemini Live sessions expire around 10-15 minutes.
  // We proactively rotate the session at 8.5 minutes to guarantee uninterrupted recording.
  private readonly ROTATION_INTERVAL_MS = 8.5 * 60 * 1000;
  private options: LiveSessionManagerOptions;

  constructor(options: LiveSessionManagerOptions) {
    this.options = options;
  }

  public async start(): Promise<void> {
    this.isStopped = false;
    this.retryCount = 0;
    this.clearTimers();
    await this.openSession();
  }

  private clearTimers(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = undefined;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private async openSession(): Promise<void> {
    if (this.isStopped) return;

    this.options.onStatusChange?.(false, 'Menghubungkan ke Gemini Live...');

    const newClient = this.options.clientFactory(
      (text, isFinal) => {
        this.options.onTranscript(text, isFinal);
      },
      (reason) => {
        console.warn('[LiveSessionManager] Session disconnected:', reason);
        if (!this.isStopped && !this.isRotating) {
          this.handleUnexpectedDrop();
        }
      },
      (errMsg) => {
        console.error('[LiveSessionManager] Session error:', errMsg);
        this.options.onError?.(errMsg);
      }
    );

    try {
      await newClient.connect();

      const oldClient = this.activeClient;
      this.activeClient = newClient;
      this.retryCount = 0;
      this.options.onStatusChange?.(true, 'Gemini 3.5 Live Aktif');

      // Flush any queued audio chunks immediately into the new session
      if (this.queue.length > 0) {
        console.log(`[LiveSessionManager] Flushing ${this.queue.length} buffered audio chunks...`);
        for (const chunk of this.queue) {
          newClient.sendAudioChunk(chunk);
        }
        this.queue = [];
      }

      // Schedule proactive rotation at 8.5 minutes
      this.rotationTimer = setTimeout(() => {
        if (!this.isStopped) {
          console.log('[LiveSessionManager] 8.5m mark reached. Proactively rotating session...');
          this.rotateSession();
        }
      }, this.ROTATION_INTERVAL_MS);

      // Gracefully terminate the old session after in-flight final packets arrive
      if (oldClient) {
        try {
          oldClient.sendAudioStreamEnd();
          setTimeout(() => {
            oldClient.disconnect();
          }, 2000);
        } catch (e) {
          console.warn('[LiveSessionManager] Error closing previous session:', e);
        }
      }
    } catch (err: any) {
      console.warn('[LiveSessionManager] Connection attempt failed:', err?.message || err);
      if (!this.isStopped) {
        this.handleUnexpectedDrop();
      }
      throw err;
    }
  }

  public pushAudioChunk(base64Chunk: string): void {
    if (this.isStopped) return;

    if (this.activeClient?.isConnected()) {
      this.activeClient.sendAudioChunk(base64Chunk);
    } else {
      // Buffer chunks while connecting/reconnecting so no audio is lost
      this.queue.push(base64Chunk);
      if (this.queue.length > this.MAX_QUEUE) {
        this.queue.shift(); // Prevent memory overflow if offline for > 2 minutes
      }
    }
  }

  private handleUnexpectedDrop(): void {
    if (this.isStopped || this.isRotating) return;

    this.activeClient = null;
    this.options.onStatusChange?.(false, 'Koneksi terputus. Menyambung ulang...');

    if (this.retryTimer) clearTimeout(this.retryTimer);

    // Exponential backoff: 1s, 2s, 4s, up to 10s
    const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 10000);
    this.retryCount++;
    console.log(`[LiveSessionManager] Reconnecting in ${delay}ms (attempt #${this.retryCount})...`);

    this.retryTimer = setTimeout(async () => {
      if (this.isStopped) return;
      try {
        await this.openSession();
      } catch {
        // Will retry on next callback/timer
      }
    }, delay);
  }

  private async rotateSession(): Promise<void> {
    if (this.isStopped || this.isRotating) return;
    this.isRotating = true;
    try {
      await this.openSession();
    } catch (err) {
      console.warn('[LiveSessionManager] Rotation failed, will retry on drop:', err);
    } finally {
      this.isRotating = false;
    }
  }

  public isConnected(): boolean {
    return !!this.activeClient?.isConnected();
  }

  public async stop(): Promise<void> {
    this.isStopped = true;
    this.clearTimers();
    this.queue = [];

    const client = this.activeClient;
    this.activeClient = null;

    if (client) {
      try {
        client.sendAudioStreamEnd();
        await client.waitForFinal(1500);
        client.disconnect();
      } catch (e) {
        console.warn('[LiveSessionManager] Error stopping client:', e);
      }
    }

    this.options.onStatusChange?.(false);
  }
}
