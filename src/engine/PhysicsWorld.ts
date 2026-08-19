import { Particle } from './Particle';

export interface VisualEffectInstance {
  type: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud';
  x: number;
  y: number;
  radius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export class PhysicsWorld {
  public particles: Particle[] = [];
  public effects: VisualEffectInstance[] = [];
  public width: number = 800;
  public height: number = 600;
  
  public gravity: number = 0.18;
  public airMolarMass: number = 28.8; // 空気の平均分子量 (g/mol)
  public ambientTemp: number = 25; // 室温 25°C
  
  // 空間分割グリッド (Spatial Grid)
  private cellSize: number = 50;
  private grid: Map<string, Particle[]> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public addParticle(p: Particle) {
    this.particles.push(p);
  }

  public removeParticle(p: Particle) {
    const idx = this.particles.indexOf(p);
    if (idx !== -1) {
      this.particles.splice(idx, 1);
    }
  }

  public clear() {
    this.particles = [];
    this.effects = [];
    this.grid.clear();
  }

  public addEffect(type: VisualEffectInstance['type'], x: number, y: number, color: string = '#F97316', radius: number = 30) {
    this.effects.push({
      type,
      x,
      y,
      radius,
      color,
      lifetime: 0,
      maxLifetime: type === 'explosion' ? 30 : 25
    });
  }

  public buildGrid() {
    this.grid.clear();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cellX = Math.floor(p.x / this.cellSize);
      const cellY = Math.floor(p.y / this.cellSize);
      const key = `${cellX},${cellY}`;
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(p);
    }
  }

  public getNeighbors(p: Particle, radius: number): Particle[] {
    if (this.grid.size === 0 && this.particles.length > 0) {
      this.buildGrid();
    }
    const minCellX = Math.floor((p.x - radius) / this.cellSize);
    const maxCellX = Math.floor((p.x + radius) / this.cellSize);
    const minCellY = Math.floor((p.y - radius) / this.cellSize);
    const maxCellY = Math.floor((p.y + radius) / this.cellSize);
    
    const neighbors: Particle[] = [];
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (let k = 0; k < cell.length; k++) {
            const other = cell[k];
            if (other !== p) {
              const dx = other.x - p.x;
              const dy = other.y - p.y;
              if (dx * dx + dy * dy <= radius * radius) {
                neighbors.push(other);
              }
            }
          }
        }
      }
    }
    return neighbors;
  }

  public update() {
    this.buildGrid();

    // 1. 各粒子の物理挙動・浮力・温度計算
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age++;

      if (p.pinned) continue;

      // 室温への緩やかな熱平衡
      p.temperature += (this.ambientTemp - p.temperature) * 0.0008;
      p.updateStateByTemperature();

      // 気体の場合: 浮力 (空気の分子量 28.8 との比較)
      if (p.state === 'gas') {
        // 空気の分子量より軽ければ上向きの浮力
        const buoyancy = (this.airMolarMass - p.molarMass) * 0.015;
        // 熱気球効果 (高温な気体はさらに膨張して上昇)
        const thermalLift = Math.max(0, (p.temperature - this.ambientTemp) * 0.001);
        
        p.vy -= (buoyancy + thermalLift);
        p.vy += this.gravity * 0.2; // わずかな基本重力

        // 気体のブラウン運動・熱拡散
        const brownian = Math.min(1.2, Math.sqrt(Math.max(1, p.temperature + 273)) * 0.04);
        p.vx += (Math.random() - 0.5) * brownian;
        p.vy += (Math.random() - 0.5) * brownian;

        // 空気抵抗
        p.vx *= 0.94;
        p.vy *= 0.94;
      } else if (p.state === 'liquid') {
        // 液体の挙動: 重力 + 横方向への流動拡散
        p.vy += this.gravity * 0.8;
        p.vx += (Math.random() - 0.5) * 0.15;
        p.vx *= 0.92;
        p.vy *= 0.96;
      } else {
        // 固体の挙動: 通常重力 + 摩擦
        p.vy += this.gravity;
        p.vx *= 0.95;
        p.vy *= 0.98;
      }

      // 速度制限
      const maxSpeed = 12;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      // 位置更新
      p.x += p.vx;
      p.y += p.vy;

      // 境界（壁）との衝突判定
      if (p.x - p.radius < 0) {
        p.x = p.radius;
        p.vx = -p.vx * 0.6;
      } else if (p.x + p.radius > this.width) {
        p.x = this.width - p.radius;
        p.vx = -p.vx * 0.6;
      }

      if (p.y - p.radius < 0) {
        p.y = p.radius;
        p.vy = -p.vy * 0.6;
      } else if (p.y + p.radius > this.height) {
        p.y = this.height - p.radius;
        p.vy = -p.vy * 0.4;
        if (p.state === 'liquid') {
          // 液体は底で横に広がる
          p.vx += (Math.random() - 0.5) * 0.5;
        }
      }
    }

    // 2. 粒子間の衝突 & 熱伝導 (グリッド探索で高速化)
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      const cellX = Math.floor(p1.x / this.cellSize);
      const cellY = Math.floor(p1.y / this.cellSize);

      for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
        for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
          const key = `${cx},${cy}`;
          const cell = this.grid.get(key);
          if (!cell) continue;

          for (let j = 0; j < cell.length; j++) {
            const p2 = cell[j];
            if (p1.id >= p2.id) continue; // 重複チェック防止

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;
            const minDist = p1.radius + p2.radius;

            if (distSq < minDist * minDist && distSq > 0.001) {
              const dist = Math.sqrt(distSq);
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;

              // 位置押し出し補正
              if (!p1.pinned && !p2.pinned) {
                p1.x -= nx * overlap * 0.5;
                p1.y -= ny * overlap * 0.5;
                p2.x += nx * overlap * 0.5;
                p2.y += ny * overlap * 0.5;
              } else if (!p1.pinned) {
                p1.x -= nx * overlap;
                p1.y -= ny * overlap;
              } else if (!p2.pinned) {
                p2.x += nx * overlap;
                p2.y += ny * overlap;
              }

              // 弾性衝突応答
              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const p = 2 * (nx * kx + ny * ky) / (p1.molarMass + p2.molarMass);

              const restitution = (p1.state === 'gas' || p2.state === 'gas') ? 0.9 : 0.4;

              if (!p1.pinned) {
                p1.vx -= p * p2.molarMass * nx * restitution;
                p1.vy -= p * p2.molarMass * ny * restitution;
              }
              if (!p2.pinned) {
                p2.vx += p * p1.molarMass * nx * restitution;
                p2.vy += p * p1.molarMass * ny * restitution;
              }

              // 熱伝導
              const tempDiff = p2.temperature - p1.temperature;
              const heatTransfer = tempDiff * 0.08;
              p1.temperature += heatTransfer;
              p2.temperature -= heatTransfer;
            }
          }
        }
      }
    }

    // 3. エフェクトのアニメーション更新
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.lifetime++;
      if (eff.lifetime >= eff.maxLifetime) {
        this.effects.splice(i, 1);
      }
    }
  }

  // バーナー加熱ツール
  public applyHeat(x: number, y: number, radius: number, tempIncrease: number = 30) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        const falloff = 1 - (dist / (radius + p.radius));
        p.temperature = Math.min(1800, p.temperature + tempIncrease * falloff);
        p.updateStateByTemperature();
        // わずかに上向きの熱対流
        p.vy -= 0.3 * falloff;
      }
    }
  }

  // 冷却スプレーツール
  public applyCool(x: number, y: number, radius: number, tempDecrease: number = 30) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        const falloff = 1 - (dist / (radius + p.radius));
        p.temperature = Math.max(-273, p.temperature - tempDecrease * falloff);
        p.updateStateByTemperature();
      }
    }
  }

  // 点火・スパークツール
  public applySpark(x: number, y: number, radius: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        p.temperature = Math.max(p.temperature, 600);
        p.updateStateByTemperature();
      }
    }
  }

  // 消しゴムツール
  public eraseAt(x: number, y: number, radius: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        this.particles.splice(i, 1);
      }
    }
  }

  // 描画メソッド
  public draw(ctx: CanvasRenderingContext2D) {
    // 1. エフェクト背景層
    for (let i = 0; i < this.effects.length; i++) {
      const eff = this.effects[i];
      const progress = eff.lifetime / eff.maxLifetime;
      const alpha = 1 - progress;
      const r = eff.radius * (1 + progress * 0.8);

      ctx.save();
      ctx.translate(eff.x, eff.y);

      if (eff.type === 'explosion') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
        grad.addColorStop(0.4, `rgba(249, 115, 22, ${alpha * 0.8})`);
        grad.addColorStop(0.8, `rgba(239, 68, 68, ${alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.type === 'sparkles') {
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = 2;
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2 + progress * 2;
          const dist = r * (0.4 + 0.6 * progress);
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * (dist - 4), Math.sin(angle) * (dist - 4));
          ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
          ctx.stroke();
        }
      } else if (eff.type === 'toxic_cloud') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, `rgba(234, 179, 8, ${alpha * 0.7})`);
        grad.addColorStop(0.7, `rgba(163, 230, 53, ${alpha * 0.3})`);
        grad.addColorStop(1, 'rgba(163, 230, 53, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.type === 'steam') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, `rgba(224, 242, 254, ${alpha * 0.8})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. 粒子描画
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }
}
