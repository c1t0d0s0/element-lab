import { getFlameReactionInfo } from '../data/elements';
import { REACTIONS_DATA } from '../data/reactions';
import { GameStats } from '../data/quests';
import { soundManager } from './AudioEffects';
import type { FireworkShot } from '../data/fireworkProgram';

// 花火工房で使える色の元素 = 実際の花火で使われる主な色剤 (炎色反応を一度見ると使えるようになる)
// 紅: ストロンチウム, 橙: カルシウム, 黄: ナトリウム, 緑: バリウム, 青緑: 銅, 白い輝き: マグネシウム
export const FIREWORK_ELEMENTS = ['Sr', 'Ca', 'Na', 'Ba', 'Cu', 'Mg'];

// マグネシウムは炎色反応を示さない。花火の白い輝きはマグネシウムが燃えるときの光なので、燃やすと使えるようになる
export const MAGNESIUM_WHITE_UNLOCK_REACTIONS = ['magnesium_combustion', 'magnesium_co2_combustion'];

export interface FireworkColorInfo {
  color: string;
  nameJa: string;
  nameEn: string;
}

const MAGNESIUM_WHITE: FireworkColorInfo = { color: '#FFFFFF', nameJa: '白い輝き (燃焼の光)', nameEn: 'Brilliant White (burning light)' };

// 花火の星の色 (炎色反応の色。マグネシウムだけは燃焼の光)
export function getFireworkColorInfo(symbol: string): FireworkColorInfo | null {
  if (symbol === 'Mg') return MAGNESIUM_WHITE;
  const flame = getFlameReactionInfo('element', symbol);
  if (!flame) return null;
  return { color: flame.flameColor, nameJa: flame.flameColorNameJa, nameEn: flame.flameColorNameEn ?? '' };
}

export function getFireworkColor(symbol: string): string {
  return getFireworkColorInfo(symbol)?.color ?? '#FDE047';
}

// マグネシウムの白は燃焼させると使える (以前の版で Mg の炎色反応として記録された分も引き継ぐ)
export function isMagnesiumWhiteUnlocked(stats: GameStats): boolean {
  if ((stats.flameTestsSeen?.['Mg'] || 0) > 0) return true;
  return REACTIONS_DATA.some(r =>
    MAGNESIUM_WHITE_UNLOCK_REACTIONS.includes(r.variantOf ?? r.id) && (stats.triggeredReactions[r.id] || 0) > 0
  );
}

export function isFireworkColorUnlocked(symbol: string, stats: GameStats): boolean {
  if (symbol === 'Mg') return isMagnesiumWhiteUnlocked(stats);
  return (stats.flameTestsSeen?.[symbol] || 0) > 0;
}

// しだれ柳の金色の尾は炎色反応ではなく、炭や鉄粉がゆっくり燃える光。炭や鉄を燃やすと柳が使えるようになる
export const WILLOW_UNLOCK_REACTIONS = ['carbon_complete_combustion', 'carbon_incomplete_combustion', 'iron_high_temp_oxidation'];
const WILLOW_TRAIL_COLORS = ['#FCD34D', '#F59E0B', '#FB923C'];

// 炭や鉄をバーナー・点火で燃やす (金色の火花を見る) か、炭・鉄の燃焼反応を起こすと使える
export function isWillowUnlocked(stats: GameStats): boolean {
  if (Object.values(stats.goldSparksSeen ?? {}).some(n => n > 0)) return true;
  return REACTIONS_DATA.some(r =>
    WILLOW_UNLOCK_REACTIONS.includes(r.variantOf ?? r.id) && (stats.triggeredReactions[r.id] || 0) > 0
  );
}
export const MAX_FIREWORK_COLORS = 3;

export type FireworkShape =
  | 'chrysanthemum' | 'peony' | 'willow' | 'double'
  | 'changing' | 'senrin' | 'palm' | 'kamuro' | 'heart' | 'saturn' | 'bee' | 'strobe';

// 炭・鉄粉の金色の尾を引く形 (柳と冠)。炭や鉄を燃やすと使えるようになる
export const GOLD_TRAIL_SHAPES: FireworkShape[] = ['willow', 'kamuro'];

export function isShapeUnlocked(shape: FireworkShape, stats: GameStats): boolean {
  return !GOLD_TRAIL_SHAPES.includes(shape) || isWillowUnlocked(stats);
}

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
  symbols: string[];
  shape: FireworkShape;
  size: number; // 開く大きさの倍率 (1 が標準)
  launched: boolean;
  showLabel: boolean; // 開いたときに画面下へ色と元素の説明 (炎色反応) を出すか
}

// 破裂した花火の色と形 (博士のセリフ・ラベル用)
export interface BurstInfo {
  symbols: string[];
  shape: FireworkShape;
}

// 発射プログラムの時刻 (秒) をフレーム数にする (60 fps)
const FRAMES_PER_SECOND = 60;

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
  trailColor?: string; // 尾と光のにじみの色 (柳の炭・鉄粉の金色)。なければ星の色
  trail: { x: number; y: number }[];
  trailLength: number;
  glitter: boolean; // 燃え尽きぎわに火の粉を散らす
  trailGlitter?: boolean; // 飛んでいる間ずっと、尾に沿ってきらきらした火の粉を残す (柳)
  colorStages?: string[]; // 変化菊: 寿命を等分して、この順に色が変わる
  childBurst?: ChildBurst; // 千輪: 燃え尽きたところで小さな花が開く
  wiggle?: number; // 蜂: 進む向きに対して横向きにぶれる強さ
  strobe?: { period: number; phase: number }; // 点滅: period フレームごとに、前半だけ光る
}

// 千輪の小さな花。sound は1発の千輪で共有し、破裂音が重なりすぎないように回数を数える
interface ChildBurst {
  count: number;
  speed: number;
  color: string;
  sound: { left: number };
}

// 点滅の星が今光っているか
export function isStarLit(st: { life: number; strobe?: { period: number; phase: number } }): boolean {
  if (!st.strobe) return true;
  return (st.life + st.strobe.phase) % st.strobe.period < st.strobe.period / 2;
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
  gravity?: number; // 未指定なら 0.03。柳の尾の火の粉はふわっと漂うように小さくする
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
  shape: FireworkShape;
  life: number;
}

// 型物・土星の玉が開いた瞬間の、星を並べた平面の向き。
// roll: 正面から見た回転 (0 でまっすぐ、π でさかさま)。tilt: 見る人に向かって傾いた角度 (0 で正面、π/2 で真横)。tiltAxis: 傾ける軸の向き
export interface ShellOrientation {
  roll: number;
  tilt: number;
  tiltAxis: number;
}

// 本物の型物花火のように、毎回ちがう向きで開く。
// 傾き: 正面に近いほど起こりやすいが、ときどき真横 (線に見える) になる。回転: まっすぐが多いが、横向き・さかさまもある
export function randomShellOrientation(rand: () => number = Math.random): ShellOrientation {
  const cosTilt = Math.pow(rand(), 0.6);
  return {
    roll: (rand() + rand() - 1) * Math.PI,
    tilt: Math.acos(cosTilt),
    tiltAxis: rand() * Math.PI * 2
  };
}

// 星を並べた平面上の点 (x, y) と、平面からの少しの浮き z を、向き o に回してから正面 (画面) に映す
export function projectShaped(x: number, y: number, z: number, o: ShellOrientation): { x: number; y: number } {
  // 1. 正面から見た回転
  const x1 = x * Math.cos(o.roll) - y * Math.sin(o.roll);
  const y1 = x * Math.sin(o.roll) + y * Math.cos(o.roll);
  // 2. 画面内の軸 u = (cos φ, sin φ, 0) のまわりに tilt だけ傾ける (ロドリゲスの回転公式)
  const ux = Math.cos(o.tiltAxis);
  const uy = Math.sin(o.tiltAxis);
  const c = Math.cos(o.tilt);
  const sn = Math.sin(o.tilt);
  const dot = ux * x1 + uy * y1;
  return {
    x: x1 * c + uy * z * sn + ux * dot * (1 - c),
    y: y1 * c - ux * z * sn + uy * dot * (1 - c)
  };
}

const LABEL_LIFETIME = 150;
const FLASH_LIFETIME = 14;
const MAX_SPARKS = 3000;

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
  public onBurst?: (info: BurstInfo) => void;

  // 1発・スターマイン: 同じ色と形の花火を、横に散らして少しずつ時間をずらして打ち上げる
  public launch(design: FireworkDesign, bounds: Bounds) {
    const shots: FireworkShot[] = [];
    for (let i = 0; i < design.count; i++) {
      const spread = design.count > 1 ? (i / (design.count - 1) - 0.5) * 60 : 0;
      shots.push({
        time: (i * 22) / FRAMES_PER_SECOND,
        colors: design.symbols,
        shape: design.shape,
        size: 100,
        x: 50 + spread + (Math.random() - 0.5) * 8,
        height: 58 + Math.random() * 12
      });
    }
    this.launchShots(shots, bounds, true);
  }

  // 発射プログラム: 1発ずつ、打ち上げ時刻・左右の位置 (%)・開く高さ (床から %)・大きさ (%) を指定して打ち上げる。
  // showLabels が false なら、開くたびの色の説明 (炎色反応) を出さない (カスタムの花火大会を邪魔しないように)
  public launchShots(shots: FireworkShot[], bounds: Bounds, showLabels: boolean = true) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    for (const shot of shots) {
      this.shells.push({
        x: bounds.minX + width * Math.min(1, Math.max(0, shot.x / 100)),
        y: bounds.maxY - 4,
        vy: 0,
        burstY: bounds.maxY - height * Math.min(0.97, Math.max(0.05, shot.height / 100)),
        delay: Math.round(shot.time * FRAMES_PER_SECOND),
        symbols: shot.colors,
        shape: shot.shape,
        size: shot.size / 100,
        launched: false,
        showLabel: showLabels
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
        // 笛の音は、頂点 (破裂) に着くまでの時間だけ鳴らす
        soundManager.playFireworkLaunch(Math.min(2.5, -s.vy / 0.12 / FRAMES_PER_SECOND));
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
      // 蜂: 進む向きに対して横向きに押して、ジグザグに飛ばす
      if (st.wiggle) {
        const speed = Math.hypot(st.vx, st.vy) || 1;
        const push = st.wiggle * (Math.random() - 0.5) * 2;
        const { vx, vy } = st;
        st.vx += (-vy / speed) * push;
        st.vy += (vx / speed) * push;
      }
      st.x += st.vx;
      st.y += st.vy;
      st.life++;
      // 変化菊: 燃えるにつれて次の色の火薬の層が燃え出す
      if (st.colorStages) {
        st.color = st.colorStages[Math.min(st.colorStages.length - 1, Math.floor((st.life / st.maxLife) * st.colorStages.length))];
      }
      // 柳: 炭・鉄粉の燃えかすが尾に沿って残り、ゆっくり落ちながらきらめく
      if (st.trailGlitter && st.life > 4 && Math.random() < 0.4) {
        this.addSpark({
          x: st.x + (Math.random() - 0.5) * 2,
          y: st.y + (Math.random() - 0.5) * 2,
          vx: st.vx * 0.15 + (Math.random() - 0.5) * 0.15,
          vy: st.vy * 0.15 + Math.random() * 0.1,
          color: Math.random() < 0.3 ? '#FFFBEB' : WILLOW_TRAIL_COLORS[Math.floor(Math.random() * WILLOW_TRAIL_COLORS.length)],
          life: 0,
          maxLife: 28 + Math.random() * 24,
          gravity: 0.008
        });
      }
      // 燃え尽きぎわにきらきらした火の粉を落とす
      if (st.glitter && st.life > st.maxLife * 0.45 && Math.random() < 0.18) {
        this.addSpark({
          x: st.x,
          y: st.y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.2 + Math.random() * 0.4,
          color: Math.random() < 0.5 ? '#FFFFFF' : st.trailColor ?? st.color,
          life: 0,
          maxLife: 12 + Math.random() * 14
        });
      }
      if (st.life >= st.maxLife || st.y > bounds.maxY || st.x < bounds.minX || st.x > bounds.maxX) {
        if (st.childBurst && st.life >= st.maxLife) this.openChildBurst(st.x, st.y, st.childBurst);
        this.stars.splice(i, 1);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.vy += sp.gravity ?? 0.03;
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

  private addStar(x: number, y: number, angle: number, speed: number, color: string, opts: Partial<Star> = {}) {
    this.stars.push({
      x,
      y,
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
  }

  // 千輪の親の星が燃え尽きたところで、小さな花を開く
  private openChildBurst(x: number, y: number, child: ChildBurst) {
    const offset = Math.random() * Math.PI * 2;
    for (let k = 0; k < child.count; k++) {
      this.addStar(x, y, offset + (k / child.count) * Math.PI * 2, child.speed * (0.85 + Math.random() * 0.3), child.color, {
        size: 1.8,
        trailLength: 3,
        maxLife: 28 + Math.random() * 12,
        gravity: 0.03,
        glitter: k % 2 === 0
      });
    }
    this.flashes.push({ x, y, radius: child.speed * 14, color: child.color, life: 0 });
    if (child.sound.left > 0) {
      child.sound.left--;
      soundManager.playFireworkBurst();
    }
  }

  private burst(s: Shell, bounds: Bounds) {
    const colors = s.symbols.map(getFireworkColor);
    if (colors.length === 0) colors.push('#FDE047');
    const shape = s.shape;
    // チャンバーの大きさに合わせて開く大きさを決める (標準で高さの約3〜4割の半径)。発射プログラムのサイズで倍率をかける
    const height = bounds.maxY - bounds.minY;
    const baseSpeed = Math.max(3.5, height * 0.0125) * s.size;

    const addStar = (angle: number, speed: number, color: string, opts: Partial<Star> = {}) => this.addStar(s.x, s.y, angle, speed, color, opts);
    // 速度 (vx, vy) で星を出す (型物・土星の輪のように、形に沿って並べるとき用)
    const addStarVelocity = (vx: number, vy: number, color: string, opts: Partial<Star> = {}) =>
      addStar(Math.atan2(vy, vx), Math.hypot(vx, vy), color, opts);
    // 球状に開いた星を正面から見た分布 (外側ほど星が密になり、立体的に見える)
    const sphereSpeed = (speed: number) => speed * Math.sqrt(1 - Math.pow(Math.random(), 2)) * (0.92 + Math.random() * 0.08);
    // 型物・土星: 星は玉の中で平面に並べてあるが、玉は回りながら飛ぶので、開いた瞬間の平面の向きは毎回ちがう。
    // 平面を立体的に傾けてから正面に映すので、つぶれて見えたり、真横から見て線になったり、横向き・さかさまになったりする
    const orientation = randomShellOrientation();
    // 形の上の点 (x, y) を傾けて映した速度。星ごとに少しだけ立体的なばらつき (z) を入れる
    const shaped = (x: number, y: number, jitter: number = 0.04) => projectShaped(
      x * (1 + (Math.random() - 0.5) * jitter),
      y * (1 + (Math.random() - 0.5) * jitter),
      Math.hypot(x, y) * (Math.random() - 0.5) * jitter,
      orientation
    );

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
    } else if (shape === 'willow' || shape === 'kamuro') {
      // 柳: 炭・鉄粉がゆっくり燃える金色の尾を引いて、長くしだれ落ちる (先端の小さな光だけ選んだ炎色)
      // 冠: 柳より星が多く、空気にじゃまされにくい金色の尾が、冠のように長く空に残る
      const kamuro = shape === 'kamuro';
      for (let k = 0; k < (kamuro ? 180 : 110); k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * (kamuro ? 0.6 : 0.8)), colors[k % colors.length], {
          trailColor: WILLOW_TRAIL_COLORS[Math.floor(Math.random() * WILLOW_TRAIL_COLORS.length)],
          size: kamuro ? 1.6 : 1.8,
          gravity: kamuro ? 0.035 : 0.055,
          drag: kamuro ? 0.982 : 0.975,
          trailLength: kamuro ? 30 : 36,
          maxLife: kamuro ? 200 + Math.random() * 40 : 165 + Math.random() * 40,
          glitter: true,
          trailGlitter: !kamuro || k % 2 === 0
        });
      }
    } else if (shape === 'changing') {
      // 変化菊: 星に色の違う火薬を層にして詰めてあり、外側の層から順に燃えて色が変わる
      for (let k = 0; k < 140; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed), colors[0], {
          colorStages: colors.length > 1 ? colors : undefined,
          maxLife: 100 + Math.random() * 25,
          glitter: k % 3 === 0
        });
      }
    } else if (shape === 'senrin') {
      // 千輪: 小さな星が少し飛んで燃え尽きると、そこで小さな花がたくさんパチパチ開く
      const sound = { left: 3 };
      for (let k = 0; k < 30; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.7), colors[k % colors.length], {
          size: 1.4,
          trailLength: 4,
          maxLife: 40 + Math.random() * 25,
          childBurst: { count: 10, speed: baseSpeed * 0.22, color: colors[k % colors.length], sound }
        });
      }
    } else if (shape === 'palm') {
      // 椰子: 太い星が太い尾を引いて、ヤシの葉のように弧を描いて垂れる
      const fronds = 14;
      const offset = Math.random() * Math.PI * 2;
      for (let k = 0; k < fronds; k++) {
        addStar(offset + (k / fronds) * Math.PI * 2 + (Math.random() - 0.5) * 0.15, baseSpeed * (0.85 + Math.random() * 0.1), colors[k % colors.length], {
          size: 3.4,
          trailLength: 30,
          gravity: 0.06,
          drag: 0.97,
          maxLife: 110 + Math.random() * 20,
          glitter: true
        });
      }
    } else if (shape === 'heart') {
      // 型物 (ハート): ハートの形に並べた星が、その形のまま大きくなる。2色目以降は中の小さな星
      const outline = 72;
      for (let k = 0; k < outline; k++) {
        const t = (k / outline) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const p = shaped((hx / 17) * baseSpeed * 0.95, (hy / 17) * baseSpeed * 0.95);
        addStarVelocity(p.x, p.y, colors[0], { gravity: 0.02, trailLength: 6, glitter: k % 4 === 0 });
      }
      if (colors.length > 1) {
        for (let k = 0; k < 24; k++) {
          addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.25), colors[1 + (k % (colors.length - 1))], { gravity: 0.02, size: 1.8, trailLength: 3 });
        }
      }
    } else if (shape === 'saturn') {
      // 土星: 1色目の丸い玉のまわりに、輪 (2色目以降) が開く。輪の傾きで、細い楕円にも、まん丸にも、一本の線にも見える
      const ringColors = colors.length > 1 ? colors.slice(1) : colors;
      for (let k = 0; k < 90; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.55), colors[0], { glitter: k % 3 === 0 });
      }
      const ring = 70;
      for (let k = 0; k < ring; k++) {
        const a = (k / ring) * Math.PI * 2;
        const p = shaped(Math.cos(a) * baseSpeed * 1.05, Math.sin(a) * baseSpeed * 1.05);
        addStarVelocity(p.x, p.y, ringColors[k % ringColors.length], { trailLength: 8, glitter: k % 3 === 0 });
      }
    } else if (shape === 'bee') {
      // 蜂: 星がブーンとジグザグに飛び回って、すぐ燃え尽きる
      for (let k = 0; k < 40; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.8), colors[k % colors.length], {
          wiggle: 0.9,
          size: 1.8,
          trailLength: 14,
          drag: 0.975,
          gravity: 0.02,
          maxLife: 55 + Math.random() * 20,
          glitter: true
        });
      }
    } else if (shape === 'strobe') {
      // 点滅: 燃える・消えるをくり返す火薬の星が、チカチカ光りながらゆっくり落ちる
      for (let k = 0; k < 100; k++) {
        addStar(Math.random() * Math.PI * 2, sphereSpeed(baseSpeed * 0.75), colors[k % colors.length], {
          size: 2.4,
          trailLength: 1,
          gravity: 0.025,
          drag: 0.96,
          maxLife: 140 + Math.random() * 40,
          strobe: { period: 8 + Math.floor(Math.random() * 5), phase: Math.floor(Math.random() * 12) }
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
    if (s.showLabel) this.labels = [{ symbols: s.symbols, shape, life: 0 }];
    soundManager.playFireworkBurst();
    this.onBurst?.({ symbols: s.symbols, shape });
  }

  // 夜空・花火・色ラベルの描画。labelText は元素記号から表示文字列を作る。willowText は柳の金色の尾の説明
  public draw(ctx: CanvasRenderingContext2D, bounds: Bounds, labelText: (symbol: string) => string, willowText: string = '') {
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
      if (!isStarLit(st)) continue;
      const progress = st.life / st.maxLife;
      const alpha = progress < 0.7 ? 1 : Math.max(0, 1 - (progress - 0.7) / 0.3);
      // 終わりぎわにチカチカ瞬く
      const twinkle = progress > 0.75 && Math.random() < 0.35 ? 0.35 : 1;
      const a = alpha * twinkle;

      // 尾: 根元は細く薄く、先端に近いほど太く明るい (2段階で描いて先細りに見せる)
      if (st.trail.length > 1) {
        ctx.strokeStyle = st.trailColor ?? st.color;
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
      const glow = getGlowSprite(st.trailColor ?? st.color);
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
      const lines = label.symbols.map(sym => ({
        color: getFireworkColor(sym),
        text: labelText(sym)
      }));
      if (GOLD_TRAIL_SHAPES.includes(label.shape) && willowText) {
        lines.push({ color: WILLOW_TRAIL_COLORS[1], text: willowText });
      }
      const startY = bounds.maxY - 20 - (lines.length - 1) * lineHeight;
      lines.forEach(({ color, text }, i) => {
        const y = startY + i * lineHeight;
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
