/**
 * Web Audio APIを用いた完全内製プロシージャル効果音ジェネレータ
 * 外部音声ファイル不要・ゼロレイテンシー・軽量
 * ダイナミクスリミッター & クールダウン制御により耳に優しい快適な音響響きを実現
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private enabled: boolean = true;
  private lastPlayTimes: Map<string, number> = new Map();

  constructor() {
    // ユーザー操作時に初期化
  }

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();

        // マスターリミッター (過剰な重なりや不快な音割れ・スパイクノイズを自動抑制)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(10, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private canPlay(type: string, cooldownMs: number = 80): boolean {
    if (!this.enabled) return false;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return false;

    const now = performance.now();
    const last = this.lastPlayTimes.get(type) || 0;
    if (now - last < cooldownMs) {
      return false;
    }
    this.lastPlayTimes.set(type, now);
    return true;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggleSound(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public playPop(frequency: number = 440) {
    if (!this.canPlay('pop', 60)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * 1.5), now + 0.06);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playWater() {
    if (!this.canPlay('water', 75)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playSpark() {
    if (!this.canPlay('spark', 85)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.05);
  }

  // 爆発音 (power: 1.0 = 通常の爆発反応, 2.0 前後 = フラスコ破裂を伴う大爆発)
  // 衝撃波の「パンッ」+ 腹に響く重低音 + 歪んだ爆風 + 長く尾を引く残響ゴロゴロ の4層構成
  public playExplosion(power: number = 1) {
    if (!this.canPlay('explosion', 180)) return;
    if (!this.ctx || !this.masterGain) return;
    this.renderExplosion(power, this.masterGain);
  }

  // 爆発音の本体 (破裂音・重低音・轟音・地鳴りの4層)。destination へ出力する
  private renderExplosion(power: number, destination: AudioNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const p = Math.max(0.5, Math.min(2.5, power));
    const now = ctx.currentTime;

    // 全層をまとめる出力 (歪みで迫力を出してから出力先へ)
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(Math.min(1.0, 0.65 + 0.15 * p), now);
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.createDistortionCurve(18 + 10 * p);
    shaper.oversample = '2x';
    bus.connect(shaper);
    shaper.connect(destination);

    const makeNoise = (dur: number, decayPow: number) => {
      const size = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < size; i++) {
        // ブラウンノイズ寄りにして低域の厚みを出す
        brown = (brown + (Math.random() * 2 - 1) * 0.12) * 0.985;
        const env = Math.pow(1 - i / size, decayPow);
        data[i] = ((Math.random() * 2 - 1) * 0.5 + brown * 3) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      return src;
    };

    // 1. 衝撃波の鋭い破裂音 (パンッ)
    const crack = makeNoise(0.08, 3);
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.setValueAtTime(1200, now);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.9, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(bus);
    crack.start(now);
    crack.stop(now + 0.09);

    // 2. 腹に響く重低音 (ドンッ): 周波数が急降下するサイン波
    const boomDur = 0.9 + 0.35 * p;
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110, now);
    boom.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    boom.frequency.exponentialRampToValueAtTime(22, now + boomDur);
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.linearRampToValueAtTime(0.95, now + 0.008);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + boomDur);
    boom.connect(boomGain);
    boomGain.connect(bus);
    boom.start(now);
    boom.stop(now + boomDur + 0.02);

    // 3. 爆風の轟音 (ゴォッ): ローパスが閉じていく分厚いノイズ
    const blastDur = 0.8 + 0.4 * p;
    const blast = makeNoise(blastDur, 1.6);
    const blastFilter = ctx.createBiquadFilter();
    blastFilter.type = 'lowpass';
    blastFilter.Q.setValueAtTime(0.7, now);
    blastFilter.frequency.setValueAtTime(3500, now);
    blastFilter.frequency.exponentialRampToValueAtTime(400, now + 0.25);
    blastFilter.frequency.exponentialRampToValueAtTime(90, now + blastDur);
    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.85, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + blastDur);
    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(bus);
    blast.start(now);
    blast.stop(now + blastDur);

    // 4. 尾を引く残響の地鳴り (ゴロゴロ…)
    const rumbleDur = 1.4 + 0.6 * p;
    const rumble = makeNoise(rumbleDur, 1.2);
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(160, now);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.15);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + rumbleDur);
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(bus);
    rumble.start(now);
    rumble.stop(now + rumbleDur);
  }

  // 爆発音用のソフトクリップ歪みカーブ (amount が大きいほど荒々しく)
  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    return curve;
  }

  // ガラス容器の破裂音 (高域ノイズの「ガシャン」＋ランダムピッチの破片の「チリン」)
  public playGlassShatter() {
    if (!this.canPlay('glass_shatter', 200)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // 1. 割れる瞬間の高域バーストノイズ
    const dur = 0.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 減衰しつつ断続的に砕けるようなザラつき
      const decay = Math.pow(1 - i / bufferSize, 2);
      data[i] = (Math.random() * 2 - 1) * decay * (Math.random() < 0.3 ? 1 : 0.35);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200, now);
    filter.Q.setValueAtTime(0.9, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + dur);

    // 2. 飛び散る破片が鳴らす短い高音 (ランダムなタイミング・ピッチ)
    for (let k = 0; k < 6; k++) {
      const t0 = now + 0.02 + Math.random() * 0.35;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2600 + Math.random() * 3200, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.07, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    }
  }

  // 穏やかなスチーム・水蒸気音 (高音の不快なピー音を抑えた柔らかなシュー音)
  public playSteam() {
    if (!this.canPlay('steam', 120)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.22;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  // 心地よい微細な気泡・シュワシュワ音 (過酸化水素水の分解や炭酸の発生などに使用)
  public playFizz() {
    if (!this.canPlay('fizz', 90)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.18;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (0.6 + Math.sin(i * 0.08) * 0.3);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.048, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);

    // 優しいプチプチという微小気泡音
    for (let b = 0; b < 2; b++) {
      const bTime = now + 0.02 + b * 0.06 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650 + Math.random() * 300, bTime);
      osc.frequency.exponentialRampToValueAtTime(950 + Math.random() * 200, bTime + 0.02);
      bGain.gain.setValueAtTime(0.022, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.02);
      osc.connect(bGain);
      bGain.connect(this.masterGain);
      osc.start(bTime);
      osc.stop(bTime + 0.025);
    }
  }

  public playRust() {
    if (!this.canPlay('rust', 120)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.15);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSuccessChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const now = (this.ctx?.currentTime || 0) + i * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  public playFanfare() {
    this.playSuccessChime();
  }

  public playClick() {
    if (!this.canPlay('click', 40)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playGlass() {
    if (!this.canPlay('glass', 80)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playCork(isClosed: boolean) {
    if (!this.canPlay('cork', 60)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isClosed) {
      // 蓋を閉める (カポッ、低めの密閉感ある音)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      // 蓋を開ける (ポンッ！と抜けるコルク音)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.035);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.1);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.11);
    }
  }

  public playErase() {
    if (!this.canPlay('erase', 70)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.07);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 暖かみのあるバーナー加熱音 (耳障りな高音スパークを排し、心地よい温風・炎の響きに調整)
  public playFlame() {
    if (!this.canPlay('flame', 130)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.14;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.55));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
  }

  public playElectric() {
    if (!this.canPlay('electric', 95)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 + Math.random() * 40, now);
    osc.frequency.linearRampToValueAtTime(240 + Math.random() * 80, now + 0.07);

    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playVentilation() {
    if (!this.canPlay('ventilation', 200)) return;
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const dur = 0.3;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(220, now + dur);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + dur);
  }
  // 指示薬の色が変わった時の「キラン」(上がる2音)
  public playColorChange() {
    if (!this.canPlay('color_change', 250)) return;
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    [880, 1318.5].forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.27);
    });
  }

  // 花火の打ち上げ: 玉が上がっていく笛の音「ピューー」(小さめの音量)
  // 揺らぎのない澄んだ音が、なめらかに高くなっていく。かすかな息の音 (細い帯域のノイズ) を重ねて笛らしくする
  public playFireworkLaunch(durationSec: number = 1.0) {
    if (!this.canPlay('firework_launch', 120)) return;
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = Math.max(0.5, durationSec);
    const startFreq = 1100;
    const endFreq = 2300;

    // 音量の形: すっと立ち上がり、上がるにつれて少し遠ざかり、頂点で消える
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.linearRampToValueAtTime(1, now + 0.08);
    out.gain.linearRampToValueAtTime(0.6, now + dur * 0.85);
    out.gain.exponentialRampToValueAtTime(0.001, now + dur);
    out.connect(this.masterGain);

    // 澄んだ笛の音
    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(startFreq, now);
    whistle.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    const whistleGain = ctx.createGain();
    whistleGain.gain.setValueAtTime(0.022, now);
    whistle.connect(whistleGain);
    whistleGain.connect(out);
    whistle.start(now);
    whistle.stop(now + dur + 0.02);

    // 息の音: ホワイトノイズを笛と同じ高さの細い帯域で通す
    const size = Math.floor(ctx.sampleRate * (dur + 0.05));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let k = 0; k < size; k++) data[k] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.setValueAtTime(18, now);
    band.frequency.setValueAtTime(startFreq, now);
    band.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.09, now);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  // 花火が開く音: 爆発音と同じ層の「ドーン！」に、街に反響するこだまと「パチパチ」を重ねる
  public playFireworkBurst() {
    if (!this.canPlay('firework_burst', 120)) return;
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 直接音 + こだま (少し遅れて、こもった音で数回くり返す)
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.9, now);
    out.connect(this.masterGain);
    const echoDelay = ctx.createDelay(1.0);
    echoDelay.delayTime.setValueAtTime(0.32, now);
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(900, now);
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.setValueAtTime(0.38, now);
    out.connect(echoDelay);
    echoDelay.connect(echoFilter);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoFilter.connect(this.masterGain);
    // こだまが消えたら反響ループを止める
    window.setTimeout(() => echoFeedback.disconnect(), 4000);

    this.renderExplosion(1.3, out);

    // パチパチ: 開いた星が燃えながら弾ける細かい破裂音
    const crackleStart = now + 0.35;
    const crackleDur = 1.6;
    const size = Math.floor(ctx.sampleRate * crackleDur);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let k = 0; k < 70; k++) {
      // 前半に多く、後半ほどまばらに
      const start = Math.floor(Math.pow(Math.random(), 1.6) * size * 0.95);
      const len = Math.floor(ctx.sampleRate * (0.003 + Math.random() * 0.006));
      const amp = 0.4 + Math.random() * 0.6;
      for (let i = 0; i < len && start + i < size; i++) {
        data[start + i] += (Math.random() * 2 - 1) * amp * (1 - i / len);
      }
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, crackleStart);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, crackleStart);
    gain.gain.linearRampToValueAtTime(0.12, crackleStart + crackleDur);
    crackle.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    crackle.start(crackleStart);
    crackle.stop(crackleStart + crackleDur);
  }
}

export const soundManager = new SoundManager();
