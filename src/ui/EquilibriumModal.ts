import {
  EquilibriumState, EquilibriumStart, EQUILIBRIUM_TEMPS, EQUILIBRIUM_CONCENTRATIONS,
  initialState, stepEquilibrium, forwardRate, reverseRate, forwardRateConstant, equilibriumConstant, totalPressure, isAtEquilibrium
} from '../data/equilibrium';
import { soundManager } from '../engine/AudioEffects';
import { t, onLanguageChange } from '../i18n';

const COLORS = { h2: '#60A5FA', i2: '#A855F7', hi: '#F97316' };
// グラフの横軸 (分) と、1秒間に進める時間 (秒)。120分を約15秒で見せる
const MAX_MINUTES = 120;
const SIM_SECONDS_PER_REAL_SECOND = 480;
// 計算の刻み (秒) と、グラフに残す点の間隔 (秒)
const STEP_SECONDS = 1;
const RECORD_EVERY = 20;

interface HistoryPoint extends EquilibriumState {
  t: number; // 秒
}

// 反応速度と化学平衡: 密閉容器の H₂ + I₂ ⇄ 2HI を速度式で時間を追って計算し、濃度のグラフを描く (高校 化学)
export class EquilibriumModal {
  private modalEl: HTMLElement;
  private temp = 425;
  private start: EquilibriumStart = 'reactants';
  private concentration = 0.05;
  private state: EquilibriumState = initialState('reactants', 0.05);
  private time = 0;
  private history: HistoryPoint[] = [];
  private tempMarks: { t: number; temp: number }[] = [];
  private running = false;
  private frame: number | null = null;
  private lastTimestamp = 0;
  private reported = false;
  public onEquilibrium?: (start: EquilibriumStart, tempC: number) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'equilibrium-modal';
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
    this.restart();
  }

  public open() {
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.setRunning(false);
    this.modalEl.classList.add('hidden');
  }

  private restart() {
    this.setRunning(false);
    this.state = initialState(this.start, this.concentration);
    this.time = 0;
    this.history = [{ t: 0, ...this.state }];
    this.tempMarks = [];
    this.reported = false;
  }

  private setRunning(running: boolean) {
    this.running = running;
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    if (running) {
      this.lastTimestamp = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private tick = (now: number) => {
    // タブを切り替えたあとなどに一度に進みすぎないよう、1回に進めるのは 0.1 秒分まで
    const realDt = Math.min(0.1, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;
    const target = Math.min(MAX_MINUTES * 60, this.time + realDt * SIM_SECONDS_PER_REAL_SECOND);
    while (this.time < target) {
      this.state = stepEquilibrium(this.state, this.temp, STEP_SECONDS);
      this.time += STEP_SECONDS;
      if (this.time % RECORD_EVERY === 0) this.history.push({ t: this.time, ...this.state });
    }
    if (!this.reported && isAtEquilibrium(this.state, this.temp)) {
      this.reported = true;
      soundManager.playSuccessChime();
      this.onEquilibrium?.(this.start, this.temp);
    }
    if (this.time >= MAX_MINUTES * 60) {
      this.running = false;
      this.frame = null;
      this.render();
      return;
    }
    this.update();
    this.frame = requestAnimationFrame(this.tick);
  };

  private render() {
    const tr = t().equilibrium;
    const ratio = (forwardRateConstant(425) / forwardRateConstant(400)).toFixed(1);
    this.modalEl.innerHTML = `
      <div class="modal-card titration-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.badge}</span>
          </div>
          <button class="close-btn" id="close-equilibrium-modal" title="${tr.close}">✕</button>
        </div>
        <div class="titration-body">
          <p class="fw-subtitle">${tr.subtitle}</p>
          <div class="titration-layout">
            <div class="titration-controls">
              <label class="titration-field">
                <span>${tr.tempLabel}</span>
                <select class="fw-select" id="eq-temp">
                  ${EQUILIBRIUM_TEMPS.map(v => `<option value="${v}" ${v === this.temp ? 'selected' : ''}>${v}℃</option>`).join('')}
                </select>
                <small class="titration-hint">${tr.tempHint}</small>
              </label>
              <label class="titration-field">
                <span>${tr.startLabel}</span>
                <select class="fw-select" id="eq-start">
                  ${(['reactants', 'product'] as EquilibriumStart[]).map(v => `<option value="${v}" ${v === this.start ? 'selected' : ''}>${tr.starts[v]}</option>`).join('')}
                </select>
              </label>
              <label class="titration-field">
                <span>${tr.concentrationLabel}</span>
                <select class="fw-select" id="eq-conc">
                  ${EQUILIBRIUM_CONCENTRATIONS.map(c => {
                    const shown = this.start === 'reactants' ? c : 2 * c;
                    return `<option value="${c}" ${c === this.concentration ? 'selected' : ''}>${tr.concentration(shown.toFixed(3), this.start)}</option>`;
                  }).join('')}
                </select>
              </label>
              <div class="titration-apparatus">
                <svg class="titration-svg" viewBox="0 0 100 120" aria-hidden="true"></svg>
                <div class="titration-readouts">
                  <div class="titration-readout"><span>${tr.elapsed}</span><strong id="eq-time"></strong></div>
                  <div class="eq-conc-list" id="eq-conc-list"></div>
                  <div class="titration-buttons">
                    <button class="fw-option titration-add" id="eq-play" type="button">${this.running ? tr.pause : tr.play}</button>
                    <button class="fw-option" id="eq-reset" type="button">${tr.reset}</button>
                  </div>
                </div>
              </div>
              <div class="eq-stats" id="eq-stats"></div>
            </div>
            <div class="titration-graph-wrap">
              <canvas class="titration-canvas"></canvas>
              <div class="titration-result" id="eq-status"></div>
              <ul class="eq-notes">
                <li>${tr.rateNote(ratio)}</li>
                <li>${tr.pressureNote}</li>
                <li>${tr.shiftNote}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#close-equilibrium-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector<HTMLSelectElement>('#eq-temp')?.addEventListener('change', (e) => {
      this.temp = parseInt((e.target as HTMLSelectElement).value, 10);
      // 反応の途中なら、そこから新しい温度で続ける (平衡の移動)
      if (this.time > 0) {
        this.tempMarks.push({ t: this.time, temp: this.temp });
        this.reported = false;
      }
      this.update();
    });
    this.modalEl.querySelector<HTMLSelectElement>('#eq-start')?.addEventListener('change', (e) => {
      this.start = (e.target as HTMLSelectElement).value as EquilibriumStart;
      this.restart();
      this.render();
    });
    this.modalEl.querySelector<HTMLSelectElement>('#eq-conc')?.addEventListener('change', (e) => {
      this.concentration = parseFloat((e.target as HTMLSelectElement).value);
      this.restart();
      this.render();
    });
    this.modalEl.querySelector('#eq-play')?.addEventListener('click', () => {
      soundManager.playClick();
      if (this.time >= MAX_MINUTES * 60) this.restart();
      this.setRunning(!this.running);
      (this.modalEl.querySelector('#eq-play') as HTMLButtonElement).textContent = this.running ? tr.pause : tr.play;
    });
    this.modalEl.querySelector('#eq-reset')?.addEventListener('click', () => {
      soundManager.playClick();
      this.restart();
      this.render();
    });
    this.update();
  }

  private update() {
    const tr = t().equilibrium;
    const s = this.state;
    const timeEl = this.modalEl.querySelector('#eq-time');
    if (timeEl) timeEl.textContent = tr.minutes((this.time / 60).toFixed(1));
    const list = this.modalEl.querySelector('#eq-conc-list');
    if (list) {
      list.innerHTML = ([['h2', 'H₂'], ['i2', 'I₂'], ['hi', 'HI']] as const).map(([key, label]) =>
        `<div class="titration-readout"><span><i class="eq-dot" style="background:${COLORS[key]}"></i>[${label}]</span><strong>${s[key].toFixed(4)}</strong></div>`
      ).join('');
    }
    const v1 = forwardRate(s, this.temp);
    const v2 = reverseRate(s, this.temp);
    const q = s.h2 > 0 && s.i2 > 0 ? (s.hi * s.hi) / (s.h2 * s.i2) : Infinity;
    const stats = this.modalEl.querySelector('#eq-stats');
    if (stats) {
      stats.innerHTML = `
        <div class="titration-readout"><span>${tr.v1}<small> ${tr.rateUnit}</small></span><strong>${formatRate(v1)}</strong></div>
        <div class="titration-readout"><span>${tr.v2}<small> ${tr.rateUnit}</small></span><strong>${formatRate(v2)}</strong></div>
        <div class="titration-readout"><span>${tr.qLabel}</span><strong>${Number.isFinite(q) ? q.toFixed(1) : '∞'}</strong></div>
        <div class="titration-readout"><span>${tr.kLabel(String(this.temp))}</span><strong>${equilibriumConstant(this.temp).toFixed(1)}</strong></div>
        <div class="titration-readout"><span>${tr.pressure}</span><strong>${Math.round(totalPressure(s, this.temp))} kPa</strong></div>
      `;
    }
    const status = this.modalEl.querySelector('#eq-status');
    if (status) {
      const atEq = this.time > 0 && isAtEquilibrium(s, this.temp);
      const text = this.time === 0 ? tr.statusIdle : atEq ? tr.statusEquilibrium : v1 > v2 ? tr.statusForward : tr.statusReverse;
      status.innerHTML = `<div class="titration-verdict ${atEq ? 'good' : ''}"><p>${text}</p></div>`;
    }
    this.drawVessel();
    this.drawGraph();
  }

  // 密閉容器。ヨウ素の気体は赤紫色なので、[I₂] が多いほど濃い色にする
  private drawVessel() {
    const svg = this.modalEl.querySelector('.titration-svg');
    if (!svg) return;
    const full = Math.max(this.concentration, 1e-9);
    const opacity = Math.min(0.85, (this.state.i2 / full) * 0.85);
    svg.innerHTML = `
      <circle cx="50" cy="70" r="38" fill="#A855F7" fill-opacity="${opacity.toFixed(3)}"/>
      <circle cx="50" cy="70" r="38" fill="none" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="42" y="14" width="16" height="22" fill="#0F172A" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="39" y="8" width="22" height="9" rx="2" fill="#B45309"/>
      <text x="50" y="74" text-anchor="middle" font-size="9" fill="#F8FAFC">${this.temp}℃</text>
    `;
  }

  private drawGraph() {
    const canvas = this.modalEl.querySelector<HTMLCanvasElement>('.titration-canvas');
    if (!canvas) return;
    const tr = t().equilibrium;
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

    const left = 44, right = w - 10, top = 12, bottom = h - 30;
    const maxC = Math.max(this.concentration * 2, 0.01);
    const x = (sec: number) => left + (sec / (MAX_MINUTES * 60)) * (right - left);
    const y = (c: number) => bottom - (c / maxC) * (bottom - top);

    ctx.font = '10px sans-serif';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const c = (maxC * i) / 4;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.beginPath();
      ctx.moveTo(left, y(c));
      ctx.lineTo(right, y(c));
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(c.toFixed(3), left - 4, y(c));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let m = 0; m <= MAX_MINUTES; m += 20) ctx.fillText(`${m}`, x(m * 60), bottom + 4);
    ctx.fillText(tr.axisX, (left + right) / 2, bottom + 16);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    // 温度を変えたところ
    ctx.setLineDash([4, 3]);
    for (const mark of this.tempMarks) {
      ctx.strokeStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(x(mark.t), top);
      ctx.lineTo(x(mark.t), bottom);
      ctx.stroke();
      ctx.fillStyle = '#F472B6';
      ctx.textAlign = 'left';
      ctx.fillText(tr.tempChanged(String(mark.temp)), x(mark.t) + 3, top);
    }
    ctx.setLineDash([]);

    const points = [...this.history, { t: this.time, ...this.state }];
    ctx.lineJoin = 'round';
    // H₂ と I₂ は同じ量ずつ減るので線が重なる。I₂ を太く描き、その上に H₂ を点線で重ねる
    for (const key of ['i2', 'hi', 'h2'] as const) {
      ctx.strokeStyle = COLORS[key];
      ctx.lineWidth = key === 'i2' ? 4 : 2.5;
      ctx.setLineDash(key === 'h2' ? [6, 4] : []);
      ctx.beginPath();
      points.forEach((pt, i) => (i === 0 ? ctx.moveTo(x(pt.t), y(pt[key])) : ctx.lineTo(x(pt.t), y(pt[key]))));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // 凡例
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    (['h2', 'i2', 'hi'] as const).forEach((key, i) => {
      const lx = right - 150 + i * 50;
      ctx.fillStyle = COLORS[key];
      ctx.fillRect(lx, top + 6, 12, 3);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(key === 'h2' ? 'H₂' : key === 'i2' ? 'I₂' : 'HI', lx + 16, top + 8);
    });
  }
}

function formatRate(v: number): string {
  if (v === 0) return '0';
  const exp = Math.floor(Math.log10(v));
  const mant = v / Math.pow(10, exp);
  return `${mant.toFixed(2)}×10^${exp}`.replace(/\^(-?\d+)/, (_, e) => toSuperscript(e));
}

function toSuperscript(s: string): string {
  const map: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return s.split('').map(ch => map[ch] ?? ch).join('');
}
