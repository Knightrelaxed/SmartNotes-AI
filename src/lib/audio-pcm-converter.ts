/**
 * Utility to convert browser microphone audio into 16kHz 16-bit linear PCM
 * chunks encoded in Base64 for Gemini Live API streaming.
 */

export class AudioPCMStreamer {
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isStreaming = false;
  private targetSampleRate = 16000;
  private onChunkCallback: ((base64Pcm: string) => void) | null = null;
  private ownsAudioContext = false;

  constructor(targetSampleRate = 16000) {
    this.targetSampleRate = targetSampleRate;
  }

  public start(
    stream: MediaStream,
    onChunk: (base64Pcm: string) => void,
    existingContext?: AudioContext,
    existingSource?: MediaStreamAudioSourceNode
  ): void {
    if (this.isStreaming) {
      this.stop();
    }

    this.onChunkCallback = onChunk;
    this.isStreaming = true;

    if (existingContext && existingSource) {
      this.audioContext = existingContext;
      this.sourceNode = existingSource;
      this.ownsAudioContext = false;
    } else {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.ownsAudioContext = true;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // Buffer size of 4096 gives approx 85ms chunks at 48kHz, responsive & low-latency
    const bufferSize = 4096;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      // 1. Zero out the output buffer so speaker hears complete silence (prevents feedback loop)
      // without using a 0-gain node which causes Chrome to prune and stop onaudioprocess!
      const outputBuffer = event.outputBuffer.getChannelData(0);
      for (let i = 0; i < outputBuffer.length; i++) {
        outputBuffer[i] = 0;
      }

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

    // Connect processor to source and destination
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  public pause(): void {
    this.isStreaming = false;
  }

  public resume(): void {
    this.isStreaming = true;
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  public stop(): void {
    this.isStreaming = false;
    this.onChunkCallback = null;

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
        this.processorNode.onaudioprocess = null;
      } catch {
        // Ignore
      }
      this.processorNode = null;
    }

    if (this.ownsAudioContext) {
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch {
          // Ignore
        }
        this.sourceNode = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } else {
      this.sourceNode = null;
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
      return buffer;
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
