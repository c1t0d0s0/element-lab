import type { PhysicsWorld, GlassContainer } from './PhysicsWorld';
import type { ReactionRule } from '../data/reactions';
import { COMPOUNDS_DATA } from '../data/compounds';

// 質量保存の法則 (中2): 天秤にのせた容器の中で反応が起きたら、反応の前の容器全体の質量をおぼえておき、あとの質量とくらべる。
// 密閉した容器では、気体が発生しても質量は変わらない。開いた容器 (や、反応のあとで蓋を外した容器) では、
// 発生した気体が外へ出ていくので軽くなる
export type MassCheckResult = 'sealed_same' | 'open_lighter';

// 密閉したまま、この時間 (フレーム) がたっても質量が変わらなければ「変わらない」と確かめたことにする
const SEALED_CONFIRM_FRAMES = 180;
// 開いた容器で、これだけ軽くなったら「気体が出ていった」とする (u)。CO₂ 1個 (44 u) より小さく、天秤の表示の誤差より大きい
const LIGHTER_THRESHOLD = 1;
// 反応の前後で「変わらない」とみなす差 (u)。反応式の分子量の丸めの誤差を許す
const SAME_TOLERANCE = 0.05;
// 開いた容器で、反応のあとこの時間がたっても軽くならなければ見るのをやめる (フレーム)
const OPEN_WATCH_FRAMES = 900;

interface Watch {
  container: GlassContainer;
  massBefore: number;
  sealedAtStart: boolean; // 反応が起きたときに密閉していたか (反応のあとで蓋をしても、出ていった気体はもどらない)
  sealedFrames: number; // 密閉したまま続いたフレーム数
  openFrames: number; // 開いていたフレーム数
  reportedSealed: boolean;
}

export class MassCheck {
  // 天秤で確かめられた時 (前と後の天秤の値)
  public onResult?: (result: MassCheckResult, massBefore: number, massAfter: number) => void;
  private watches = new Map<string, Watch>();

  // 容器の中で反応が起きた時。天秤にのっていて、気体ができる反応なら見はじめる (すでに見ていれば、最初の反応の前の値のまま)
  public start(world: PhysicsWorld, container: GlassContainer, rule: ReactionRule) {
    if (this.watches.has(container.id)) return;
    if (!rule.products.some(p => p.type === 'compound' && COMPOUNDS_DATA[p.id]?.stateAtRoomTemp === 'gas')) return;
    const mass = panMass(world, container);
    if (mass === null) return;
    this.watches.set(container.id, { container, massBefore: mass, sealedAtStart: container.hasCap, sealedFrames: 0, openFrames: 0, reportedSealed: false });
  }

  public update(world: PhysicsWorld) {
    for (const [id, w] of this.watches) {
      const mass = world.containers.includes(w.container) ? panMass(world, w.container) : null;
      if (mass === null) {
        // 容器が消えた・天秤から下ろされた
        this.watches.delete(id);
        continue;
      }
      if (w.container.hasCap) {
        w.sealedFrames++;
        if (w.sealedAtStart && !w.reportedSealed && w.sealedFrames >= SEALED_CONFIRM_FRAMES && Math.abs(mass - w.massBefore) < SAME_TOLERANCE) {
          w.reportedSealed = true;
          this.onResult?.('sealed_same', w.massBefore, mass);
        }
        continue;
      }
      w.sealedFrames = 0;
      w.sealedAtStart = false;
      if (mass < w.massBefore - LIGHTER_THRESHOLD) {
        this.watches.delete(id);
        this.onResult?.('open_lighter', w.massBefore, mass);
      } else if (++w.openFrames >= OPEN_WATCH_FRAMES) {
        this.watches.delete(id);
      }
    }
  }
}

// 天秤にのっている容器と中身の質量 (天秤にのっていなければ null)。
// 置いたばかりでまだ容器に入ったと記録されていない粒も、容器の中にあれば数える
function panMass(world: PhysicsWorld, c: GlassContainer): number | null {
  if (!world.balances.some(b => b.id === c.supportedByBalanceId)) return null;
  let mass = world.containerTareMass(c);
  for (const p of world.particles) {
    if (p.containerId === c.id || (p.containerId === null && !p.pinned && world.isPointInsideContainer(c, p.x, p.y))) mass += p.molarMass;
  }
  return mass;
}
