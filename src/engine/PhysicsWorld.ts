import { Particle } from './Particle';
import { ELEMENTS_DATA, getFlameReactionInfo, getElementName } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, COMPOUND_PH, PhClass, classifyPh, getIndicatorColor } from '../data/compounds';
import { FireworksShow, getFireworkColorInfo } from './Fireworks';
import { getWallType, wallImpact, WallType, WallTypeId, WALL_BLOCK, WALL_CRACK_RATIO } from '../data/walls';
import { t, getLanguage } from '../i18n';

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

// 破裂したガラス容器の破片 (見た目のみ・粒子とは衝突しない)
export interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  points: { x: number; y: number }[]; // 破片中心からの相対頂点 (不規則な三角形)
  lifetime: number;
  maxLifetime: number;
  color?: string; // 壁のかけらの色 (指定がなければガラス片)
  edgeColor?: string;
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
  vx: number; // 水平速度
  vy: number; // 垂直速度
  tareMass: number; // 容器自体の風袋質量 (g)
  isGrounded: boolean; // 床または天秤皿に着地しているか
  supportedByBalanceId: string | null; // 乗っている天秤のID
  supportedByPanSide: 'left' | 'right' | null; // 乗っている天秤の皿 ('left' | 'right')
  temperature: number; // 容器の温度 (°C)
  segments: LineSegment[]; // 衝突判定用の線分リスト
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  hasCap: boolean; // 蓋 (栓) が装着されているか
  capBounds: { minX: number; maxX: number; minY: number; maxY: number }; // 蓋の操作・判定領域
}

export interface BalancePanComposition {
  symbolOrId: string;
  displayName: string;
  nameJa: string;
  nameEn: string;
  count: number;
  totalMolarMass: number;
}

export interface BalancePan {
  cx: number;
  cy: number;
  width: number;
  height: number;
  particles: Particle[];
  totalMass: number;
  composition: BalancePanComposition[];
}

export interface LabBalance {
  id: string;
  nameJa: string;
  nameEn: string;
  cx: number;
  cy: number;
  armLength: number;     // 支点から皿支点までの距離 (px)
  pillarHeight: number;  // 支柱高さ (px)
  angle: number;         // 現在の傾き角 (ラジアン)
  targetAngle: number;   // 目標傾き角 (ラジアン)
  angleVelocity: number; // 角速度
  isLocked: boolean;     // 水平固定ロック
  vy: number;            // 落下速度 (フラスコと同じく重力で床まで落ちる)
  isGrounded: boolean;   // 床に着いているか

  leftPan: BalancePan;
  rightPan: BalancePan;

  segments: LineSegment[];
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

// 花火の色ラベル (例: 「Sr ストロンチウム ＝ 深紅色」)
function fireworkLabelText(symbol: string): string {
  const lang = getLanguage();
  const el = ELEMENTS_DATA[symbol];
  const info = getFireworkColorInfo(symbol);
  const name = el ? getElementName(el, lang) : symbol;
  const colorName = info ? (lang === 'en' ? info.nameEn : info.nameJa) : '';
  return `${symbol} ${name} = ${colorName}`;
}

// 水素原子と結びつく相手の原子と、結びつく水素の数
const HYDROGEN_PARTNERS: Record<string, number> = { C: 4, N: 3, O: 2, Cl: 1 };
// 水素原子が相手の原子に引き寄せられる距離 (px)
const HYDROGEN_ATTRACT_RADIUS = 55;
// バーナーで上げられる最高温度 (°C)。容器も同じ温度まで上がる (1500℃以上が必要な反応を容器の中でもできるように)
const MAX_HEAT_TEMP = 1800;
// 手で置ける元素・化合物の粒子の上限。多すぎるとスマホやタブレットで動きが重くなる
export const MAX_CHEMICAL_PARTICLES = 600;

// 電気を通す元素の分類 (金属)
const METAL_CATEGORIES = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition-metal', 'lanthanide', 'actinide'];
// 電解質: 水に溶けたり融けたりするとイオンに分かれて電気を通す物質
export const ELECTROLYTES = [
  'NaCl', 'CuCl2', 'HCl', 'NaOH', 'H2SO4', 'CaCl2', 'CuSO4', 'FeCl2',
  'KCl', 'KOH', 'LiCl', 'HNO3', 'H3PO4', 'NaHCO3', 'Na2CO3', 'AgNO3', 'ZnCl2'
];
// 水の電気分解で、電流を流しやすくするために水に溶かす物質 (中学の実験では水酸化ナトリウム)
export const WATER_ELECTROLYSIS_AIDS = ['NaOH', 'KOH', 'H2SO4', 'Na2CO3'];
// 電解質が水に溶けているとみなす距離 (px)
const ELECTROLYTE_WATER_RADIUS = 40;

export type Conductivity =
  | 'metal' // 金属 (自由電子)
  | 'graphite' // 黒鉛 (自由電子)
  | 'electrolyte' // 水に溶けた・融けた電解質 (イオンが動ける)
  | 'electrolyte_dry' // 固体や気体のままの電解質 (イオンが動けず、電気を通さない)
  | 'ionic_water' // 電解質が溶けている水
  | 'pure_water' // 純水 (ほとんど電気を通さない)
  | 'insulator';
const CONDUCTING: Conductivity[] = ['metal', 'graphite', 'electrolyte', 'ionic_water'];

// 通電で電解質 (水溶液・塩) が温まる上限 (°C) と、金属に比べた温まり方の割合
const ELECTROLYTE_JOULE_MAX_TEMP = 60;
const ELECTROLYTE_JOULE_RATIO = 0.05;
// 粒子1個とガラス容器が熱をやりとりするとき、容器の温度が動く割合 (容器は粒子より熱を多くためる)
const GLASS_HEAT_SHARE = 0.25;
// 蓋をした容器の中の気体: 浮力・重力の割合と、混ざり合うためのブラウン運動の強さ
const SEALED_GAS_LIFT_SCALE = 0.1;
const SEALED_GAS_BROWNIAN = 0.6;

// 上皿天秤の横幅の半分 (支点から皿の外側のふちまで, px)
const BALANCE_HALF_WIDTH = 140;

// ガラス器具の横幅の半分の目安 (px)。置くときの重なり判定に使う
// 器具が占める範囲 (配置できるかの重なり判定用)。横は 5px ずつ重なっても許す
interface PlacementBox { minX: number; maxX: number; minY: number; maxY: number }
// 上皿天秤の高さ (台座の底から皿のふちまで, px)
const BALANCE_HEIGHT = 135;
function flaskHeight(t: 'erlenmeyer' | 'beaker' | 'testtube'): number {
  if (t === 'erlenmeyer') return 110;
  if (t === 'beaker') return 90;
  return 105;
}
function flaskBox(t: 'erlenmeyer' | 'beaker' | 'testtube', cx: number, bottom: number): PlacementBox {
  const half = flaskHalfWidth(t) - 5;
  return { minX: cx - half, maxX: cx + half, minY: bottom - flaskHeight(t), maxY: bottom };
}
function balanceBox(cx: number, bottom: number): PlacementBox {
  const half = BALANCE_HALF_WIDTH - 5;
  return { minX: cx - half, maxX: cx + half, minY: bottom - BALANCE_HEIGHT, maxY: bottom };
}
function boxesOverlap(a: PlacementBox, b: PlacementBox): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

// 壁の下側をクリックしても壁の上に乗せる余裕 (px)
const WALL_SNAP_MARGIN = 20;
// 上皿天秤の台座の横幅の半分 (px)
const BALANCE_BASE_HALF_WIDTH = 70;

function flaskHalfWidth(t: 'erlenmeyer' | 'beaker' | 'testtube'): number {
  if (t === 'erlenmeyer') return 48;
  if (t === 'beaker') return 42;
  return 18;
}

// 金色の火花を散らす元素と温度 (°C)
const GOLD_SPARK_ELEMENTS = ['C', 'Fe'];
const GOLD_SPARK_TEMP = 300;

// 指示薬の色を更新する間隔 (フレーム) と、容器の外で液性を調べる範囲 (px)
const INDICATOR_UPDATE_INTERVAL = 6;
const INDICATOR_RADIUS = 45;

// 周りの物質から液性 (pH) を求める。酸の強さとアルカリの強さを差し引くので中和も表せる。
// 水は数えない (水で薄めても色は変わらない)。指示薬の色を決めるための目安で、濃度から求める本当の pH ではない
// (pH の数値は画面に出さない。数値を見せるときは濃度と対数で計算し直すこと)
export function computeLocalPh(surroundings: Particle[]): number {
  let acidity = 0;
  let alkalinity = 0;
  for (const o of surroundings) {
    if (o.kind !== 'compound') continue;
    const ph = COMPOUND_PH[o.symbolOrId];
    if (ph === undefined) continue;
    if (ph < 7) acidity += 7 - ph;
    else alkalinity += ph - 7;
  }
  return Math.max(0, Math.min(14, 7 + alkalinity - acidity));
}

export class PhysicsWorld {
  public particles: Particle[] = [];
  public containers: GlassContainer[] = [];
  public balances: LabBalance[] = [];
  public effects: VisualEffectInstance[] = [];
  public glassShards: GlassShard[] = [];
  public fireworks: FireworksShow = new FireworksShow();

  // 指示薬の液性が変わった時 (BTB液が黄色になった等)
  public onIndicatorChange?: (p: Particle, phClass: PhClass, isInitial: boolean) => void;
  // 炎色反応を示す元素を熱して炎色が出た時
  public onFlameTest?: (symbol: string) => void;
  // 炭 (C) や鉄 (Fe) が高温で燃えて金色の火花を散らした時 (しだれ柳の金色の尾の材料)
  public onGoldSparks?: (symbol: string) => void;
  private indicatorTick: number = 0;

  // 爆発時の画面揺れ (残りフレーム数と最大振幅px)
  private shakeTime: number = 0;
  private shakeIntensity: number = 0;
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
  private nextBalanceId: number = 1;
  private nextElectrolysisId: number = 1;
  private nextWallId: number = 1;

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

    // 有毒ガス粒子および浮遊気体を吸引して排気 (密閉フラスコ内の粒子は保護)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.state === 'gas' && !p.pinned) {
        let isProtected = false;
        if (p.containerId) {
          const c = this.containers.find(cont => cont.id === p.containerId);
          if (c && c.hasCap) isProtected = true;
        } else {
          for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
            const c = this.containers[cIdx];
            if (c.hasCap && this.isPointInsideContainer(c, p.x, p.y)) {
              isProtected = true;
              break;
            }
          }
        }
        if (isProtected) continue;

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

  // 元素・化合物の粒子の数 (壁やガラスは数えない)
  public countChemicalParticles(): number {
    let n = 0;
    for (const p of this.particles) if (p.kind === 'element' || p.kind === 'compound') n++;
    return n;
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
    this.balances = [];
    this.effects = [];
    this.glassShards = [];
    this.fireworks.clear();
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.grid.clear();
  }

  // ガラス器具の配置可否判定 (重ねて置くことを防止)
  public canSpawnFlask(
    cx: number,
    cy: number,
    flaskType: 'erlenmeyer' | 'beaker' | 'testtube' = 'erlenmeyer'
  ): { allowed: boolean; reason?: 'overlap_container' | 'overlap_balance' | 'pan_occupied' | 'overlap_wall'; targetX: number; targetY: number } {
    const clampMinX = this.chamber.minX + 50;
    const clampMaxX = this.chamber.maxX - 50;
    const clampMinY = this.chamber.minY + 60;
    const clampMaxY = this.chamber.maxY;

    let targetX = Math.max(clampMinX, Math.min(clampMaxX, cx));
    let targetY = Math.max(clampMinY, Math.min(clampMaxY, cy));

    let supportedByBalanceId: string | null = null;
    let supportedByPanSide: 'left' | 'right' | null = null;

    // 天秤の皿へのスナップチェック (皿の真上ならどの高さでも皿に乗せる。落ちて皿に着地するのと同じ)
    for (const b of this.balances) {
      if (Math.abs(targetX - b.leftPan.cx) <= (b.leftPan.width / 2 + 5) && targetY <= b.leftPan.cy + 35) {
        targetX = b.leftPan.cx;
        targetY = b.leftPan.cy;
        supportedByBalanceId = b.id;
        supportedByPanSide = 'left';
        break;
      }
      if (Math.abs(targetX - b.rightPan.cx) <= (b.rightPan.width / 2 + 5) && targetY <= b.rightPan.cy + 35) {
        targetX = b.rightPan.cx;
        targetY = b.rightPan.cy;
        supportedByBalanceId = b.id;
        supportedByPanSide = 'right';
        break;
      }
    }

    // 壁の上やそのすぐ下をクリックしたときは、壁の上に乗せる (壁にめり込んだまま床へ落ちないように)
    if (!supportedByBalanceId) {
      targetY = this.snapOntoWalls(targetX, flaskHalfWidth(flaskType), targetY);
    }

    // 1. 天秤の皿が既にフラスコで占有されているか判定
    if (supportedByBalanceId && supportedByPanSide) {
      const alreadyHasFlask = this.containers.some(
        c => c.supportedByBalanceId === supportedByBalanceId && c.supportedByPanSide === supportedByPanSide
      );
      if (alreadyHasFlask) {
        return { allowed: false, reason: 'pan_occupied', targetX, targetY };
      }
    }

    const getRadius = flaskHalfWidth;
    const newRadius = getRadius(flaskType);

    // 落ちて止まる場所 (皿の上・壁の上・床) で占める範囲。ほかの器具と重ならなければ置ける
    // (壁の棚の上のフラスコの真下でも、床との間に空間があれば置ける)
    const restY = supportedByBalanceId ? targetY : this.restingBottom(targetX, newRadius, targetY, this.chamber.maxY);
    const newBox = flaskBox(flaskType, targetX, restY);

    // 2. 壁との重なり判定 (棚の下のすきまに入りきらない)
    if (this.overlapsWall(newBox)) {
      return { allowed: false, reason: 'overlap_wall', targetX, targetY };
    }

    // 3. 天秤との重なり判定 (皿の上以外で天秤の台座・支柱・皿と重なる)
    if (!supportedByBalanceId) {
      for (const b of this.balances) {
        if (boxesOverlap(newBox, balanceBox(b.cx, b.cy))) {
          return { allowed: false, reason: 'overlap_balance', targetX, targetY };
        }
      }
    }

    // 4. 既存フラスコとの重なり判定
    for (const c of this.containers) {
      if (boxesOverlap(newBox, flaskBox(c.type, c.cx, c.cy))) {
        return { allowed: false, reason: 'overlap_container', targetX, targetY };
      }
    }

    return { allowed: true, targetX, targetY };
  }

  // ガラス製実験器具 (三角フラスコ・ビーカー・試験管) の配置
  public spawnFlask(
    cx: number,
    cy: number,
    flaskType: 'erlenmeyer' | 'beaker' | 'testtube' = 'erlenmeyer',
    customTareMass?: number
  ): GlassContainer | null {
    const check = this.canSpawnFlask(cx, cy, flaskType);
    if (!check.allowed) {
      return null;
    }

    const targetX = check.targetX;
    let targetY = check.targetY;

    const nameJa = flaskType === 'erlenmeyer' ? '三角フラスコ (300ml)' : (flaskType === 'beaker' ? 'ビーカー (250ml)' : '丸底試験管 (50ml)');
    const defaultTareMass = flaskType === 'erlenmeyer' ? 50.0 : (flaskType === 'beaker' ? 40.0 : 15.0);
    const tareMass = customTareMass !== undefined ? customTareMass : defaultTareMass;

    let supportedByBalanceId: string | null = null;
    let supportedByPanSide: 'left' | 'right' | null = null;
    let isGrounded = false;

    // 天秤の皿の直上・付近に配置された場合のスマートスナップ
    for (const b of this.balances) {
      if (targetX === b.leftPan.cx && targetY === b.leftPan.cy) {
        supportedByBalanceId = b.id;
        supportedByPanSide = 'left';
        isGrounded = true;
        break;
      }
      if (targetX === b.rightPan.cx && targetY === b.rightPan.cy) {
        supportedByBalanceId = b.id;
        supportedByPanSide = 'right';
        isGrounded = true;
        break;
      }
    }

    if (!supportedByBalanceId && targetY >= this.chamber.maxY) {
      targetY = this.chamber.maxY;
      isGrounded = true;
    }

    const container: GlassContainer = {
      id: `flask_${this.nextContainerId++}`,
      type: flaskType,
      nameJa,
      cx: targetX,
      cy: targetY,
      vx: 0,
      vy: 0,
      tareMass,
      isGrounded,
      supportedByBalanceId,
      supportedByPanSide,
      temperature: this.ambientTemp,
      hasCap: false,
      segments: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      capBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    };

    this.rebuildContainerGeometry(container);
    this.containers.push(container);
    return container;
  }

  // 容器の衝突線分・バウンディングボックス・蓋判定領域の再構築
  public rebuildContainerGeometry(c: GlassContainer) {
    const segments: LineSegment[] = [];
    const clampedX = c.cx;
    const clampedY = c.cy;

    if (c.type === 'erlenmeyer') {
      const bHalf = 50;
      const nHalf = 15;
      const neckTop = clampedY - 110;
      const neckBottom = clampedY - 75;
      const base = clampedY;

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

      // 7. 蓋 (コルク栓/ゴム栓) による開口部の遮断線分
      if (c.hasCap) {
        segments.push({ x1: clampedX - nHalf, y1: neckTop, x2: clampedX + nHalf, y2: neckTop });
      }

      c.capBounds = {
        minX: clampedX - 22,
        maxX: clampedX + 22,
        minY: neckTop - 25,
        maxY: neckTop + 10
      };
      c.bounds = {
        minX: clampedX - bHalf - 5,
        maxX: clampedX + bHalf + 5,
        minY: c.hasCap ? neckTop - 25 : neckTop - 5,
        maxY: base + 5
      };
    } else if (c.type === 'beaker') {
      const bHalf = 44;
      const top = clampedY - 90;
      const base = clampedY;

      // 1. 底面
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX + bHalf, y2: base });
      // 2. 左垂直壁
      segments.push({ x1: clampedX - bHalf, y1: base, x2: clampedX - bHalf, y2: top });
      // 3. 右垂直壁
      segments.push({ x1: clampedX + bHalf, y1: base, x2: clampedX + bHalf, y2: top });
      // 4. 注ぎ口
      segments.push({ x1: clampedX - bHalf, y1: top, x2: clampedX - bHalf - 8, y2: top - 4 });
      segments.push({ x1: clampedX + bHalf, y1: top, x2: clampedX + bHalf + 4, y2: top });

      // 5. 蓋 (時計皿) による開口部遮断
      if (c.hasCap) {
        segments.push({ x1: clampedX - bHalf, y1: top, x2: clampedX + bHalf, y2: top });
      }

      c.capBounds = {
        minX: clampedX - 48,
        maxX: clampedX + 48,
        minY: top - 18,
        maxY: top + 10
      };
      c.bounds = {
        minX: clampedX - bHalf - 10,
        maxX: clampedX + bHalf + 8,
        minY: c.hasCap ? top - 18 : top - 5,
        maxY: base + 5
      };
    } else if (c.type === 'testtube') {
      const tHalf = 16;
      const top = clampedY - 105;
      const roundCenterY = clampedY - tHalf;

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

      // 蓋 (コルク栓/ゴム栓) による開口部遮断
      if (c.hasCap) {
        segments.push({ x1: clampedX - tHalf, y1: top, x2: clampedX + tHalf, y2: top });
      }

      c.capBounds = {
        minX: clampedX - 20,
        maxX: clampedX + 20,
        minY: top - 22,
        maxY: top + 10
      };
      c.bounds = {
        minX: clampedX - tHalf - 5,
        maxX: clampedX + tHalf + 5,
        minY: c.hasCap ? top - 22 : top - 5,
        maxY: clampedY + 5
      };
    }

    c.segments = segments;
  }

  // フラスコ・実験器具の蓋を開閉
  public toggleFlaskCap(container: GlassContainer): boolean {
    container.hasCap = !container.hasCap;
    this.rebuildContainerGeometry(container);
    return container.hasCap;
  }

  public setFlaskCap(container: GlassContainer, hasCap: boolean) {
    container.hasCap = hasCap;
    this.rebuildContainerGeometry(container);
  }

  // 指定座標が蓋の領域に含まれるコンテナを取得
  public getContainerAtCapPoint(x: number, y: number): GlassContainer | null {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      const cb = c.capBounds;
      if (x >= cb.minX && x <= cb.maxX && y >= cb.minY && y <= cb.maxY) {
        return c;
      }
    }
    return null;
  }

  // 容器の特定高さにおける半幅 (内径の半分) を計算
  public getContainerHalfWidth(c: GlassContainer, y: number): number {
    if (c.type === 'erlenmeyer') {
      const neckBottom = c.cy - 75;
      const base = c.cy;
      const nHalf = 15;
      const bHalf = 50;
      if (y <= neckBottom) return nHalf;
      const ratio = Math.max(0, Math.min(1, (y - neckBottom) / (base - neckBottom)));
      return nHalf + ratio * (bHalf - nHalf);
    } else if (c.type === 'beaker') {
      return 44;
    } else if (c.type === 'testtube') {
      const roundCenterY = c.cy - 16;
      if (y <= roundCenterY) return 16;
      const dy = y - roundCenterY;
      return Math.sqrt(Math.max(4, 16 * 16 - dy * dy));
    }
    return 50;
  }

  // 容器の開口部 (上端) の Y 座標を取得
  public getContainerTopY(c: GlassContainer): number {
    return c.cy - flaskHeight(c.type);
  }

  // 指定座標が容器内部に含まれているかを判定
  public isPointInsideContainer(c: GlassContainer, x: number, y: number, margin: number = 0): boolean {
    const topY = this.getContainerTopY(c);
    const bottomY = c.cy;
    if (y < topY - margin || y > bottomY + margin) return false;
    const halfW = this.getContainerHalfWidth(c, y);
    return Math.abs(x - c.cx) <= halfW + margin;
  }

  // 容器内部の粒子を壁抜けしないよう安全境界内に拘束 (壁抜け防止クランプ)
  public clampInsideContainer(c: GlassContainer, p: Particle) {
    const topY = this.getContainerTopY(c);
    const bottomY = c.cy;

    if (c.hasCap) {
      if (p.y < topY + p.radius) {
        p.y = topY + p.radius;
        if (p.vy < 0) p.vy = -p.vy * 0.35;
      }
    } else {
      if (p.y < topY) {
        const mouthHalfW = this.getContainerHalfWidth(c, topY);
        if (Math.abs(p.x - c.cx) <= mouthHalfW) {
          p.containerId = null;
          return;
        } else {
          p.y = topY + p.radius;
          if (p.vy < 0) p.vy = -p.vy * 0.35;
        }
      }
    }

    if (p.y > bottomY - p.radius) {
      p.y = bottomY - p.radius;
      if (p.vy > 0) p.vy = -p.vy * 0.35;
    }

    const halfW = this.getContainerHalfWidth(c, p.y);
    const safeHalfW = Math.max(1, halfW - p.radius);
    if (p.x < c.cx - safeHalfW) {
      p.x = c.cx - safeHalfW;
      if (p.vx < 0) p.vx = -p.vx * 0.35;
    } else if (p.x > c.cx + safeHalfW) {
      p.x = c.cx + safeHalfW;
      if (p.vx > 0) p.vx = -p.vx * 0.35;
    }
  }

  // 容器内部粒子の閉じ込め拘束を一括適用 (壁抜け完全防止)
  public applyContainerContainment() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.pinned) continue;

      // 未所属の粒子が容器内に入っているか自動追跡 (新配置・落下流入)
      if (!p.containerId) {
        for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
          const c = this.containers[cIdx];
          if (this.isPointInsideContainer(c, p.x, p.y, 2)) {
            p.containerId = c.id;
            break;
          }
        }
      }

      if (p.containerId) {
        const c = this.containers.find(cont => cont.id === p.containerId);
        if (!c) {
          p.containerId = null;
          continue;
        }
        this.clampInsideContainer(c, p);
      }
    }
  }

  // ガラス容器 (フラスコ・ビーカー・試験管) の重力落下・天秤皿への着地・追従更新
  public updateContainers() {
    for (let i = 0; i < this.containers.length; i++) {
      const c = this.containers[i];
      const prevX = c.cx;
      const prevY = c.cy;

      let onBalancePan = false;
      let targetPanY = 0;
      let panCenterX = 0;

      // 天秤の皿との着地・支持判定
      for (let bIdx = 0; bIdx < this.balances.length; bIdx++) {
        const b = this.balances[bIdx];

        // 左皿のチェック
        const leftPan = b.leftPan;
        const isOverLeft = Math.abs(c.cx - leftPan.cx) <= (leftPan.width / 2 + 8);
        if (isOverLeft) {
          if (c.supportedByBalanceId === b.id && c.supportedByPanSide === 'left') {
            onBalancePan = true;
            targetPanY = leftPan.cy;
            panCenterX = leftPan.cx;
            break;
          } else if (c.cy >= leftPan.cy - 12 && c.cy <= leftPan.cy + 30 && c.vy >= 0) {
            onBalancePan = true;
            c.supportedByBalanceId = b.id;
            c.supportedByPanSide = 'left';
            targetPanY = leftPan.cy;
            panCenterX = leftPan.cx;
            break;
          }
        }

        // 右皿のチェック
        const rightPan = b.rightPan;
        const isOverRight = Math.abs(c.cx - rightPan.cx) <= (rightPan.width / 2 + 8);
        if (isOverRight) {
          if (c.supportedByBalanceId === b.id && c.supportedByPanSide === 'right') {
            onBalancePan = true;
            targetPanY = rightPan.cy;
            panCenterX = rightPan.cx;
            break;
          } else if (c.cy >= rightPan.cy - 12 && c.cy <= rightPan.cy + 30 && c.vy >= 0) {
            onBalancePan = true;
            c.supportedByBalanceId = b.id;
            c.supportedByPanSide = 'right';
            targetPanY = rightPan.cy;
            panCenterX = rightPan.cx;
            break;
          }
        }
      }

      if (onBalancePan) {
        c.cy = targetPanY;
        c.vy = 0;
        c.isGrounded = true;

        // 皿の中央へ穏やかにセンタリング
        const panOffset = c.cx - panCenterX;
        if (Math.abs(panOffset) > 1.0) {
          c.cx -= panOffset * 0.08;
        }
        c.vx *= 0.5;
      } else {
        // 天秤から離れた、または自由落下
        c.supportedByBalanceId = null;
        c.supportedByPanSide = null;

        c.vy += this.gravity * 1.5;
        if (c.vy > 12) c.vy = 12;

        c.cx += c.vx;
        c.cy += c.vy;
        c.vx *= 0.9;

        // 壁の上・床面への着地判定
        const floorY = this.chamber.maxY;
        const wallTop = this.wallSupportY(c.cx, flaskHalfWidth(c.type), prevY, c.cy);
        if (wallTop !== null) {
          c.cy = wallTop;
          c.vy = 0;
          c.isGrounded = true;
        } else if (c.cy >= floorY) {
          c.cy = floorY;
          c.vy = 0;
          c.isGrounded = true;
        } else {
          c.isGrounded = false;
        }

        // チャンバー左右壁のクランプ
        const minX = this.chamber.minX + 45;
        const maxX = this.chamber.maxX - 45;
        if (c.cx < minX) {
          c.cx = minX;
          c.vx = 0;
        } else if (c.cx > maxX) {
          c.cx = maxX;
          c.vx = 0;
        }
      }

      const dx = c.cx - prevX;
      const dy = c.cy - prevY;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        this.rebuildContainerGeometry(c);

        // 容器内部の粒子を追従移動
        for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
          const p = this.particles[pIdx];
          if (p.pinned) continue; // 固定された壁は、落ちてきたフラスコに入っても一緒に動かない
          if (p.containerId === c.id || (!p.containerId && this.isPointInsideContainer(c, p.x, p.y, 2))) {
            p.containerId = c.id;
            p.x += dx;
            p.y += dy;
            if (c.isGrounded && Math.abs(dy) < 0.01 && p.vy > 0) {
              p.vy *= 0.6;
            }
          }
        }
      }
    }
  }


  // 上皿天秤を置けるか。天秤は壁の上か床まで落ちるので、落ちて止まる場所で
  // ほかの天秤やフラスコと重なるなら置けない (壁の棚の下でも、空間があれば置ける)
  public canSpawnBalance(cx: number, cy?: number): { allowed: boolean; reason?: 'overlap_balance' | 'overlap_container' | 'overlap_wall'; targetX: number; targetY: number } {
    const floorY = this.balanceFloorY();
    const targetX = Math.max(this.chamber.minX + 130, Math.min(this.chamber.maxX - 130, cx));
    const clampedY = Math.max(this.chamber.minY + 160, Math.min(floorY, cy ?? floorY));
    const targetY = this.snapOntoWalls(targetX, BALANCE_BASE_HALF_WIDTH, clampedY);
    const newBox = balanceBox(targetX, this.restingBottom(targetX, BALANCE_BASE_HALF_WIDTH, targetY, floorY));
    if (this.overlapsWall(newBox)) {
      return { allowed: false, reason: 'overlap_wall', targetX, targetY };
    }
    for (const b of this.balances) {
      if (boxesOverlap(newBox, balanceBox(b.cx, b.cy))) {
        return { allowed: false, reason: 'overlap_balance', targetX, targetY };
      }
    }
    for (const c of this.containers) {
      if (c.supportedByBalanceId) continue; // ほかの天秤の皿の上のフラスコは、その天秤の判定でわかる
      if (boxesOverlap(newBox, flaskBox(c.type, c.cx, c.cy))) {
        return { allowed: false, reason: 'overlap_container', targetX, targetY };
      }
    }
    return { allowed: true, targetX, targetY };
  }

  // 上皿天秤の配置
  public spawnBalance(cx: number, cy?: number): LabBalance {
    const clampMinX = this.chamber.minX + 130;
    const clampMaxX = this.chamber.maxX - 130;
    const clampedX = Math.max(clampMinX, Math.min(clampMaxX, cx));
    // 高さを指定しなければ床に置く。空中に置いた場合は updateBalances で床まで落ちる
    const floorY = this.balanceFloorY();
    const targetY = cy !== undefined ? cy : floorY;
    // 壁の上やそのすぐ下に置いたときは、壁の上に乗せる
    const clampedY = this.snapOntoWalls(clampedX, BALANCE_BASE_HALF_WIDTH, Math.max(this.chamber.minY + 160, Math.min(floorY, targetY)));

    const balance: LabBalance = {
      id: `balance_${this.nextBalanceId++}`,
      nameJa: '精密上皿天秤 (ローベルバル式)',
      nameEn: 'Precision Pan Balance',
      cx: clampedX,
      cy: clampedY,
      armLength: 95,
      pillarHeight: 105,
      angle: 0,
      targetAngle: 0,
      angleVelocity: 0,
      isLocked: false,
      vy: 0,
      isGrounded: clampedY >= floorY,
      leftPan: {
        cx: clampedX - 95,
        cy: clampedY - 105 - 18,
        width: 80,
        height: 16,
        particles: [],
        totalMass: 0,
        composition: []
      },
      rightPan: {
        cx: clampedX + 95,
        cy: clampedY - 105 - 18,
        width: 80,
        height: 16,
        particles: [],
        totalMass: 0,
        composition: []
      },
      segments: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    };

    this.rebuildBalanceGeometry(balance);
    this.balances.push(balance);
    return balance;
  }

  // 落ちてくるフラスコ・天秤を受け止める壁の上面の高さ。
  // 底が prevBottom から nextBottom まで下がる間に上面を通る壁のうち、いちばん上のものを返す (なければ null)
  private wallSupportY(cx: number, halfWidth: number, prevBottom: number, nextBottom: number): number | null {
    let top: number | null = null;
    for (const w of this.particles) {
      if (w.kind !== 'wall') continue;
      if (Math.abs(w.x - cx) > halfWidth + w.radius * 0.5) continue;
      const wallTop = w.y - w.radius;
      if (wallTop < prevBottom - 1 || wallTop > nextBottom) continue;
      if (top === null || wallTop < top) top = wallTop;
    }
    return top;
  }

  // 置いた器具の範囲に壁がめり込むか (器具を支えている真下の壁は、上面が底に接するだけなので含まれない)
  private overlapsWall(box: PlacementBox): boolean {
    return this.particles.some(w => w.kind === 'wall' && boxesOverlap(box, {
      minX: w.x - w.radius + 1, maxX: w.x + w.radius - 1, minY: w.y - w.radius + 1, maxY: w.y + w.radius - 1
    }));
  }

  // 底が bottom の物が落ちて止まる高さ: 真下にある壁のうちいちばん上の上面か、床
  private restingBottom(cx: number, halfWidth: number, bottom: number, floorY: number): number {
    let rest = floorY;
    for (const w of this.particles) {
      if (w.kind !== 'wall' || Math.abs(w.x - cx) > halfWidth + w.radius * 0.5) continue;
      const wallTop = w.y - w.radius;
      if (wallTop >= bottom - 0.5 && wallTop < rest) rest = wallTop;
    }
    return rest;
  }

  // 底 (bottom) が壁にめり込んでいたら、その壁の上面まで持ち上げる。積み上げた壁はいちばん上まで
  private snapOntoWalls(cx: number, halfWidth: number, bottom: number): number {
    for (let guard = 0; guard < 50; guard++) {
      const sunk = this.particles.find(w =>
        w.kind === 'wall' &&
        Math.abs(w.x - cx) <= halfWidth + w.radius * 0.5 &&
        w.y - w.radius < bottom - 0.5 &&
        w.y + w.radius + WALL_SNAP_MARGIN >= bottom
      );
      if (!sunk) break;
      bottom = sunk.y - sunk.radius;
    }
    return bottom;
  }

  // 天秤の台座の底が着く床の高さ
  private balanceFloorY(): number {
    return this.chamber.maxY - 4;
  }

  // 天秤の重力落下 (フラスコと同じ加速度・最大速度)。床に着いたら止まる
  private applyBalanceGravity(b: LabBalance) {
    const floorY = this.balanceFloorY();
    if (b.isGrounded && b.cy >= floorY) return;
    const prevY = b.cy;
    b.vy = Math.min(12, b.vy + this.gravity * 1.5);
    b.cy += b.vy;
    const wallTop = this.wallSupportY(b.cx, BALANCE_BASE_HALF_WIDTH, prevY, b.cy);
    if (wallTop !== null) {
      b.cy = wallTop;
      b.vy = 0;
      b.isGrounded = true;
    } else if (b.cy >= floorY) {
      b.cy = floorY;
      b.vy = 0;
      b.isGrounded = true;
    } else {
      b.isGrounded = false;
    }
    this.rebuildBalanceGeometry(b);
  }

  // 天秤の形状・衝突線分・バウンディングボックスの再構築
  public rebuildBalanceGeometry(b: LabBalance) {
    const pivotX = b.cx;
    const pivotY = b.cy - b.pillarHeight;

    const cosA = Math.cos(b.angle);
    const sinA = Math.sin(b.angle);

    // 左右アーム端の座標
    const leftArmX = pivotX - b.armLength * cosA;
    const leftArmY = pivotY - b.armLength * sinA;
    const rightArmX = pivotX + b.armLength * cosA;
    const rightArmY = pivotY + b.armLength * sinA;

    // 上皿天秤の受け皿中心 (アーム端から垂直ロッドを介して常に水平な皿を保持)
    const panLeftX = leftArmX;
    const panLeftY = leftArmY - 18;
    const panRightX = rightArmX;
    const panRightY = rightArmY - 18;

    b.leftPan.cx = panLeftX;
    b.leftPan.cy = panLeftY;
    b.rightPan.cx = panRightX;
    b.rightPan.cy = panRightY;

    const segments: LineSegment[] = [];

    // 1. 左皿の線分 (幅80px, フチ深さ14px)
    const pw = 40;
    const lipH = 14;
    // 底面
    segments.push({ x1: panLeftX - pw, y1: panLeftY, x2: panLeftX + pw, y2: panLeftY });
    // 左縁
    segments.push({ x1: panLeftX - pw, y1: panLeftY, x2: panLeftX - pw - 3, y2: panLeftY - lipH });
    // 右縁
    segments.push({ x1: panLeftX + pw, y1: panLeftY, x2: panLeftX + pw + 3, y2: panLeftY - lipH });

    // 2. 右皿の線分
    // 底面
    segments.push({ x1: panRightX - pw, y1: panRightY, x2: panRightX + pw, y2: panRightY });
    // 左縁
    segments.push({ x1: panRightX - pw, y1: panRightY, x2: panRightX - pw - 3, y2: panRightY - lipH });
    // 右縁
    segments.push({ x1: panRightX + pw, y1: panRightY, x2: panRightX + pw + 3, y2: panRightY - lipH });

    // 3. 台座上面の衝突線分
    segments.push({ x1: b.cx - 65, y1: b.cy - 8, x2: b.cx + 65, y2: b.cy - 8 });

    b.segments = segments;

    // バウンディングボックス
    b.bounds = {
      minX: b.cx - b.armLength - 50,
      maxX: b.cx + b.armLength + 50,
      minY: Math.min(panLeftY, panRightY) - 50,
      maxY: b.cy + 5
    };
  }

  // 天秤の皿の上の粒子およびフラスコを空にする
  public clearPan(b: LabBalance, side: 'left' | 'right' | 'all'): number {
    const toRemove = new Set<Particle>();
    if (side === 'left' || side === 'all') {
      b.leftPan.particles.forEach(p => toRemove.add(p));
      b.leftPan.particles = [];
      b.leftPan.totalMass = 0;
      b.leftPan.composition = [];
    }
    if (side === 'right' || side === 'all') {
      b.rightPan.particles.forEach(p => toRemove.add(p));
      b.rightPan.particles = [];
      b.rightPan.totalMass = 0;
      b.rightPan.composition = [];
    }

    // 皿に乗っているフラスコおよびその内部粒子も片付ける
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const c = this.containers[i];
      if (c.supportedByBalanceId === b.id) {
        if (side === 'all' || c.supportedByPanSide === side) {
          for (const p of this.particles) {
            if (p.containerId === c.id) {
              toRemove.add(p);
            }
          }
          this.containers.splice(i, 1);
        }
      }
    }

    if (toRemove.size > 0) {
      this.particles = this.particles.filter(p => !toRemove.has(p));
    }
    return toRemove.size;
  }

  // 天秤の固定/解除
  public toggleBalanceLock(b: LabBalance): boolean {
    b.isLocked = !b.isLocked;
    if (b.isLocked) {
      b.targetAngle = 0;
      b.angleVelocity = 0;
    }
    return b.isLocked;
  }

  // 天秤のホバー判定
  public getHoveredBalance(x: number, y: number): LabBalance | null {
    for (let i = this.balances.length - 1; i >= 0; i--) {
      const b = this.balances[i];
      if (
        x >= b.bounds.minX &&
        x <= b.bounds.maxX &&
        y >= b.bounds.minY &&
        y <= b.bounds.maxY
      ) {
        return b;
      }
    }
    return null;
  }

  // 皿の直接タップ判定
  public getBalanceAtPan(x: number, y: number): { balance: LabBalance; side: 'left' | 'right' } | null {
    for (let i = this.balances.length - 1; i >= 0; i--) {
      const b = this.balances[i];
      // 左皿タップ
      if (Math.abs(x - b.leftPan.cx) <= 45 && Math.abs(y - b.leftPan.cy) <= 25) {
        return { balance: b, side: 'left' };
      }
      // 右皿タップ
      if (Math.abs(x - b.rightPan.cx) <= 45 && Math.abs(y - b.rightPan.cy) <= 25) {
        return { balance: b, side: 'right' };
      }
    }
    return null;
  }

  // 上皿天秤の物理挙動・皿上の粒子測定・質量比較の更新
  public updateBalances() {
    for (let bIdx = 0; bIdx < this.balances.length; bIdx++) {
      const b = this.balances[bIdx];

      // 前フレームの皿位置を記録 (上下動の粒子追従用)
      const prevLeftY = b.leftPan.cy;
      const prevRightY = b.rightPan.cy;

      // 空中に置いた天秤は床まで落ちる (皿の上の粒子は下の「皿の上下動に追従」で一緒に動く)
      this.applyBalanceGravity(b);

      // 皿上の粒子リスト・質量集計を初期化
      b.leftPan.particles = [];
      b.rightPan.particles = [];
      b.leftPan.totalMass = 0;
      b.rightPan.totalMass = 0;
      const leftCompMap = new Map<string, BalancePanComposition>();
      const rightCompMap = new Map<string, BalancePanComposition>();

      // 1. 各粒子がどちらかの皿に乗っているかを判定
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;
        if (p.containerId) continue; // フラスコ内の粒子はフラスコ単位で合算するためスキップ

        // 左皿の判定 (受け皿の幅 80px, 上下スタック対応 80px)
        const inLeftX = Math.abs(p.x - b.leftPan.cx) <= (b.leftPan.width / 2 + 3);
        const inLeftY = p.y >= b.leftPan.cy - 80 && p.y <= b.leftPan.cy + 8;

        if (inLeftX && inLeftY) {
          b.leftPan.particles.push(p);
          b.leftPan.totalMass += p.molarMass;

          // 気体粒子の場合、天秤測定のため皿の上で静置 (浮力による脱出を防止)
          if (p.state === 'gas') {
            if (p.vy < 0) p.vy = 0;
            if (p.y < b.leftPan.cy - 70) {
              p.y = b.leftPan.cy - 70;
            }
          }

          // 皿の横滑り・こぼれ落ち防止
          const maxLeftOffset = Math.max(10, b.leftPan.width / 2 - p.radius);
          if (Math.abs(p.x - b.leftPan.cx) > maxLeftOffset) {
            p.x = b.leftPan.cx + Math.sign(p.x - b.leftPan.cx) * maxLeftOffset;
            p.vx *= -0.3;
          }

          // 皿の上下動に追従
          const dy = b.leftPan.cy - prevLeftY;
          p.y += dy;
          if (p.y > b.leftPan.cy - p.radius) {
            p.y = b.leftPan.cy - p.radius;
            if (p.vy > 0) p.vy = 0;
          }

          // 組成集計
          let comp = leftCompMap.get(p.symbolOrId);
          if (!comp) {
            comp = {
              symbolOrId: p.symbolOrId,
              displayName: p.displayName,
              nameJa: p.nameJa,
              nameEn: p.nameEn,
              count: 0,
              totalMolarMass: 0
            };
            leftCompMap.set(p.symbolOrId, comp);
          }
          comp.count++;
          comp.totalMolarMass += p.molarMass;
          continue;
        }

        // 右皿の判定
        const inRightX = Math.abs(p.x - b.rightPan.cx) <= (b.rightPan.width / 2 + 3);
        const inRightY = p.y >= b.rightPan.cy - 80 && p.y <= b.rightPan.cy + 8;

        if (inRightX && inRightY) {
          b.rightPan.particles.push(p);
          b.rightPan.totalMass += p.molarMass;

          if (p.state === 'gas') {
            if (p.vy < 0) p.vy = 0;
            if (p.y < b.rightPan.cy - 70) {
              p.y = b.rightPan.cy - 70;
            }
          }

          const maxRightOffset = Math.max(10, b.rightPan.width / 2 - p.radius);
          if (Math.abs(p.x - b.rightPan.cx) > maxRightOffset) {
            p.x = b.rightPan.cx + Math.sign(p.x - b.rightPan.cx) * maxRightOffset;
            p.vx *= -0.3;
          }

          const dy = b.rightPan.cy - prevRightY;
          p.y += dy;
          if (p.y > b.rightPan.cy - p.radius) {
            p.y = b.rightPan.cy - p.radius;
            if (p.vy > 0) p.vy = 0;
          }

          let comp = rightCompMap.get(p.symbolOrId);
          if (!comp) {
            comp = {
              symbolOrId: p.symbolOrId,
              displayName: p.displayName,
              nameJa: p.nameJa,
              nameEn: p.nameEn,
              count: 0,
              totalMolarMass: 0
            };
            rightCompMap.set(p.symbolOrId, comp);
          }
          comp.count++;
          comp.totalMolarMass += p.molarMass;
        }
      }

      // 1.5 皿に乗っているガラス器具 (フラスコ・ビーカー・試験管) の集計
      for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
        const c = this.containers[cIdx];
        if (c.supportedByBalanceId === b.id) {
          let innerMass = 0;
          let innerCount = 0;
          for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
            const p = this.particles[pIdx];
            if (p.containerId === c.id) {
              innerMass += p.molarMass;
              innerCount++;
            }
          }
          const totalFlaskMass = c.tareMass + innerMass;
          const isLeft = c.supportedByPanSide === 'left';
          const targetPan = isLeft ? b.leftPan : b.rightPan;
          const targetCompMap = isLeft ? leftCompMap : rightCompMap;

          targetPan.totalMass += totalFlaskMass;

          const flaskTypeNameJa = c.type === 'erlenmeyer' ? '三角フラスコ' : (c.type === 'beaker' ? 'ビーカー' : '丸底試験管');
          const flaskTypeNameEn = c.type === 'erlenmeyer' ? 'Erlenmeyer Flask' : (c.type === 'beaker' ? 'Beaker' : 'Test Tube');
          const icon = c.type === 'erlenmeyer' ? '🏺' : (c.type === 'beaker' ? '🥛' : '🧪');

          const countSuffixJa = innerCount > 0 ? ` + 内部${innerCount}個 (${innerMass.toFixed(1)}g)` : '';
          const countSuffixEn = innerCount > 0 ? ` + ${innerCount} in (${innerMass.toFixed(1)}g)` : '';

          targetCompMap.set(c.id, {
            symbolOrId: c.id,
            displayName: icon,
            nameJa: `${flaskTypeNameJa} (${c.tareMass.toFixed(1)}g)${countSuffixJa}`,
            nameEn: `${flaskTypeNameEn} (${c.tareMass.toFixed(1)}g)${countSuffixEn}`,
            count: 1,
            totalMolarMass: totalFlaskMass
          });
        }
      }

      b.leftPan.composition = Array.from(leftCompMap.values());
      b.rightPan.composition = Array.from(rightCompMap.values());

      // 2. 質量差と傾斜角の計算
      if (b.isLocked) {
        b.targetAngle = 0;
        b.angleVelocity = 0;
        b.angle = 0;
      } else {
        const massDiff = b.rightPan.totalMass - b.leftPan.totalMass;
        const maxAngle = 0.22; // 約 12.6 度
        // 少しの差でも感度よく傾き、差が大きい場合は最大角度で飽和
        b.targetAngle = Math.max(-maxAngle, Math.min(maxAngle, Math.atan(massDiff * 0.04) * 0.7));

        // バネ・ダンパー物理 (減衰振動)
        const torque = (b.targetAngle - b.angle) * 0.09;
        b.angleVelocity = (b.angleVelocity + torque) * 0.88;
        b.angle += b.angleVelocity;
      }

      // 3. 最新の傾き角度で線分・皿位置を更新
      this.rebuildBalanceGeometry(b);

      // 3.5 皿に乗っているフラスコおよび内部粒子を皿の最新高さに同期
      for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
        const c = this.containers[cIdx];
        if (c.supportedByBalanceId === b.id) {
          const targetPan = c.supportedByPanSide === 'left' ? b.leftPan : b.rightPan;
          const dy = targetPan.cy - c.cy;
          if (Math.abs(dy) > 0.0001) {
            c.cy = targetPan.cy;
            this.rebuildContainerGeometry(c);
            for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
              const p = this.particles[pIdx];
              if (p.containerId === c.id) {
                p.y += dy;
              }
            }
          }
        }
      }

      // 4. 天秤の衝突線分と粒子の衝突判定
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.pinned) continue;

        if (
          p.x + p.radius < b.bounds.minX ||
          p.x - p.radius > b.bounds.maxX ||
          p.y + p.radius < b.bounds.minY ||
          p.y - p.radius > b.bounds.maxY
        ) {
          continue;
        }

        for (let sIdx = 0; sIdx < b.segments.length; sIdx++) {
          const seg = b.segments[sIdx];
          const dx = seg.x2 - seg.x1;
          const dy = seg.y2 - seg.y1;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 0.001) continue;

          const t = Math.max(0, Math.min(1, ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq));
          const nearX = seg.x1 + t * dx;
          const nearY = seg.y1 + t * dy;

          const rx = p.x - nearX;
          const ry = p.y - nearY;
          const distSq = rx * rx + ry * ry;
          const wallThickness = 2.0;
          const minDist = p.radius + wallThickness;

          if (distSq < minDist * minDist && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = rx / dist;
            const ny = ry / dist;

            p.x += nx * overlap;
            p.y += ny * overlap;

            const vn = p.vx * nx + p.vy * ny;
            if (vn < 0) {
              const restitution = p.state === 'gas' ? 0.2 : 0.35;
              p.vx -= (1 + restitution) * vn * nx;
              p.vy -= (1 + restitution) * vn * ny;
              p.vx *= 0.92;
              p.vy *= 0.92;
            }
          }
        }
      }
    }
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

  // 爆風: 爆心から半径内の粒子・ガラス容器を距離に応じて外向きに吹き飛ばす
  public applyBlast(x: number, y: number, radius: number, power: number, excludeContainerId?: string) {
    for (const p of this.particles) {
      if (p.pinned) continue;
      // 無傷の容器の中にある粒子は容器ごと揺さぶる (容器壁で守られる)
      if (p.containerId && p.containerId !== excludeContainerId) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const falloff = 1 - dist / radius;
      const angle = dist > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      const impulse = power * (0.4 + falloff) * (0.8 + Math.random() * 0.4);
      p.vx += Math.cos(angle) * impulse;
      p.vy += Math.sin(angle) * impulse - power * 0.3 * falloff;
    }

    for (const c of this.containers) {
      if (c.id === excludeContainerId) continue;
      const midY = (c.bounds.minY + c.bounds.maxY) / 2;
      const dx = c.cx - x;
      const dy = midY - y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius * 1.2) continue;
      const falloff = 1 - dist / (radius * 1.2);
      c.vx += Math.sign(dx || 1) * power * 0.6 * falloff;
      if (!c.supportedByBalanceId) {
        c.vy -= power * 0.4 * falloff;
      }
    }

    this.shake(Math.min(14, 3 + power * 1.2), 14 + Math.round(power * 2));
  }

  // 壁ブラシが覆う範囲 (格子にそろえた四角形)。置くときとカーソルの表示で同じ範囲を使う
  public wallBrushBounds(x: number, y: number, cols: number, rows: number): { minX: number; minY: number; maxX: number; maxY: number } {
    const { minX, minY } = this.chamber;
    const firstCol = Math.floor((x - minX) / WALL_BLOCK) - Math.floor((cols - 1) / 2);
    const firstRow = Math.floor((y - minY) / WALL_BLOCK) - Math.floor((rows - 1) / 2);
    const left = minX + firstCol * WALL_BLOCK;
    const top = minY + firstRow * WALL_BLOCK;
    return { minX: left, minY: top, maxX: left + cols * WALL_BLOCK, maxY: top + rows * WALL_BLOCK };
  }

  // 壁ブラシ: (x, y) のマスを中心に、幅 cols × 高さ rows のマスへ壁ブロックを置く。
  // マスはチャンバー左上を原点とする格子にそろえ、既に壁があるマスやチャンバーの外は飛ばす (ドラッグで何度呼んでも重ならない)
  public placeWallBrush(x: number, y: number, cols: number, rows: number, typeId: WallTypeId): number {
    const { minX, minY, maxX, maxY } = this.chamber;
    const area = this.wallBrushBounds(x, y, cols, rows);
    let placed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const half = WALL_BLOCK / 2;
        const cx = area.minX + c * WALL_BLOCK + half;
        const cy = area.minY + r * WALL_BLOCK + half;
        if (cx - half < minX || cx + half > maxX || cy - half < minY || cy + half > maxY) continue;
        if (this.particles.some(p => p.kind === 'wall' && Math.abs(p.x - cx) < half && Math.abs(p.y - cy) < half)) continue;
        this.addParticle(new Particle(`wall_${this.nextWallId++}`, 'wall', typeId, cx, cy, this.ambientTemp));
        placed++;
      }
    }
    return placed;
  }

  // 爆発で壁が受けるダメージ。強度以上の衝撃で壊れ、強度の 6 割以上ならひびが入る (ひびの入った壁は 6 割の衝撃で壊れる)
  public damageWalls(x: number, y: number, power: number): { broken: number; cracked: number } {
    let broken = 0;
    let cracked = 0;
    const toRemove = new Set<Particle>();
    for (const w of this.particles) {
      if (w.kind !== 'wall') continue;
      const wt = getWallType(w.symbolOrId);
      if (!Number.isFinite(wt.breakImpact)) continue;
      const impact = wallImpact(power, Math.hypot(w.x - x, w.y - y));
      const crackLevel = wt.breakImpact * WALL_CRACK_RATIO;
      if (impact >= (w.cracked ? crackLevel : wt.breakImpact)) {
        toRemove.add(w);
        this.scatterWallDebris(w, x, y, power, wt);
        broken++;
      } else if (impact >= crackLevel && !w.cracked) {
        w.cracked = true;
        this.addEffect('smoke', w.x, w.y, '#D1D5DB', 14);
        cracked++;
      }
    }
    if (toRemove.size > 0) this.particles = this.particles.filter(p => !toRemove.has(p));
    return { broken, cracked };
  }

  // 壊れた壁ブロックのかけらを爆発の中心から外へ飛ばす (ガラス片と同じ仕組みで、壁の色で描く)
  private scatterWallDebris(w: Particle, x: number, y: number, power: number, wt: WallType) {
    const angle = Math.atan2(w.y - y, w.x - x);
    for (let k = 0; k < 5; k++) {
      const spread = angle + (Math.random() - 0.5) * 1.2;
      const speed = power * (0.4 + Math.random() * 0.6);
      const size = 3 + Math.random() * 4;
      const baseAngle = Math.random() * Math.PI * 2;
      const points: { x: number; y: number }[] = [];
      for (let v = 0; v < 4; v++) {
        const a = baseAngle + (v / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        points.push({ x: Math.cos(a) * size, y: Math.sin(a) * size });
      }
      this.glassShards.push({
        x: w.x + (Math.random() - 0.5) * w.radius,
        y: w.y + (Math.random() - 0.5) * w.radius,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed - power * 0.3,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.4,
        points,
        lifetime: 0,
        maxLifetime: 90 + Math.floor(Math.random() * 50),
        color: wt.color,
        edgeColor: wt.edgeColor
      });
    }
    this.addEffect('smoke', w.x, w.y, '#9CA3AF', 22);
  }

  public shake(intensity: number, frames: number) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, frames);
  }

  // ガラス容器の破裂: 容器を消去してガラス片を四方八方へ飛散させ、内部の粒子を解放して吹き飛ばす
  public shatterContainer(c: GlassContainer, x: number, y: number, power: number = 6) {
    const idx = this.containers.indexOf(c);
    if (idx === -1) return;

    // 1. 容器の輪郭線に沿ってガラス片を生成 (容器の形状から飛び散って見えるように)
    const totalLength = c.segments.reduce((sum, seg) => sum + Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1), 0);
    const shardCount = 16 + Math.floor(Math.random() * 10);
    for (let k = 0; k < shardCount; k++) {
      // 輪郭上のランダムな位置
      let target = Math.random() * totalLength;
      let sx = c.cx;
      let sy = c.cy;
      for (const seg of c.segments) {
        const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
        if (target <= len) {
          const t = len > 0 ? target / len : 0;
          sx = seg.x1 + (seg.x2 - seg.x1) * t;
          sy = seg.y1 + (seg.y2 - seg.y1) * t;
          break;
        }
        target -= len;
      }

      const dx = sx - x;
      const dy = sy - y;
      const angle = Math.hypot(dx, dy) > 0.001 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      const spread = angle + (Math.random() - 0.5) * 0.9;
      const speed = power * (0.6 + Math.random() * 0.9);

      const size = 4 + Math.random() * 7;
      const points: { x: number; y: number }[] = [];
      const baseAngle = Math.random() * Math.PI * 2;
      for (let v = 0; v < 3; v++) {
        const a = baseAngle + (v / 3) * Math.PI * 2 + (Math.random() - 0.5) * 1.2;
        const r = size * (0.45 + Math.random() * 0.75);
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }

      this.glassShards.push({
        x: sx,
        y: sy,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed - power * 0.35,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.5,
        points,
        lifetime: 0,
        maxLifetime: 110 + Math.floor(Math.random() * 60)
      });
    }

    // 2. 内部の粒子を解放 (この後の爆風で外へ飛び散る)
    for (const p of this.particles) {
      if (p.containerId === c.id) {
        p.containerId = null;
      }
    }

    // 3. 容器の消去 (天秤の支持も自動的に消える)
    this.containers.splice(idx, 1);

    // 4. 爆風・閃光・画面揺れ
    this.applyBlast(x, y, 160 + power * 10, power, c.id);
    this.addEffect('explosion', x, y, '#F97316', 55 + power * 3);
    this.addEffect('flash', x, y, '#FFFFFF', 40);
    this.shake(Math.min(16, 6 + power), 26);
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

    // 0. ガラス容器 (フラスコ・ビーカー・試験管) の重力落下・天秤皿着地・追従更新
    this.updateContainers();

    // 0.5 水素原子を、結びつく相手の原子 (C・N・O・Cl) のそばに引き寄せる
    this.attractHydrogenToPartners();

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
        // 空気の分子量より軽ければ上向きの穏やかな浮力
        const buoyancy = (this.airMolarMass - p.molarMass) * 0.015;
        // 熱気球効果 (高温な気体はさらに膨張して穏やかに上昇)
        const thermalLift = Math.max(0, (p.temperature - this.ambientTemp) * 0.0006);
        // 蓋をした容器の中の気体は、重さで上下に分かれず拡散して混ざり合う (メタンと酸素などが出会えるように)
        const sealed = p.containerId !== null && this.containers.some(c => c.id === p.containerId && c.hasCap);
        const liftScale = sealed ? SEALED_GAS_LIFT_SCALE : 1;

        p.vy -= (buoyancy + thermalLift) * liftScale;
        p.vy += this.gravity * 0.18 * liftScale; // わずかな基本重力

        // 気体の穏やかな熱拡散・ブラウン運動 (急激な暴れ・激しいランダム振動を抑制)
        const brownian = sealed
          ? SEALED_GAS_BROWNIAN
          : Math.min(0.22, Math.sqrt(Math.max(1, p.temperature + 273)) * 0.007);
        p.vx += (Math.random() - 0.5) * brownian;
        p.vy += (Math.random() - 0.5) * brownian;

        // 空気抵抗・粘性抵抗による安定した滑らかな気流減衰
        p.vx *= 0.92;
        p.vy *= 0.92;
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

      // 速度制限 (気体は急激に飛び跳ねないよう落ち着いた最高速度に抑制)
      const maxSpeed = p.state === 'gas' ? 5.5 : 12;
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

      const wallDamping = p.state === 'gas' ? 0.35 : 0.6;
      if (p.x < minX) {
        p.x = minX;
        p.vx = -p.vx * wallDamping;
      } else if (p.x > maxX) {
        p.x = maxX;
        p.vx = -p.vx * wallDamping;
      }

      if (p.y < minY) {
        p.y = minY;
        p.vy = -p.vy * wallDamping;
      } else if (p.y > maxY) {
        p.y = maxY;
        p.vy = -p.vy * (p.state === 'gas' ? 0.25 : 0.4);
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

              // 位置押し出し補正 (過度な重なりによる瞬間ワープ壁抜けを防止するため上限を設ける)
              const pushAmount = Math.min(overlap * 0.5, 2.0);
              if (!p1.pinned && !p2.pinned) {
                p1.x -= nx * pushAmount;
                p1.y -= ny * pushAmount;
                p2.x += nx * pushAmount;
                p2.y += ny * pushAmount;
              } else if (!p1.pinned) {
                p1.x -= nx * Math.min(overlap, 4.0);
                p1.y -= ny * Math.min(overlap, 4.0);
              } else if (!p2.pinned) {
                p2.x += nx * Math.min(overlap, 4.0);
                p2.y += ny * Math.min(overlap, 4.0);
              }

              // 弾性衝突応答
              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;
              const p = 2 * (nx * kx + ny * ky) / (p1.molarMass + p2.molarMass);

              const restitution = (p1.state === 'gas' || p2.state === 'gas') ? 0.35 : 0.4;

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
              const restitution = p.state === 'gas' ? 0.35 : (p.state === 'liquid' ? 0.25 : 0.45);
              p.vx -= (1 + restitution) * vn * nx;
              p.vy -= (1 + restitution) * vn * ny;

              // 壁面との摩擦減衰
              p.vx *= 0.95;
              p.vy *= 0.95;
            }

            // 3. フラスコとの熱伝導 (熱は両方向に動く: 温かい中身はガラスを温め、そのぶん冷める)
            const tempDiff = container.temperature - p.temperature;
            p.temperature += tempDiff * 0.04;
            container.temperature -= tempDiff * 0.04 * GLASS_HEAT_SHARE;
          }
        }
      }
    }

    // 4. 容器内部粒子の閉じ込め拘束 (高圧・激しい熱膨張・密集による壁抜けを完全防止)
    this.applyContainerContainment();

    // 5. 精密上皿天秤の物理挙動・質量測定更新
    this.updateBalances();

    // 6. エフェクトのアニメーション更新
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const eff = this.effects[i];
      eff.lifetime++;
      if (eff.lifetime >= eff.maxLifetime) {
        this.effects.splice(i, 1);
      }
    }

    // 6.5 ガラス片の飛散 (重力・回転・チャンバー壁/床での減衰反射)
    this.updateGlassShards();

    // 6.6 指示薬の色 (数フレームに1回、周りの液性を調べる)
    if (++this.indicatorTick >= INDICATOR_UPDATE_INTERVAL) {
      this.indicatorTick = 0;
      this.updateIndicators();
    }

    // 6.7 花火
    this.fireworks.update(this.chamber);
    if (this.shakeTime > 0) {
      this.shakeTime--;
      this.shakeIntensity *= 0.9;
      if (this.shakeTime === 0) this.shakeIntensity = 0;
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
        // 密閉されたフラスコ (有栓) の内部に封じ込められているか判定
        let isSealedInsideFlask = false;
        if (p.containerId) {
          const c = this.containers.find(cont => cont.id === p.containerId);
          if (c && c.hasCap) {
            isSealedInsideFlask = true;
          }
        } else {
          for (let cIdx = 0; cIdx < this.containers.length; cIdx++) {
            const c = this.containers[cIdx];
            if (c.hasCap && this.isPointInsideContainer(c, p.x, p.y)) {
              p.containerId = c.id;
              isSealedInsideFlask = true;
              break;
            }
          }
        }

        // 密閉フラスコ内に隔離されている気体は、チャンバー大気への漏出・汚染としてはカウントしない
        if (!isSealedInsideFlask) {
          gasCount++;
          if (p.isToxic) {
            toxicCount++;
            toxicMap[p.symbolOrId] = (toxicMap[p.symbolOrId] || 0) + 1;
          }
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
      } else if (dominantId === 'O3') {
        // 淡青色 (O3)
        this.chamber.dominantToxicColor = 'rgba(147, 197, 253, 0.45)';
        this.chamber.dominantSecondaryColor = 'rgba(59, 130, 246, 0.7)';
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

  private updateGlassShards() {
    const ch = this.chamber;
    for (let i = this.glassShards.length - 1; i >= 0; i--) {
      const g = this.glassShards[i];
      g.lifetime++;
      g.vy += this.gravity * 1.4;
      g.vx *= 0.99;
      g.x += g.vx;
      g.y += g.vy;
      g.angle += g.spin;

      if (g.x < ch.minX + 4) {
        g.x = ch.minX + 4;
        g.vx = Math.abs(g.vx) * 0.45;
        g.spin *= 0.7;
      } else if (g.x > ch.maxX - 4) {
        g.x = ch.maxX - 4;
        g.vx = -Math.abs(g.vx) * 0.45;
        g.spin *= 0.7;
      }
      if (g.y < ch.minY + 4) {
        g.y = ch.minY + 4;
        g.vy = Math.abs(g.vy) * 0.4;
      } else if (g.y > ch.maxY - 3) {
        g.y = ch.maxY - 3;
        g.vy = -Math.abs(g.vy) * 0.3;
        g.vx *= 0.6;
        g.spin *= 0.5;
        if (Math.abs(g.vy) < 0.6) g.vy = 0;
      }

      if (g.lifetime >= g.maxLifetime) {
        this.glassShards.splice(i, 1);
      }
    }
  }

  // 水素原子は軽くてすぐ浮き上がるので、相手の原子のそばに来たら引き寄せてくっつける。
  // 相手ごとに結びつく数 (C は 4, N は 3, O は 2, Cl は 1) まで集まると CH₄・NH₃・H₂O・HCl になる
  private attractHydrogenToPartners() {
    const partners = this.particles.filter(p => p.kind === 'element' && !p.pinned && HYDROGEN_PARTNERS[p.symbolOrId] !== undefined);
    if (partners.length === 0) return;

    // 水素原子ごとに、いちばん近い相手を決める
    const claims = new Map<Particle, { h: Particle; d: number }[]>();
    for (const h of this.particles) {
      if (h.kind !== 'element' || h.symbolOrId !== 'H' || h.pinned) continue;
      let best: Particle | null = null;
      let bestD = HYDROGEN_ATTRACT_RADIUS;
      for (const partner of partners) {
        const d = Math.hypot(h.x - partner.x, h.y - partner.y);
        if (d < bestD) {
          bestD = d;
          best = partner;
        }
      }
      if (best) {
        const list = claims.get(best) ?? [];
        list.push({ h, d: bestD });
        claims.set(best, list);
      }
    }

    // 相手ごとに、近い順に結びつく数まで引き寄せる (原子の表面に並ぶように)
    for (const [partner, list] of claims) {
      list.sort((a, b) => a.d - b.d);
      for (const { h, d } of list.slice(0, HYDROGEN_PARTNERS[partner.symbolOrId])) {
        const rest = partner.radius + h.radius * 0.8;
        const ux = d > 0.01 ? (h.x - partner.x) / d : 0;
        const uy = d > 0.01 ? (h.y - partner.y) / d : -1;
        const tx = partner.x + ux * rest;
        const ty = partner.y + uy * rest;
        h.vx = partner.vx + (tx - h.x) * 0.3;
        h.vy = partner.vy + (ty - h.y) * 0.3;
      }
    }
  }

  // 指示薬の粒子ごとに周りの液性 (pH) を求め、色を少しずつ変える
  public updateIndicators() {
    for (const p of this.particles) {
      if (p.kind !== 'compound') continue;
      const info = COMPOUNDS_DATA[p.symbolOrId]?.indicator;
      if (!info) continue;

      const targetPh = computeLocalPh(this.getIndicatorSurroundings(p));
      p.indicatorPh = p.indicatorPh === undefined ? targetPh : p.indicatorPh + (targetPh - p.indicatorPh) * 0.35;
      if (Math.abs(p.indicatorPh - targetPh) < 0.05) p.indicatorPh = targetPh;

      const color = getIndicatorColor(info, p.indicatorPh);
      p.color = color;
      p.secondaryColor = color;

      const phClass = classifyPh(p.indicatorPh);
      if (phClass !== p.indicatorClass) {
        const isFirst = p.indicatorClass === undefined;
        p.indicatorClass = phClass;
        if (!isFirst) {
          this.addEffect('sparkles', p.x, p.y, color, 20);
        }
        this.onIndicatorChange?.(p, phClass, isFirst);
      }
    }
  }

  // 指示薬の色を決める周りの粒子: 容器の中なら同じ容器の中身全体、外なら近くの粒子
  private getIndicatorSurroundings(p: Particle): Particle[] {
    if (p.containerId) {
      return this.particles.filter(o => o !== p && o.containerId === p.containerId);
    }
    return this.particles.filter(o =>
      o !== p && o.containerId === null && Math.hypot(o.x - p.x, o.y - p.y) <= INDICATOR_RADIUS
    );
  }

  // 炭や鉄粉は高温で燃えて金色〜オレンジの火花を散らす (線香花火・しだれ柳の金色の尾と同じ光)
  private emitGoldSparks(p: Particle, chance: number) {
    if (p.kind !== 'element' || !GOLD_SPARK_ELEMENTS.includes(p.symbolOrId)) return;
    if (p.temperature < GOLD_SPARK_TEMP || Math.random() >= chance) return;
    this.addEffect('sparkles', p.x + (Math.random() - 0.5) * 10, p.y - 4, Math.random() < 0.5 ? '#FCD34D' : '#F97316', 20);
    this.onGoldSparks?.(p.symbolOrId);
  }

  // バーナー加熱ツール (粒子およびフラスコを加熱)
  public applyHeat(x: number, y: number, radius: number, tempIncrease: number = 30) {
    // 粒子の加熱
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        const falloff = 1 - (dist / (radius + p.radius));
        p.temperature = Math.min(MAX_HEAT_TEMP, p.temperature + tempIncrease * falloff);
        p.updateStateByTemperature();
        // 温まった液体・気体は対流で上がる (固体まで浮かせると、まわりの粒子から離れて反応できなくなる)
        if (p.state !== 'solid') p.vy -= 0.3 * falloff;

        this.emitGoldSparks(p, 0.4);

        // 炎色反応の発生判定 (>180°C)
        if (p.temperature > 180 && Math.random() < 0.4) {
          const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);
          if (flameInfo) {
            this.onFlameTest?.(flameInfo.elementSymbol);
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
        c.temperature = Math.min(MAX_HEAT_TEMP, c.temperature + tempIncrease * falloff * 0.8);
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

  // 電気の通しやすさ。電解質はイオンが動けるとき (水に溶けている・融けている) だけ電気を通す。
  // 固体の食塩や気体の塩化水素はそのままでは通さず、純水もほとんど通さない
  public getConductivity(p: Particle): Conductivity {
    if (p.kind === 'element') {
      if (p.symbolOrId === 'C') return 'graphite'; // 炭素 (黒鉛)
      const el = ELEMENTS_DATA[p.symbolOrId];
      return el && METAL_CATEGORIES.includes(el.category) ? 'metal' : 'insulator';
    }
    if (p.kind !== 'compound') return 'insulator';
    if (p.symbolOrId === 'H2O') {
      if (p.state !== 'liquid') return 'insulator';
      return this.getNeighbors(p, ELECTROLYTE_WATER_RADIUS).some(n => ELECTROLYTES.includes(n.symbolOrId))
        ? 'ionic_water'
        : 'pure_water';
    }
    if (!ELECTROLYTES.includes(p.symbolOrId)) return 'insulator';
    return p.state === 'liquid' || this.hasLiquidWaterNear(p) ? 'electrolyte' : 'electrolyte_dry';
  }

  public isConductor(p: Particle): boolean {
    return CONDUCTING.includes(this.getConductivity(p));
  }

  private hasLiquidWaterNear(p: Particle): boolean {
    return this.getNeighbors(p, ELECTROLYTE_WATER_RADIUS).some(n => n.symbolOrId === 'H2O' && n.state === 'liquid');
  }

  // ジュール熱: 金属や炭素は通電で赤熱するほど熱くなるが、水溶液などの電解質は少し温まるだけ
  // (水が沸騰して水蒸気になったり、食塩が融けたりすると電気分解の実験にならない)
  private applyJouleHeat(p: Particle, amount: number) {
    if (p.kind === 'compound') {
      if (p.temperature < ELECTROLYTE_JOULE_MAX_TEMP) {
        p.temperature = Math.min(ELECTROLYTE_JOULE_MAX_TEMP, p.temperature + amount * ELECTROLYTE_JOULE_RATIO);
      }
    } else {
      p.temperature += amount;
    }
    p.updateStateByTemperature();
  }

  // 通電・電気分解ツール (Electrolysis & Conduction)
  public applyElectric(x: number, y: number, radius: number = 40): {
    decomposedCount: number;
    conductedCount: number;
    ozonizedCount: number;
    createdCompounds: string[];
    triggeredReactionIds: string[]; // この放電で起きた反応ルールID (図鑑の発見記録用・重複なし)
    pureWaterOnly: boolean; // 純水だけに通電して何も起きなかった (博士がヒントを出す)
  } {
    let decomposedCount = 0;
    let conductedCount = 0;
    let ozonizedCount = 0;
    const createdCompounds: string[] = [];
    const triggeredReactionIds = new Set<string>();

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

    // 放電前から存在する酸素分子 (同じ放電で水の電気分解から生じたO2は対象外)
    const oxygenTargets = hitParticles.filter(p => p.kind === 'compound' && p.symbolOrId === 'O2');

    for (const p of hitParticles) {
      if (this.isConductor(p)) {
        // ジュール熱 (通電による温度上昇)
        this.applyJouleHeat(p, 18 + Math.random() * 20);
        conductedCount++;

        // 近傍の導電粒子への放電アーク連鎖
        const neighbors = this.getNeighbors(p, 60);
        for (const n of neighbors) {
          if (n !== p && this.isConductor(n)) {
            this.applyJouleHeat(n, 12);
            conductedCount++;
            if (Math.random() < 0.6) {
              this.addEffect('electric_arc', p.x, p.y, '#38BDF8', 16, '#C084FC', n.x, n.y);
            }
          }
        }
      }
    }

    // --- 電気分解 (Electrolysis): 原子の数が保存されるよう、反応式どおりの組で変換する ---
    const unused = (p: Particle) => p.kind === 'compound' && this.particles.includes(p);
    const pick = (sym: string, extra: (p: Particle) => boolean = () => true) =>
      hitParticles.filter(p => unused(p) && p.symbolOrId === sym && extra(p));
    const convert = (p: Particle, kind: 'element' | 'compound', sym: string, vy: number) => {
      p.kind = kind;
      p.symbolOrId = sym;
      p.applyData();
      p.updateStateByTemperature();
      p.vy = vy;
      if (kind === 'compound') createdCompounds.push(sym);
    };
    const spawnGas = (sym: string, at: Particle, vy: number) => {
      const g = new Particle(`elec_${this.nextElectrolysisId++}`, 'compound', sym, at.x + (Math.random() - 0.5) * 8, at.y - 4, at.temperature);
      g.containerId = at.containerId;
      g.vy = vy;
      this.addParticle(g);
      createdCompounds.push(sym);
    };
    const hasLiquidWaterNear = (p: Particle) => this.hasLiquidWaterNear(p);

    // ① 食塩水の電気分解: 2NaCl + 2H₂O → 2NaOH + H₂ + Cl₂
    const brineSalt = pick('NaCl', p => p.state === 'solid' && hasLiquidWaterNear(p));
    const brineWater = pick('H2O', p => p.state === 'liquid');
    while (brineSalt.length >= 2 && brineWater.length >= 2 && Math.random() < 0.7) {
      const [s1, s2] = brineSalt.splice(0, 2);
      const [w1, w2] = brineWater.splice(0, 2);
      convert(s1, 'compound', 'NaOH', 0);
      convert(s2, 'compound', 'NaOH', 0);
      convert(w1, 'compound', 'H2', -2 - Math.random() * 2);
      convert(w2, 'compound', 'Cl2', -0.7 - Math.random());
      decomposedCount += 2;
      triggeredReactionIds.add('brine_electrolysis');
      this.addEffect('sparkles', s1.x, s1.y, '#FDE047', 18);
    }

    // ② 融解塩電解: 2NaCl(融解) → 2Na + Cl₂ (固体の食塩はイオンが動けず電流を通さない)
    const moltenSalt = pick('NaCl', p => p.state === 'liquid');
    while (moltenSalt.length >= 2 && Math.random() < 0.7) {
      const [s1, s2] = moltenSalt.splice(0, 2);
      convert(s1, 'element', 'Na', 0.4);
      convert(s2, 'element', 'Na', 0.4);
      spawnGas('Cl2', s1, -0.8);
      decomposedCount += 2;
      triggeredReactionIds.add('salt_electrolysis');
      this.addEffect('sparkles', s1.x, s1.y, '#FDE047', 18);
    }

    // ③ 水の電気分解: 2H₂O → 2H₂ + O₂ (気体の体積比 2:1)
    // 純水はほとんど電気を通さないので、水酸化ナトリウムなどが溶けている水だけが分解する (溶かした物質は変化しない)
    // 食塩が2個以上残っている水は食塩水として①で分解するので、ふつうの水の電気分解には使わない
    const waterNearSalt = (p: Particle) => this.getNeighbors(p, ELECTROLYTE_WATER_RADIUS).some(n => brineSalt.includes(n));
    const hasElectrolysisAid = (p: Particle) =>
      this.getNeighbors(p, ELECTROLYTE_WATER_RADIUS).some(n => WATER_ELECTROLYSIS_AIDS.includes(n.symbolOrId));
    const liquidWater = pick('H2O', p => p.state === 'liquid' && (brineSalt.length < 2 || !waterNearSalt(p)));
    const water = liquidWater.filter(hasElectrolysisAid);
    const pureWaterOnly = liquidWater.length > 0 && water.length === 0 && decomposedCount === 0;
    while (water.length >= 2 && Math.random() < 0.75) {
      const [w1, w2] = water.splice(0, 2);
      convert(w1, 'compound', 'H2', -2 - Math.random() * 2);
      convert(w2, 'compound', 'H2', -2 - Math.random() * 2);
      spawnGas('O2', w1, -1 - Math.random() * 1.5);
      decomposedCount += 2;
      triggeredReactionIds.add('water_electrolysis');
      this.addEffect('sparkles', w1.x, w1.y, '#38BDF8', 18);
    }

    // ④ 塩化銅の電気分解: CuCl₂ → Cu + Cl₂ (陰極に赤褐色の銅が析出、陽極から黄緑色の塩素)
    // 水溶液 (水のそば) か融けた塩化銅だけ。乾いた固体はイオンが動けず電流が流れない
    for (const p of pick('CuCl2', p => p.state === 'liquid' || hasLiquidWaterNear(p))) {
      if (Math.random() >= 0.8) continue;
      convert(p, 'element', 'Cu', 0.6);
      spawnGas('Cl2', p, -0.7 - Math.random());
      decomposedCount++;
      triggeredReactionIds.add('copper_chloride_electrolysis');
      this.addEffect('sparkles', p.x, p.y, '#2DD4BF', 22);
    }

    // --- 無声放電によるオゾン生成: 3O2 -> 2O3 (酸素分子3個ごとにオゾン2個) ---
    for (let i = 0; i + 2 < oxygenTargets.length; i += 3) {
      if (Math.random() >= 0.6) continue;
      const [o1, o2, o3] = oxygenTargets.slice(i, i + 3);
      for (const p of [o1, o2]) {
        p.symbolOrId = 'O3';
        p.applyData();
        p.state = 'gas';
        p.vy = -0.3 - Math.random() * 0.5;
        createdCompounds.push('O3');
        this.addEffect('sparkles', p.x, p.y, '#93C5FD', 18);
      }
      this.removeParticle(o3);
      ozonizedCount++;
      triggeredReactionIds.add('ozone_generation');
    }

    return {
      decomposedCount,
      conductedCount,
      ozonizedCount,
      pureWaterOnly,
      createdCompounds,
      triggeredReactionIds: Array.from(triggeredReactionIds)
    };
  }

  // 点火・スパークツール
  public applySpark(x: number, y: number, radius: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < radius + p.radius) {
        p.temperature = Math.max(p.temperature, 600);
        p.updateStateByTemperature();

        this.emitGoldSparks(p, 1);

        // 点火時の即時炎色反応
        const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);
        if (flameInfo) {
          this.onFlameTest?.(flameInfo.elementSymbol);
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
        // コンテナ内部の粒子を解放
        for (const p of this.particles) {
          if (p.containerId === c.id) {
            p.containerId = null;
          }
        }
        this.containers.splice(i, 1);
        erasedCount++;
      }
    }

    // 天秤の消去
    for (let i = this.balances.length - 1; i >= 0; i--) {
      const b = this.balances[i];
      let hit = Math.hypot(b.cx - x, b.cy - y) < radius + 45;
      if (!hit) {
        hit = (
          x >= b.bounds.minX - 10 &&
          x <= b.bounds.maxX + 10 &&
          y >= b.bounds.minY - 10 &&
          y <= b.bounds.maxY + 10
        );
      }
      if (hit) {
        // この天秤に乗っていたフラスコの支持を解除して落下可能にする
        for (const c of this.containers) {
          if (c.supportedByBalanceId === b.id) {
            c.supportedByBalanceId = null;
            c.supportedByPanSide = null;
          }
        }
        this.balances.splice(i, 1);
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
    // 爆発時の画面揺れ
    ctx.save();
    if (this.shakeTime > 0 && this.shakeIntensity > 0.1) {
      ctx.translate(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity
      );
    }

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
      } else if (eff.type === 'smoke') {
        // もくもくと立ち上る白煙 (複数の煙玉が上昇しながら膨らむ)
        for (let b = 0; b < 5; b++) {
          const bx = Math.sin(b * 2.4 + eff.lifetime * 0.08) * r * 0.35;
          const by = -progress * r * (0.8 + b * 0.25) + (b - 2) * 3;
          const br = r * (0.35 + 0.12 * b) * (0.7 + progress * 0.6);
          const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          grad.addColorStop(0, `rgba(241, 245, 249, ${alpha * 0.75})`);
          grad.addColorStop(0.6, `rgba(203, 213, 225, ${alpha * 0.4})`);
          grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (eff.type === 'glow') {
        // 発熱による赤熱グロー
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, `rgba(254, 215, 170, ${alpha * 0.8})`);
        grad.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.45})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
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

    // 4. 精密上皿天秤の描画
    this.drawBalances(ctx);

    // 5. 粒子描画 (ガラス容器・天秤の内側/前景に描画)
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    // 5.5 飛散するガラス片
    this.drawGlassShards(ctx);

    // 5.6 花火 (夜空・花火・色と元素の対応ラベル)
    this.fireworks.draw(ctx, this.chamber, sym => fireworkLabelText(sym), t().fireworks.willowTrailLabel);

    // 6. 密閉実験チャンバーの前面・フレーム・ヘッダー・排気ファン描画
    this.drawChamberForeground(ctx);

    ctx.restore();
  }

  private drawGlassShards(ctx: CanvasRenderingContext2D) {
    for (const g of this.glassShards) {
      const fadeStart = g.maxLifetime * 0.7;
      const alpha = g.lifetime < fadeStart ? 1 : Math.max(0, 1 - (g.lifetime - fadeStart) / (g.maxLifetime - fadeStart));
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(g.points[0].x, g.points[0].y);
      for (let v = 1; v < g.points.length; v++) {
        ctx.lineTo(g.points[v].x, g.points[v].y);
      }
      ctx.closePath();
      if (g.color) {
        // 壁のかけら: 壁と同じ色の不透明な破片
        ctx.fillStyle = g.color;
        ctx.fill();
        ctx.strokeStyle = g.edgeColor ?? 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      // ガラスのきらめき
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(g.points[0].x * 0.5, g.points[0].y * 0.5);
      ctx.lineTo(g.points[1].x * 0.5, g.points[1].y * 0.5);
      ctx.stroke();
      ctx.restore();
    }
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
    const tr = t();
    const lang = getLanguage();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(tr.chamber.title, ch.minX + 14, headerY + headerH / 2);

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
    let statusText = tr.chamber.cleanStatus;
    let statusBg = 'rgba(16, 185, 129, 0.25)';
    let statusBorder = '#10B981';
    let statusColor = '#6EE7B7';

    if (ch.toxicLevel > 0.05) {
      const comp = ch.dominantToxicCompound ? COMPOUNDS_DATA[ch.dominantToxicCompound] : undefined;
      const toxicName = comp ? getCompoundName(comp, lang) : (ch.dominantToxicCompound || (lang === 'en' ? 'Toxic Gas' : '有毒物質'));
      statusText = tr.chamber.toxicAlert(toxicName, ch.dominantToxicCompound || '');
      statusBg = 'rgba(239, 68, 68, 0.3)';
      statusBorder = '#EF4444';
      statusColor = '#FCA5A5';
    }

    ctx.font = 'bold 10px sans-serif';
    const statusTextWidth = ctx.measureText(statusText).width;
    const statusBadgeW = statusTextWidth + 16;
    const exhaustBtnW = lang === 'en' ? 70 : 60;
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
    ctx.fillText(ch.isExhausting ? tr.chamber.exhaustingBtn : tr.chamber.ventilateBtn, btnX + exhaustBtnW / 2, btnY + btnH / 2);

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

      // 2.5 内部に有毒ガスが存在する場合のガス色ベール
      let innerToxicGas: string | null = null;
      for (let pIdx = 0; pIdx < this.particles.length; pIdx++) {
        const p = this.particles[pIdx];
        if (p.containerId === c.id && p.state === 'gas' && p.isToxic) {
          innerToxicGas = p.symbolOrId;
          break;
        }
      }
      if (innerToxicGas) {
        let toxicVeilColor = 'rgba(234, 179, 8, 0.18)';
        if (innerToxicGas === 'Cl2' || innerToxicGas === 'HCl') {
          toxicVeilColor = 'rgba(163, 230, 53, 0.22)';
        } else if (innerToxicGas === 'NO2') {
          toxicVeilColor = 'rgba(180, 83, 9, 0.25)';
        } else if (innerToxicGas === 'O3') {
          toxicVeilColor = 'rgba(147, 197, 253, 0.22)';
        }
        ctx.fillStyle = toxicVeilColor;
        ctx.fill();
      }

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

      // 7. 蓋・栓 (Stopper / Cap / Watch Glass) の描画
      if (c.hasCap) {
        if (c.type === 'erlenmeyer') {
          const neckTop = c.cy - 110;

          // ガラス首の内部に差し込まれたコルク栓部分 (透過)
          ctx.fillStyle = 'rgba(180, 83, 9, 0.7)';
          ctx.beginPath();
          ctx.moveTo(c.cx - 14, neckTop);
          ctx.lineTo(c.cx - 12, neckTop + 15);
          ctx.lineTo(c.cx + 12, neckTop + 15);
          ctx.lineTo(c.cx + 14, neckTop);
          ctx.closePath();
          ctx.fill();

          // 口から飛び出ているコルク栓の頭部
          const corkGrad = ctx.createLinearGradient(c.cx - 18, neckTop - 20, c.cx + 18, neckTop);
          corkGrad.addColorStop(0, '#F59E0B');
          corkGrad.addColorStop(0.4, '#D97706');
          corkGrad.addColorStop(1, '#92400E');
          ctx.fillStyle = corkGrad;
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(c.cx - 15, neckTop + 1);
          ctx.lineTo(c.cx - 19, neckTop - 18);
          // コルク上部の丸み
          ctx.quadraticCurveTo(c.cx, neckTop - 22, c.cx + 19, neckTop - 18);
          ctx.lineTo(c.cx + 15, neckTop + 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // コルクのテクスチャ (スジ・木目)
          ctx.strokeStyle = 'rgba(120, 53, 15, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c.cx - 12, neckTop - 8);
          ctx.lineTo(c.cx + 10, neckTop - 9);
          ctx.moveTo(c.cx - 14, neckTop - 14);
          ctx.lineTo(c.cx + 12, neckTop - 15);
          ctx.stroke();

          // つまみリング / グリップ
          ctx.fillStyle = '#FDE68A';
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(c.cx, neckTop - 22, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 密閉ロックバッジ (小さく表示)
          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('🔒', c.cx, neckTop - 24);
        } else if (c.type === 'testtube') {
          const top = c.cy - 105;

          // 試験管内のコルク下部
          ctx.fillStyle = 'rgba(180, 83, 9, 0.7)';
          ctx.beginPath();
          ctx.moveTo(c.cx - 15, top);
          ctx.lineTo(c.cx - 13, top + 14);
          ctx.lineTo(c.cx + 13, top + 14);
          ctx.lineTo(c.cx + 15, top);
          ctx.closePath();
          ctx.fill();

          // コルク頭部
          const corkGrad = ctx.createLinearGradient(c.cx - 19, top - 18, c.cx + 19, top);
          corkGrad.addColorStop(0, '#F59E0B');
          corkGrad.addColorStop(0.4, '#D97706');
          corkGrad.addColorStop(1, '#92400E');
          ctx.fillStyle = corkGrad;
          ctx.strokeStyle = '#78350F';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(c.cx - 15, top + 1);
          ctx.lineTo(c.cx - 19, top - 18);
          ctx.quadraticCurveTo(c.cx, top - 21, c.cx + 19, top - 18);
          ctx.lineTo(c.cx + 15, top + 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('🔒', c.cx, top - 23);
        } else if (c.type === 'beaker') {
          const top = c.cy - 90;

          // ビーカー用時計皿 (Watch Glass)
          ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(c.cx - 48, top + 2);
          ctx.quadraticCurveTo(c.cx, top - 12, c.cx + 48, top + 2);
          ctx.quadraticCurveTo(c.cx, top - 6, c.cx - 48, top + 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 時計皿のガラスつまみ
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.arc(c.cx, top - 10, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText('🔒', c.cx, top - 15);
        }
      } else {
        // 未装着時: 口の上に控えめな半透明の蓋ガイド (タップで蓋・密閉できることを視覚的に案内)
        if (c.type === 'erlenmeyer') {
          const neckTop = c.cy - 110;
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(c.cx - 15, neckTop);
          ctx.lineTo(c.cx - 18, neckTop - 14);
          ctx.quadraticCurveTo(c.cx, neckTop - 18, c.cx + 18, neckTop - 14);
          ctx.lineTo(c.cx + 15, neckTop);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (c.type === 'testtube') {
          const top = c.cy - 105;
          ctx.save();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(c.cx - 15, top);
          ctx.lineTo(c.cx - 18, top - 14);
          ctx.quadraticCurveTo(c.cx, top - 17, c.cx + 18, top - 14);
          ctx.lineTo(c.cx + 15, top);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  // 精密上皿天秤の描画処理 (台座・支柱・目盛り盤・指針・アーム・水平皿・リアルタイムHUD)
  private drawBalances(ctx: CanvasRenderingContext2D) {
    const lang = getLanguage();
    for (const b of this.balances) {
      ctx.save();

      const pivotX = b.cx;
      const pivotY = b.cy - b.pillarHeight;

      // 1. 台座 (Base)
      const baseW = 140;
      const baseH = 14;
      const baseX = b.cx - baseW / 2;
      const baseY = b.cy - baseH;

      // 台座の接地シャドウ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(baseX - 4, baseY + 2, baseW + 8, baseH + 4, 6);
      } else {
        ctx.rect(baseX - 4, baseY + 2, baseW + 8, baseH + 4);
      }
      ctx.fill();

      // 台座本体 (メタリックグラデーション)
      const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseH);
      baseGrad.addColorStop(0, '#475569');
      baseGrad.addColorStop(0.3, '#334155');
      baseGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = baseGrad;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(baseX, baseY, baseW, baseH, 4);
      } else {
        ctx.rect(baseX, baseY, baseW, baseH);
      }
      ctx.fill();
      ctx.stroke();

      // 台座の調整足 (スクリューつまみ)
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.fillRect(baseX + 12, b.cy - 3, 14, 5);
      ctx.strokeRect(baseX + 12, b.cy - 3, 14, 5);
      ctx.fillRect(baseX + baseW - 26, b.cy - 3, 14, 5);
      ctx.strokeRect(baseX + baseW - 26, b.cy - 3, 14, 5);

      // 中央の丸形水平器
      const levelX = b.cx;
      const levelY = baseY + 7;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(levelX, levelY, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84CC16'; // 蛍光グリーンの液体
      ctx.beginPath();
      ctx.arc(levelX, levelY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(levelX, levelY, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 2. 中央支柱 (Pillar)
      const pillarW = 12;
      const pillarX = b.cx - pillarW / 2;

      const pillarGrad = ctx.createLinearGradient(pillarX, 0, pillarX + pillarW, 0);
      pillarGrad.addColorStop(0, '#B45309');
      pillarGrad.addColorStop(0.3, '#F59E0B');
      pillarGrad.addColorStop(0.7, '#FCD34D');
      pillarGrad.addColorStop(1, '#92400E');
      ctx.fillStyle = pillarGrad;
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillarX, pivotY, pillarW, b.cy - baseH - pivotY, 3);
      } else {
        ctx.rect(pillarX, pivotY, pillarW, b.cy - baseH - pivotY);
      }
      ctx.fill();
      ctx.stroke();

      // 3. 目盛り盤 (Index Scale Plate) & 指針 (Pointer)
      const plateY = pivotY + 28;
      const plateW = 56;
      const plateH = 24;
      const plateGrad = ctx.createLinearGradient(b.cx - plateW / 2, plateY, b.cx + plateW / 2, plateY + plateH);
      plateGrad.addColorStop(0, '#FEF3C7');
      plateGrad.addColorStop(0.5, '#FDE68A');
      plateGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = plateGrad;
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(b.cx - plateW / 2, plateY, plateW, plateH, [0, 0, 10, 10]);
      } else {
        ctx.rect(b.cx - plateW / 2, plateY, plateW, plateH);
      }
      ctx.fill();
      ctx.stroke();

      // 目盛り線
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 0.8;
      for (let m = -4; m <= 4; m++) {
        const mx = b.cx + m * 5.5;
        const my1 = plateY + 2;
        const my2 = plateY + (m === 0 ? 12 : (m % 2 === 0 ? 8 : 5));
        ctx.beginPath();
        ctx.moveTo(mx, my1);
        ctx.lineTo(mx, my2);
        ctx.stroke();
      }
      ctx.fillStyle = '#78350F';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0', b.cx, plateY + 19);

      // 指針 (Pointer needle) - 天秤の傾きに応じて振れる
      const needleAngle = -b.angle * 2.8;
      const needleLen = 22;
      ctx.save();
      ctx.translate(b.cx, pivotY + 14);
      ctx.rotate(needleAngle);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, needleLen);
      ctx.stroke();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, needleLen, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ピボット軸受 (ルビーベアリング)
      ctx.fillStyle = '#E11D48';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4. ビーム (梁 / Arm) - 傾き角 b.angle で回転
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(b.angle);

      const armL = b.armLength;
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-armL, 0);
      ctx.lineTo(armL, 0);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-armL + 10, 0);
      ctx.quadraticCurveTo(0, 10, armL - 10, 0);
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-armL, 0, 3.5, 0, Math.PI * 2);
      ctx.arc(armL, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // 5. 垂直支持ロッド & 上皿 (Pans) - 常に水平！
      const drawPanAssembly = (pan: BalancePan, isLeft: boolean) => {
        const px = pan.cx;
        const py = pan.cy;
        const armEndX = isLeft
          ? pivotX - b.armLength * Math.cos(b.angle)
          : pivotX + b.armLength * Math.cos(b.angle);
        const armEndY = isLeft
          ? pivotY - b.armLength * Math.sin(b.angle)
          : pivotY + b.armLength * Math.sin(b.angle);

        // 垂直支持ロッド
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(armEndX, armEndY);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // 皿 (Pan)
        const pw = 40;
        const lipH = 14;

        const panGrad = ctx.createLinearGradient(px, py - lipH, px, py);
        panGrad.addColorStop(0, 'rgba(226, 232, 240, 0.35)');
        panGrad.addColorStop(0.7, 'rgba(148, 163, 184, 0.55)');
        panGrad.addColorStop(1, 'rgba(100, 116, 139, 0.7)');
        ctx.fillStyle = panGrad;

        ctx.beginPath();
        ctx.moveTo(px - pw - 3, py - lipH);
        ctx.quadraticCurveTo(px - pw, py, px, py);
        ctx.quadraticCurveTo(px + pw, py, px + pw + 3, py - lipH);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isLeft ? '#38BDF8' : '#F43F5E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - pw - 3, py - lipH);
        ctx.quadraticCurveTo(px - pw, py, px, py);
        ctx.quadraticCurveTo(px + pw, py, px + pw + 3, py - lipH);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - pw + 4, py - 2);
        ctx.lineTo(px + pw - 4, py - 2);
        ctx.stroke();
      };

      drawPanAssembly(b.leftPan, true);
      drawPanAssembly(b.rightPan, false);

      // 6. リアルタイム質量HUDバッジ
      // 左皿HUD
      const hasLeftFlask = this.containers.some(c => c.supportedByBalanceId === b.id && c.supportedByPanSide === 'left');
      const leftHudY = hasLeftFlask ? b.leftPan.cy - 128 : b.leftPan.cy - 46;
      ctx.save();
      const leftMassStr = b.leftPan.totalMass.toFixed(2);
      let leftSummary = '';
      if (b.leftPan.composition.length > 0) {
        leftSummary = b.leftPan.composition.map(c => `${c.displayName}×${c.count}`).join(' ');
        if (leftSummary.length > 14) leftSummary = leftSummary.substring(0, 13) + '…';
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = b.leftPan.totalMass > 0 ? '#38BDF8' : '#64748B';
      ctx.lineWidth = 1.2;
      const bW = 86;
      const bH = leftSummary ? 32 : 20;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(b.leftPan.cx - bW / 2, leftHudY - bH / 2, bW, bH, 6);
      } else {
        ctx.rect(b.leftPan.cx - bW / 2, leftHudY - bH / 2, bW, bH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (leftSummary) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px sans-serif';
        ctx.fillText(leftSummary, b.leftPan.cx, leftHudY - 6);
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${leftMassStr} u`, b.leftPan.cx, leftHudY + 7);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px monospace';
        ctx.fillText(`${leftMassStr} u`, b.leftPan.cx, leftHudY);
      }
      ctx.restore();

      // 右皿HUD
      const hasRightFlask = this.containers.some(c => c.supportedByBalanceId === b.id && c.supportedByPanSide === 'right');
      const rightHudY = hasRightFlask ? b.rightPan.cy - 128 : b.rightPan.cy - 46;
      ctx.save();
      const rightMassStr = b.rightPan.totalMass.toFixed(2);
      let rightSummary = '';
      if (b.rightPan.composition.length > 0) {
        rightSummary = b.rightPan.composition.map(c => `${c.displayName}×${c.count}`).join(' ');
        if (rightSummary.length > 14) rightSummary = rightSummary.substring(0, 13) + '…';
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = b.rightPan.totalMass > 0 ? '#F43F5E' : '#64748B';
      ctx.lineWidth = 1.2;
      const rbH = rightSummary ? 32 : 20;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(b.rightPan.cx - bW / 2, rightHudY - rbH / 2, bW, rbH, 6);
      } else {
        ctx.rect(b.rightPan.cx - bW / 2, rightHudY - rbH / 2, bW, rbH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (rightSummary) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px sans-serif';
        ctx.fillText(rightSummary, b.rightPan.cx, rightHudY - 6);
        ctx.fillStyle = '#F43F5E';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${rightMassStr} u`, b.rightPan.cx, rightHudY + 7);
      } else {
        ctx.fillStyle = '#64748B';
        ctx.font = '10px monospace';
        ctx.fillText(`${rightMassStr} u`, b.rightPan.cx, rightHudY);
      }
      ctx.restore();

      // 中央上部ステータスバッジ
      ctx.save();
      const centerHudY = pivotY - 24;
      const diff = b.rightPan.totalMass - b.leftPan.totalMass;
      const absDiff = Math.abs(diff);

      let statusText = '';
      let statusColor = '#38BDF8';
      let statusBg = 'rgba(15, 23, 42, 0.88)';

      if (b.isLocked) {
        statusText = lang === 'ja' ? '🔒 固定中 (Locked)' : '🔒 Locked';
        statusColor = '#F59E0B';
      } else if (b.leftPan.totalMass === 0 && b.rightPan.totalMass === 0) {
        statusText = lang === 'ja' ? '⚖️ 上皿天秤 (空)' : '⚖️ Pan Balance';
        statusColor = '#94A3B8';
      } else if (absDiff < 0.05) {
        statusText = lang === 'ja' ? '🟢 つり合い (Balanced)' : '🟢 Balanced';
        statusColor = '#10B981';
      } else if (diff < 0) {
        statusText = lang === 'ja' ? `◀ 左が重い (Δ ${absDiff.toFixed(1)})` : `◀ Left heavier (Δ ${absDiff.toFixed(1)})`;
        statusColor = '#38BDF8';
      } else {
        statusText = lang === 'ja' ? `右が重い ▶ (Δ ${absDiff.toFixed(1)})` : `Right heavier ▶ (Δ ${absDiff.toFixed(1)})`;
        statusColor = '#F43F5E';
      }

      ctx.font = 'bold 10px sans-serif';
      const textW = ctx.measureText(statusText).width;
      const cbW = Math.max(100, textW + 16);
      const cbH = 20;

      ctx.fillStyle = statusBg;
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(b.cx - cbW / 2, centerHudY - cbH / 2, cbW, cbH, 10);
      } else {
        ctx.rect(b.cx - cbW / 2, centerHudY - cbH / 2, cbW, cbH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = statusColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(statusText, b.cx, centerHudY);
      ctx.restore();

      ctx.restore();
    }
  }
}

