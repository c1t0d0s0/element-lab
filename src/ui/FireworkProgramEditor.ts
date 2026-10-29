import {
  FIREWORK_PROGRAM_STORAGE_KEY, FIREWORK_SHAPES, FireworkProgram, FireworkShot, MAX_PROGRAM_SHOTS, ProgramWarning, SHOT_LIMITS, ShotNumberField,
  createProgram, createShot, parseFireworkProgram, programDuration, sampleProgram, serializeFireworkProgram, sortShotsByTime
} from '../data/fireworkProgram';
import { FIREWORK_ELEMENTS, MAX_FIREWORK_COLORS, isShapeUnlocked, getFireworkColor, isFireworkColorUnlocked } from '../engine/Fireworks';
import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { GameStats } from '../data/quests';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';

type MessageKind = 'info' | 'warn' | 'error';

const SLIDER_FIELDS: ShotNumberField[] = ['size', 'x', 'height'];

function flameColor(sym: string): string {
  return getFireworkColor(sym);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

// 花火工房の「カスタム」: 1発ずつ、打ち上げ時刻・色・形・サイズ・位置・高さを決める表形式のエディタ
export class FireworkProgramEditor {
  private modalEl: HTMLElement;
  private getStats: () => GameStats;
  private program: FireworkProgram;
  private messages: { kind: MessageKind; text: string }[] = [];
  // 1発だけ・全部の打ち上げ (main.ts で花火エンジンにつなぐ)
  public onLaunchShots?: (shots: FireworkShot[], isTest: boolean) => void;
  // プログラムが変わった時 (花火工房の概要表示を更新する)
  public onChange?: () => void;

  constructor(getStats: () => GameStats) {
    this.getStats = getStats;
    this.program = this.loadSaved() ?? sampleProgram(t().fireworks.editor.sampleTitle);
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'firework-program-editor';
    document.body.appendChild(this.modalEl);

    this.modalEl.addEventListener('click', (e) => this.handleClick(e));
    this.modalEl.addEventListener('input', (e) => this.handleInput(e));
    this.modalEl.addEventListener('change', (e) => this.handleChange(e));
    onLanguageChange(() => {
      if (this.isOpen()) this.render();
    });
  }

  public getProgram(): FireworkProgram {
    return this.program;
  }

  public isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  public open() {
    this.messages = [];
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private loadSaved(): FireworkProgram | null {
    try {
      const saved = localStorage.getItem(FIREWORK_PROGRAM_STORAGE_KEY);
      if (!saved) return null;
      const result = parseFireworkProgram(saved);
      return 'program' in result ? result.program : null;
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      localStorage.setItem(FIREWORK_PROGRAM_STORAGE_KEY, serializeFireworkProgram(this.program));
    } catch {
      // ignore
    }
    this.onChange?.();
  }

  private isColorFound(sym: string): boolean {
    return isFireworkColorUnlocked(sym, this.getStats());
  }

  private render() {
    const tr = t().fireworks.editor;
    const p = this.program;
    this.modalEl.innerHTML = `
      <div class="modal-card fw-editor-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge fw-editor-summary">${this.summaryText()}</span>
          </div>
          <button class="close-btn" data-action="close">✕</button>
        </div>
        <div class="fw-editor-body">
          <label class="fw-editor-title">
            <span>${tr.titleLabel}</span>
            <input type="text" maxlength="60" data-field="title" value="${escapeHtml(p.title)}">
          </label>

          <div class="fw-editor-map-wrap">
            <div class="fw-editor-map-title">${tr.map} <span>${tr.mapHint}</span></div>
            <canvas class="fw-editor-map" width="600" height="260"></canvas>
          </div>

          <div class="fw-editor-messages"></div>

          <div class="fw-editor-rows">
            ${p.shots.length === 0 ? `<div class="filter-empty">${tr.empty}</div>` : p.shots.map((_, i) => this.renderRow(i)).join('')}
          </div>
        </div>

        <div class="fw-editor-footer">
          <div class="fw-editor-actions">
            <button class="fw-option" data-action="add">${tr.add}</button>
            <button class="fw-option" data-action="sort">${tr.sort}</button>
            <button class="fw-option" data-action="sample">${tr.sample}</button>
            <button class="fw-option" data-action="clear">${tr.clearAll}</button>
            <button class="fw-option" data-action="save">${tr.save}</button>
            <button class="fw-option" data-action="load">${tr.load}</button>
            <input type="file" accept="application/json,.json" class="fw-editor-file" hidden>
          </div>
          <button class="fw-launch-btn" data-action="launch-all" ${p.shots.length === 0 ? 'disabled' : ''}>${tr.launchAll}</button>
        </div>
      </div>
    `;
    this.renderMessages();
    this.drawMap();
  }

  private renderRow(i: number): string {
    const tr = t().fireworks.editor;
    const lang = getLanguage();
    const shot = this.program.shots[i];
    const stats = this.getStats();

    const colorChips = FIREWORK_ELEMENTS.map(sym => {
      const el = ELEMENTS_DATA[sym];
      const order = shot.colors.indexOf(sym);
      const found = this.isColorFound(sym);
      return `
        <button class="fw-ed-color ${order >= 0 ? 'selected' : ''}" data-action="color" data-index="${i}" data-sym="${sym}" style="--fw-color: ${flameColor(sym)};" title="${el ? getElementName(el, lang) : sym}">
          <span class="fw-ed-swatch">${order >= 0 ? order + 1 : ''}</span>${sym}${found ? '' : `<span class="fw-ed-unfound">？${tr.notFound}</span>`}
        </button>`;
    }).join('');

    // 形はプルダウンで選ぶ (種類が多いのでボタンを並べない)。未発見の形も選べるが、印を付ける
    const shapeSelect = `
      <select class="fw-select fw-ed-select" data-field="shape" data-index="${i}" aria-label="${tr.shape}">
        ${FIREWORK_SHAPES.map(shape => `
          <option value="${shape}" ${shot.shape === shape ? 'selected' : ''}>${tr.shapesShort[shape]}${!isShapeUnlocked(shape, stats) ? `（？${tr.notFound}）` : ''}</option>`).join('')}
      </select>`;

    const slider = (field: ShotNumberField, label: string) => {
      const { min, max, step } = SHOT_LIMITS[field];
      return `
        <label class="fw-ed-slider">
          <span class="fw-ed-label">${label}</span>
          <input type="range" min="${min}" max="${max}" step="${step}" value="${shot[field]}" data-field="${field}" data-index="${i}">
          <span class="fw-ed-value" data-value-for="${field}">${shot[field]}${field === 'size' ? '%' : ''}</span>
        </label>`;
    };

    return `
      <div class="fw-ed-row" data-row="${i}" style="--fw-color: ${flameColor(shot.colors[0])};">
        <div class="fw-ed-row-head">
          <span class="fw-ed-no">${tr.shotLabel(i + 1)}</span>
          <label class="fw-ed-time">
            ${tr.time}
            <input type="number" min="${SHOT_LIMITS.time.min}" max="${SHOT_LIMITS.time.max}" step="${SHOT_LIMITS.time.step}" value="${shot.time}" data-field="time" data-index="${i}">
            ${tr.seconds}
          </label>
          <div class="fw-ed-row-buttons">
            <button class="fw-ed-small" data-action="test" data-index="${i}">${tr.test}</button>
            <button class="fw-ed-small" data-action="duplicate" data-index="${i}">${tr.duplicate}</button>
            <button class="fw-ed-small danger" data-action="remove" data-index="${i}">${tr.remove}</button>
          </div>
        </div>
        <div class="fw-ed-line"><span class="fw-ed-label">${tr.colors}</span><div class="fw-ed-chips">${colorChips}</div></div>
        <div class="fw-ed-line"><span class="fw-ed-label">${tr.shape}</span>${shapeSelect}</div>
        <div class="fw-ed-sliders">
          ${slider('size', tr.size)}
          ${slider('x', tr.x)}
          ${slider('height', tr.height)}
        </div>
      </div>`;
  }

  // 1つの行だけ描き直す (スライダー操作の途中で全体を描き直さない)
  private rerenderRow(i: number) {
    const row = this.modalEl.querySelector(`[data-row="${i}"]`);
    if (row) row.outerHTML = this.renderRow(i);
    this.afterEdit();
  }

  private afterEdit() {
    const summary = this.modalEl.querySelector('.fw-editor-summary');
    if (summary) summary.textContent = this.summaryText();
    this.drawMap();
    this.persist();
  }

  private summaryText(): string {
    return t().fireworks.editor.summary(this.program.shots.length, programDuration(this.program).toFixed(1));
  }

  private setMessages(messages: { kind: MessageKind; text: string }[]) {
    this.messages = messages;
    this.renderMessages();
  }

  private renderMessages() {
    const el = this.modalEl.querySelector('.fw-editor-messages') as HTMLElement | null;
    if (!el) return;
    el.innerHTML = this.messages.map(m => `<div class="fw-ed-msg ${m.kind}">${escapeHtml(m.text)}</div>`).join('');
  }

  private warningText(w: ProgramWarning): string {
    const tr = t().fireworks.editor;
    switch (w.code) {
      case 'clamped': return tr.warnings.clamped(w.shot, tr.fieldNames[w.field], w.value);
      case 'unknownColor': return tr.warnings.unknownColor(w.shot, w.value);
      case 'tooManyColors': return tr.warnings.tooManyColors(w.shot);
      case 'noColors': return tr.warnings.noColors(w.shot);
      case 'unknownShape': return tr.warnings.unknownShape(w.shot, w.value);
      case 'tooManyShots': return tr.warnings.tooManyShots(w.count);
    }
  }

  // どこで開くかを、横 = 左右の位置・たて = 高さの図に描く
  private drawMap() {
    const canvas = this.modalEl.querySelector('.fw-editor-map') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    const pad = 18;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);
    // 地面
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, h - pad, w, pad);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const y = h - pad - ((h - pad * 2) * k) / 4;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }
    this.program.shots.forEach((shot, i) => {
      const x = pad + ((w - pad * 2) * shot.x) / 100;
      const y = h - pad - ((h - pad * 2) * shot.height) / 100;
      const r = 6 + (shot.size / 100) * 8;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      grad.addColorStop(0, flameColor(shot.colors[0]));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      // 打ち上げの軌跡
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.25)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, h - pad);
      ctx.lineTo(x, y + r);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x, y);
    });
  }

  private handleClick(e: Event) {
    if (e.target === this.modalEl) {
      this.close();
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const tr = t().fireworks.editor;
    const i = Number(btn.dataset.index);
    const shots = this.program.shots;

    switch (btn.dataset.action) {
      case 'close':
        this.close();
        return;
      case 'color': {
        const sym = btn.dataset.sym!;
        const colors = shots[i].colors;
        const idx = colors.indexOf(sym);
        if (idx >= 0) {
          if (colors.length > 1) colors.splice(idx, 1);
        } else {
          if (colors.length >= MAX_FIREWORK_COLORS) colors.shift();
          colors.push(sym);
        }
        soundManager.playClick();
        this.rerenderRow(i);
        return;
      }
      case 'test':
        this.onLaunchShots?.([{ ...shots[i], time: 0 }], true);
        return;
      case 'duplicate':
        if (shots.length >= MAX_PROGRAM_SHOTS) {
          this.setMessages([{ kind: 'warn', text: tr.maxShots(MAX_PROGRAM_SHOTS) }]);
          return;
        }
        shots.splice(i + 1, 0, createShot({ ...shots[i], time: Math.min(SHOT_LIMITS.time.max, Number((shots[i].time + 0.5).toFixed(1))) }));
        break;
      case 'remove':
        shots.splice(i, 1);
        break;
      case 'add': {
        if (shots.length >= MAX_PROGRAM_SHOTS) {
          this.setMessages([{ kind: 'warn', text: tr.maxShots(MAX_PROGRAM_SHOTS) }]);
          return;
        }
        const last = shots[shots.length - 1];
        shots.push(last
          ? createShot({ ...last, time: Math.min(SHOT_LIMITS.time.max, Number((last.time + 1).toFixed(1))) })
          : createShot());
        break;
      }
      case 'sort':
        this.program = sortShotsByTime(this.program);
        break;
      case 'sample':
        this.program = sampleProgram(tr.sampleTitle);
        this.messages = [];
        break;
      case 'clear':
        if (shots.length > 0 && !window.confirm(tr.confirmClear)) return;
        this.program = createProgram(this.program.title || tr.defaultTitle, []);
        break;
      case 'save':
        this.download();
        return;
      case 'load':
        this.pickFile();
        return;
      case 'launch-all':
        if (shots.length > 0) this.onLaunchShots?.(shots.map(s => ({ ...s, colors: [...s.colors] })), false);
        return;
      default:
        return;
    }
    soundManager.playClick();
    this.render();
    this.persist();
  }

  // スライダー・数値・タイトルの入力 (その場で値と図だけ更新する)
  private handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const field = input.dataset.field;
    if (!field) return;
    if (field === 'title') {
      this.program.title = input.value.slice(0, 60);
      this.persist();
      return;
    }
    const i = Number(input.dataset.index);
    const shot = this.program.shots[i];
    if (!shot || !(field in SHOT_LIMITS)) return;
    const f = field as ShotNumberField;
    const n = Number(input.value);
    if (!Number.isFinite(n) || input.value === '') return;
    const { min, max } = SHOT_LIMITS[f];
    shot[f] = Math.min(max, Math.max(min, f === 'time' ? Number(n.toFixed(1)) : Math.round(n)));
    if (SLIDER_FIELDS.includes(f)) {
      const label = this.modalEl.querySelector(`[data-row="${i}"] [data-value-for="${f}"]`);
      if (label) label.textContent = `${shot[f]}${f === 'size' ? '%' : ''}`;
    }
    this.afterEdit();
  }

  // 数値入力で入力を終えた時は、範囲内に丸めた値を表示し直す
  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.classList.contains('fw-editor-file')) {
      const file = input.files?.[0];
      if (file) void this.loadFile(file);
      input.value = '';
      return;
    }
    if (input.dataset.field === 'time') {
      const shot = this.program.shots[Number(input.dataset.index)];
      if (shot) input.value = String(shot.time);
    }
    if (input.dataset.field === 'shape') {
      const shot = this.program.shots[Number(input.dataset.index)];
      if (!shot || !(FIREWORK_SHAPES as string[]).includes(input.value)) return;
      shot.shape = input.value as FireworkShot['shape'];
      soundManager.playClick();
      this.afterEdit();
    }
  }

  private download() {
    const tr = t().fireworks.editor;
    const base = (this.program.title || tr.defaultTitle).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'fireworks';
    const fileName = `fireworks-${base}.json`;
    const blob = new Blob([serializeFireworkProgram(this.program)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    soundManager.playClick();
    this.setMessages([{ kind: 'info', text: tr.saved(fileName) }]);
  }

  private pickFile() {
    (this.modalEl.querySelector('.fw-editor-file') as HTMLInputElement | null)?.click();
  }

  private async loadFile(file: File) {
    const tr = t().fireworks.editor;
    const result = parseFireworkProgram(await file.text());
    if ('error' in result) {
      this.setMessages([{ kind: 'error', text: tr.errors[result.error] }]);
      return;
    }
    this.program = result.program;
    if (!this.program.title) this.program.title = file.name.replace(/\.json$/i, '');
    soundManager.playSuccessChime();
    this.render();
    this.persist();
    this.setMessages([
      { kind: 'info', text: tr.loaded(this.program.shots.length) },
      ...result.warnings.map(w => ({ kind: 'warn' as const, text: this.warningText(w) }))
    ]);
  }
}
