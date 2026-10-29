import { Particle, MatterState } from '../engine/Particle';
import { TemperatureLog, TemperatureSample, TEMPERATURE_SAMPLE_INTERVAL } from '../engine/TemperatureLog';
import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, getCompoundFormula } from '../data/compounds';
import { t, getLanguage, onLanguageChange } from '../i18n';

const STATE_COLORS: Record<MatterState, string> = { solid: '#60A5FA', liquid: '#34D399', gas: '#F87171' };
const PLATEAU_COLOR = '#FACC15';
// グラフの横軸の幅の最小値 (秒)。記録しはじめは左から少しずつのびていく
const MIN_SPAN_SECONDS = 10;
const FPS = 60;
// 融点・沸点の線は、記録した温度からこれだけはなれていてもグラフに入れて見せる (℃)
const REFERENCE_MARGIN = 60;
// 融点・沸点のデータがない物質 (塩など) の目印
const NO_DATA_TEMP = 9000;

// 画面の左上に出す温度グラフ。観察カードの「📈 温度グラフ」で選んだ粒の温度を時間とともに描く
export class TemperatureGraph {
  private rootEl: HTMLElement;
  private titleEl: HTMLElement;
  private nowEl: HTMLElement;
  private noteEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private drawnKey = '';
  public onClose?: () => void;

  constructor(parent: HTMLElement, private log: TemperatureLog) {
    this.rootEl = document.createElement('div');
    this.rootEl.id = 'temperature-graph';
    this.rootEl.hidden = true;
    this.rootEl.innerHTML = `
      <div class="tg-header">
        <span class="tg-title"></span>
        <span class="tg-now"></span>
        <button class="tg-close" type="button">✕</button>
      </div>
      <canvas class="tg-canvas"></canvas>
      <div class="tg-legend"></div>
      <div class="tg-note"></div>`;
    parent.appendChild(this.rootEl);
    this.titleEl = this.rootEl.querySelector('.tg-title')!;
    this.nowEl = this.rootEl.querySelector('.tg-now')!;
    this.noteEl = this.rootEl.querySelector('.tg-note')!;
    this.canvas = this.rootEl.querySelector('.tg-canvas')!;
    this.rootEl.querySelector('.tg-close')!.addEventListener('click', () => {
      this.log.stop();
      this.hide();
      this.onClose?.();
    });
    onLanguageChange(() => {
      this.drawnKey = '';
      this.renderLegend();
    });
    this.renderLegend();
  }

  public show() {
    this.rootEl.hidden = false;
    this.drawnKey = '';
    this.render();
  }

  public hide() {
    this.rootEl.hidden = true;
  }

  public isOpen(): boolean {
    return !this.rootEl.hidden;
  }

  private renderLegend() {
    const tr = t().temperatureGraph;
    const chip = (color: string, label: string) => `<span class="tg-chip"><i style="background:${color}"></i>${label}</span>`;
    this.rootEl.querySelector('.tg-legend')!.innerHTML =
      chip(STATE_COLORS.solid, tr.solid) + chip(STATE_COLORS.liquid, tr.liquid) + chip(STATE_COLORS.gas, tr.gas) + chip(PLATEAU_COLOR, tr.plateau);
    (this.rootEl.querySelector('.tg-close') as HTMLButtonElement).title = tr.close;
  }

  // 毎フレーム呼ぶ。新しい点が増えたときだけ描き直す
  public render() {
    if (this.rootEl.hidden) return;
    const log = this.log;
    const last = log.samples[log.samples.length - 1];
    const lang = getLanguage();
    const key = `${log.samples.length}:${last?.frame}:${log.vanished}:${lang}`;
    if (key === this.drawnKey) return;
    this.drawnKey = key;

    const tr = t().temperatureGraph;
    const p = log.target;
    this.titleEl.textContent = p ? tr.title(particleName(p)) : '';
    if (last) {
      const change = last.change ? t().inspector.phaseChange[last.change] : '';
      this.nowEl.textContent = `${Math.round(last.temperature)} ℃ ${change}`;
    }
    this.noteEl.textContent = log.vanished ? tr.vanished : (log.samples.length < 3 ? tr.hint : '');
    if (p) this.draw(log.samples, p);
  }

  private draw(samples: TemperatureSample[], p: Particle) {
    const tr = t().temperatureGraph;
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.clientWidth || 276;
    const cssH = this.canvas.clientHeight || 140;
    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (samples.length === 0) return;

    const left = 38, right = cssW - 8, top = 8, bottom = cssH - 20;
    const frame0 = samples[0].frame;
    const spanFrames = Math.max(MIN_SPAN_SECONDS * FPS, samples[samples.length - 1].frame - frame0, TEMPERATURE_SAMPLE_INTERVAL);
    const temps = samples.map(s => s.temperature);
    let lo = Math.min(...temps);
    let hi = Math.max(...temps);
    // 融点・沸点 (昇華する物質は昇華点) の線
    const sublimes = p.meltingPoint >= p.boilingPoint;
    const refs = (sublimes
      ? [{ temp: p.boilingPoint, label: tr.sublimationPoint, color: '#C4B5FD' }]
      : [{ temp: p.meltingPoint, label: tr.meltingPoint, color: '#93C5FD' }, { temp: p.boilingPoint, label: tr.boilingPoint, color: '#FDBA74' }]
    ).filter(r => Number.isFinite(r.temp) && Math.abs(r.temp) < NO_DATA_TEMP && r.temp >= lo - REFERENCE_MARGIN && r.temp <= hi + REFERENCE_MARGIN);
    for (const r of refs) {
      lo = Math.min(lo, r.temp);
      hi = Math.max(hi, r.temp);
    }
    const pad = Math.max(5, (hi - lo) * 0.1);
    lo -= pad;
    hi += pad;
    const x = (frame: number) => left + ((frame - frame0) / spanFrames) * (right - left);
    const y = (temp: number) => bottom - ((temp - lo) / (hi - lo)) * (bottom - top);

    // 目盛り
    const step = niceStep((hi - lo) / 4);
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.beginPath();
      ctx.moveTo(left, y(v));
      ctx.lineTo(right, y(v));
      ctx.stroke();
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${Math.round(v)}`, left - 4, y(v));
    }
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('℃', 2, top - 2);
    ctx.textAlign = 'right';
    ctx.fillText(tr.timeAxis(Math.round(spanFrames / FPS)), right, bottom + 6);

    // 融点・沸点の点線
    ctx.setLineDash([4, 3]);
    for (const r of refs) {
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.moveTo(left, y(r.temp));
      ctx.lineTo(right, y(r.temp));
      ctx.stroke();
      ctx.fillStyle = r.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${r.label} ${Math.round(r.temp)}℃`, left + 4, y(r.temp) - 1);
    }
    ctx.setLineDash([]);

    // 温度の線: 状態ごとの色。状態変化の途中 (温度が一定) は黄色で太く
    ctx.lineCap = 'round';
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      const flat = a.change !== null && b.change !== null;
      ctx.strokeStyle = flat ? PLATEAU_COLOR : STATE_COLORS[b.state];
      ctx.lineWidth = flat ? 3.5 : 2;
      ctx.beginPath();
      ctx.moveTo(x(a.frame), y(a.temperature));
      ctx.lineTo(x(b.frame), y(b.temperature));
      ctx.stroke();
    }
    const last = samples[samples.length - 1];
    ctx.fillStyle = last.change ? PLATEAU_COLOR : STATE_COLORS[last.state];
    ctx.beginPath();
    ctx.arc(x(last.frame), y(last.temperature), 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function niceStep(raw: number): number {
  const base = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  for (const m of [1, 2, 5, 10]) if (base * m >= raw) return base * m;
  return base * 10;
}

export function particleName(p: Particle): string {
  const lang = getLanguage();
  const comp = p.kind === 'compound' ? COMPOUNDS_DATA[p.symbolOrId] : undefined;
  if (comp) return `${getCompoundName(comp, lang)} (${getCompoundFormula(comp, lang)})`;
  if (p.kind === 'element' && ELEMENTS_DATA[p.symbolOrId]) return `${getElementName(ELEMENTS_DATA[p.symbolOrId], lang)} (${p.symbolOrId})`;
  return lang === 'en' ? p.nameEn || p.symbolOrId : p.nameJa || p.symbolOrId;
}
