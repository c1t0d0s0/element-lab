import { ELEMENTS_DATA, getAtomicRenderRadius } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';

export type ParticleKind = 'element' | 'compound' | 'wall';

export class Particle {
  public id: string;
  public kind: ParticleKind;
  public symbolOrId: string;
  public displayName: string = '';
  public nameJa: string = '';
  
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 12;
  public molarMass: number = 28;
  
  public temperature: number = 25; // 常温 25°C
  public state: 'solid' | 'liquid' | 'gas' = 'solid';
  public meltingPoint: number = 0;
  public boilingPoint: number = 100;
  
  public color: string = '#FFFFFF';
  public secondaryColor: string = '#94A3B8';
  public isToxic: boolean = false;
  public toxicWarning?: string;
  
  public isRedHot: boolean = false;
  public rustProgress: number = 0; // 鉄のサビ進行度 (0.0 〜 1.0)
  public age: number = 0;
  public pinned: boolean = false; // 壁用
  
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
        this.radius = getAtomicRenderRadius(el.atomicRadius);
        this.molarMass = el.molarMass;
        this.meltingPoint = el.meltingPoint;
        this.boilingPoint = el.boilingPoint;
        this.color = el.color;
        this.secondaryColor = el.secondaryColor || el.color;
        this.updateStateByTemperature();
      } else {
        this.displayName = this.symbolOrId;
        this.nameJa = this.symbolOrId;
      }
    } else if (this.kind === 'compound') {
      const comp = COMPOUNDS_DATA[this.symbolOrId];
      if (comp) {
        this.displayName = comp.formula;
        this.nameJa = comp.nameJa;
        this.radius = comp.renderRadius;
        this.molarMass = comp.molarMass;
        this.meltingPoint = comp.meltingPoint;
        this.boilingPoint = comp.boilingPoint;
        this.color = comp.color;
        this.secondaryColor = comp.secondaryColor || comp.color;
        this.isToxic = !!comp.isToxic;
        this.toxicWarning = comp.toxicWarning;
        this.updateStateByTemperature();
      } else {
        this.displayName = this.symbolOrId;
        this.nameJa = this.symbolOrId;
      }
    } else if (this.kind === 'wall') {
      this.displayName = '🧱';
      this.nameJa = '耐熱壁';
      this.radius = 12;
      this.molarMass = 1000;
      this.color = '#475569';
      this.secondaryColor = '#334155';
      this.state = 'solid';
      this.pinned = true;
      this.meltingPoint = 9999;
      this.boilingPoint = 9999;
    }
  }

  public updateStateByTemperature() {
    if (this.pinned) return;

    if (this.temperature < this.meltingPoint) {
      this.state = 'solid';
    } else if (this.temperature < this.boilingPoint) {
      this.state = 'liquid';
    } else {
      this.state = 'gas';
    }

    // 鉄 (Fe) の赤熱判定 (500℃以上で発光)
    if (this.symbolOrId === 'Fe' && this.temperature >= 450) {
      this.isRedHot = true;
    } else {
      this.isRedHot = false;
    }
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

    // 粒子本体の描画
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

    if (this.kind === 'wall') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
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
