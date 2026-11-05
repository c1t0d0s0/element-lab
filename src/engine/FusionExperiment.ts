import {
  BeamEnergy, BEAM_ENERGY_FACTOR, COLLISIONS_PER_SIM_SECOND, FusionReaction, Nuclide,
  findFusionReaction, reactionProbability
} from '../data/nuclearFusion';

// 加速器実験のシミュレーション (DOM に依存しない)。
// 実際の確率のまま時間を早送りし、衝突回数と、ポアソン分布で抽選した合成数を数える

export interface SynthesizedAtom {
  index: number; // 1個目, 2個目…
  simSeconds: number; // 実験開始から何秒後にできたか
  reaction: FusionReaction;
}

export class FusionExperiment {
  public simSeconds = 0;
  public collisions = 0;
  public expected = 0; // ここまでの期待値 (できるはずの原子の平均個数)
  public atoms: SynthesizedAtom[] = [];
  public readonly reaction: FusionReaction | null;

  constructor(public readonly beam: Nuclide, public readonly target: Nuclide) {
    this.reaction = findFusionReaction(beam, target);
  }

  // 衝突1回あたりに原子ができる確率
  public probability(energy: BeamEnergy): number {
    if (!this.reaction) return 0;
    return reactionProbability(this.reaction) * BEAM_ENERGY_FACTOR[energy];
  }

  // 1個できるまでの平均時間 (秒)。できない組み合わせでは Infinity
  public meanSecondsPerAtom(energy: BeamEnergy): number {
    const rate = COLLISIONS_PER_SIM_SECOND * this.probability(energy);
    return rate > 0 ? 1 / rate : Infinity;
  }

  // シミュレーション時間を simDt 秒進め、新しくできた原子を返す
  public advance(simDt: number, energy: BeamEnergy, rng: () => number = Math.random): SynthesizedAtom[] {
    if (!(simDt > 0)) return [];
    const collisions = COLLISIONS_PER_SIM_SECOND * simDt;
    const lambda = collisions * this.probability(energy);
    const count = this.reaction ? samplePoisson(lambda, rng) : 0;
    // この区間の中のどこかでできた。時刻の順に番号をつける
    const times = Array.from({ length: count }, () => this.simSeconds + simDt * rng()).sort((a, b) => a - b);
    const created: SynthesizedAtom[] = times.map((simSeconds, i) => ({
      index: this.atoms.length + 1 + i,
      simSeconds,
      reaction: this.reaction!
    }));
    this.atoms.push(...created);
    this.simSeconds += simDt;
    this.collisions += collisions;
    this.expected += lambda;
    return created;
  }
}

// 平均 lambda のポアソン分布から1つ抽選する。ふつう lambda はとても小さいので Knuth の方法で十分。
// 大きいとき (早送りで当たりやすい反応) は正規分布で近似する
export function samplePoisson(lambda: number, rng: () => number = Math.random): number {
  if (!(lambda > 0)) return 0;
  if (lambda > 30) {
    const u1 = Math.max(rng(), Number.MIN_VALUE);
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = rng();
  while (p > limit) {
    k++;
    p *= rng();
  }
  return k;
}
