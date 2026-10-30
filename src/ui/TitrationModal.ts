import {
  TitrationAnalyte, TitrationIndicator, TitrationSetup, EndpointVerdict,
  TITRATION_ANALYTES, TITRATION_INDICATORS, TRANSITION_RANGES, ANALYTES,
  ANALYTE_VOLUME, TITRANT_CONCENTRATION, BURETTE_CAPACITY, DROP_VOLUME, MYSTERY_CONCENTRATIONS,
  titrationPh, equivalenceVolume, equivalencePh, equivalenceNature, indicatorColor, indicatorChanged, judgeEndpoint
} from '../data/titration';
import { soundManager } from '../engine/AudioEffects';
import { t, onLanguageChange } from '../i18n';

// 中和点でできる塩
const SALTS: Record<TitrationAnalyte, string> = { HCl: 'NaCl', CH3COOH: 'CH₃COONa', NaOH: 'NaCl', NH3: 'NH₄Cl' };
// 長押しで1滴ずつ続けて落とす間隔 (ms)
const HOLD_DELAY = 400;
const HOLD_INTERVAL = 90;
// 滴定曲線を描くときの刻み (mL)
const CURVE_STEP = 0.02;

export interface TitrationEndpoint {
  analyte: TitrationAnalyte;
  indicator: TitrationIndicator;
  volume: number;
  verdict: EndpointVerdict;
}

// 中和滴定ラボ: 濃度から計算した pH で、滴定曲線と指示薬の色の変化を見る (高校 化学基礎)
export class TitrationModal {
  private modalEl: HTMLElement;
  private analyte: TitrationAnalyte = 'CH3COOH';
  private indicator: TitrationIndicator = 'Phenolphthalein';
  private mystery = false;
  private concentration = TITRANT_CONCENTRATION;
  private added = 0;
  private endpoint: number | null = null;
  private holdTimer: number | null = null;
  public onEndpoint?: (result: TitrationEndpoint) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'titration-modal';
    document.body.appendChild(this.modalEl);
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
    onLanguageChange(() => {
      if (!this.modalEl.classList.contains('hidden')) this.render();
    });
    window.addEventListener('resize', () => {
      if (!this.modalEl.classList.contains('hidden')) this.drawGraph();
    });
  }

  public open() {
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.stopHold();
    this.modalEl.classList.add('hidden');
  }

  private get setup(): TitrationSetup {
    return { analyte: this.analyte, concentration: this.concentration };
  }

  private restart() {
    this.added = 0;
    this.endpoint = null;
    this.concentration = this.mystery
      ? MYSTERY_CONCENTRATIONS[Math.floor(Math.random() * MYSTERY_CONCENTRATIONS.length)]
      : TITRANT_CONCENTRATION;
  }

  private render() {
    const tr = t().titration;
    const titrant = ANALYTES[this.analyte].titrant;
    this.modalEl.innerHTML = `
      <div class="modal-card titration-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.badge}</span>
          </div>
          <button class="close-btn" id="close-titration-modal" title="${tr.close}">✕</button>
        </div>
        <div class="titration-body">
          <p class="fw-subtitle">${tr.subtitle}</p>
          <div class="titration-layout">
            <div class="titration-controls">
              <label class="titration-field">
                <span>${tr.analyteLabel}</span>
                <select class="fw-select" id="titration-analyte">
                  ${TITRATION_ANALYTES.map(a => `<option value="${a}" ${a === this.analyte ? 'selected' : ''}>${tr.analytes[a]}（${tr.strength[a]}）</option>`).join('')}
                </select>
              </label>
              <label class="titration-field">
                <span>${tr.concentrationLabel}</span>
                <select class="fw-select" id="titration-concentration">
                  <option value="known" ${this.mystery ? '' : 'selected'}>${tr.knownConcentration(TITRANT_CONCENTRATION.toFixed(3))}</option>
                  <option value="mystery" ${this.mystery ? 'selected' : ''}>${tr.mysteryConcentration}</option>
                </select>
              </label>
              <div class="titration-field">
                <span>${tr.indicatorLabel}</span>
                <div class="fw-option-row">
                  ${TITRATION_INDICATORS.map(i => {
                    const [a, b] = TRANSITION_RANGES[i];
                    return `<button class="fw-option titration-indicator ${i === this.indicator ? 'selected' : ''}" data-indicator="${i}" type="button">
                      <span class="titration-swatch" style="background: linear-gradient(90deg, ${indicatorColor(i, a - 0.5)}, ${indicatorColor(i, b + 0.5)});"></span>
                      ${tr.indicators[i]}<small>${tr.range(a.toFixed(1), b.toFixed(1))}</small>
                    </button>`;
                  }).join('')}
                </div>
              </div>
              <div class="titration-apparatus">
                <svg class="titration-svg" viewBox="36 0 100 230" aria-hidden="true"></svg>
                <div class="titration-readouts">
                  <div class="titration-burette-label">${tr.burette(tr.titrants[titrant])}</div>
                  <div class="titration-readout"><span>${tr.added}</span><strong id="titration-added"></strong></div>
                  <div class="titration-readout"><span>pH</span><strong id="titration-ph"></strong></div>
                  <div class="titration-buttons">
                    <button class="fw-option titration-add" id="titration-drop" type="button">${tr.drop}</button>
                    ${[0.5, 1, 5].map(v => `<button class="fw-option titration-add" data-add="${v}" type="button">${tr.addMl(v.toFixed(1))}</button>`).join('')}
                    <button class="fw-option" id="titration-reset" type="button">${tr.reset}</button>
                  </div>
                  <div class="titration-hint">${tr.holdHint}</div>
                </div>
              </div>
            </div>
            <div class="titration-graph-wrap">
              <canvas class="titration-canvas"></canvas>
              <div class="titration-result" id="titration-result"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#close-titration-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector<HTMLSelectElement>('#titration-analyte')?.addEventListener('change', (e) => {
      this.analyte = (e.target as HTMLSelectElement).value as TitrationAnalyte;
      this.restart();
      this.render();
    });
    this.modalEl.querySelector<HTMLSelectElement>('#titration-concentration')?.addEventListener('change', (e) => {
      this.mystery = (e.target as HTMLSelectElement).value === 'mystery';
      this.restart();
      this.render();
    });
    this.modalEl.querySelectorAll<HTMLButtonElement>('.titration-indicator').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.indicator = btn.dataset.indicator as TitrationIndicator;
        this.added = 0;
        this.endpoint = null;
        this.render();
      });
    });
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => this.add(parseFloat(btn.dataset.add!)));
    });
    this.modalEl.querySelector('#titration-reset')?.addEventListener('click', () => {
      soundManager.playClick();
      this.restart();
      this.update();
    });
    const drop = this.modalEl.querySelector<HTMLButtonElement>('#titration-drop')!;
    drop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.add(DROP_VOLUME);
      this.stopHold();
      this.holdTimer = window.setTimeout(() => {
        this.holdTimer = window.setInterval(() => this.add(DROP_VOLUME), HOLD_INTERVAL);
      }, HOLD_DELAY);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) drop.addEventListener(ev, () => this.stopHold());
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.add(DROP_VOLUME);
      }
    });

    this.update();
  }

  private stopHold() {
    if (this.holdTimer !== null) {
      window.clearTimeout(this.holdTimer);
      window.clearInterval(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private add(volume: number) {
    const next = Math.min(BURETTE_CAPACITY, Math.round((this.added + volume) * 100) / 100);
    if (next === this.added) {
      this.stopHold();
      return;
    }
    this.added = next;
    if (volume <= DROP_VOLUME) soundManager.playWater();
    else soundManager.playClick();

    if (this.endpoint === null && indicatorChanged(this.setup, this.indicator, titrationPh(this.setup, this.added))) {
      this.endpoint = this.added;
      this.stopHold();
      soundManager.playColorChange();
      this.onEndpoint?.({ analyte: this.analyte, indicator: this.indicator, volume: this.added, verdict: judgeEndpoint(this.setup, this.added) });
    }
    this.update();
  }

  private update() {
    const ph = titrationPh(this.setup, this.added);
    const added = this.modalEl.querySelector('#titration-added');
    const phEl = this.modalEl.querySelector('#titration-ph');
    if (added) added.textContent = `${this.added.toFixed(2)} mL`;
    if (phEl) phEl.textContent = ph.toFixed(2);
    this.modalEl.querySelectorAll<HTMLButtonElement>('.titration-add').forEach(btn => {
      btn.disabled = this.added >= BURETTE_CAPACITY;
    });
    this.drawApparatus(ph);
    this.drawGraph();
    this.renderResult();
  }

  // ビュレットとコニカルビーカー。液の色は指示薬の色
  private drawApparatus(ph: number) {
    const svg = this.modalEl.querySelector('.titration-svg');
    if (!svg) return;
    const titrant = ANALYTES[this.analyte].titrant;
    // ビュレットの目盛り: 0 mL が上、25 mL が下
    const top = 12, bottom = 132;
    const level = top + (this.added / BURETTE_CAPACITY) * (bottom - top);
    const liquid = indicatorColor(this.indicator, ph);
    const ticks = [0, 5, 10, 15, 20, 25].map(v => {
      const y = top + (v / BURETTE_CAPACITY) * (bottom - top);
      return `<line x1="72" y1="${y}" x2="78" y2="${y}" stroke="#94A3B8" stroke-width="1"/><text x="68" y="${y + 3}" font-size="9" fill="#94A3B8" text-anchor="end">${v}</text>`;
    }).join('');
    svg.innerHTML = `
      <rect x="78" y="${level}" width="10" height="${bottom - level}" fill="${titrant === 'NaOH' ? '#BFDBFE' : '#E0F2FE'}" opacity="0.7"/>
      <rect x="78" y="${top}" width="10" height="${bottom - top}" fill="none" stroke="#CBD5E1" stroke-width="1.5" rx="2"/>
      ${ticks}
      <path d="M78 ${bottom} L83 ${bottom + 14} L88 ${bottom}" fill="none" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="76" y="${bottom + 4}" width="14" height="5" rx="2" fill="#64748B"/>
      <line x1="83" y1="${bottom + 14}" x2="83" y2="${bottom + 22}" stroke="#CBD5E1" stroke-width="1.5"/>
      <path d="M51 223 L115 223 L103 196 L63 196 Z" fill="${liquid}" fill-opacity="0.85"/>
      <path d="M50 224 L116 224 L94 176 L94 160 L72 160 L72 176 Z" fill="none" stroke="#CBD5E1" stroke-width="1.8" stroke-linejoin="round"/>
    `;
  }

  private drawGraph() {
    const canvas = this.modalEl.querySelector<HTMLCanvasElement>('.titration-canvas');
    if (!canvas) return;
    const tr = t().titration;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 420;
    const h = canvas.clientHeight || 300;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const left = 34, right = w - 10, top = 10, bottom = h - 30;
    const x = (v: number) => left + (v / BURETTE_CAPACITY) * (right - left);
    const y = (ph: number) => bottom - (ph / 14) * (bottom - top);

    // 指示薬の変色域の帯
    const [ra, rb] = TRANSITION_RANGES[this.indicator];
    const band = ctx.createLinearGradient(0, y(ra), 0, y(rb));
    band.addColorStop(0, indicatorColor(this.indicator, ra - 0.1));
    band.addColorStop(1, indicatorColor(this.indicator, rb + 0.1));
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = band;
    ctx.fillRect(left, y(rb), right - left, y(ra) - y(rb));
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${tr.indicators[this.indicator]} ${tr.rangeBand}`, right - 4, y(rb) - 2);

    // 目盛り
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    for (let p = 0; p <= 14; p += 2) {
      ctx.strokeStyle = p === 7 ? 'rgba(148, 163, 184, 0.45)' : 'rgba(148, 163, 184, 0.15)';
      ctx.beginPath();
      ctx.moveTo(left, y(p));
      ctx.lineTo(right, y(p));
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${p}`, left - 5, y(p));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= BURETTE_CAPACITY; v += 5) {
      ctx.fillText(`${v}`, x(v), bottom + 4);
    }
    ctx.fillText(tr.axisX, (left + right) / 2, bottom + 16);
    ctx.save();
    ctx.translate(10, (top + bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('pH', 0, -4);
    ctx.restore();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    // 中和点 (濃度をかくしているときは終点が見つかってから見せる)
    if (!this.mystery || this.endpoint !== null) {
      const veq = equivalenceVolume(this.setup);
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(x(veq), top);
      ctx.lineTo(x(veq), bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#F472B6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(tr.equivalence, x(veq) + 4, top + 2);
    }

    // 滴定曲線 (pH メーターの記録): 色はそのときの指示薬の色
    if (this.added > 0) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      let prev = { v: 0, ph: titrationPh(this.setup, 0) };
      const steps = Math.ceil(this.added / CURVE_STEP);
      for (let i = 1; i <= steps; i++) {
        const v = Math.min(this.added, i * CURVE_STEP);
        const ph = titrationPh(this.setup, v);
        ctx.strokeStyle = curveColor(indicatorColor(this.indicator, ph));
        ctx.beginPath();
        ctx.moveTo(x(prev.v), y(prev.ph));
        ctx.lineTo(x(v), y(ph));
        ctx.stroke();
        prev = { v, ph };
      }
    }
    const now = titrationPh(this.setup, this.added);
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(x(this.added), y(now), 4, 0, Math.PI * 2);
    ctx.fill();

    // 終点
    if (this.endpoint !== null) {
      const ep = titrationPh(this.setup, this.endpoint);
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x(this.endpoint), y(ep), 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderResult() {
    const el = this.modalEl.querySelector('#titration-result');
    if (!el) return;
    const tr = t().titration;
    if (this.endpoint === null) {
      el.innerHTML = `<p class="titration-waiting">${tr.waiting}</p>`;
      return;
    }
    const setup = this.setup;
    const veq = equivalenceVolume(setup).toFixed(2);
    const eqPh = equivalencePh(setup).toFixed(1);
    const verdict = judgeEndpoint(setup, this.endpoint);
    const verdictText = verdict === 'good' ? tr.verdictGood(veq, eqPh) : verdict === 'early' ? tr.verdictEarly(veq, eqPh) : tr.verdictLate(veq, eqPh);
    const nature = tr.nature[equivalenceNature(setup)](SALTS[this.analyte]);
    const measured = (TITRANT_CONCENTRATION * this.endpoint) / ANALYTE_VOLUME;
    el.innerHTML = `
      <div class="titration-verdict ${verdict}">
        <strong>${tr.endpointTitle(this.endpoint.toFixed(2))}</strong>
        <p>${verdictText}</p>
        <p>${nature}</p>
        ${this.mystery ? `<p>${tr.concentrationCalc(this.endpoint.toFixed(2), measured.toFixed(3))}<br><b>${tr.concentrationAnswer(this.concentration.toFixed(3))}</b></p>` : ''}
      </div>
    `;
  }
}

// 無色 (フェノールフタレインの酸性側) でも暗い背景の上で線が見えるようにする
function curveColor(color: string): string {
  return color.toUpperCase() === '#F1F5F9' ? '#E2E8F0' : color;
}
