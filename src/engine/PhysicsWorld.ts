import { Particle } from './Particle';
import { ELEMENTS_DATA, getFlameReactionInfo } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';

export interface VisualEffectInstance {
  type: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud' | 'flash' | 'flame_plume' | 'electric_arc';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  color: string;
  secondaryColor?: string;
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

export interface ExperimentChamber {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  cornerRadius: number;
  
  // 有毒ガス検知・状態
  toxicLevel: number; // 0.0 (クリーン) 〜 1.0 (高濃度有毒ガス)
  toxicParticleCount: number;
  totalGasCount: number;
  dominantToxicCompound: string | null;
  dominantToxicNameJa: string | null;
  dominantToxicColor: string;
  dominantSecondaryColor: string;
  
  // 排気・換気状態
  isExhausting: boolean;
  exhaustAnimationTime: number;
  exhaustButtonBounds: { x: number; y: number; w: number; h: number };
  
  age: number;
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

  // 密閉式 透明実験チャンバー (Sealed Transparent Experiment Chamber)
  public chamber: ExperimentChamber = {
    minX: 20,
    maxX: 780,
    minY: 46,
    maxY: 576,
    width: 760,
    height: 530,
    cornerRadius: 12,
    toxicLevel: 0,
    toxicParticleCount: 0,
    totalGasCount: 0,
    dominantToxicCompound: null,
    dominantToxicNameJa: null,
    dominantToxicColor: 'rgba(234, 179, 8, 0.45)',
    dominantSecondaryColor: 'rgba(163, 230, 53, 0.7)',
    isExhausting: false,
    exhaustAnimationTime: 0,
    exhaustButtonBounds: { x: 0, y: 0, w: 0, h: 0 },
    age: 0
  };
  
  // 空間分割グリッド (Spatial Grid)
  private cellSize: number = 50;
  private grid: Map<string, Particle[]> = new Map();
  private nextContainerId: number = 1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.updateChamberBounds();
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.updateChamberBounds();
  }

  public updateChamberBounds() {
    const padX = Math.max(16, Math.min(32, Math.round(this.width * 0.035)));
    const padTop = Math.max(42, Math.min(52, Math.round(this.height * 0.075)));
    const padBottom = Math.max(18, Math.min(26, Math.round(this.height * 0.04)));

    const minX = padX;
    const maxX = Math.max(minX + 220, this.width - padX);
    const minY = padTop;
    const maxY = Math.max(minY + 220, this.height - padBottom);

    this.chamber.minX = minX;
    this.chamber.maxX = maxX;
    this.chamber.minY = minY;
    this.chamber.maxY = maxY;
    this.chamber.width = maxX - minX;
    this.chamber.height = maxY - minY;
  }

  public isPointInExhaustButton(x: number, y: number): boolean {
    const b = this.chamber.exhaustButtonBounds;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  // チャンバー換気・有毒ガス排気
  public ventilateChamber(): { purgedCount: number } {
    let purgedCount = 0;
    this.chamber.isExhausting = true;
    this.chamber.exhaustAnimationTime = 1;

    // 有毒ガス粒子および浮遊気体を吸引して排気
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.state === 'gas' && !p.pinned) {
        if (p.isToxic || Math.random() < 0.85) {
          this.addEffect('steam', p.x, p.y, '#E0F2FE', 18);
          this.particles.splice(i, 1);
          purgedCount++;
        }
      }
    }

    const midX = (this.chamber.minX + this.chamber.maxX) / 2;
    this.addEffect('steam', midX, this.chamber.minY + 12, '#38BDF8', 32);

    return { purgedCount };
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
    const clampMinX = this.chamber.minX + 60;
    const clampMaxX = this.chamber.maxX - 60;
    const clampMinY = this.chamber.minY + 120;
    const clampMaxY = this.chamber.maxY - 10;

    const clampedX = Math.max(clampMinX, Math.min(clampMaxX, cx));
    const clampedY = Math.max(clampMinY, Math.min(clampMaxY, cy));

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

  public addEffect(
    type: VisualEffectInstance['type'],
    x: number,
    y: number,
    color: string = '#F97316',
    radius: number = 30,
    secondaryColor?: string,
    targetX?: number,
    targetY?: number
  ) {
    this.effects.push({
      type,
      x,
      y,
      targetX,
      targetY,
      radius: type === 'flash' ? radius * 1.4 : (type === 'flame_plume' ? radius * 1.2 : radius),
      color,
      secondaryColor,
      lifetime: 0,
      maxLifetime: type === 'explosion' ? 30 : (type === 'flash' ? 28 : (type === 'flame_plume' ? 22 : (type === 'electric_arc' ? 10 : 25)))
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

      // 境界（透明実験ケースの壁）との衝突判定
      const minX = this.chamber.minX + p.radius;
      const maxX = this.chamber.maxX - p.radius;
      const minY = this.chamber.minY + p.radius;
      const maxY = this.chamber.maxY - p.radius;

      if (p.x < minX) {
        p.x = minX;
        p.vx = -p.vx * 0.6;
      } else if (p.x > maxX) {
        p.x = maxX;
        p.vx = -p.vx * 0.6;
      }

      if (p.y < minY) {
        p.y = minY;
        p.vy = -p.vy * 0.6;
      } else if (p.y > maxY) {
        p.y = maxY;
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

    // 5. チャンバー内有毒ガス検知・状態更新
    this.chamber.age++;
    let toxicCount = 0;
    let gasCount = 0;
    const toxicMap: Record<string, number> = {};

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.pinned) continue;
      if (p.state === 'gas') {
        gasCount++;
        if (p.isToxic) {
          toxicCount++;
          toxicMap[p.symbolOrId] = (toxicMap[p.symbolOrId] || 0) + 1;
        }
      }
    }

    this.chamber.toxicParticleCount = toxicCount;
    this.chamber.totalGasCount = gasCount;

    let maxCount = 0;
    let dominantId: string | null = null;
    for (const [id, count] of Object.entries(toxicMap)) {
      if (count > maxCount) {
        maxCount = count;
        dominantId = id;
      }
    }
    this.chamber.dominantToxicCompound = dominantId;

    if (dominantId) {
      const comp = COMPOUNDS_DATA[dominantId];
      this.chamber.dominantToxicNameJa = comp ? comp.nameJa : dominantId;

      if (dominantId === 'NO2') {
        // 赤褐色 (NO2)
        this.chamber.dominantToxicColor = 'rgba(180, 83, 9, 0.45)';
        this.chamber.dominantSecondaryColor = 'rgba(120, 53, 15, 0.7)';
      } else if (dominantId === 'Cl2' || dominantId === 'HCl') {
        // 刺激性黄緑色 (Cl2, HCl)
        this.chamber.dominantToxicColor = 'rgba(163, 230, 53, 0.45)';
        this.chamber.dominantSecondaryColor = 'rgba(234, 179, 8, 0.7)';
      } else if (dominantId === 'SO2' || dominantId === 'SO3' || dominantId === 'H2S') {
        // 硫黄系有毒ガス（黄色〜アンバー）
        this.chamber.dominantToxicColor = 'rgba(250, 204, 21, 0.45)';
        this.chamber.dominantSecondaryColor = 'rgba(217, 119, 6, 0.7)';
      } else {
        // CO (一酸化炭素) など（有毒アンバー・オレンジ）
        this.chamber.dominantToxicColor = 'rgba(249, 115, 22, 0.45)';
        this.chamber.dominantSecondaryColor = 'rgba(239, 68, 68, 0.7)';
      }
    } else {
      this.chamber.dominantToxicNameJa = null;
    }

    // 目標有毒濃度 (0.0 〜 1.0)
    const targetToxicLevel = toxicCount === 0 ? 0 : Math.min(1.0, 0.28 + toxicCount * 0.16);
    this.chamber.toxicLevel += (targetToxicLevel - this.chamber.toxicLevel) * 0.08;
    if (this.chamber.toxicLevel < 0.001) this.chamber.toxicLevel = 0;

    // 排気アニメーション更新
    if (this.chamber.isExhausting) {
      this.chamber.exhaustAnimationTime++;
      if (this.chamber.exhaustAnimationTime > 50) {
        this.chamber.isExhausting = false;
        this.chamber.exhaustAnimationTime = 0;
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

        // 炎色反応の発生判定 (>180°C)
        if (p.temperature > 180 && Math.random() < 0.4) {
          const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);
          if (flameInfo) {
            this.addEffect(
              'flame_plume',
              p.x + (Math.random() - 0.5) * 8,
              p.y - 6,
              flameInfo.flameColor,
              26,
              flameInfo.flameColorSecondary
            );
          }
        }
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

  // 電気伝導性・導電体かどうかの判定 (金属・炭素・電解質水溶液など)
  public isConductor(p: Particle): boolean {
    if (p.kind === 'element') {
      if (p.symbolOrId === 'C') return true; // 炭素 (黒鉛)
      const el = ELEMENTS_DATA[p.symbolOrId];
      if (!el) return false;
      const conductorCategories = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition-metal', 'lanthanide', 'actinide'];
      return conductorCategories.includes(el.category);
    } else if (p.kind === 'compound') {
      const electrolytes = ['NaCl', 'CuCl2', 'HCl', 'NaOH', 'H2SO4', 'CaCl2', 'CuSO4', 'H2O', 'FeCl2'];
      return electrolytes.includes(p.symbolOrId);
    }
    return false;
  }

  // 通電・電気分解ツール (Electrolysis & Conduction)
  public applyElectric(x: number, y: number, radius: number = 40): {
    decomposedCount: number;
    conductedCount: number;
    createdCompounds: string[];
  } {
    let decomposedCount = 0;
    let conductedCount = 0;
    const createdCompounds: string[] = [];

    // 中心からの放電アークエフェクト
    for (let a = 0; a < 4; a++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * radius * 1.2;
      this.addEffect(
        'electric_arc',
        x,
        y,
        '#38BDF8',
        20,
        '#818CF8',
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist
      );
    }

    const hitParticles: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        hitParticles.push(p);
      }
    }

    for (const p of hitParticles) {
      if (this.isConductor(p)) {
        // ジュール熱 (通電による温度上昇)
        p.temperature += 18 + Math.random() * 20;
        p.updateStateByTemperature();
        conductedCount++;

        // 近傍の導電粒子への放電アーク連鎖
        const neighbors = this.getNeighbors(p, 60);
        for (const n of neighbors) {
          if (n !== p && this.isConductor(n)) {
            n.temperature += 12;
            n.updateStateByTemperature();
            conductedCount++;
            if (Math.random() < 0.6) {
              this.addEffect('electric_arc', p.x, p.y, '#38BDF8', 16, '#C084FC', n.x, n.y);
            }
          }
        }
      }

      // --- 電気分解 (Electrolysis) 反応 ---
      if (p.kind === 'compound') {
        // ① 水の電気分解: 2H2O -> 2H2 + O2 (気体発生・体積比 2:1)
        if (p.symbolOrId === 'H2O' && Math.random() < 0.75) {
          decomposedCount++;
          if (Math.random() < 0.67) {
            p.symbolOrId = 'H2';
            p.applyData();
            p.state = 'gas';
            p.vy = -2 - Math.random() * 2;
            createdCompounds.push('H2');
          } else {
            p.symbolOrId = 'O2';
            p.applyData();
            p.state = 'gas';
            p.vy = -1 - Math.random() * 1.5;
            createdCompounds.push('O2');
          }
          this.addEffect('sparkles', p.x, p.y, '#38BDF8', 18);
        }
        // ② 塩化銅の電気分解: CuCl2 -> Cu + Cl2 (赤褐色銅の析出 & 黄緑色塩素ガス)
        else if (p.symbolOrId === 'CuCl2' && Math.random() < 0.8) {
          decomposedCount++;
          if (Math.random() < 0.5) {
            p.kind = 'element';
            p.symbolOrId = 'Cu';
            p.applyData();
            p.state = 'solid';
            p.vy = 0.6;
          } else {
            p.symbolOrId = 'Cl2';
            p.applyData();
            p.state = 'gas';
            p.vy = -0.7 - Math.random() * 1;
            createdCompounds.push('Cl2');
          }
          this.addEffect('sparkles', p.x, p.y, '#2DD4BF', 22);
        }
        // ③ 食塩の電気分解: NaCl -> 塩素ガス発生
        else if (p.symbolOrId === 'NaCl' && Math.random() < 0.7) {
          decomposedCount++;
          p.symbolOrId = 'Cl2';
          p.applyData();
          p.state = 'gas';
          p.vy = -0.8;
          createdCompounds.push('Cl2');
          this.addEffect('sparkles', p.x, p.y, '#FDE047', 18);
        }
      }
    }

    return { decomposedCount, conductedCount, createdCompounds };
  }

  // 点火・スパークツール
  public applySpark(x: number, y: number, radius: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        p.temperature = Math.max(p.temperature, 600);
        p.updateStateByTemperature();

        // 点火時の即時炎色反応
        const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);
        if (flameInfo) {
          this.addEffect(
            'flame_plume',
            p.x,
            p.y - 8,
            flameInfo.flameColor,
            32,
            flameInfo.flameColorSecondary
          );
        }
      }
    }
  }

  // 消しゴムツール (粒子およびフラスコを消去)
  public eraseAt(x: number, y: number, radius: number = 36): number {
    let erasedCount = 0;
    // 粒子の消去
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        this.particles.splice(i, 1);
        erasedCount++;
      }
    }

    // ガラス器具の消去
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      let hit = Math.hypot(c.cx - x, c.cy - y) < radius + 35;
      if (!hit) {
        for (const seg of c.segments) {
          const midX = (seg.x1 + seg.x2) / 2;
          const midY = (seg.y1 + seg.y2) / 2;
          if (Math.hypot(midX - x, midY - y) < radius + 20) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        this.containers.splice(i, 1);
        erasedCount++;
      }
    }
    return erasedCount;
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
    // 1. 密閉式 透明実験チャンバーの背面・内部描画（有毒ガス色変化・目盛り・底面台座）
    this.drawChamberBackground(ctx);

    // 2. エフェクト背景層
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
      } else if (eff.type === 'flame_plume') {
        // 美しく揺らめく炎色反応の炎（内炎・外炎グラデーション＋スパーク）
        const flameHeight = r * (1.1 + 0.5 * Math.sin(eff.lifetime * 0.45));
        const flameWidth = r * (0.6 - 0.25 * progress);
        const shiftX = Math.sin(eff.lifetime * 0.55) * 3;
        const shiftY = -progress * 22;

        // 1. 周囲の光彩（ラジアルグロー）
        const glowGrad = ctx.createRadialGradient(shiftX, shiftY, 0, shiftX, shiftY, r * 1.6);
        glowGrad.addColorStop(0, eff.color);
        glowGrad.addColorStop(0.4, eff.secondaryColor || eff.color);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(shiftX, shiftY, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // 2. 炎の外炎（Outer Flame Plume）
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = eff.secondaryColor || eff.color;
        ctx.beginPath();
        ctx.moveTo(shiftX - flameWidth, shiftY + 4);
        ctx.quadraticCurveTo(shiftX - flameWidth * 1.1, shiftY - flameHeight * 0.5, shiftX, shiftY - flameHeight);
        ctx.quadraticCurveTo(shiftX + flameWidth * 1.1, shiftY - flameHeight * 0.5, shiftX + flameWidth, shiftY + 4);
        ctx.closePath();
        ctx.fill();

        // 3. 炎の中心・内炎（Bright Core Flame）
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = eff.color;
        ctx.beginPath();
        ctx.moveTo(shiftX - flameWidth * 0.5, shiftY + 2);
        ctx.quadraticCurveTo(shiftX - flameWidth * 0.6, shiftY - flameHeight * 0.4, shiftX, shiftY - flameHeight * 0.7);
        ctx.quadraticCurveTo(shiftX + flameWidth * 0.6, shiftY - flameHeight * 0.4, shiftX + flameWidth * 0.5, shiftY + 2);
        ctx.closePath();
        ctx.fill();

        // 4. 上昇する微小スパーク
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(shiftX + Math.sin(eff.lifetime * 0.8) * 5, shiftY - flameHeight * 0.75 - progress * 10, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.type === 'electric_arc') {
        const x1 = 0;
        const y1 = 0;
        const x2 = (eff.targetX !== undefined ? eff.targetX - eff.x : Math.cos(eff.lifetime * 3) * eff.radius);
        const y2 = (eff.targetY !== undefined ? eff.targetY - eff.y : Math.sin(eff.lifetime * 3) * eff.radius);

        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = Math.max(3, Math.floor(dist / 10));

        // 1. 放電グロー
        ctx.strokeStyle = eff.secondaryColor || '#818CF8';
        ctx.lineWidth = 4;
        ctx.globalAlpha = alpha * 0.45;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const nx = -(y2 - y1) / (dist || 1);
          const ny = (x2 - x1) / (dist || 1);
          const jitter = Math.sin(s * 17 + eff.lifetime * 8) * 6;
          ctx.lineTo(x1 + (x2 - x1) * t + nx * jitter, y1 + (y2 - y1) * t + ny * jitter);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 2. 中心放電コア（鋭い稲妻ライン）
        ctx.strokeStyle = eff.color || '#38BDF8';
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha * 0.95;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const nx = -(y2 - y1) / (dist || 1);
          const ny = (x2 - x1) / (dist || 1);
          const jitter = Math.sin(s * 17 + eff.lifetime * 8) * 6;
          ctx.lineTo(x1 + (x2 - x1) * t + nx * jitter, y1 + (y2 - y1) * t + ny * jitter);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 3. 端点の放電スパーク
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x2, y2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. ガラス器具 (フラスコ・ビーカー・試験管) の美麗な線・面描画
    this.drawContainers(ctx);

    // 4. 粒子描画 (ガラス容器の内側/前景に描画)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    // 5. 密閉実験チャンバーの前面・フレーム・ヘッダー・排気ファン描画
    this.drawChamberForeground(ctx);
  }

  // 密閉式 透明実験チャンバーの背面・内部描画
  private drawChamberBackground(ctx: CanvasRenderingContext2D) {
    const ch = this.chamber;
    const r = ch.cornerRadius;

    ctx.save();

    // 1. ケース外側の実験台背景（ソフトなダークラボグリッド）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < this.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. チャンバーの丸角パス定義
    const roundRectPath = (x: number, y: number, w: number, h: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    };

    // 3. チャンバー背後のドロップシャドウ & ベース
    ctx.shadowColor = ch.toxicLevel > 0.1 ? ch.dominantToxicColor : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = ch.toxicLevel > 0.1 ? 20 + ch.toxicLevel * 15 : 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#0F172A';
    roundRectPath(ch.minX, ch.minY, ch.width, ch.height, r);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. 実験台底面（耐薬品性・ステンレス台座）
    const floorH = 14;
    const floorY = ch.maxY - floorH;
    const floorGrad = ctx.createLinearGradient(ch.minX, floorY, ch.minX, ch.maxY);
    floorGrad.addColorStop(0, '#1E293B');
    floorGrad.addColorStop(0.3, '#334155');
    floorGrad.addColorStop(0.7, '#1E293B');
    floorGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.rect(ch.minX, floorY, ch.width, floorH);
    ctx.fill();

    // 底面グリッドライン
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let gx = ch.minX + 30; gx < ch.maxX; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, floorY);
      ctx.lineTo(gx, ch.maxY);
      ctx.stroke();
    }

    // 5. 内部空間のクリッピング（有毒ガスや透明ガラス色をケース内部のみに描画）
    ctx.save();
    roundRectPath(ch.minX, ch.minY, ch.width, ch.height, r);
    ctx.clip();

    // 6. 通常時（クリーン）の透明アクリル・ガラス質感グラデーション
    const cleanGrad = ctx.createLinearGradient(ch.minX, ch.minY, ch.minX, ch.maxY);
    cleanGrad.addColorStop(0, 'rgba(224, 242, 254, 0.03)');
    cleanGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.05)');
    cleanGrad.addColorStop(0.7, 'rgba(30, 41, 59, 0.5)');
    cleanGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
    ctx.fillStyle = cleanGrad;
    ctx.fill();

    // 7. 【重要】有毒ガス発生時の動的カラー変化 & 充満エフェクト
    if (ch.toxicLevel > 0.01) {
      const toxicAlpha = Math.min(0.7, ch.toxicLevel * 0.65);
      
      // 有毒ガス充満グラデーション（底〜天井）
      const toxicGrad = ctx.createLinearGradient(ch.minX, ch.maxY, ch.minX, ch.minY);
      toxicGrad.addColorStop(0, ch.dominantToxicColor.replace(/[\d\.]+\)$/, `${toxicAlpha * 0.9})`));
      toxicGrad.addColorStop(0.6, ch.dominantSecondaryColor.replace(/[\d\.]+\)$/, `${toxicAlpha * 0.6})`));
      toxicGrad.addColorStop(1, ch.dominantToxicColor.replace(/[\d\.]+\)$/, `${toxicAlpha * 0.35})`));

      ctx.fillStyle = toxicGrad;
      ctx.fillRect(ch.minX, ch.minY, ch.width, ch.height);

      // 動的スワリング有毒ミスト（ゆらめく毒ガス雲）
      const waveCount = 4;
      for (let w = 0; w < waveCount; w++) {
        ctx.fillStyle = ch.dominantToxicColor.replace(/[\d\.]+\)$/, `${toxicAlpha * (0.15 + w * 0.08)})`);
        ctx.beginPath();
        const baseY = ch.minY + (ch.height / (waveCount + 1)) * (w + 1);
        ctx.moveTo(ch.minX, ch.maxY);
        ctx.lineTo(ch.minX, baseY);
        for (let x = ch.minX; x <= ch.maxX; x += 20) {
          const waveY = baseY + Math.sin((x * 0.015) + (ch.age * 0.04) + w * 1.8) * (10 + w * 4);
          ctx.lineTo(x, waveY);
        }
        ctx.lineTo(ch.maxX, ch.maxY);
        ctx.closePath();
        ctx.fill();
      }

      // 上部＆下部のハザード注意ストライプ (Caution Stripes)
      const stripeH = 6;
      ctx.save();
      const stripeGrad = ctx.createLinearGradient(ch.minX, 0, ch.maxX, 0);
      for (let s = 0; s < 20; s++) {
        stripeGrad.addColorStop(s / 20, s % 2 === 0 ? 'rgba(234, 179, 8, 0.4)' : 'rgba(0, 0, 0, 0.4)');
      }
      ctx.fillStyle = stripeGrad;
      ctx.fillRect(ch.minX, ch.minY, ch.width, stripeH);
      ctx.fillRect(ch.minX, ch.maxY - floorH - stripeH, ch.width, stripeH);
      ctx.restore();
    }

    // 8. 左右の高さ目盛り線 (Graduation Ticks)
    ctx.strokeStyle = ch.toxicLevel > 0.3 ? 'rgba(234, 179, 8, 0.5)' : 'rgba(186, 230, 253, 0.25)';
    ctx.fillStyle = ch.toxicLevel > 0.3 ? 'rgba(254, 240, 138, 0.7)' : 'rgba(186, 230, 253, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const tickSpacing = 50;
    let tickIndex = 1;
    for (let ty = ch.maxY - floorH - tickSpacing; ty > ch.minY + 30; ty -= tickSpacing) {
      const isMajor = tickIndex % 2 === 0;
      const tickLen = isMajor ? 12 : 6;
      
      // 左側目盛り
      ctx.beginPath();
      ctx.moveTo(ch.minX + 4, ty);
      ctx.lineTo(ch.minX + 4 + tickLen, ty);
      ctx.stroke();
      if (isMajor) {
        ctx.fillText(`${tickIndex * 50}mm`, ch.minX + 18, ty);
      }

      // 右側目盛り
      ctx.beginPath();
      ctx.moveTo(ch.maxX - 4, ty);
      ctx.lineTo(ch.maxX - 4 - tickLen, ty);
      ctx.stroke();

      tickIndex++;
    }

    ctx.restore(); // クリップ解除
    ctx.restore();
  }

  // 密閉式 透明実験チャンバーの前面・フレーム・ヘッダー描画
  private drawChamberForeground(ctx: CanvasRenderingContext2D) {
    const ch = this.chamber;
    const r = ch.cornerRadius;

    ctx.save();

    const roundRectPath = (x: number, y: number, w: number, h: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    };

    // 1. 透明ガラスの斜め光沢反射 (Gloss Sheen Strip)
    ctx.save();
    roundRectPath(ch.minX, ch.minY, ch.width, ch.height, r);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(ch.minX + ch.width * 0.15, ch.minY);
    ctx.lineTo(ch.minX + ch.width * 0.35, ch.minY);
    ctx.lineTo(ch.minX + ch.width * 0.05, ch.maxY);
    ctx.lineTo(ch.minX - ch.width * 0.15, ch.maxY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fill();

    // 2. 内側のガラスエッジ・ハイライト線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ch.minX + r, ch.minY + 1.5);
    ctx.lineTo(ch.maxX - r, ch.minY + 1.5);
    ctx.moveTo(ch.minX + 1.5, ch.minY + r);
    ctx.lineTo(ch.minX + 1.5, ch.maxY - r);
    ctx.stroke();

    ctx.restore();

    // 3. 外枠フレーム (アクリルケース・金属フレーム)
    ctx.lineWidth = 3;
    if (ch.toxicLevel > 0.1) {
      // 有毒ガス時の点滅・発光ボーダー
      const pulse = Math.sin(ch.age * 0.15) * 0.3 + 0.7;
      ctx.strokeStyle = ch.dominantToxicColor.replace(/[\d\.]+\)$/, `${pulse})`);
      ctx.shadowColor = ch.dominantSecondaryColor;
      ctx.shadowBlur = 12 * pulse;
    } else {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.shadowBlur = 0;
    }
    roundRectPath(ch.minX, ch.minY, ch.width, ch.height, r);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. 四隅の金属固定金具 (Corner Metal Brackets)
    const bracketSize = 16;
    ctx.fillStyle = ch.toxicLevel > 0.3 ? '#CA8A04' : '#475569';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;

    const corners = [
      { x: ch.minX, y: ch.minY, dx: 1, dy: 1 },
      { x: ch.maxX, y: ch.minY, dx: -1, dy: 1 },
      { x: ch.minX, y: ch.maxY, dx: 1, dy: -1 },
      { x: ch.maxX, y: ch.maxY, dx: -1, dy: -1 }
    ];

    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * bracketSize);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * bracketSize, c.y);
      ctx.lineTo(c.x + c.dx * bracketSize, c.y + c.dy * 4);
      ctx.lineTo(c.x + c.dx * 4, c.y + c.dy * 4);
      ctx.lineTo(c.x + c.dx * 4, c.y + c.dy * bracketSize);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ボルト点
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 7, c.y + c.dy * 7, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ch.toxicLevel > 0.3 ? '#CA8A04' : '#475569';
    }

    // 5. チャンバー上部ヘッダー（ステータス表示 & 排気ファン）
    const headerH = 26;
    const headerY = ch.minY - headerH - 4;
    
    // ヘッダー背景バー
    ctx.fillStyle = ch.toxicLevel > 0.2 ? 'rgba(69, 26, 3, 0.85)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = ch.toxicLevel > 0.2 ? '#F59E0B' : 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    roundRectPath(ch.minX + 4, headerY, ch.width - 8, headerH, 6);
    ctx.fill();
    ctx.stroke();

    // チャンバー名ラベル (左側)
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText('🔬 密閉実験ケース (Sealed Chamber)', ch.minX + 14, headerY + headerH / 2);

    // 中央：排気グリル (Exhaust Fan Grill)
    const ventW = 54;
    const ventX = ch.minX + ch.width / 2 - ventW / 2;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(ventX, headerY + 5, ventW, headerH - 10);
    ctx.strokeStyle = ch.isExhausting ? '#38BDF8' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    for (let vx = ventX + 6; vx < ventX + ventW; vx += 7) {
      ctx.beginPath();
      ctx.moveTo(vx, headerY + 7);
      ctx.lineTo(vx, headerY + headerH - 7);
      ctx.stroke();
    }

    // 排気中の吸引エフェクト
    if (ch.isExhausting) {
      ctx.fillStyle = '#38BDF8';
      for (let s = 0; s < 3; s++) {
        const streamY = ch.minY + 2 + Math.sin(ch.age * 0.3 + s) * 8;
        ctx.beginPath();
        ctx.arc(ventX + 12 + s * 15, streamY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 右側：ステータスバッジ
    let statusText = '🟢 正常 (CLEAN)';
    let statusBg = 'rgba(16, 185, 129, 0.25)';
    let statusBorder = '#10B981';
    let statusColor = '#6EE7B7';

    if (ch.toxicLevel > 0.05) {
      const toxicName = ch.dominantToxicNameJa || ch.dominantToxicCompound || '有毒物質';
      statusText = `⚠️ 有毒ガス検知: ${toxicName} 充満中!`;
      statusBg = 'rgba(239, 68, 68, 0.3)';
      statusBorder = '#EF4444';
      statusColor = '#FCA5A5';
    }

    ctx.font = 'bold 10px sans-serif';
    const statusTextWidth = ctx.measureText(statusText).width;
    const statusBadgeW = statusTextWidth + 16;
    const exhaustBtnW = 60;
    const totalRightW = statusBadgeW + exhaustBtnW + 8;
    const statusX = ch.maxX - totalRightW - 10;

    // ステータスバッジ描画
    ctx.fillStyle = statusBg;
    ctx.strokeStyle = statusBorder;
    ctx.lineWidth = 1;
    roundRectPath(statusX, headerY + 4, statusBadgeW, headerH - 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    ctx.fillText(statusText, statusX + statusBadgeW / 2, headerY + headerH / 2);

    // 「💨 換気」ボタン (クリック可能エリアを保存)
    const btnX = statusX + statusBadgeW + 6;
    const btnY = headerY + 4;
    const btnH = headerH - 8;
    ch.exhaustButtonBounds = { x: btnX, y: btnY, w: exhaustBtnW, h: btnH };

    ctx.fillStyle = ch.isExhausting ? 'rgba(56, 189, 248, 0.4)' : 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = ch.isExhausting ? '#38BDF8' : '#64748B';
    ctx.lineWidth = 1;
    roundRectPath(btnX, btnY, exhaustBtnW, btnH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = ch.isExhausting ? '#38BDF8' : '#F1F5F9';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ch.isExhausting ? '⚡ 排気中...' : '💨 換気', btnX + exhaustBtnW / 2, btnY + btnH / 2);

    ctx.restore();
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
