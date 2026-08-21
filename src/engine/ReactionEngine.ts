import { REACTIONS_DATA, ReactionRule } from '../data/reactions';
import { Particle } from './Particle';
import { PhysicsWorld } from './PhysicsWorld';
import { soundManager } from './AudioEffects';
import { GameStats } from '../data/quests';

export interface ReactionEvent {
  rule: ReactionRule;
  x: number;
  y: number;
  timestamp: number;
}

export class ReactionEngine {
  private world: PhysicsWorld;
  public stats: GameStats;
  public onReactionTriggered?: (event: ReactionEvent) => void;
  public onNewDiscovery?: (id: string, nameJa: string, isCompound: boolean) => void;

  private discoveredItems: Set<string> = new Set();
  private nextParticleId: number = 1000;

  constructor(world: PhysicsWorld) {
    this.world = world;
    this.stats = {
      createdCompounds: {},
      triggeredReactions: {},
      spawnedElements: {},
      maxTemperatureReached: 25,
      minTemperatureReached: 25
    };
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

      // 鉄の常温サビ進行処理 (Feが水滴または酸素と接触している場合)
      if (p1.symbolOrId === 'Fe' && p1.temperature < 150) {
        const neighbors = this.world.getNeighbors(p1, p1.radius + 15);
        const hasWater = neighbors.some(n => n.symbolOrId === 'H2O' && n.state === 'liquid');
        const hasOxygen = neighbors.some(n => n.symbolOrId === 'O' || n.symbolOrId === 'O2');
        
        if (hasWater && hasOxygen) {
          p1.rustProgress += 0.005; // 徐々にサビが進行
          if (p1.rustProgress >= 1.0) {
            // 赤サビ(Fe2O3)に変化
            const oParticle = neighbors.find(n => (n.symbolOrId === 'O' || n.symbolOrId === 'O2') && !consumed.has(n.id));
            if (oParticle) {
              consumed.add(p1.id);
              consumed.add(oParticle.id);
              this.transformToCompound(p1.x, p1.y, 'Fe2O3', p1.temperature);
              this.recordReaction('iron_red_rust', p1.x, p1.y);
              continue;
            }
          }
        }
      }

      // 近傍の粒子群を取得して反応ルールを評価
      const neighbors = this.world.getNeighbors(p1, 35);
      const group = [p1, ...neighbors.filter(n => !consumed.has(n.id) && !n.pinned)];

      // ルールマッチング
      for (let r = 0; r < REACTIONS_DATA.length; r++) {
        const rule = REACTIONS_DATA[r];
        const match = this.tryMatchRule(rule, group);

        if (match) {
          // 通電・電気分解ツール専用の反応ルールは近接接触では自然発生させない
          if (rule.condition.requiresElectricity) {
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

          // 反応実行
          match.forEach(p => consumed.add(p.id));

          const centerX = match.reduce((sum, p) => sum + p.x, 0) / match.length;
          const centerY = match.reduce((sum, p) => sum + p.y, 0) / match.length;

          // 反応熱の付与
          const productTemp = avgTemp + rule.heatRelease;

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
              this.world.addParticle(newP);

              if (prod.type === 'compound') {
                this.stats.createdCompounds[prod.id] = (this.stats.createdCompounds[prod.id] || 0) + 1;
                if (!this.discoveredItems.has(prod.id)) {
                  this.discoveredItems.add(prod.id);
                  this.onNewDiscovery?.(prod.id, newP.nameJa, true);
                }
              }
            }
          }

          // エフェクト & サウンド
          if (rule.visualEffect) {
            this.world.addEffect(rule.visualEffect, centerX, centerY, '#F97316', 35);
          }
          this.playReactionSound(rule.soundEffect);

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

  private transformToCompound(x: number, y: number, compoundId: string, temp: number) {
    const newP = new Particle(`p_${this.nextParticleId++}`, 'compound', compoundId, x, y, temp);
    this.world.addParticle(newP);
    this.stats.createdCompounds[compoundId] = (this.stats.createdCompounds[compoundId] || 0) + 1;
    if (!this.discoveredItems.has(compoundId)) {
      this.discoveredItems.add(compoundId);
      this.onNewDiscovery?.(compoundId, newP.nameJa, true);
    }
  }

  private recordReaction(ruleId: string, x: number, y: number) {
    this.stats.triggeredReactions[ruleId] = (this.stats.triggeredReactions[ruleId] || 0) + 1;
    const rule = REACTIONS_DATA.find(r => r.id === ruleId);
    if (rule) {
      this.onReactionTriggered?.({
        rule,
        x,
        y,
        timestamp: Date.now()
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

  public registerSpawn(kind: 'element' | 'compound' | 'wall', id: string) {
    if (kind === 'element') {
      this.stats.spawnedElements[id] = (this.stats.spawnedElements[id] || 0) + 1;
      if (!this.discoveredItems.has(id)) {
        this.discoveredItems.add(id);
        this.onNewDiscovery?.(id, id, false);
      }
    }
  }
}
