import {
  BEAM_ENERGIES, BEAM_NUCLIDES, BeamEnergy, FusionReaction, Nuclide, TARGET_NUCLIDES
} from '../data/nuclearFusion';
import { FusionExperiment, SynthesizedAtom } from '../engine/FusionExperiment';
import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';
import { flashScale } from '../engine/Motion';

// 早送り: 現実の1秒あたりに進むシミュレーション時間 (秒)
const SPEEDS = [1, 60, 3600, 86400, 7 * 86400, 30.4375 * 86400];
const DEFAULT_SPEED_INDEX = 5;

// アニメーションの描画領域 (論理座標)
const CANVAS_W = 600;
const CANVAS_H = 180;
const BEAM_Y = 80;
const LINAC = { x: 14, w: 150 };
const TARGET_X = 250;
const SEPARATOR = { x: 300, w: 120 };
const DUMP = { x: 470, y: 152 };
const DETECTOR = { x: 566, y: 34 };
// 直線部分 (加速器 → 標的 → 分離器の入口) が経路全体に占める割合
const STRAIGHT_PART = 0.45;
const MAX_FLYING_PRODUCTS = 5;

interface FlyingNucleus {
  kind: 'beam' | 'product';
  u: number; // 経路上の位置 (0〜1)
  label?: string;
}

// 質量数は <sup> で書く (上付き数字の文字 ⁰⁴…は、フォントによっては表示されないため)
export function nuclideLabel(n: Nuclide): string {
  return `<sup class="acc-mass">${n.mass}</sup>${n.symbol}`;
}

// HTML を使えない所 (select の選択肢・canvas・title 属性) 用
export function nuclidePlain(n: Nuclide): string {
  return `${n.symbol}-${n.mass}`;
}

function elementName(symbol: string): string {
  const el = ELEMENTS_DATA[symbol];
  return el ? getElementName(el, getLanguage()) : symbol;
}

function atomicNumber(symbol: string): number {
  return ELEMENTS_DATA[symbol]?.number ?? 0;
}

// 加速器実験室: ビームを標的に当て、核融合で超重元素を合成する (確率は実際の実験と同じくらい小さい)
export class AcceleratorModal {
  private modalEl: HTMLElement;
  private beamIndex = BEAM_NUCLIDES.findIndex(n => n.symbol === 'Zn' && n.mass === 70);
  private targetIndex = TARGET_NUCLIDES.findIndex(n => n.symbol === 'Bi');
  private energy: BeamEnergy = 'optimal';
  private speedIndex = DEFAULT_SPEED_INDEX;
  private experiment: FusionExperiment;
  private running = false;
  private rafId: number | null = null;
  private lastFrame = 0;
  private flying: FlyingNucleus[] = [];
  private spawnAccumulator = 0;
  private detectorFlash = 0; // 検出器が光る残り時間 (秒)
  private targetSparks: { x: number; y: number; life: number }[] = [];
  // 検出器へ飛ばすのを待っている原子核のラベル (同時にできても重ならないよう、少しずつ間をあけて飛ばす)
  private productQueue: string[] = [];
  private productCooldown = 0;
  // まだラボに置いていない、合成した原子 (元素記号)
  private unplaced: string[] = [];

  public onSynthesized?: (atom: SynthesizedAtom) => void;
  public onPlaceAtom?: (symbol: string) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'accelerator-modal';
    document.body.appendChild(this.modalEl);
    this.experiment = this.newExperiment();

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    onLanguageChange(() => {
      if (this.isOpen()) this.render();
    });
  }

  private isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  private newExperiment(): FusionExperiment {
    return new FusionExperiment(BEAM_NUCLIDES[this.beamIndex], TARGET_NUCLIDES[this.targetIndex]);
  }

  public open() {
    this.modalEl.classList.remove('hidden');
    this.render();
    this.startLoop();
  }

  public close() {
    this.running = false;
    this.stopLoop();
    this.modalEl.classList.add('hidden');
  }

  private startLoop() {
    if (this.rafId !== null) return;
    this.lastFrame = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      // タブが裏に回っていた等で間が空いても、一度に進めすぎない
      const dt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      this.update(dt);
      this.draw();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private update(dt: number) {
    if (this.running) {
      const created = this.experiment.advance(dt * SPEEDS[this.speedIndex], this.energy);
      if (created.length > 0) this.handleCreated(created);
      this.updateCounters();

      // ビームの粒 (1粒が膨大な数の原子核を表す)。早送りするほど多く流す
      this.spawnAccumulator += dt * (10 + this.speedIndex * 5);
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.flying.push({ kind: 'beam', u: Math.random() * 0.02 });
      }
    }

    const targetU = ((TARGET_X - LINAC.x) / (SEPARATOR.x - LINAC.x)) * STRAIGHT_PART;
    for (const n of this.flying) {
      const before = n.u;
      n.u += dt * (n.kind === 'beam' ? 0.55 : 0.3);
      // 標的を通るときに、ときどき (原子核のはね返りの) 火花を出す
      if (n.kind === 'beam' && before < targetU && n.u >= targetU && Math.random() < 0.12) {
        this.targetSparks.push({ x: TARGET_X + (Math.random() - 0.5) * 6, y: BEAM_Y + (Math.random() - 0.5) * 18, life: 0.3 });
      }
      if (n.kind === 'product' && n.u >= 1 && before < 1) {
        this.detectorFlash = 1.2;
      }
    }
    this.flying = this.flying.filter(n => n.u < 1);
    this.productCooldown = Math.max(0, this.productCooldown - dt);
    if (this.productQueue.length > 0 && this.productCooldown === 0) {
      this.flying.push({ kind: 'product', u: targetU, label: this.productQueue.shift() });
      this.productCooldown = 0.6;
    }
    this.targetSparks.forEach(s => (s.life -= dt));
    this.targetSparks = this.targetSparks.filter(s => s.life > 0);
    this.detectorFlash = Math.max(0, this.detectorFlash - dt);
  }

  private handleCreated(created: SynthesizedAtom[]) {
    for (const atom of created) {
      this.unplaced.push(atom.reaction.product.symbol);
      if (this.productQueue.length < MAX_FLYING_PRODUCTS) this.productQueue.push(nuclidePlain(atom.reaction.product));
      this.onSynthesized?.(atom);
    }
    if (this.experiment.atoms.length === created.length) soundManager.playFanfare();
    else soundManager.playSuccessChime();
    this.renderResults();
  }

  // 数値の表示だけを書きかえる (毎フレーム)
  private updateCounters() {
    const tr = t().accelerator;
    const set = (id: string, text: string) => {
      const el = this.modalEl.querySelector(`#${id}`);
      if (el && el.textContent !== text) el.textContent = text;
    };
    set('acc-elapsed', tr.formatDuration(this.experiment.simSeconds));
    set('acc-collisions', tr.formatCount(this.experiment.collisions));
    set('acc-atoms', `${this.experiment.atoms.length}`);
    set('acc-expected', this.experiment.reaction ? this.experiment.expected.toFixed(this.experiment.expected < 10 ? 3 : 1) : '0');
  }

  private render() {
    const tr = t().accelerator;
    const beam = BEAM_NUCLIDES[this.beamIndex];
    const target = TARGET_NUCLIDES[this.targetIndex];
    const reaction = this.experiment.reaction;
    const p = this.experiment.probability(this.energy);
    const zSum = atomicNumber(beam.symbol) + atomicNumber(target.symbol);
    const productEl = Object.values(ELEMENTS_DATA).find(e => e.number === zSum);

    const nuclideOption = (n: Nuclide, i: number, selected: number) =>
      `<option value="${i}" ${i === selected ? 'selected' : ''}>${nuclidePlain(n)}　${elementName(n.symbol)}（Z = ${atomicNumber(n.symbol)}）</option>`;

    const zLine = productEl
      ? tr.zSum(atomicNumber(beam.symbol), atomicNumber(target.symbol), zSum, `${productEl.symbol} ${getElementName(productEl, getLanguage())}`)
      : tr.zTooHigh(zSum);

    this.modalEl.innerHTML = `
      <div class="modal-card accelerator-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
          </div>
          <button class="close-btn" id="close-accelerator-modal">✕</button>
        </div>
        <div class="accelerator-body">
          <p class="fw-subtitle">${tr.subtitle}</p>

          <div class="acc-picks">
            <label class="acc-pick">
              <span class="fw-section">${tr.beamLabel}</span>
              <select class="fw-select" id="acc-beam">${BEAM_NUCLIDES.map((n, i) => nuclideOption(n, i, this.beamIndex)).join('')}</select>
            </label>
            <label class="acc-pick">
              <span class="fw-section">${tr.targetLabel}</span>
              <select class="fw-select" id="acc-target">${TARGET_NUCLIDES.map((n, i) => nuclideOption(n, i, this.targetIndex)).join('')}</select>
            </label>
          </div>

          <div class="acc-reaction ${reaction ? '' : 'acc-reaction-none'}">
            <div class="acc-zsum">${zLine}</div>
            ${reaction ? `
              <div class="acc-equation">${tr.equation}: ${nuclideLabel(reaction.beam)} + ${nuclideLabel(reaction.target)} → ${nuclideLabel(reaction.product)} + ${reaction.neutrons > 1 ? reaction.neutrons : ''}n</div>
              <div class="acc-reaction-info">${tr.reactionInfo(getLanguage() === 'en' ? reaction.labEn : reaction.labJa, reaction.year)}</div>
              <div class="acc-reaction-info">${getLanguage() === 'en' ? reaction.noteEn : reaction.noteJa}</div>
            ` : `<div class="acc-reaction-info">${tr.noReaction}</div>`}
          </div>

          <h3 class="fw-section">${tr.energyLabel}</h3>
          <div class="fw-option-row">
            ${BEAM_ENERGIES.map(e => `<button class="fw-option ${this.energy === e ? 'selected' : ''}" data-energy="${e}">${tr.energies[e]}</button>`).join('')}
          </div>
          <p class="acc-hint">${tr.energyHints[this.energy]}</p>

          <canvas class="acc-canvas" id="acc-canvas" aria-label="${tr.partsLabel.linac} → ${tr.partsLabel.target} → ${tr.partsLabel.separator} → ${tr.partsLabel.detector}"></canvas>
          <p class="acc-hint">${tr.separatorHint}</p>

          <div class="acc-controls">
            <label class="acc-speed">
              <span class="fw-section">${tr.speedLabel}</span>
              <select class="fw-select" id="acc-speed">${tr.speeds.map((label, i) => `<option value="${i}" ${i === this.speedIndex ? 'selected' : ''}>${label}</option>`).join('')}</select>
            </label>
            <div class="acc-buttons">
              <button class="fw-launch-btn acc-run-btn" id="acc-run">${this.running ? tr.pause : tr.start}</button>
              <button class="fw-option" id="acc-reset">${tr.reset}</button>
            </div>
          </div>

          <div class="acc-stats">
            <div class="acc-stat"><span class="acc-stat-label">${tr.elapsed}</span><span class="acc-stat-value" id="acc-elapsed"></span></div>
            <div class="acc-stat"><span class="acc-stat-label">${tr.collisions}</span><span class="acc-stat-value" id="acc-collisions"></span></div>
            <div class="acc-stat acc-stat-main"><span class="acc-stat-label">${tr.atoms}</span><span class="acc-stat-value"><span id="acc-atoms"></span><small> / ${tr.expected} <span id="acc-expected"></span></small></span></div>
            <div class="acc-stat"><span class="acc-stat-label">${tr.probability}</span><span class="acc-stat-value">${p > 0 ? `1 / ${tr.formatCount(1 / p)}` : tr.never}</span></div>
            <div class="acc-stat"><span class="acc-stat-label">${tr.meanTime}</span><span class="acc-stat-value">${p > 0 ? tr.formatMean(this.experiment.meanSecondsPerAtom(this.energy)) : tr.never}</span></div>
          </div>

          <div id="acc-results"></div>

          <div class="acc-riken">
            <h3 class="fw-section">${tr.rikenTitle}</h3>
            <p>${tr.rikenNote}</p>
            <p class="acc-hint">${tr.approxNote}</p>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#close-accelerator-modal')?.addEventListener('click', () => this.close());

    const onSelect = (id: string, apply: (v: number) => void) => {
      this.modalEl.querySelector<HTMLSelectElement>(id)?.addEventListener('change', (e) => {
        apply(Number((e.target as HTMLSelectElement).value));
        soundManager.playClick();
      });
    };
    // ビームや標的を変えると、新しい実験になる
    onSelect('#acc-beam', v => { this.beamIndex = v; this.resetExperiment(); });
    onSelect('#acc-target', v => { this.targetIndex = v; this.resetExperiment(); });
    onSelect('#acc-speed', v => { this.speedIndex = v; });

    this.modalEl.querySelectorAll<HTMLButtonElement>('.fw-option[data-energy]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.energy = btn.dataset.energy as BeamEnergy;
        soundManager.playClick();
        this.render();
      });
    });

    this.modalEl.querySelector('#acc-run')?.addEventListener('click', () => {
      this.running = !this.running;
      soundManager.playClick();
      const btn = this.modalEl.querySelector('#acc-run');
      if (btn) btn.textContent = this.running ? tr.pause : tr.start;
    });

    this.modalEl.querySelector('#acc-reset')?.addEventListener('click', () => {
      soundManager.playClick();
      this.resetExperiment();
    });

    this.setupCanvas();
    this.updateCounters();
    this.renderResults();
    this.draw();
  }

  private resetExperiment() {
    this.running = false;
    this.experiment = this.newExperiment();
    this.flying = [];
    this.productQueue = [];
    this.targetSparks = [];
    this.detectorFlash = 0;
    this.render();
  }

  // 検出の記録・崩壊の連鎖・ラボに置くボタン
  private renderResults() {
    const container = this.modalEl.querySelector('#acc-results');
    if (!container) return;
    const tr = t().accelerator;
    const atoms = this.experiment.atoms;
    const latest = atoms[atoms.length - 1];
    // 記録は新しいものから (多すぎると読めないので最大20件)
    const entries = atoms.slice(-20).reverse().map(a =>
      `<li>${tr.logEntry(a.index, tr.formatDuration(a.simSeconds), `${nuclideLabel(a.reaction.product)}（${elementName(a.reaction.product.symbol)}）`)}</li>`
    ).join('');

    container.innerHTML = `
      <h3 class="fw-section">${tr.logTitle}</h3>
      ${atoms.length > 0 ? `<ol class="acc-log">${entries}</ol>` : `<p class="acc-hint">${tr.logEmpty}</p>`}
      ${latest ? this.renderDecayChain(latest.reaction) : ''}
      ${this.unplaced.length > 0 ? `<button class="fw-option acc-place-btn" id="acc-place">${tr.placeAtom(this.unplaced.length)}</button>` : ''}
    `;

    container.querySelector('#acc-place')?.addEventListener('click', () => {
      const symbol = this.unplaced.pop();
      if (!symbol) return;
      soundManager.playClick();
      this.close();
      this.onPlaceAtom?.(symbol);
    });
  }

  private renderDecayChain(reaction: FusionReaction): string {
    const tr = t().accelerator;
    const steps = reaction.decayChain.map((step, i) => {
      const nuclide = `<span class="acc-nuclide ${i === 0 ? 'acc-nuclide-new' : ''}" title="${elementName(step.symbol)}">${nuclideLabel(step)}</span>`;
      if (step.mode === 'end') return nuclide;
      const half = step.halfLifeSec !== undefined ? tr.halfLife(tr.formatHalfLife(step.halfLifeSec)) : '';
      if (step.mode === 'SF') {
        return `${nuclide}<span class="acc-decay acc-decay-sf">💥 ${tr.sf}<small>${half}</small></span>`;
      }
      return `${nuclide}<span class="acc-decay">→ ${tr.alpha}<small>${half}</small></span>`;
    }).join('');
    return `
      <h3 class="fw-section">${tr.decayTitle(nuclideLabel(reaction.product))}</h3>
      <div class="acc-chain">${steps}</div>
      <p class="acc-hint">${tr.decayHint}</p>
    `;
  }

  private setupCanvas() {
    const canvas = this.modalEl.querySelector<HTMLCanvasElement>('#acc-canvas');
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
  }

  // 経路上の位置 u (0〜1) の座標。分離器の中で、ビームは下 (捨て場) へ、できた原子核は上 (検出器) へ曲がる
  private pathPoint(kind: FlyingNucleus['kind'], u: number): { x: number; y: number } {
    const startX = LINAC.x + 20;
    const entryX = SEPARATOR.x;
    if (u <= STRAIGHT_PART) {
      return { x: startX + (entryX - startX) * (u / STRAIGHT_PART), y: BEAM_Y };
    }
    const s = (u - STRAIGHT_PART) / (1 - STRAIGHT_PART);
    const end = kind === 'beam' ? DUMP : DETECTOR;
    const cx = SEPARATOR.x + SEPARATOR.w * 0.8;
    const cy = BEAM_Y;
    const x = (1 - s) * (1 - s) * entryX + 2 * (1 - s) * s * cx + s * s * end.x;
    const y = (1 - s) * (1 - s) * BEAM_Y + 2 * (1 - s) * s * cy + s * s * end.y;
    return { x, y };
  }

  private draw() {
    const canvas = this.modalEl.querySelector<HTMLCanvasElement>('#acc-canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const tr = t().accelerator;
    const scale = canvas.width / CANVAS_W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    // 文字の大きさ (canvas が縮んで表示されても、およそ10px以上で読めるようにする)
    const shrink = canvas.clientWidth > 0 ? canvas.clientWidth / CANVAS_W : 1;
    const labelPx = Math.round(Math.min(18, Math.max(11, 10 / shrink)));

    // ビームライン
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(LINAC.x, BEAM_Y);
    ctx.lineTo(SEPARATOR.x, BEAM_Y);
    ctx.stroke();
    for (const kind of ['beam', 'product'] as const) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const pt = this.pathPoint(kind, STRAIGHT_PART + (1 - STRAIGHT_PART) * (i / 20));
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // 線形加速器 (加速する電極が並ぶ筒)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, LINAC.x, BEAM_Y - 18, LINAC.w, 36, 8);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = LINAC.x + 14 + i * 22;
      ctx.fillStyle = this.running && Math.floor(performance.now() / 120 + i) % 2 === 0 ? '#38BDF8' : 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(x, BEAM_Y - 12, 10 + i * 1.2, 24);
    }

    // 標的
    ctx.fillStyle = '#A78BFA';
    ctx.fillRect(TARGET_X - 3, BEAM_Y - 22, 6, 44);

    // 分離器 (磁石)
    ctx.fillStyle = 'rgba(251, 146, 60, 0.15)';
    ctx.strokeStyle = '#FB923C';
    this.roundRect(ctx, SEPARATOR.x, BEAM_Y - 34, SEPARATOR.w, 68, 10);
    ctx.fill();
    ctx.stroke();

    // ビーム捨て場
    ctx.fillStyle = '#475569';
    ctx.fillRect(DUMP.x - 6, DUMP.y - 12, 26, 24);

    // 検出器 (原子核が届くと光る)
    // 「動きを減らす」設定のときは光を弱める
    const flash = this.detectorFlash > 0 ? Math.min(1, this.detectorFlash) * flashScale() : 0;
    ctx.fillStyle = flash > 0 ? `rgba(250, 204, 21, ${0.4 + 0.6 * flash})` : '#334155';
    ctx.strokeStyle = '#FACC15';
    ctx.fillRect(DETECTOR.x - 4, DETECTOR.y - 18, 22, 36);
    ctx.strokeRect(DETECTOR.x - 4, DETECTOR.y - 18, 22, 36);
    if (flash > 0) {
      ctx.fillStyle = `rgba(250, 204, 21, ${0.35 * flash})`;
      ctx.beginPath();
      ctx.arc(DETECTOR.x + 7, DETECTOR.y, 18 + 16 * (1 - flash), 0, Math.PI * 2);
      ctx.fill();
    }

    // 火花
    for (const s of this.targetSparks) {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.life / 0.3})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 飛んでいる原子核
    for (const n of this.flying) {
      const pt = this.pathPoint(n.kind, n.u);
      if (n.kind === 'beam') {
        ctx.fillStyle = '#7DD3FC';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y + (Math.sin(n.u * 40) * 2), 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#FACC15';
        ctx.shadowColor = '#FACC15';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (n.label) {
          ctx.fillStyle = '#FDE68A';
          ctx.font = `bold ${labelPx + 1}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, pt.x, pt.y - 10);
        }
      }
    }

    // ラベル
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${labelPx}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(tr.partsLabel.linac, LINAC.x + LINAC.w / 2, BEAM_Y + 22 + labelPx);
    ctx.fillText(tr.partsLabel.target, TARGET_X, BEAM_Y + 24 + labelPx);
    ctx.fillText(tr.partsLabel.separator, SEPARATOR.x + SEPARATOR.w / 2, BEAM_Y + 38 + labelPx);
    ctx.textAlign = 'right';
    ctx.fillText(tr.partsLabel.dump, DUMP.x - 10, DUMP.y + 4);
    ctx.fillText(tr.partsLabel.detector, DETECTOR.x - 8, DETECTOR.y + 18 + labelPx);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
