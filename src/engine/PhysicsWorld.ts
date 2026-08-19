import { Particle } from './Particle';

export interface VisualEffectInstance {
  type: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud' | 'flash';
  x: number;
  y: number;
  radius: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GlassContainer {
  id: string;
  type: 'erlenmeyer' | 'beaker' | 'testtube';
  nameJa: string;
  cx: number;
  cy: number; // 底面の中央
  temperature: number; // 容器の温度 (°C)
  segments: LineSegment[]; // 衝突判定用の線分リスト
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class PhysicsWorld {
  public particles: Particle[] = [];
  public containers: GlassContainer[] = [];
  public effects: VisualEffectInstance[] = [];
  public width: number = 800;
  public height: number = 600;
  
  public gravity: number = 0.18;
  public airMolarMass: number = 28.8; // 空気の平均分子量 (g/mol)
  public ambientTemp: number = 25; // 室温 25°C
  
  // 空間分割グリッド (Spatial Grid)
  private cellSize: number = 50;
  private grid: Map<string, Particle[]> = new Map();
  private nextContainerId: number = 1;

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
    this.containers = [];
    this.effects = [];
    this.grid.clear();
  }

  // ガラス製実験器具 (三角フラスコ・ビーカー・試験管) の配置
  public spawnFlask(cx: number, cy: number, flaskType: 'erlenmeyer' | 'beaker' | 'testtube' = 'erlenmeyer'): GlassContainer {
    const clampedX = Math.max(60, Math.min(this.width - 60, cx));
    const clampedY = Math.max(120, Math.min(this.height - 10, cy));

    const segments: LineSegment[] = [];
    let nameJa = '三角フラスコ';
    let minX = clampedX - 55;
    let maxX = clampedX + 55;
    let minY = clampedY - 115;
    let maxY = clampedY;

    if (flaskType === 'erlenmeyer') {
      nameJa = '三角フラスコ (300ml)';
      const bHalf = 50;
      const nHalf = 15;
      const neckTop = clampedY - 110;
      const neckBottom = clampedY - 75;
      const base = clampedY;

      minX = clampedX - bHalf - 5;
      maxX = clampedX + bHalf + 5;
      minY = neckTop - 5;
      maxY = base + 5;

      // 1. 底面
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX + bHalf, y2: base });
      // 2. 左胴体斜め
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX - nHalf, y2: neckBottom });
      // 3. 右胴体斜め
      segments.push({ x1: clampedX + bHalf, y1: base, x2: clampedX + nHalf, y2: neckBottom });
      // 4. 左首部
      segments.push({ x1: clampedX - nHalf, y1: neckBottom, x2: clampedX - nHalf, y2: neckTop });
      // 5. 右首部
      segments.push({ x1: clampedX + nHalf, y1: neckBottom, x2: clampedX + nHalf, y2: neckTop });
      // 6. 口の返し
      segments.push({ x1: clampedX - nHalf, y1: neckTop, x2: clampedX - nHalf - 4, y2: neckTop });
      segments.push({ x1: clampedX + nHalf, y1: neckTop, x2: clampedX + nHalf + 4, y2: neckTop });
    } else if (flaskType === 'beaker') {
      nameJa = 'ビーカー (250ml)';
      const bHalf = 44;
      const top = clampedY - 90;
      const base = clampedY;

      minX = clampedX - bHalf - 10;
      maxX = clampedX + bHalf + 8;
      minY = top - 5;
      maxY = base + 5;

      // 1. 底面
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX + bHalf, y2: base });
      // 2. 左垂直壁
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX - bHalf, y2: top });
      // 3. 右垂直壁
      segments.push({ x1: clampedX + bHalf, y1: base, x2: clampedX + bHalf, y2: top });
      // 4. 注ぎ口
      segments.push({ x1: clampedX - bHalf, y1: top, x2: clampedX - bHalf - 8, y2: top - 4 });
      segments.push({ x1: clampedX + bHalf, y1: top, x2: clampedX + bHalf + 4, y2: top });
    } else if (flaskType === 'testtube') {
      nameJa = '丸底試験管 (50ml)';
      const tHalf = 16;
      const top = clampedY - 105;
      const roundCenterY = clampedY - tHalf;

      minX = clampedX - tHalf - 5;
      maxX = clampedX + tHalf + 5;
      minY = top - 5;
      maxY = clampedY + 5;

      // 左右垂直壁
      segments.push({ x1: clampedX - tHalf, y1: top, x2: clampedX - tHalf, y2: roundCenterY });
      segments.push({ x1: clampedX + tHalf, y1: top, x2: clampedX + tHalf, y2: roundCenterY });
      // 口の返し
      segments.push({ x1: clampedX - tHalf, y1: top, x2: clampedX - tHalf - 4, y2: top });
      segments.push({ x1: clampedX + tHalf, y1: top, x2: clampedX + tHalf + 4, y2: top });
      // 丸底
      const arcSteps = 8;
      for (let i = 0; i < arcSteps; i++) {
        const a1 = (i / arcSteps) * Math.PI;
        const a2 = ((i + 1) / arcSteps) * Math.PI;
        segments.push({
          x1: clampedX - Math.cos(a1) * tHalf,
          y1: roundCenterY + Math.sin(a1) * tHalf,
          x2: clampedX - Math.cos(a2) * tHalf,
          y2: roundCenterY + Math.sin(a2) * tHalf
        });
      }
    }

    const container: GlassContainer = {
      id: `flask_${this.nextContainerId++}`,
      type: flaskType,
      nameJa,
      cx: clampedX,
      cy: clampedY,
      temperature: this.ambientTemp,
      segments,
      bounds: { minX, maxX, minY, maxY }
    };

    this.containers.push(container);
    return container;
  }

  public addEffect(type: VisualEffectInstance['type'], x: number, y: number, color: string = '#F97316', radius: number = 30) {
    this.effects.push({
      type,
      x,
      y,
      radius: type === 'flash' ? radius * 1.4 : radius,
      color,
      lifetime: 0,
      maxLifetime: type === 'explosion' ? 30 : (type === 'flash' ? 28 : 25)
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

    // 3. 粒子とガラス器具 (フラスコ・ビーカー・試験管) の線分衝突判定
    for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
      const container = this.containers[cIdx];
      // コンテナ温度の室温緩和
      container.temperature += (this.ambientTemp - container.temperature) * 0.0004;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        // AABB バウンディングボックスによる高速除外
        if (
          p.x + p.radius < container.bounds.minX ||
          p.x - p.radius > container.bounds.maxX ||
          p.y + p.radius < container.bounds.minY ||
          p.y - p.radius > container.bounds.maxY
        ) {
          continue;
        }

        // 各線分セグメントとの最短距離判定
        for (let sIdx = 0; sIdx < container.segments.length; sIdx++) {
          const seg = container.segments[sIdx];
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 0.001) continue;

          // 点Pから線分ABへの射影パラメータ t (0 <= t <= 1)
          const t = Math.max(0, Math.min(1, ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq));
          const nearX = seg.x1 + t * dx;
          const nearY = seg.y1 + t * dy;

          const rx = p.x - nearX;
          const ry = p.y - nearY;
          const distSq = rx * rx + ry * ry;
          const wallThickness = 2.5;
          const minDist = p.radius + wallThickness;

          if (distSq < minDist * minDist && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = rx / dist;
            const ny = ry / dist;

            // 1. 位置補正 (線分の法線方向へ押し出し)
            p.x += nx * overlap;
            p.y += ny * overlap;

            // 2. 速度反射 (弾性衝突)
            const vn = p.vx * nx + p.vy * ny;
            if (vn < 0) {
              const restitution = p.state === 'gas' ? 0.75 : (p.state === 'liquid' ? 0.3 : 0.45);
              p.vx -= (1 + restitution) * vn * nx;
              p.vy -= (1 + restitution) * vn * ny;

              // 壁面との摩擦減衰
              p.vx *= 0.95;
              p.vy *= 0.95;
            }

            // 3. フラスコとの熱伝導
            const tempDiff = container.temperature - p.temperature;
            p.temperature += tempDiff * 0.04;
          }
        }
      }
    }

    // 4. エフェクトのアニメーション更新
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.lifetime++;
      if (eff.lifetime >= eff.maxLifetime) {
        this.effects.splice(i, 1);
      }
    }
  }

  // バーナー加熱ツール (粒子およびフラスコを加熱)
  public applyHeat(x: number, y: number, radius: number, tempIncrease: number = 30) {
    // 粒子の加熱
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        const falloff = 1 - (dist / (radius + p.radius));
        p.temperature = Math.min(1800, p.temperature + tempIncrease * falloff);
        p.updateStateByTemperature();
        p.vy -= 0.3 * falloff;
      }
    }

    // ガラス器具 (フラスコ) の加熱
    for (let i = 0; i < this.containers.length; i++) {
      const c = this.containers[i];
      const dist = Math.hypot(c.cx - x, c.cy - y);
      if (dist < radius + 50) {
        const falloff = 1 - (dist / (radius + 50));
        c.temperature = Math.min(1200, c.temperature + tempIncrease * falloff * 0.8);
      }
    }
  }

  // 冷却スプレーツール (粒子およびフラスコを冷却)
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

    for (let i = 0; i < this.containers.length; i++) {
      const c = this.containers[i];
      const dist = Math.hypot(c.cx - x, c.cy - y);
      if (dist < radius + 50) {
        const falloff = 1 - (dist / (radius + 50));
        c.temperature = Math.max(-273, c.temperature - tempDecrease * falloff * 0.8);
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

  // 消しゴムツール (粒子およびフラスコを消去)
  public eraseAt(x: number, y: number, radius: number) {
    // 粒子の消去
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        this.particles.splice(i, 1);
      }
    }

    // ガラス器具の消去
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      // セグメントまたは中心近傍の消去判定
      let hit = Math.hypot(c.cx - x, c.cy - y) < radius + 30;
      if (!hit) {
        for (const seg of c.segments) {
          const midX = (seg.x1 + seg.x2) / 2;
          const midY = (seg.y1 + seg.y2) / 2;
          if (Math.hypot(midX - x, midY - y) < radius + 15) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        this.containers.splice(i, 1);
      }
    }
  }

  // ホバーされたガラス器具の取得 (インスペクター用)
  public getHoveredContainer(x: number, y: number): GlassContainer | null {
    for (const c of this.containers) {
      if (
        x >= c.bounds.minX - 10 &&
        x <= c.bounds.maxX + 10 &&
        y >= c.bounds.minY - 10 &&
        y <= c.bounds.maxY + 10
      ) {
        return c;
      }
    }
    return null;
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
      } else if (eff.type === 'flash') {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(0.3, `rgba(254, 249, 195, ${alpha * 0.9})`);
        grad.addColorStop(0.7, `rgba(224, 242, 254, ${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
        ctx.lineWidth = 3;
        for (let a = 0; a < 8; a++) {
          const angle = (a / 8) * Math.PI * 2 + progress * 0.5;
          const rayLength = r * (1.2 + 0.8 * progress);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // 2. ガラス器具 (フラスコ・ビーカー・試験管) の美麗な線・面描画
    this.drawContainers(ctx);

    // 3. 粒子描画 (ガラス容器の内側/前景に描画)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }

  // ガラス器具の描画処理
  private drawContainers(ctx: CanvasRenderingContext2D) {
    for (const c of this.containers) {
      ctx.save();

      // 1. 加熱時の底部サーマルグロー
      if (c.temperature > 50) {
        const heatIntensity = Math.min(1, (c.temperature - 50) / 450);
        const glowGrad = ctx.createRadialGradient(c.cx, c.cy, 5, c.cx, c.cy, 60);
        if (c.temperature >= 400) {
          glowGrad.addColorStop(0, `rgba(254, 240, 138, ${heatIntensity * 0.8})`);
          glowGrad.addColorStop(0.4, `rgba(249, 115, 22, ${heatIntensity * 0.6})`);
          glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          glowGrad.addColorStop(0, `rgba(249, 115, 22, ${heatIntensity * 0.5})`);
          glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        }
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. 内部の透明ガラスフィル (透過感)
      ctx.beginPath();
      if (c.type === 'erlenmeyer') {
        const base = c.cy;
        const neckBottom = c.cy - 75;
        const neckTop = c.cy - 110;
        ctx.moveTo(c.cx - 50, base);
        ctx.lineTo(c.cx - 15, neckBottom);
        ctx.lineTo(c.cx - 15, neckTop);
        ctx.lineTo(c.cx + 15, neckTop);
        ctx.lineTo(c.cx + 15, neckBottom);
        ctx.lineTo(c.cx + 50, base);
        ctx.closePath();
      } else if (c.type === 'beaker') {
        const base = c.cy;
        const top = c.cy - 90;
        ctx.moveTo(c.cx - 44, base);
        ctx.lineTo(c.cx - 44, top);
        ctx.lineTo(c.cx + 44, top);
        ctx.lineTo(c.cx + 44, base);
        ctx.closePath();
      } else if (c.type === 'testtube') {
        const top = c.cy - 105;
        const roundCenterY = c.cy - 16;
        ctx.moveTo(c.cx - 16, top);
        ctx.lineTo(c.cx - 16, roundCenterY);
        ctx.arc(c.cx, roundCenterY, 16, Math.PI, 0, true);
        ctx.lineTo(c.cx + 16, top);
        ctx.closePath();
      }

      const fillGrad = ctx.createLinearGradient(c.cx - 40, c.bounds.minY, c.cx + 40, c.bounds.maxY);
      fillGrad.addColorStop(0, 'rgba(224, 242, 254, 0.04)');
      fillGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.08)');
      fillGrad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // 3. ガラス外壁のなめらかな輪郭線 (Outer Glass Line)
      ctx.strokeStyle = c.temperature >= 400 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (const seg of c.segments) {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      }
      ctx.stroke();

      // 4. 内側のガラス肉厚ハイライト線 (Inner Glass Sheen)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (const seg of c.segments) {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      }
      ctx.stroke();

      // 5. ガラス表面の光沢反射ハイライト (Gloss Highlight)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (c.type === 'erlenmeyer') {
        // 左側の美しいハイライトライン
        ctx.moveTo(c.cx - 12, c.cy - 105);
        ctx.lineTo(c.cx - 12, c.cy - 78);
        ctx.lineTo(c.cx - 44, c.cy - 6);
      } else if (c.type === 'beaker') {
        ctx.moveTo(c.cx - 40, c.cy - 85);
        ctx.lineTo(c.cx - 40, c.cy - 8);
      } else if (c.type === 'testtube') {
        ctx.moveTo(c.cx - 13, c.cy - 100);
        ctx.lineTo(c.cx - 13, c.cy - 20);
      }
      ctx.stroke();

      // 6. 実験用目盛り (Graduation Marks)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1;

      if (c.type === 'erlenmeyer') {
        const marks = [
          { y: c.cy - 18, label: '300' },
          { y: c.cy - 36, label: '200' },
          { y: c.cy - 54, label: '100' }
        ];
        for (const m of marks) {
          ctx.beginPath();
          ctx.moveTo(c.cx + 2, m.y);
          ctx.lineTo(c.cx + 14, m.y);
          ctx.stroke();
          ctx.fillText(m.label, c.cx + 17, m.y);
        }
      } else if (c.type === 'beaker') {
        const marks = [
          { y: c.cy - 22, label: '50' },
          { y: c.cy - 44, label: '100' },
          { y: c.cy - 66, label: '200' }
        ];
        for (const m of marks) {
          ctx.beginPath();
          ctx.moveTo(c.cx + 8, m.y);
          ctx.lineTo(c.cx + 20, m.y);
          ctx.stroke();
          ctx.fillText(m.label, c.cx + 23, m.y);
        }
      }

      ctx.restore();
    }
  }
}
