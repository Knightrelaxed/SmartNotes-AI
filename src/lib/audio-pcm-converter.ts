/**
 * Utility to convert browser microphone audio into 16kHz 16-bit linear PCM
 * chunks encoded in Base64 for Gemini Live API streaming.
 * Includes intelligent noise gate, adaptive gain control (AGC),
 * and standardized 100ms packet pacing (1600 samples).
 */

export class AudioPCMStreamer {
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isStreaming = false;
  private targetSampleRate = 16000;
  private onChunkCallback: ((base64Pcm: string) => void) | null = null;
  private ownsAudioContext = false;
  private sampleBuffer: Float32Array = new Float32Array(0);

  // 100ms chunk at 16kHz is 1600 samples (optimal frame pacing for Gemini Live VAD)
  private readonly CHUNK_SIZE = 1600;

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
    this.sampleBuffer = new Float32Array(0);

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

    // Buffer size of 2048 samples from Web Audio processor
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

      // Downsample to 16kHz if browser audio context runs at 44.1kHz or 48kHz
      const downsampledBuffer = inputSampleRate === this.targetSampleRate
        ? inputBuffer
        : this.downsampleTo16k(inputBuffer, inputSampleRate, this.targetSampleRate);

      // Append new samples into the pacing buffer
      const combined = new Float32Array(this.sampleBuffer.length + downsampledBuffer.length);
      combined.set(this.sampleBuffer);
      combined.set(downsampledBuffer, this.sampleBuffer.length);
      this.sampleBuffer = combined;

      // Flush in standardized 100ms chunks (1600 samples)
      while (this.sampleBuffer.length >= this.CHUNK_SIZE) {
        const chunk = this.sampleBuffer.subarray(0, this.CHUNK_SIZE);
        this.sampleBuffer = this.sampleBuffer.slice(this.CHUNK_SIZE);

        const pcm16Buffer = this.processFloatTo16BitPCM(chunk);
        const base64Data = this.arrayBufferToBase64(pcm16Buffer);

        if (base64Data && this.onChunkCallback) {
          this.onChunkCallback(base64Data);
        }
      }
    };

    // Connect processor to source and destination
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  public pause(): void {
    this.isStreaming = false;
    this.flushRemainingBuffer();
  }

  public resume(): void {
    this.isStreaming = true;
    this.sampleBuffer = new Float32Array(0);
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  public stop(): void {
    this.isStreaming = false;
    this.flushRemainingBuffer();
    this.onChunkCallback = null;
    this.sampleBuffer = new Float32Array(0);

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
   * Flush residual audio buffer (at least 25ms) so trailing syllables aren't lost
   */
  private flushRemainingBuffer(): void {
    if (this.sampleBuffer.length >= 400 && this.onChunkCallback) {
      const pcm16Buffer = this.processFloatTo16BitPCM(this.sampleBuffer);
      const base64Data = this.arrayBufferToBase64(pcm16Buffer);
      if (base64Data) {
        this.onChunkCallback(base64Data);
      }
    }
    this.sampleBuffer = new Float32Array(0);
  }

  /**
   * Linear interpolation downsampler to 16kHz
   */
  private downsampleTo16k(
    buffer: Float32Array,
    inputRate: number,
    outputRate: number
  ): Float32Array {
    if (inputRate === outputRate || inputRate < outputRate) {
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
   * Convert Float32Array to 16-bit Linear PCM with Noise Gate & Adaptive Gain Control (AGC)
   */
  private processFloatTo16BitPCM(input: Float32Array): ArrayBuffer {
    let peak = 0;
    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i]);
      if (abs > peak) peak = abs;
    }

    // 1. Intelligent Noise Gate:
    // If peak < 0.0035 (ambient room hiss/aircon/silence), emit clean zeros.
    // This tells Google's VAD that user has paused, cleanly closing segments
    // and completely eliminating background hallucinations (Arabic, Hindi, etc.)
    if (peak < 0.0035) {
      return new Int16Array(input.length).buffer;
    }

    // 2. Adaptive Gain Booster:
    // Target healthy speech level (around 0.65 peak)
    // Max boost of 3.5x to ensure whisper/quiet laptop mics are crystal clear
    let gain = 1.0;
    if (peak < 0.25) {
      gain = Math.min(3.5, 0.65 / Math.max(peak, 0.01));
    } else if (peak > 0.85) {
      gain = 0.85 / peak; // Soft attenuation for loud sounds
    }

    // 3. Convert to 16-bit Signed Integer PCM Little-Endian with soft saturation
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = input[i] * gain;
      if (s > 1.0) s = 1.0;
      else if (s < -1.0) s = -1.0;
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
