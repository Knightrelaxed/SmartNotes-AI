/**
 * Utility to convert browser microphone audio into 16kHz 16-bit linear PCM
 * chunks encoded in Base64 for Gemini Live API streaming.
 */

export class AudioPCMStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isStreaming = false;
  private targetSampleRate = 16000;
  private onChunkCallback: ((base64Pcm: string) => void) | null = null;

  constructor(targetSampleRate = 16000) {
    this.targetSampleRate = targetSampleRate;
  }

  public start(
    stream: MediaStream,
    onChunk: (base64Pcm: string) => void
  ): void {
    if (this.isStreaming) {
      this.stop();
    }

    this.mediaStream = stream;
    this.onChunkCallback = onChunk;
    this.isStreaming = true;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Buffer size of 4096 gives approx 85ms chunks at 48kHz, responsive & low-latency
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isStreaming || !this.onChunkCallback) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const inputSampleRate = event.inputBuffer.sampleRate;

      // Downsample to 16kHz
      const downsampledBuffer = this.downsampleTo16k(
        inputBuffer,
        inputSampleRate,
        this.targetSampleRate
      );

      // Convert Float32 to 16-bit PCM ArrayBuffer
      const pcm16Buffer = this.floatTo16BitPCM(downsampledBuffer);

      // Convert to Base64 string
      const base64Data = this.arrayBufferToBase64(pcm16Buffer);

      if (base64Data) {
        this.onChunkCallback(base64Data);
      }
    };

    // Mute destination to prevent microphone loopback echo
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  public pause(): void {
    this.isStreaming = false;
  }

  public resume(): void {
    this.isStreaming = true;
  }

  public stop(): void {
    this.isStreaming = false;
    this.onChunkCallback = null;

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  /**
   * Linear interpolation downsampler
   */
  private downsampleTo16k(
    buffer: Float32Array,
    inputRate: number,
    outputRate: number
  ): Float32Array {
    if (inputRate === outputRate) {
      return buffer;
    }

    if (inputRate < outputRate) {
      return buffer; // Upsampling not needed
    }

    const sampleRateRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /**
   * Convert Float32Array (-1.0 to 1.0) to 16-bit Signed Integer PCM ArrayBuffer
   */
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(i * 2, val, true); // true = Little-Endian
    }

    return buffer;
  }

  /**
   * Convert ArrayBuffer bytes to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
