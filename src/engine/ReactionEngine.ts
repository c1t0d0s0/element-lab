import { REACTIONS_DATA, ReactionRule, OPEN_FLASK_SHATTER_HEAT } from '../data/reactions';
import { ELEMENTS_DATA, getFlameReactionInfo } from '../data/elements';
import { COMPOUNDS_DATA, PhClass } from '../data/compounds';
import { FireworkDesign } from './Fireworks';
import { Particle } from './Particle';
import { PhysicsWorld, GlassContainer } from './PhysicsWorld';
import { soundManager } from './AudioEffects';
import { GameStats } from '../data/quests';

export interface ReactionEvent {
  rule: ReactionRule;
  x: number;
  y: number;
  timestamp: number;
  // 初めて見た反応か (原子版などの別ルートで見ていれば初めてではない)
  isFirstDiscovery: boolean;
}

// 反応物を探す範囲 (px)。反応物の粒子数が多い反応ほど広く探す (例: 4P + 5O₂ は9粒子)
// 床に横一列に並んだ4粒子 (CaO + 3C など) にも届くよう、1粒子増えるごとに 10px 広げる
const BASE_REACTION_RADIUS = 35;
const MAX_REACTION_RADIUS = 60;
function getReactionRadius(rule: ReactionRule): number {
  const total = rule.reactants.reduce((sum, r) => sum + r.count, 0);
  return Math.min(MAX_REACTION_RADIUS, BASE_REACTION_RADIUS + Math.max(0, total - 3) * 10);
}

// 反応半径は小さな原子どうし (半径10程度) を基準にしている。大きな粒子 (CaO などの化合物) は
// 中心どうしが離れていても表面は触れ合うので、その分だけ半径を広げる
const STANDARD_PAIR_RADIUS = 20;
function sizeAllowance(a: Particle, b: Particle): number {
  return Math.max(0, a.radius + b.radius - STANDARD_PAIR_RADIUS);
}

// 発見した化学反応式 (反応IDごとの実験回数) の保存キー
export const DISCOVERED_REACTIONS_STORAGE_KEY = 'element_lab_discovered_reactions';
// 発見した化合物 (化合物IDごとの生成回数) の保存キー
export const DISCOVERED_COMPOUNDS_STORAGE_KEY = 'element_lab_discovered_compounds';
// 指示薬の色の発見 ('BTB:acid' などごとの回数) の保存キー
export const INDICATOR_RESULTS_STORAGE_KEY = 'element_lab_indicator_results';
// 炎色反応を見た元素 (元素記号ごとの回数) の保存キー。花火工房で使える色もここから決まる
export const FLAME_TESTS_STORAGE_KEY = 'element_lab_flame_tests';
// 炭・鉄の金色の火花を見た元素の保存キー (しだれ柳が使えるようになる)
export const GOLD_SPARKS_STORAGE_KEY = 'element_lab_gold_sparks';

const PH_CLASSES: PhClass[] = ['acid', 'neutral', 'alkaline'];

export class ReactionEngine {
  private world: PhysicsWorld;
  public stats: GameStats;
  public onReactionTriggered?: (event: ReactionEvent) => void;
  public onNewDiscovery?: (id: string, nameJa: string, isCompound: boolean) => void;
  public onContainerShattered?: (container: GlassContainer, rule: ReactionRule) => void;

  private discoveredItems: Set<string> = new Set();
  private nextParticleId: number = 1000;

  constructor(world: PhysicsWorld) {
    this.world = world;
    this.stats = {
      createdCompounds: {},
      triggeredReactions: {},
      spawnedElements: {},
      maxTemperatureReached: 25,
      minTemperatureReached: 25,
      shatteredFlasks: 0,
      indicatorResults: {},
      flameTestsSeen: {},
      goldSparksSeen: {},
      fireworksLaunched: 0,
      maxFireworkColors: 0
    };
    this.loadCounts(DISCOVERED_REACTIONS_STORAGE_KEY, REACTIONS_DATA.map(r => r.id), this.stats.triggeredReactions);
    this.loadCounts(DISCOVERED_COMPOUNDS_STORAGE_KEY, Object.keys(COMPOUNDS_DATA), this.stats.createdCompounds);
    const indicatorKeys = Object.values(COMPOUNDS_DATA)
      .filter(c => c.indicator)
      .flatMap(c => PH_CLASSES.map(cls => `${c.id}:${cls}`));
    this.loadCounts(INDICATOR_RESULTS_STORAGE_KEY, indicatorKeys, this.stats.indicatorResults!);
    const flameElements = Object.keys(ELEMENTS_DATA).filter(sym => ELEMENTS_DATA[sym].flameColor);
    this.loadCounts(FLAME_TESTS_STORAGE_KEY, flameElements, this.stats.flameTestsSeen!);
    this.loadCounts(GOLD_SPARKS_STORAGE_KEY, ['C', 'Fe'], this.stats.goldSparksSeen!);
    // 発見済みの化合物では「新発見」通知を再び出さない
    Object.keys(this.stats.createdCompounds).forEach(id => this.discoveredItems.add(id));
  }

  // 前回までの発見状況 (IDごとの回数) を復元 (未知のIDや不正な値は無視)
  private loadCounts(key: string, validIds: string[], target: Record<string, number>) {
    try {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem(key);
      if (!saved) return;
      const data = JSON.parse(saved) as Record<string, unknown>;
      for (const id of validIds) {
        const count = data[id];
        if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
          target[id] = Math.floor(count);
        }
      }
    } catch {
      // ignore
    }
  }

  private saveCounts(key: string, counts: Record<string, number>) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }

  private registerCreatedCompound(compoundId: string, nameJa: string) {
    this.stats.createdCompounds[compoundId] = (this.stats.createdCompounds[compoundId] || 0) + 1;
    this.saveCounts(DISCOVERED_COMPOUNDS_STORAGE_KEY, this.stats.createdCompounds);
    if (!this.discoveredItems.has(compoundId)) {
      this.discoveredItems.add(compoundId);
      this.onNewDiscovery?.(compoundId, nameJa, true);
    }
  }

  public checkReactions() {
    this.world.buildGrid();
    const particles = this.world.particles;
    const consumed = new Set<string>();

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      if (consumed.has(p1.id) || p1.pinned) continue;

      // 最高/最低到達温度の記録
      if (p1.temperature > this.stats.maxTemperatureReached) {
        this.stats.maxTemperatureReached = Math.round(p1.temperature);
      }
      if (p1.temperature < this.stats.minTemperatureReached) {
        this.stats.minTemperatureReached = Math.round(p1.temperature);
      }

      // 鉄の常温サビ進行処理 (Feが水滴と酸素の両方に接触している間、少しずつ進む)
      // 進行度が100%に達した鉄が4個集まると、反応ルール iron_red_rust で赤サビ (Fe₂O₃) になる
      if (p1.symbolOrId === 'Fe' && p1.temperature < 150 && p1.rustProgress < 1) {
        const neighbors = this.world.getNeighbors(p1, p1.radius + 15);
        const hasWater = neighbors.some(n => n.symbolOrId === 'H2O' && n.state === 'liquid');
        const hasOxygen = neighbors.some(n => n.symbolOrId === 'O' || n.symbolOrId === 'O2');
        if (hasWater && hasOxygen) {
          p1.rustProgress = Math.min(1, p1.rustProgress + 0.005);
        }
      }

      // 近傍の粒子群を取得して反応ルールを評価
      const neighbors = this.world.getNeighbors(p1, MAX_REACTION_RADIUS);
      const group = [p1, ...neighbors.filter(n => !consumed.has(n.id) && !n.pinned)];

      // ルールマッチング
      for (let r = 0; r < REACTIONS_DATA.length; r++) {
        const rule = REACTIONS_DATA[r];
        const radius = getReactionRadius(rule);
        const minRust = rule.condition.minRustProgress;
        const candidates = group.filter(p =>
          (p === p1 || Math.hypot(p.x - p1.x, p.y - p1.y) - sizeAllowance(p, p1) <= radius) &&
          // 溶解熱ルールは、すでに溶解熱を放出した溶質を候補から外す
          !(rule.condition.isDissolution && p.heatOfSolutionReleased) &&
          // サビの反応は、サビが十分に進んだ鉄だけを候補にする
          !(minRust !== undefined && p.symbolOrId === 'Fe' && p.rustProgress < minRust)
        );
        const match = this.tryMatchRule(rule, candidates);

        if (match) {
          // 通電・電気分解ツール専用の反応ルールは近接接触では自然発生させない
          if (rule.condition.requiresElectricity) {
            continue;
          }

          // 近くに別の結びつく相手があるときは待つ (例: 炭素のそばの水素原子は H₂ にならない)
          const waitFor = rule.condition.waitIfNear;
          if (waitFor && match.some(m => this.world.getNeighbors(m, MAX_REACTION_RADIUS).some(
            p => waitFor.includes(p.symbolOrId)
          ))) {
            continue;
          }

          // 条件チェック (温度等)
          const avgTemp = match.reduce((sum, p) => sum + p.temperature, 0) / match.length;
          if (rule.condition.minTemp !== undefined && avgTemp < rule.condition.minTemp) {
            continue;
          }
          if (rule.condition.maxTemp !== undefined && avgTemp > rule.condition.maxTemp) {
            continue;
          }

          // 溶解熱: 物質は消費せず、その場で発熱だけさせる
          if (rule.condition.isDissolution) {
            this.releaseHeatOfSolution(rule, match);
            break;
          }

          // 反応実行
          match.forEach(p => consumed.add(p.id));

          const centerX = match.reduce((sum, p) => sum + p.x, 0) / match.length;
          const centerY = match.reduce((sum, p) => sum + p.y, 0) / match.length;

          // 反応熱の付与
          const productTemp = avgTemp + rule.heatRelease;

          // 反応が起きた容器 (フラスコ内反応の判定)
          const reactionContainer = this.world.containers.find(
            cont => this.world.isPointInsideContainer(cont, centerX, centerY, 8)
          ) ?? null;

          // 生成物の作成
          for (const prod of rule.products) {
            for (let c = 0; c < prod.count; c++) {
              const offsetX = (Math.random() - 0.5) * 15;
              const offsetY = (Math.random() - 0.5) * 15;
              const newP = new Particle(
                `p_${this.nextParticleId++}`,
                prod.type,
                prod.id,
                centerX + offsetX,
                centerY + offsetY,
                productTemp
              );
              // 反応時の穏やかな拡散速度 (気体は急激に暴れないよう上向きの穏やかな初速)
              const isGas = newP.state === 'gas';
              newP.vx = (Math.random() - 0.5) * (isGas ? 1.0 : 1.8);
              newP.vy = isGas ? (-0.4 - Math.random() * 0.6) : ((Math.random() - 0.5) * 1.8);

              // 容器内で反応した場合、生成物が容器外壁の外側に飛び出さないよう初期座標をクランプ
              if (reactionContainer) {
                newP.containerId = reactionContainer.id;
                this.world.clampInsideContainer(reactionContainer, newP);
              }

              this.world.addParticle(newP);

              if (prod.type === 'compound') {
                this.registerCreatedCompound(prod.id, newP.nameJa);
              }
            }
          }

          // エフェクト & サウンド
          if (rule.visualEffect) {
            this.world.addEffect(rule.visualEffect, centerX, centerY, '#F97316', 35);
          }
          this.playReactionSound(rule.soundEffect);
          this.applyIntensityEffects(rule, match, centerX, centerY, reactionContainer);
          if (rule.visualHint === 'cloudy') {
            for (let k = 0; k < 4; k++) {
              this.world.addEffect('smoke', centerX + (Math.random() - 0.5) * 20, centerY + (Math.random() - 0.5) * 10, '#F8FAFC', 22 + k * 5);
            }
          }

          // 記録
          this.recordReaction(rule.id, centerX, centerY);
          break;
        }
      }
    }

    // 消費された粒子の削除
    if (consumed.size > 0) {
      this.world.particles = this.world.particles.filter(p => !consumed.has(p.id));
    }
  }

  private releaseHeatOfSolution(rule: ReactionRule, match: Particle[]) {
    match[0].heatOfSolutionReleased = true;
    for (const p of match) {
      p.temperature += rule.heatRelease;
    }
    const x = match.reduce((sum, p) => sum + p.x, 0) / match.length;
    const y = match.reduce((sum, p) => sum + p.y, 0) / match.length;
    const container = this.world.containers.find(
      cont => this.world.isPointInsideContainer(cont, x, y, 8)
    ) ?? null;
    if (rule.visualEffect) {
      this.world.addEffect(rule.visualEffect, x, y, '#F97316', 35);
    }
    this.playReactionSound(rule.soundEffect);
    this.applyIntensityEffects(rule, match, x, y, container);
    this.recordReaction(rule.id, x, y);
  }

  // 反応の激しさ (爆発・発火・発煙・発熱) に応じた演出。容器内の爆発ではフラスコが破裂する
  private applyIntensityEffects(
    rule: ReactionRule,
    reactants: Particle[],
    x: number,
    y: number,
    container: GlassContainer | null
  ) {
    // 複数区分の反応 (例: 発火＋発煙) は各区分の演出を重ねる
    for (const intensity of rule.intensities ?? []) {
      switch (intensity) {
        case 'explosion': {
          const power = rule.heatRelease / 40;
          const shouldShatter = container !== null &&
            (container.hasCap || rule.heatRelease >= OPEN_FLASK_SHATTER_HEAT);
          if (container && shouldShatter) {
            this.world.shatterContainer(container, x, y, power + 2);
            soundManager.playExplosion(2);
            soundManager.playGlassShatter();
            this.stats.shatteredFlasks = (this.stats.shatteredFlasks || 0) + 1;
            this.onContainerShattered?.(container, rule);
          } else {
            this.world.addEffect('flash', x, y, '#FFFFFF', 28);
            this.world.applyBlast(x, y, 70 + power * 8, power * 0.5, container?.id);
            soundManager.playExplosion(1);
          }
          // 近くの壁: 強度より大きな爆発なら壊れ、少し足りなければひびが入る
          const wallDamage = this.world.damageWalls(x, y, power);
          if (wallDamage.broken > 0) soundManager.playWallCrumble();
          break;
        }
        case 'ignition': {
          // 反応固有の炎色 > 炎色反応をもつ反応物 (Na: 黄, K: 赤紫 など) > 既定の橙色
          let core = '#FDE047';
          let outer = '#F97316';
          if (rule.flameColors) {
            core = rule.flameColors.core;
            outer = rule.flameColors.outer;
          } else {
            for (const p of reactants) {
              const flame = getFlameReactionInfo(p.kind, p.symbolOrId);
              if (flame) {
                core = flame.flameColor;
                outer = flame.flameColorSecondary;
                break;
              }
            }
          }
          this.world.addEffect('flame_plume', x, y - 6, core, 30, outer);
          soundManager.playSpark();
          break;
        }
        case 'smoke':
          for (let k = 0; k < 3; k++) {
            this.world.addEffect('smoke', x + (k - 1) * 12, y - k * 6, '#F1F5F9', 26 + k * 6);
          }
          break;
        case 'heat':
          this.world.addEffect('glow', x, y, '#F97316', 34);
          this.world.addEffect('steam', x, y - 10, '#E0F2FE', 22);
          break;
      }
    }
  }

  private tryMatchRule(rule: ReactionRule, candidates: Particle[]): Particle[] | null {
    const matchedParticles: Particle[] = [];
    const available = [...candidates];

    for (const req of rule.reactants) {
      let foundCount = 0;
      for (let i = available.length - 1; i >= 0; i--) {
        const p = available[i];
        if (p.kind === req.type && p.symbolOrId === req.id) {
          matchedParticles.push(p);
          available.splice(i, 1);
          foundCount++;
          if (foundCount === req.count) break;
        }
      }
      if (foundCount < req.count) {
        return null;
      }
    }

    return matchedParticles;
  }

  private recordReaction(ruleId: string, x: number, y: number) {
    const rule = REACTIONS_DATA.find(r => r.id === ruleId);
    const family = rule?.variantOf ?? ruleId;
    const isFirstDiscovery = !REACTIONS_DATA.some(r =>
      (r.variantOf ?? r.id) === family && (this.stats.triggeredReactions[r.id] || 0) > 0
    );
    this.stats.triggeredReactions[ruleId] = (this.stats.triggeredReactions[ruleId] || 0) + 1;
    this.saveCounts(DISCOVERED_REACTIONS_STORAGE_KEY, this.stats.triggeredReactions);
    if (rule) {
      this.onReactionTriggered?.({
        rule,
        x,
        y,
        timestamp: Date.now(),
        isFirstDiscovery
      });
    }
  }

  private playReactionSound(type: ReactionRule['soundEffect']) {
    switch (type) {
      case 'spark':
      case 'burn':
        soundManager.playSpark();
        break;
      case 'water':
        soundManager.playWater();
        break;
      case 'pop':
        soundManager.playPop();
        break;
      case 'steam':
        soundManager.playSteam();
        break;
      case 'fizz':
        soundManager.playFizz();
        break;
      case 'rust':
        soundManager.playRust();
        break;
    }
  }

  // 通電ツール (PhysicsWorld.applyElectric) で起きた電気分解・オゾン生成を発見として記録する
  public recordElectricResult(
    result: { createdCompounds: string[]; triggeredReactionIds: string[] },
    x: number,
    y: number
  ) {
    for (const compoundId of result.createdCompounds) {
      const comp = COMPOUNDS_DATA[compoundId];
      if (comp) {
        this.registerCreatedCompound(compoundId, comp.nameJa);
      }
    }
    for (const ruleId of result.triggeredReactionIds) {
      this.recordReaction(ruleId, x, y);
    }
  }

  public registerSpawn(kind: 'element' | 'compound' | 'wall', id: string) {
    if (kind === 'element') {
      this.stats.spawnedElements[id] = (this.stats.spawnedElements[id] || 0) + 1;
      if (!this.discoveredItems.has(id)) {
        this.discoveredItems.add(id);
        this.onNewDiscovery?.(id, id, false);
      }
    }
  }

  // 指示薬の色の発見を記録する。初めての組み合わせなら true
  public recordIndicatorResult(compoundId: string, phClass: PhClass): boolean {
    const results = this.stats.indicatorResults!;
    const key = `${compoundId}:${phClass}`;
    const isNew = !results[key];
    results[key] = (results[key] || 0) + 1;
    this.saveCounts(INDICATOR_RESULTS_STORAGE_KEY, results);
    return isNew;
  }

  // 炎色反応を見た元素を記録する (花火の色剤なら花火工房で使えるようになる)。初めてなら true
  public recordFlameTest(symbol: string): boolean {
    if (!getFlameReactionInfo('element', symbol)) return false;
    const seen = this.stats.flameTestsSeen!;
    const isNew = !seen[symbol];
    // 加熱中は毎フレームのように呼ばれるので、保存は初回だけ
    seen[symbol] = (seen[symbol] || 0) + 1;
    if (isNew) this.saveCounts(FLAME_TESTS_STORAGE_KEY, seen);
    return isNew;
  }

  // 炭・鉄の金色の火花を見たことを記録する。初めてなら true
  public recordGoldSparks(symbol: string): boolean {
    const seen = this.stats.goldSparksSeen!;
    const isNew = !seen[symbol];
    seen[symbol] = (seen[symbol] || 0) + 1;
    if (isNew) this.saveCounts(GOLD_SPARKS_STORAGE_KEY, seen);
    return isNew;
  }

  public recordFireworkLaunch(design: FireworkDesign) {
    this.stats.fireworksLaunched = (this.stats.fireworksLaunched || 0) + 1;
    this.stats.maxFireworkColors = Math.max(this.stats.maxFireworkColors || 0, design.symbols.length);
  }
}
