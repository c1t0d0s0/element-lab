import { ELEMENTS_DATA, getAtomicRenderRadius } from '../data/elements';
import { COMPOUNDS_DATA, PhClass } from '../data/compounds';
import { getLanguage } from '../i18n';
import { getWallType, WALL_BLOCK, WallType } from '../data/walls';
import { getIonForm } from '../data/ions';

export type ParticleKind = 'element' | 'compound' | 'wall';
export type MatterState = 'solid' | 'liquid' | 'gas';
export type PhaseChange = 'melting' | 'boiling' | 'sublimating' | 'condensing' | 'freezing' | 'depositing';

// 状態変化に必要な熱 (温度に換算した値, °C)。融点・沸点に達しても、この分の熱を吸収 (冷やすときは放出) し終えるまで
// 温度はそこで止まり、状態は変わらない (沸騰している間は温度が一定、という中学1年の学習内容)
export const LATENT_HEAT_MELT = 100;
export const LATENT_HEAT_BOIL = 300;

const STATE_RANK: Record<MatterState, number> = { solid: 0, liquid: 1, gas: 2 };

// 元素の原子量を足した式量。化合物データの丸めた分子量ではなくこちらを使うので、反応の前後で質量の合計がぴったり同じになる
// (質量保存の法則を天秤で確かめるとき、表示が 0.01 ずれたりしない)。原子量のない元素をふくむときは null
function formulaMass(elements: Record<string, number>): number | null {
  let mass = 0;
  for (const [sym, n] of Object.entries(elements)) {
    const el = ELEMENTS_DATA[sym];
    if (!el) return null;
    mass += el.molarMass * n;
  }
  return mass > 0 ? mass : null;
}

export class Particle {
  public id: string;
  public kind: ParticleKind;
  public symbolOrId: string;
  private baseDisplayName: string = '';
  private displayNameEn?: string; // 英語表示のときだけ使うラベル (リトマス紙の略称など)
  public get displayName(): string {
    return this.displayNameEn && getLanguage() === 'en' ? this.displayNameEn : this.baseDisplayName;
  }
  public set displayName(name: string) {
    this.baseDisplayName = name;
    this.displayNameEn = undefined;
  }
  public nameJa: string = '';
  public nameEn: string = '';
  
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 12;
  public molarMass: number = 28;
  
  public temperature: number = 25; // 常温 25°C
  public state: MatterState = 'solid';
  // いま進んでいる状態変化でたくわえた熱 (°C換算)。正: 融解・蒸発・昇華の向き、負: 凝固・凝縮の向き
  public latentHeat: number = 0;
  public meltingPoint: number = 0;
  public boilingPoint: number = 100;
  
  public color: string = '#FFFFFF';
  public secondaryColor: string = '#94A3B8';
  public isToxic: boolean = false;
  public toxicWarning?: string;
  
  public isRedHot: boolean = false;
  public rustProgress: number = 0; // 鉄のサビ進行度 (0.0 〜 1.0)
  public heatOfSolutionReleased: boolean = false; // 溶解熱を放出済みか (溶質1粒子につき1回)
  public dissolved: boolean = false; // 水に溶けて水溶液の中に散らばっているか (食塩・砂糖など溶解度のある物質)
  public ionized: boolean = false; // 電解質が水に溶けて (融けて) イオンに分かれているか。イオンの粒として描く
  public ionDrift: number = 0; // 電極に電流を流したとき、イオンが電極へ移動した割合 (0〜1)
  public effervescence: number = 0; // 泡となって出てきた気体が、液体から勢いよく上がっていく残りフレーム数
  public stuckToElectrode: string | null = null; // 陰極にくっついている (電気分解で出てきた銅)。その容器のID
  public ionPoles: { cathodeX: number; anodeX: number; minY: number; maxY: number } | null = null; // 引き寄せられる電極の位置
  public age: number = 0;
  public indicatorPh?: number; // 指示薬が感じている周りの pH (指示薬のみ)
  public indicatorClass?: PhClass; // 指示薬の現在の液性 (指示薬のみ)
  public pinned: boolean = false; // 壁用
  public cracked: boolean = false; // 壁にひびが入っているか (ひびの入った壁は弱い爆発でも壊れる)
  public containerId: string | null = null; // 容器内部閉じ込め追跡用
  
  constructor(
    id: string,
    kind: ParticleKind,
    symbolOrId: string,
    x: number,
    y: number,
    initialTemp: number = 25
  ) {
    this.id = id;
    this.kind = kind;
    this.symbolOrId = symbolOrId;
    this.x = x;
    this.y = y;
    this.temperature = initialTemp;
    
    this.applyData();
  }

  public applyData() {
    if (this.kind === 'element') {
      const el = ELEMENTS_DATA[this.symbolOrId];
      if (el) {
        this.displayName = el.symbol;
        this.nameJa = el.nameJa;
        this.nameEn = el.nameEn;
        this.radius = getAtomicRenderRadius(el.atomicRadius);
        this.molarMass = el.molarMass;
        this.meltingPoint = el.meltingPoint;
        this.boilingPoint = el.boilingPoint;
        this.color = el.color;
        this.secondaryColor = el.secondaryColor || el.color;
        this.updateStateByTemperature(true);
      } else {
        this.displayName = this.symbolOrId;
        this.nameJa = this.symbolOrId;
        this.nameEn = this.symbolOrId;
      }
    } else if (this.kind === 'compound') {
      const comp = COMPOUNDS_DATA[this.symbolOrId];
      if (comp) {
        this.displayName = comp.formula;
        this.displayNameEn = comp.formulaEn;
        this.nameJa = comp.nameJa;
        this.nameEn = comp.nameEn;
        this.radius = comp.renderRadius;
        this.molarMass = formulaMass(comp.elements) ?? comp.molarMass;
        this.meltingPoint = comp.meltingPoint;
        this.boilingPoint = comp.boilingPoint;
        this.color = comp.color;
        this.secondaryColor = comp.secondaryColor || comp.color;
        this.isToxic = !!comp.isToxic;
        this.toxicWarning = comp.toxicWarning;
        this.updateStateByTemperature(true);
      } else {
        this.displayName = this.symbolOrId;
        this.nameJa = this.symbolOrId;
        this.nameEn = this.symbolOrId;
      }
    } else if (this.kind === 'wall') {
      if (this.symbolOrId === 'flask_glass' || this.symbolOrId === 'glass') {
        this.displayName = '';
        this.nameJa = '耐熱ガラス (フラスコ)';
        this.nameEn = 'Borosilicate Glass (Flask)';
        this.radius = 8;
        this.molarMass = 2000;
        this.color = 'rgba(186, 230, 253, 0.45)';
        this.secondaryColor = '#38BDF8';
        this.state = 'solid';
        this.pinned = true;
        this.meltingPoint = 1200;
        this.boilingPoint = 2500;
      } else {
        // 壁ブロック (木・れんが・コンクリート・耐熱壁)
        const wt = getWallType(this.symbolOrId);
        this.displayName = '🧱';
        this.nameJa = wt.nameJa;
        this.nameEn = wt.nameEn;
        this.radius = WALL_BLOCK / 2;
        this.molarMass = 1000;
        this.color = wt.color;
        this.secondaryColor = wt.edgeColor;
        this.state = 'solid';
        this.pinned = true;
        this.meltingPoint = 9999;
        this.boilingPoint = 9999;
      }
    }
  }

  // 温度に合わせて状態を変える。instant のときは潜熱を考えずにすぐ切り替える (置いた直後や、反応で物質が変わったとき)
  public updateStateByTemperature(instant: boolean = false) {
    if (this.pinned) return;

    if (instant) {
      this.state = this.stateAt(this.temperature);
      this.latentHeat = 0;
    } else {
      this.advancePhaseChange();
    }

    // 鉄 (Fe) の赤熱判定 (500℃以上で発光)
    if (this.symbolOrId === 'Fe' && this.temperature >= 450) {
      this.isRedHot = true;
    } else {
      this.isRedHot = false;
    }
  }

  // 進行中の状態変化 (インスペクター表示用)
  public get phaseChange(): PhaseChange | null {
    if (this.latentHeat > 0) {
      if (this.state === 'solid') return this.sublimes ? 'sublimating' : 'melting';
      if (this.state === 'liquid') return 'boiling';
    } else if (this.latentHeat < 0) {
      if (this.state === 'gas') return this.sublimes ? 'depositing' : 'condensing';
      if (this.state === 'liquid') return 'freezing';
    }
    return null;
  }

  // 画面に出す温度。状態変化の途中は、融点・沸点ちょうど (加熱や冷却で少しずれた分は、次の更新で潜熱になる)
  public get displayTemperature(): number {
    const change = this.phaseChange;
    if (change === 'melting' || change === 'freezing') return this.meltingPoint;
    if (change) return this.boilingPoint;
    return this.temperature;
  }

  // 融点が沸点以上の物質 (ヒ素・塩化アルミニウムなど) は液体にならず、沸点 (昇華点) で固体から直接気体になる
  private get sublimes(): boolean {
    return this.meltingPoint >= this.boilingPoint;
  }

  private stateAt(t: number): MatterState {
    if (this.sublimes) return t < this.boilingPoint ? 'solid' : 'gas';
    if (t < this.meltingPoint) return 'solid';
    return t < this.boilingPoint ? 'liquid' : 'gas';
  }

  // 今の状態から温度を上げたとき・下げたときに変わる先の状態と、その境目の温度・必要な熱
  private stepUp(state: MatterState): { next: MatterState; at: number; heat: number } | null {
    if (state === 'solid') {
      return this.sublimes
        ? { next: 'gas', at: this.boilingPoint, heat: LATENT_HEAT_MELT + LATENT_HEAT_BOIL }
        : { next: 'liquid', at: this.meltingPoint, heat: LATENT_HEAT_MELT };
    }
    if (state === 'liquid') return { next: 'gas', at: this.boilingPoint, heat: LATENT_HEAT_BOIL };
    return null;
  }

  private stepDown(state: MatterState): { next: MatterState; at: number; heat: number } | null {
    if (state === 'gas') {
      return this.sublimes
        ? { next: 'solid', at: this.boilingPoint, heat: LATENT_HEAT_MELT + LATENT_HEAT_BOIL }
        : { next: 'liquid', at: this.boilingPoint, heat: LATENT_HEAT_BOIL };
    }
    if (state === 'liquid') return { next: 'solid', at: this.meltingPoint, heat: LATENT_HEAT_MELT };
    return null;
  }

  // 境目を越えた分の温度を潜熱としてたくわえ、必要な熱がたまったら状態を変える
  private advancePhaseChange() {
    for (let guard = 0; guard < 4; guard++) {
      const target = this.stateAt(this.temperature);
      const up = this.stepUp(this.state);
      const down = this.stepDown(this.state);
      if (STATE_RANK[target] > STATE_RANK[this.state] && up) {
        if (this.latentHeat < 0) this.latentHeat = 0;
        this.latentHeat += this.temperature - up.at;
        this.temperature = up.at;
        if (this.latentHeat < up.heat) return;
        this.temperature = up.at + (this.latentHeat - up.heat);
        this.state = up.next;
        this.latentHeat = 0;
      } else if (STATE_RANK[target] < STATE_RANK[this.state] && down) {
        if (this.latentHeat > 0) this.latentHeat = 0;
        this.latentHeat -= down.at - this.temperature;
        this.temperature = down.at;
        if (-this.latentHeat < down.heat) return;
        this.temperature = down.at - (-this.latentHeat - down.heat);
        this.state = down.next;
        this.latentHeat = 0;
      } else {
        // 状態変化の途中で温度が戻ったときは、たくわえた熱を温度に戻す
        if (this.latentHeat > 0 && up && this.temperature < up.at) {
          const back = Math.min(this.latentHeat, up.at - this.temperature);
          this.latentHeat -= back;
          this.temperature += back;
        } else if (this.latentHeat < 0 && down && this.temperature > down.at) {
          const back = Math.min(-this.latentHeat, this.temperature - down.at);
          this.latentHeat += back;
          this.temperature -= back;
        }
        return;
      }
    }
  }

  // イオンの粒を描く (ctx は粒の中心に移動ずみ)。電流が流れていると、陽イオンは陰極へ、陰イオンは陽極へ寄っていく
  private drawIons(ctx: CanvasRenderingContext2D): boolean {
    const form = this.kind === 'compound' ? getIonForm(this.symbolOrId) : undefined;
    if (!form) return false;
    const n = form.ions.length;
    const spread = Math.max(5, this.radius * 0.55);
    // 粒ごとに向きを変え、ゆっくり回して水の中で動いているように見せる
    const phase = (this.id.length * 1.7 + this.id.charCodeAt(this.id.length - 1)) % (Math.PI * 2);
    const turn = phase + this.age * 0.015;
    const drift = this.ionPoles ? this.ionDrift * this.ionDrift * (3 - 2 * this.ionDrift) : 0; // なめらかに動き出して止まる
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    form.ions.forEach((ion, i) => {
      const angle = turn + (i / n) * Math.PI * 2;
      let ix = Math.cos(angle) * spread;
      let iy = Math.sin(angle) * spread;
      if (this.ionPoles && drift > 0) {
        const { cathodeX, anodeX, minY, maxY } = this.ionPoles;
        // 電極のすぐ横に集まる。同じ粒のイオンが重ならないよう、上下に少しずらす
        const targetX = (ion.charge > 0 ? cathodeX : anodeX) - this.x;
        const targetY = Math.max(minY, Math.min(maxY, this.y + iy * 1.5)) - this.y;
        ix += (targetX - ix) * drift;
        iy += (targetY - iy) * drift;
      }
      ctx.font = 'bold 8px sans-serif';
      const r = Math.max(7.5, ctx.measureText(ion.label).width / 2 + 2);
      ctx.fillStyle = ion.color;
      ctx.strokeStyle = ion.charge > 0 ? '#EF4444' : '#3B82F6';
      ctx.beginPath();
      ctx.arc(ix, iy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.fillText(ion.label, ix, iy + 0.5);
    });
    return true;
  }

  public draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 赤熱時の発光グロー効果
    if (this.isRedHot) {
      const glowIntensity = Math.min(1, (this.temperature - 400) / 600);
      const glowRadius = this.radius * (1.5 + glowIntensity * 0.8);
      const glowGrad = ctx.createRadialGradient(0, 0, this.radius * 0.8, 0, 0, glowRadius);
      glowGrad.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
      glowGrad.addColorStop(0.6, 'rgba(255, 50, 0, 0.4)');
      glowGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 有毒ガス (CO, HCl等) の警告オーラ
    if (this.isToxic && this.state === 'gas') {
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4 + Math.sin(this.age * 0.1) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // イオンに分かれた粒: 陽イオン (赤いふち) と陰イオン (青いふち) を別々の小さな粒として描く
    if (this.ionized && this.drawIons(ctx)) {
      ctx.restore();
      return;
    }

    // 水に溶けた粒: 小さく薄く描く (目には見えにくくなるが、なくなったわけではない)
    if (this.dissolved) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.secondaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 粒子本体の描画
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

    if (this.kind === 'wall') {
      if (this.symbolOrId === 'flask_glass' || this.symbolOrId === 'glass') {
        // 耐熱ガラス壁の美しい質感 (つややかな半透明シアン＋ハイライト)
        const glassGrad = ctx.createRadialGradient(
          -this.radius * 0.3,
          -this.radius * 0.3,
          this.radius * 0.1,
          0,
          0,
          this.radius
        );
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glassGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.6)');
        glassGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.5)');
        glassGrad.addColorStop(1, 'rgba(2, 132, 199, 0.8)');

        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ガラス光沢スポット
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.35, -this.radius * 0.35, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return;
      }

      drawWallBlock(ctx, getWallType(this.symbolOrId), this.radius, Math.round(this.y / WALL_BLOCK), this.cracked, this.id);
      ctx.restore();
      return;
    }

    // 赤熱鉄の場合は色をオレンジ〜白熱色に変化
    let fillColor = this.color;
    if (this.isRedHot) {
      const heatFactor = Math.min(1, (this.temperature - 450) / 700);
      fillColor = heatFactor > 0.6 ? '#FEF08A' : '#F97316';
    } else if (this.symbolOrId === 'Fe' && this.rustProgress > 0) {
      // サビ進行に応じた変色 (灰色 -> 赤褐色)
      fillColor = '#B45309';
    }

    // 状態（固体・液体・気体）に応じたグラデーション
    const grad = ctx.createRadialGradient(
      -this.radius * 0.3,
      -this.radius * 0.3,
      this.radius * 0.1,
      0,
      0,
      this.radius
    );

    if (this.state === 'gas') {
      // 気体: ぼんやりした透過グラデーション
      grad.addColorStop(0, fillColor);
      grad.addColorStop(0.7, this.secondaryColor);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      ctx.globalAlpha = 0.85;
    } else if (this.state === 'liquid') {
      // 液体: つやのあるドロップ
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.3, fillColor);
      grad.addColorStop(1, this.secondaryColor);
      ctx.globalAlpha = 0.95;
    } else {
      // 固体: はっきりとした球体
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, fillColor);
      grad.addColorStop(1, this.secondaryColor);
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = grad;
    ctx.fill();

    // 輪郭線
    ctx.strokeStyle = this.isRedHot ? '#FBBF24' : this.secondaryColor;
    ctx.lineWidth = this.state === 'liquid' ? 1.5 : (this.state === 'gas' ? 1 : 2);
    ctx.stroke();

    // ラベル (元素記号 / 化学式)
    ctx.fillStyle = '#0F172A';
    ctx.font = `bold ${Math.max(8, Math.min(14, Math.round(this.radius * 0.85)))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 背景の小さな文字縁取りで見やすく
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText(this.displayName, 0, 0);
    ctx.fillText(this.displayName, 0, 0);

    // 水（H2O）の温度状態アイコン表示 (氷の結晶または蒸気マーク)
    if (this.symbolOrId === 'H2O') {
      if (this.state === 'solid') {
        // 氷マーク (❄)
        ctx.fillStyle = '#E0F2FE';
        ctx.font = '10px sans-serif';
        ctx.fillText('❄', this.radius * 0.6, -this.radius * 0.6);
      } else if (this.state === 'gas') {
        // 蒸気マーク (♨)
        ctx.fillStyle = '#BAE6FD';
        ctx.font = '10px sans-serif';
        ctx.fillText('♨', this.radius * 0.6, -this.radius * 0.6);
      }
    }

    ctx.restore();
  }
}

// 文字列から決まる 0〜1 の疑似乱数 (ブロックごとに木目やひびの形を変える。毎フレーム同じ形になる)
function seeded(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (n * 374761393), 668265263);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// 壁ブロックの描画。強度ごとに模様を変え、隣のブロックとつながって1枚の壁に見えるよう四角いっぱいに描く
export function drawWallBlock(ctx: CanvasRenderingContext2D, wt: WallType, r: number, row: number, cracked: boolean, seed: string) {
  const size = r * 2;
  ctx.fillStyle = wt.color;
  ctx.fillRect(-r, -r, size, size);

  if (wt.pattern === 'wood') {
    // 木: 横板の継ぎ目と木目
    ctx.strokeStyle = wt.edgeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.55)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const y0 = -r + 4 + k * r + seeded(seed, k) * 3;
      ctx.beginPath();
      ctx.moveTo(-r, y0);
      ctx.bezierCurveTo(-r * 0.3, y0 - 2, r * 0.3, y0 + 2, r, y0);
      ctx.stroke();
    }
  } else if (wt.pattern === 'brick') {
    // れんが: 2段の横目地と、段ごとに互い違いの縦目地
    ctx.strokeStyle = wt.edgeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r, -r + 0.75);
    ctx.lineTo(r, -r + 0.75);
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    // 上の段と下の段で縦目地の位置を半分ずらす (ブロックの行ごとにも入れ替えて、壁全体で互い違いにする)
    const even = ((row % 2) + 2) % 2 === 0;
    const upperJoint = even ? 0 : -r + 0.75;
    const lowerJoint = even ? -r + 0.75 : 0;
    ctx.moveTo(upperJoint, -r);
    ctx.lineTo(upperJoint, 0);
    ctx.moveTo(lowerJoint, 0);
    ctx.lineTo(lowerJoint, r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(-r, -r + 1.5, size, 2);
  } else if (wt.pattern === 'concrete') {
    // コンクリート: 小さな粒模様
    ctx.fillStyle = 'rgba(55, 65, 81, 0.45)';
    for (let k = 0; k < 7; k++) {
      const px = -r + 2 + seeded(seed, k * 2) * (size - 4);
      const py = -r + 2 + seeded(seed, k * 2 + 1) * (size - 4);
      ctx.fillRect(px, py, 1.6, 1.6);
    }
    ctx.strokeStyle = wt.edgeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(-r + 0.5, -r + 0.5, size - 1, size - 1);
  } else {
    // 耐熱壁: 今までの濃い灰青の板に、四隅のびょう
    ctx.strokeStyle = wt.edgeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r, -r, size, size);
    ctx.fillStyle = '#94A3B8';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.arc(sx * (r - 4), sy * (r - 4), 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (cracked) {
    // ひび: ブロックを斜めに走るジグザグの線
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.85)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const startX = -r + seeded(seed, 20) * r;
    ctx.moveTo(startX, -r);
    let x = startX;
    for (let k = 1; k <= 4; k++) {
      x += (seeded(seed, 20 + k) - 0.3) * r * 0.7;
      ctx.lineTo(Math.max(-r, Math.min(r, x)), -r + (size * k) / 4);
    }
    ctx.stroke();
  }
}
