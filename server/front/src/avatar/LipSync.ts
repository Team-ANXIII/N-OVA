export class LipSync {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  connect(audioElement: HTMLAudioElement): void {
    this.disconnect();
    const context = new AudioContext();
    const analyser = context.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;

    const source = context.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(context.destination);

    this.audioContext = context;
    this.analyser = analyser;
    this.source = source;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  getValue(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteTimeDomainData(this.dataArray);

    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i += 1) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }

    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(1, rms * 2.2);
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
  }
}
