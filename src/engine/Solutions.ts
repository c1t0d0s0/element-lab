import type { PhysicsWorld } from './PhysicsWorld';
import type { Particle } from './Particle';
import { isSolute, soluteCapacity, WATER_PARTICLE_MASS } from '../data/solubility';

// 水溶液 (溶解と溶解度): 食塩・砂糖などの溶質は液体の水にふれると溶けて見えにくくなり、
// 水の量と温度で決まる量 (溶解度) より多くは溶けない。冷やしたり水を蒸発させたりして
// 溶けていられる量が減ると、溶けきれなくなった分が結晶になって出てくる (小5・中1)

// つながった水の粒をひとつの水溶液とみなす距離 (px)
const WATER_LINK_DISTANCE = 32;
// 溶質が水にふれたとみなす、粒どうしのすき間 (px)
const CONTACT_MARGIN = 6;
// 溶けた粒がこの距離の中に液体の水をもたないと、水がなくなったとみなして結晶に戻る (px)
const DISSOLVED_STAY_RADIUS = 36;
// 溶けきれない状態がこの回数続いたら結晶になる (水の粒が一瞬はなれただけでは結晶にしない)
const CRYSTALLIZE_CHECKS = 3;

export interface SoluteAmount {
  compoundId: string;
  dissolved: number; // 溶けている粒の数
  capacity: number; // いまの水の量と温度で溶けていられる粒の数 (小数)
}

export interface SolutionInfo {
  waterCount: number;
  temperature: number;
  solutes: SoluteAmount[];
}

interface Cluster {
  waters: Particle[];
  temperature: number;
  dissolved: Map<string, Particle[]>;
  candidates: Map<string, Particle[]>;
  info: SolutionInfo;
}

export function isLiquidWater(p: Particle): boolean {
  return p.kind === 'compound' && p.symbolOrId === 'H2O' && p.state === 'liquid' && !p.pinned;
}

export class SolutionSystem {
  // 溶質が初めて溶けた・溶けていた溶質が結晶になって出てきた時
  public onDissolve?: (compoundId: string, p: Particle) => void;
  public onCrystallize?: (compoundId: string, p: Particle) => void;
  // 水溶液が飽和して、溶け残りが出ている時
  public onSaturate?: (compoundId: string) => void;

  private infoByParticle = new Map<Particle, SolutionInfo>();
  // 溶けている粒が、溶けきれない状態で続けて判定された回数
  private overCounts = new Map<Particle, number>();

  // 水の粒、または溶けている粒がふくまれる水溶液のようす (水溶液でなければ null)
  public getSolution(p: Particle): SolutionInfo | null {
    return this.infoByParticle.get(p) ?? null;
  }

  public reset() {
    this.infoByParticle.clear();
    this.overCounts.clear();
  }

  public update(world: PhysicsWorld) {
    this.infoByParticle.clear();
    const prevCounts = this.overCounts;
    this.overCounts = new Map();
    // 溶けきれない状態が続いたら true (続いた回数を数える)
    const staysOver = (p: Particle) => {
      const count = (prevCounts.get(p) ?? 0) + 1;
      this.overCounts.set(p, count);
      return count >= CRYSTALLIZE_CHECKS;
    };
    const clusterOf = this.buildClusters(world);

    // 溶けている粒・これから溶ける粒を、ふれている水溶液ごとに分ける
    for (const p of world.particles) {
      if (p.kind !== 'compound' || p.pinned || !isSolute(p.symbolOrId)) continue;
      if (p.dissolved) {
        const cluster = this.largestNearbyCluster(world, p, DISSOLVED_STAY_RADIUS, clusterOf);
        if (!cluster) {
          // まわりの水がすべて蒸発したり凍ったりした
          if (staysOver(p)) this.crystallize(world, p);
          continue;
        }
        pushTo(cluster.dissolved, p.symbolOrId, p);
      } else if (p.state === 'solid') {
        const water = world.getNeighbors(p, p.radius + 13 + CONTACT_MARGIN)
          .find(n => isLiquidWater(n) && Math.hypot(n.x - p.x, n.y - p.y) <= p.radius + n.radius + CONTACT_MARGIN);
        const cluster = water ? clusterOf.get(water) : undefined;
        if (cluster) pushTo(cluster.candidates, p.symbolOrId, p);
      }
    }

    const clusters = new Set(clusterOf.values());
    for (const cluster of clusters) {
      const ids = new Set([...cluster.dissolved.keys(), ...cluster.candidates.keys()]);
      for (const id of ids) {
        const dissolved = cluster.dissolved.get(id) ?? [];
        const candidates = cluster.candidates.get(id) ?? [];
        const sample = dissolved[0] ?? candidates[0];
        const capacity = soluteCapacity(id, sample.molarMass, cluster.waters.length, cluster.temperature);

        // 1回の判定で溶ける・出てくるのは1粒ずつ (少しずつ溶けていくように見せる)
        if (dissolved.length > capacity) {
          const ready = dissolved.filter(staysOver);
          if (ready.length > 0) {
            const p = ready[0];
            dissolved.splice(dissolved.indexOf(p), 1);
            this.overCounts.delete(p);
            this.crystallize(world, p);
          }
        } else if (candidates.length > 0 && dissolved.length + 1 <= capacity) {
          const p = candidates[0];
          p.dissolved = true;
          p.vx *= 0.2;
          p.vy *= 0.2;
          dissolved.push(p);
          world.addEffect('sparkles', p.x, p.y, '#BAE6FD', 10);
          this.onDissolve?.(id, p);
        } else if (candidates.length > 0) {
          this.onSaturate?.(id);
        }

        for (const p of dissolved) p.temperature = cluster.temperature;
        cluster.info.solutes.push({ compoundId: id, dissolved: dissolved.length, capacity });
        for (const p of dissolved) this.infoByParticle.set(p, cluster.info);
      }
    }
  }

  // つながった液体の水の粒をまとめる (union-find)
  private buildClusters(world: PhysicsWorld): Map<Particle, Cluster> {
    const waters = world.particles.filter(isLiquidWater);
    const parent = new Map<Particle, Particle>(waters.map(w => [w, w]));
    const find = (w: Particle): Particle => {
      let root = w;
      while (parent.get(root) !== root) root = parent.get(root)!;
      while (parent.get(w) !== root) {
        const next = parent.get(w)!;
        parent.set(w, root);
        w = next;
      }
      return root;
    };
    for (const w of waters) {
      for (const n of world.getNeighbors(w, WATER_LINK_DISTANCE)) {
        if (!parent.has(n)) continue;
        const a = find(w);
        const b = find(n);
        if (a !== b) parent.set(a, b);
      }
    }

    const byRoot = new Map<Particle, Cluster>();
    const clusterOf = new Map<Particle, Cluster>();
    for (const w of waters) {
      const root = find(w);
      let cluster = byRoot.get(root);
      if (!cluster) {
        cluster = { waters: [], temperature: 0, dissolved: new Map(), candidates: new Map(), info: { waterCount: 0, temperature: 0, solutes: [] } };
        byRoot.set(root, cluster);
      }
      cluster.waters.push(w);
      clusterOf.set(w, cluster);
    }
    for (const cluster of byRoot.values()) {
      cluster.temperature = cluster.waters.reduce((sum, w) => sum + w.temperature, 0) / cluster.waters.length;
      cluster.info.waterCount = cluster.waters.length;
      cluster.info.temperature = cluster.temperature;
      for (const w of cluster.waters) this.infoByParticle.set(w, cluster.info);
    }
    return clusterOf;
  }

  // 近くの水の粒がふくまれる水溶液のうち、いちばん大きいもの (しぶきの小さな水滴より本体の水溶液を選ぶ)
  private largestNearbyCluster(world: PhysicsWorld, p: Particle, radius: number, clusterOf: Map<Particle, Cluster>): Cluster | undefined {
    let best: Cluster | undefined;
    for (const n of world.getNeighbors(p, radius)) {
      const cluster = clusterOf.get(n);
      if (cluster && (!best || cluster.waters.length > best.waters.length)) best = cluster;
    }
    return best;
  }

  private crystallize(world: PhysicsWorld, p: Particle) {
    p.dissolved = false;
    p.vx = 0;
    p.vy = 0;
    p.updateStateByTemperature(true);
    world.addEffect('sparkles', p.x, p.y, p.color, 14);
    this.onCrystallize?.(p.symbolOrId, p);
  }

  // 水の質量 (u)。天秤などで水溶液の重さを考えるときに使う
  public static waterMass(info: SolutionInfo): number {
    return info.waterCount * WATER_PARTICLE_MASS;
  }
}

function pushTo(map: Map<string, Particle[]>, key: string, p: Particle) {
  const list = map.get(key);
  if (list) list.push(p);
  else map.set(key, [p]);
}
