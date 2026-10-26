import { getFlameReactionInfo } from '../data/elements';
import { soundManager } from './AudioEffects';

// 花火工房で使える炎色の元素 (炎色反応を一度見ると使えるようになる)
export const FIREWORK_ELEMENTS = ['Sr', 'Li', 'Ca', 'Na', 'Ba', 'Cu', 'K', 'Cs', 'Rb', 'B', 'Mg'];
export const MAX_FIREWORK_COLORS = 3;

export type FireworkShape = 'chrysanthemum' | 'peony' | 'willow' | 'double';

export interface FireworkDesign {
  symbols: string[]; // 炎色の元素 (1〜3個)
  shape: FireworkShape;
  count: number; // 打ち上げ数 (1 またはスターマインの5)
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Shell {
  x: number;
  y: number;
  vy: number;
  burstY: number;
  delay: number; // 打ち上げまでの待ちフレーム
  design: FireworkDesign;
  launched: boolean;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  size: number;
  trail: { x: number; y: number }[];
  trailLength: number;
  glitter: boolean; // 燃え尽きぎわに火の粉を散らす
}

// 星のまわりの火の粉 (打ち上げ中の尾・燃え尽きぎわのきらめき)
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

// 開いた瞬間の閃光
interface Flash {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
}

// 破裂した花火の色と元素の対応ラベル (例: 🔴 Sr = 紅色)
export interface BurstLabel {
  symbols: string[];
  life: number;
}

const LABEL_LIFETIME = 150;
const FLASH_LIFETIME = 14;
const MAX_SPARKS = 1500;

// 色ごとの光のにじみ (放射グラデーションの画像) を使い回す
const glowCache = new Map<string, HTMLCanvasElement>();
function getGlowSprite(color: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  let sprite = glowCache.get(color);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const g = sprite.getContext('2d')!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, color + '88');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    glowCache.set(color, sprite);
  }
  return sprite;
}

// 実験チャンバーの中で打ち上げる花火 (粒子物理とは独立した見た目だけの仕組み)
export class FireworksShow {
  private shells: Shell[] = [];
  public stars: Star[] = [];
  public sparks: Spark[] = [];
  private flashes: Flash[] = [];
  public labels: BurstLabel[] = [];
  private darkness: number = 0; // 夜空の暗さ (0〜1)
  private skyGlow: number = 0; // 開いた瞬間に空が明るくなる度合い (0〜1)
  private skyGlowColor: string = '#FFFFFF';
  public onBurst?: (design: FireworkDesign) => void;

  public launch(design: FireworkDesign, bounds: Bounds) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    for (let i = 0; i < design.count; i++) {
      // スターマインは横に散らし、少しずつ時間をずらして打ち上げる
      const spread = design.count > 1 ? (i / (design.count - 1) - 0.5) * 0.6 : 0;
      this.shells.push({
        x: bounds.minX + width * (0.5 + spread) + (Math.random() - 0.5) * width * 0.08,
        y: bounds.maxY - 4,
        vy: 0,
        burstY: bounds.minY + height * (0.3 + Math.random() * 0.12),
        delay: i * 22,
        design,
        launched: false
      });
    }
  }

  public isActive(): boolean {
    return this.shells.length > 0 || this.stars.length > 0 || this.sparks.length > 0 || this.labels.length > 0;
  }

  public clear() {
    this.shells = [];
    this.stars = [];
    this.sparks = [];
    this.flashes = [];
    this.labels = [];
    this.darkness = 0;
    this.skyGlow = 0;
  }

  private addSpark(spark: Spark) {
    if (this.sparks.length < MAX_SPARKS) this.sparks.push(spark);
  }

  public update(bounds: Bounds) {
    const active = this.shells.length > 0 || this.stars.length > 0;
    this.darkness += ((active ? 0.82 : 0) - this.darkness) * 0.05;
    if (this.darkness < 0.01 && !active) this.darkness = 0;
    this.skyGlow *= 0.88;

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      if (s.delay > 0) {
        s.delay--;
        continue;
      }
      if (!s.launched) {
        s.launched = true;
        // burstY に届く初速 (v² = 2gh より少し強め)
        s.vy = -Math.sqrt(2 * 0.12 * (s.y - s.burstY)) - 0.5;
        soundManager.playFireworkLaunch(0.9);
      }
      s.y += s.vy;
      s.vy += 0.12;
      s.x += Math.sin(s.y * 0.08) * 0.3;
      // 上昇中の金色の火の粉
      for (let k = 0; k < 2; k++) {
        this.addSpark({
          x: s.x + (Math.random() - 0.5) * 2,
          y: s.y + 4,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.3 + Math.random() * 0.6,
          color: '#FCD34D',
          life: 0,
          maxLife: 14 + Math.random() * 10
        });
      }
      if (s.vy >= 0 || s.y <= s.burstY) {
        this.burst(s, bounds);
        this.shells.splice(i, 1);
      }
    }

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const st = this.stars[i];
      st.trail.push({ x: st.x, y: st.y });
      if (st.trail.length > st.trailLength) st.trail.shift();
      st.vx *= st.drag;
      st.vy = st.vy * st.drag + st.gravity;
      st.x += st.vx;
      st.y += st.vy;
      st.life++;
      // 燃え尽きぎわにきらきらした火の粉を落とす
      if (st.glitter && st.life > st.maxLife * 0.45 && Math.random() < 0.18) {
        this.addSpark({
          x: st.x,
          y: st.y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.2 + Math.random() * 0.4,
          color: Math.random() < 0.5 ? '#FFFFFF' : st.color,
          life: 0,
          maxLife: 12 + Math.random() * 14
        });
      }
      if (st.life >= st.maxLife || st.y > bounds.maxY || st.x < bounds.minX || st.x > bounds.maxX) {
        this.stars.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.vy += 0.03;
      sp.x += sp.vx;
      sp.y += sp.vy;
      if (++sp.life >= sp.maxLife) this.sparks.splice(i, 1);
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      if (++this.flashes[i].life >= FLASH_LIFETIME) this.flashes.splice(i, 1);
    }

    for (let i = this.labels.length - 1; i >= 0; i--) {
      if (++this.labels[i].life >= LABEL_LIFETIME) this.labels.splice(i, 1);
    }
  }

  private burst(s: Shell, bounds: Bounds) {
    const colors = s.design.symbols.map(sym => getFlameReactionInfo('element', sym)?.flameColor ?? '#FDE047');
    if (colors.length === 0) colors.push('#FDE047');
    const shape = s.design.shape;
    // チャンバーの大きさに合わせて開く大きさを決める (高さの約3〜4割の半径)
    const height = bounds.maxY - bounds.minY;
    const baseSpeed = Math.max(3.5, height * 0.0125);

    const addStar = (angle: number, speed: number, color: string, opts: Partial<Star> = {}) => {
      this.stars.push({
        x: s.x,
        y: s.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 85 + Math.random() * 30,
        gravity: 0.04,
        drag: 0.965,
        size: 2.2,
        trail: [],
        trailLength: 10,
        glitter: false,
        ...opts
      });
    };
    // 球状に開いた星を正面から見た分布 (外側ほど星が密になり、立体的に見える)
    const sphereSpeed = (speed: number) => speed * Math.sqrt(1 - Math.pow(Math.random(), 2)) * (0.92 + Math.random() * 0.08);

    if (shape === 'chrysanthemum') {
      // 菊: 長い尾を引いて広がり、燃え尽きぎわにきらめく
      for (let k = 0; k < 140; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed), colors[k % colors.length], { glitter: k % 3 === 0 });
      }
    } else if (shape === 'peony') {
      // 牡丹: 尾のない大きな光の点で丸く開く
      for (let k = 0; k < 130; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed), colors[k % colors.length], {
          size: 3,
          trailLength: 2,
          glitter: k % 4 === 0
        });
      }
    } else if (shape === 'willow') {
      // 柳: 金色に光りながら、長くしだれ落ちる (先端だけ選んだ色)
      for (let k = 0; k < 110; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.8), k % 2 === 0 ? '#FCD34D' : colors[k % colors.length], {
          gravity: 0.055,
          drag: 0.975,
          trailLength: 24,
          maxLife: 150 + Math.random() * 40,
          glitter: true
        });
      }
    } else {
      // 二重芯: 外側の大きな輪は1色目、内側の小さな輪は2色目以降
      const innerColors = colors.length > 1 ? colors.slice(1) : colors;
      for (let k = 0; k < 90; k++) {
        addStar((k / 90) * Math.PI * 2 + Math.random() * 0.04, baseSpeed * (0.95 + Math.random() * 0.08), colors[0], { glitter: k % 3 === 0 });
      }
      for (let k = 0; k < 60; k++) {
        addStar((k / 60) * Math.PI * 2 + Math.random() * 0.05, baseSpeed * (0.45 + Math.random() * 0.05), innerColors[k % innerColors.length], {
          trailLength: 6,
          maxLife: 70 + Math.random() * 20
        });
      }
    }

    this.flashes.push({ x: s.x, y: s.y, radius: baseSpeed * 22, color: colors[0], life: 0 });
    this.skyGlow = 1;
    this.skyGlowColor = colors[0];
    this.labels = [{ symbols: s.design.symbols, life: 0 }];
    soundManager.playFireworkBurst();
    this.onBurst?.(s.design);
  }

  // 夜空・花火・色ラベルの描画。labelText は元素記号から表示文字列を作る
  public draw(ctx: CanvasRenderingContext2D, bounds: Bounds, labelText: (symbol: string) => string) {
    if (this.darkness <= 0 && !this.isActive()) return;
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.minX, bounds.minY, w, h);
    ctx.clip();

    if (this.darkness > 0) {
      ctx.fillStyle = `rgba(2, 6, 23, ${this.darkness})`;
      ctx.fillRect(bounds.minX, bounds.minY, w, h);
    }

    ctx.globalCompositeOperation = 'lighter';

    // 開いた瞬間、夜空全体がその色でほんのり明るくなる
    if (this.skyGlow > 0.02) {
      ctx.globalAlpha = this.skyGlow * 0.18;
      ctx.fillStyle = this.skyGlowColor;
      ctx.fillRect(bounds.minX, bounds.minY, w, h);
      ctx.globalAlpha = 1;
    }

    for (const f of this.flashes) {
      const t = f.life / FLASH_LIFETIME;
      const r = f.radius * (0.4 + t * 0.6);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - t)})`);
      grad.addColorStop(0.25, f.color + Math.round(150 * (1 - t)).toString(16).padStart(2, '0'));
      grad.addColorStop(1, f.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of this.shells) {
      if (!s.launched) continue;
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const sp of this.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - sp.life / sp.maxLife) * (Math.random() < 0.25 ? 0.3 : 1);
      ctx.fillStyle = sp.color;
      ctx.fillRect(sp.x - 1, sp.y - 1, 2, 2);
    }

    ctx.lineCap = 'round';
    for (const st of this.stars) {
      const progress = st.life / st.maxLife;
      const alpha = progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);
      // 終わりぎわにチカチカ瞬く
      const twinkle = progress > 0.75 && Math.random() < 0.35 ? 0.35 : 1;
      const a = alpha * twinkle;

      // 尾: 根元は細く薄く、先端に近いほど太く明るい (2段階で描いて先細りに見せる)
      if (st.trail.length > 1) {
        ctx.strokeStyle = st.color;
        const half = Math.floor(st.trail.length / 2);
        ctx.globalAlpha = a * 0.35;
        ctx.lineWidth = st.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(st.trail[0].x, st.trail[0].y);
        for (let i = 1; i <= half; i++) ctx.lineTo(st.trail[i].x, st.trail[i].y);
        ctx.stroke();
        ctx.globalAlpha = a * 0.8;
        ctx.lineWidth = st.size;
        ctx.beginPath();
        ctx.moveTo(st.trail[half].x, st.trail[half].y);
        for (let i = half + 1; i < st.trail.length; i++) ctx.lineTo(st.trail[i].x, st.trail[i].y);
        ctx.lineTo(st.x, st.y);
        ctx.stroke();
      }

      // 光のにじみ
      const glow = getGlowSprite(st.color);
      const gs = st.size * 6;
      if (glow) {
        ctx.globalAlpha = a * 0.7;
        ctx.drawImage(glow, st.x - gs / 2, st.y - gs / 2, gs, gs);
      }
      // 星本体: 開いた直後は白く、だんだん炎色反応の色になる
      ctx.globalAlpha = a;
      ctx.fillStyle = progress < 0.12 ? '#FFFFFF' : st.color;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.size * (progress < 0.12 ? 1.2 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 色と元素の対応ラベル (画面下)
    const label = this.labels[0];
    if (label) {
      const fade = Math.min(1, (LABEL_LIFETIME - label.life) / 30);
      ctx.globalAlpha = fade;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lineHeight = 22;
      const startY = bounds.maxY - 20 - (label.symbols.length - 1) * lineHeight;
      label.symbols.forEach((sym, i) => {
        const y = startY + i * lineHeight;
        const color = getFlameReactionInfo('element', sym)?.flameColor ?? '#FDE047';
        const text = labelText(sym);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const tw = ctx.measureText(text).width + 36;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(cx - tw / 2, y - 10, tw, 20);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx - tw / 2 + 12, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.fillText(text, cx + 8, y);
      });
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
