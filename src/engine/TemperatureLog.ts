import { Particle, MatterState, PhaseChange } from './Particle';
import type { PhysicsWorld } from './PhysicsWorld';

// 温度グラフ (中1「状態変化と温度」): 選んだ粒の温度を時間とともに記録する。
// 状態変化の途中 (融解中・沸騰中など) は、加熱を続けても温度が融点・沸点のまま変わらないので、グラフに平らな部分ができる

// 記録する間隔 (フレーム) と、おぼえておく点の数 (60fps で 3フレームごとに 600点 = 30秒分)
export const TEMPERATURE_SAMPLE_INTERVAL = 3;
export const TEMPERATURE_MAX_SAMPLES = 600;
// 状態変化の途中の点がこれだけ続いてから状態が変われば、「温度が一定の部分を見た」とする
const PLATEAU_MIN_SAMPLES = 3;

export interface TemperatureSample {
  frame: number;
  temperature: number;
  state: MatterState;
  change: PhaseChange | null;
}

// 状態変化が終わった時の記録 (例: 水の沸騰。temperature は平らだった温度、samples は平らだった点の数)
export interface TemperaturePlateau {
  substanceId: string;
  change: PhaseChange;
  temperature: number;
  samples: number;
}

export class TemperatureLog {
  public target: Particle | null = null;
  public samples: TemperatureSample[] = [];
  // 記録していた粒が反応や消しゴムでなくなった
  public vanished = false;
  // 「元に戻す」や読みこみで実験室を入れかえたので記録をやめた (粒が反応して消えたのではない)
  public restored = false;
  // 記録しているあいだに見た、温度が一定の部分
  public plateaus: TemperaturePlateau[] = [];
  public onPlateau?: (plateau: TemperaturePlateau) => void;
  private frame = 0;
  private tick = 0;
  private plateauRun = 0;
  private plateauTemp = 0;

  public start(p: Particle) {
    this.target = p;
    this.samples = [];
    this.plateaus = [];
    this.vanished = false;
    this.restored = false;
    this.frame = 0;
    this.tick = 0;
    this.plateauRun = 0;
    this.record(p);
  }

  public stop() {
    this.target = null;
    this.samples = [];
    this.plateaus = [];
    this.vanished = false;
    this.restored = false;
  }

  // 実験室を記録したようすに入れかえた時: 記録していた粒はもういないので、記録をやめる (グラフはそのまま残す)
  public endByRestore() {
    if (!this.target || this.vanished) return;
    this.vanished = true;
    this.restored = true;
  }

  public isTracking(p: Particle): boolean {
    return this.target === p && !this.vanished;
  }

  // 毎フレーム呼ぶ。粒がなくなったら記録をやめる (グラフはそのまま残す)
  public update(world: PhysicsWorld) {
    const p = this.target;
    if (!p || this.vanished) return;
    this.frame++;
    if (!world.particles.includes(p)) {
      this.vanished = true;
      return;
    }
    if (++this.tick < TEMPERATURE_SAMPLE_INTERVAL) return;
    this.tick = 0;
    this.record(p);
  }

  private record(p: Particle) {
    const prev = this.samples[this.samples.length - 1];
    const sample: TemperatureSample = { frame: this.frame, temperature: p.displayTemperature, state: p.state, change: p.phaseChange };
    this.samples.push(sample);
    if (this.samples.length > TEMPERATURE_MAX_SAMPLES) this.samples.shift();

    // 状態変化の途中の点が続いたあとで状態が変わった (変わりきった) ら、平らな部分を見たことになる
    if (prev?.change && prev.state !== sample.state && this.plateauRun >= PLATEAU_MIN_SAMPLES) {
      const plateau: TemperaturePlateau = { substanceId: p.symbolOrId, change: prev.change, temperature: this.plateauTemp, samples: this.plateauRun };
      this.plateaus.push(plateau);
      this.onPlateau?.(plateau);
    }
    if (sample.change && prev?.change === sample.change && prev.state === sample.state) {
      this.plateauRun++;
    } else if (sample.change) {
      this.plateauRun = 1;
      this.plateauTemp = sample.temperature;
    } else {
      this.plateauRun = 0;
    }
  }
}

export const PHASE_CHANGES: PhaseChange[] = ['melting', 'boiling', 'sublimating', 'condensing', 'freezing', 'depositing'];

export function plateauKey(substanceId: string, change: PhaseChange): string {
  return `${substanceId}:${change}`;
}
