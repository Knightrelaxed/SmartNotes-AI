/**
 * Utility to convert browser microphone audio into 16kHz 16-bit linear PCM
 * chunks encoded in Base64 for Gemini Live API streaming.
 * Optimized for low latency (128ms pacing) with zero dropped frames.
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
      this.audioContext = new AudioContextClass({ sampleRate: this.targetSampleRate });
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.ownsAudioContext = true;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // Buffer size of 2048 samples at 16kHz gives ~128ms chunks (optimal for Google VAD)
    const bufferSize = 2048;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (event) => {
      // 1. Zero out outputBuffer to prevent feedback echo without triggering Chromium silence pruning!
      const outputBuffer = event.outputBuffer.getChannelData(0);
      for (let i = 0; i < outputBuffer.length; i++) {
        outputBuffer[i] = 0;
      }

      if (!this.isStreaming || !this.onChunkCallback) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const inputSampleRate = event.inputBuffer.sampleRate;

      // Downsample if input sample rate is different from target
      const downsampledBuffer = inputSampleRate === this.targetSampleRate
        ? inputBuffer
        : this.downsampleTo16k(inputBuffer, inputSampleRate, this.targetSampleRate);

      // Convert Float32 to 16-bit signed integer linear PCM ArrayBuffer
      const pcm16Buffer = this.floatTo16BitPCM(downsampledBuffer);

      // Fast Base64 string conversion
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
   * Fast linear interpolation downsampler
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
   * Convert Float32Array (-1.0 to 1.0) to 16-bit Signed Integer PCM ArrayBuffer (Little-Endian)
   */
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16.buffer;
  }

  /**
   * Fast high-throughput ArrayBuffer to Base64 conversion
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, Math.min(i + chunkSize, len)) as any
      );
    }
    return window.btoa(binary);
  }
}
