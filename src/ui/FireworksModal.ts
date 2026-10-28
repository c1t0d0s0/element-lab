import { FIREWORK_ELEMENTS, MAX_FIREWORK_COLORS, FireworkDesign, FireworkShape, isShapeUnlocked, getFireworkColorInfo, isFireworkColorUnlocked } from '../engine/Fireworks';
import { FireworkShot, programDuration, FIREWORK_SHAPES } from '../data/fireworkProgram';
import { FireworkProgramEditor } from './FireworkProgramEditor';
import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { GameStats } from '../data/quests';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';

// 打ち上げ方: 選んだ色・形で1発/スターマイン、または発射プログラム (isTest は試し打ちの1発)
export type FireworkLaunchRequest =
  | { kind: 'design'; design: FireworkDesign }
  | { kind: 'program'; shots: FireworkShot[]; isTest: boolean };

// 花火工房: 炎色反応で見つけた色を組み合わせて花火を打ち上げる
export class FireworksModal {
  private modalEl: HTMLElement;
  private getStats: () => GameStats;
  private selected: string[] = [];
  private shape: FireworkShape = 'chrysanthemum';
  private count: number = 1;
  private custom: boolean = false; // 打ち上げ数で「カスタム」(発射プログラム) を選んでいる
  private editor: FireworkProgramEditor;
  public onLaunch?: (request: FireworkLaunchRequest) => void;

  constructor(getStats: () => GameStats) {
    this.getStats = getStats;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'fireworks-modal';
    document.body.appendChild(this.modalEl);

    this.editor = new FireworkProgramEditor(getStats);
    this.editor.onChange = () => {
      if (!this.modalEl.classList.contains('hidden')) this.render();
    };
    this.editor.onLaunchShots = (shots, isTest) => {
      // 打ち上げが見えるように、エディタと工房を閉じる
      this.editor.close();
      this.close();
      this.onLaunch?.({ kind: 'program', shots, isTest });
    };

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    onLanguageChange(() => {
      if (!this.modalEl.classList.contains('hidden')) this.render();
    });
  }

  private isUnlocked(symbol: string): boolean {
    return isFireworkColorUnlocked(symbol, this.getStats());
  }

  public open() {
    // 使えなくなった色 (別の端末のデータ等) は選択から外す
    this.selected = this.selected.filter(sym => this.isUnlocked(sym));
    if (!isShapeUnlocked(this.shape, this.getStats())) this.shape = 'chrysanthemum';
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  // 試し打ちを見終わった後、工房とエディタを開き直す
  public reopenEditor() {
    this.custom = true;
    this.open();
    this.editor.open();
  }

  private render() {
    const tr = t().fireworks;
    const lang = getLanguage();
    const unlocked = FIREWORK_ELEMENTS.filter(sym => this.isUnlocked(sym));
    const stats = this.getStats();

    const colorButtons = FIREWORK_ELEMENTS.map(sym => {
      const el = ELEMENTS_DATA[sym];
      const flame = getFireworkColorInfo(sym);
      const name = el ? getElementName(el, lang) : sym;
      if (!this.isUnlocked(sym) || !flame) {
        return `
          <button class="fw-color locked" disabled title="${tr.lockedHint(name, sym)}">
            <span class="fw-swatch">?</span>
            <span class="fw-color-name">${sym}</span>
            <span class="fw-color-sub">${tr.lockedHint(name, sym)}</span>
          </button>`;
      }
      const order = this.selected.indexOf(sym);
      const colorName = lang === 'en' ? flame.nameEn : flame.nameJa;
      return `
        <button class="fw-color ${order >= 0 ? 'selected' : ''}" data-sym="${sym}" style="--fw-color: ${flame.color};">
          <span class="fw-swatch">${order >= 0 ? order + 1 : ''}</span>
          <span class="fw-color-name">${sym} ${name}</span>
          <span class="fw-color-sub">${colorName}</span>
        </button>`;
    }).join('');

    this.modalEl.innerHTML = `
      <div class="modal-card fireworks-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.unlockedCount(unlocked.length, FIREWORK_ELEMENTS.length)}</span>
          </div>
          <button class="close-btn" id="close-fireworks-modal">✕</button>
        </div>
        <div class="fireworks-body">
          <p class="fw-subtitle">${unlocked.length > 0 ? tr.subtitle : tr.noColors}</p>

          ${this.custom ? '' : `
          <h3 class="fw-section">${tr.colorsLabel(this.selected.length, MAX_FIREWORK_COLORS)}</h3>
          <div class="fw-color-grid">${colorButtons}</div>

          <h3 class="fw-section">${tr.shapeLabel}</h3>
          <div class="fw-option-row">
            ${FIREWORK_SHAPES.map(shape => !isShapeUnlocked(shape, stats) ? `
              <button class="fw-option locked" disabled>${shape === 'kamuro' ? tr.kamuroLocked : tr.willowLocked}</button>
            ` : `
              <button class="fw-option ${this.shape === shape ? 'selected' : ''}" data-shape="${shape}">${tr.shapes[shape]}</button>
            `).join('')}
          </div>
          `}

          <h3 class="fw-section">${tr.countLabel}</h3>
          <div class="fw-option-row">
            <button class="fw-option ${!this.custom && this.count === 1 ? 'selected' : ''}" data-count="1">${tr.countSingle}</button>
            <button class="fw-option ${!this.custom && this.count === 5 ? 'selected' : ''}" data-count="5">${tr.countStarmine}</button>
            <button class="fw-option ${this.custom ? 'selected' : ''}" data-count="custom">${tr.countCustom}</button>
          </div>

          ${this.custom ? this.renderProgramSummary() : ''}

          <button class="fw-launch-btn" id="fw-launch" ${this.canLaunch() ? '' : 'disabled'}>${tr.launch}</button>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#close-fireworks-modal')?.addEventListener('click', () => this.close());

    this.modalEl.querySelectorAll<HTMLButtonElement>('.fw-color[data-sym]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.sym!;
        const idx = this.selected.indexOf(sym);
        if (idx >= 0) {
          this.selected.splice(idx, 1);
        } else if (this.selected.length < MAX_FIREWORK_COLORS) {
          this.selected.push(sym);
        } else {
          // 上限なら一番古い色と入れ替える
          this.selected.shift();
          this.selected.push(sym);
        }
        soundManager.playClick();
        this.render();
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('.fw-option[data-shape]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.shape = btn.dataset.shape as FireworkShape;
        soundManager.playClick();
        this.render();
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('.fw-option[data-count]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.custom = btn.dataset.count === 'custom';
        if (!this.custom) this.count = Number(btn.dataset.count);
        soundManager.playClick();
        this.render();
      });
    });

    this.modalEl.querySelector('#fw-edit-program')?.addEventListener('click', () => {
      soundManager.playClick();
      this.editor.open();
    });

    this.modalEl.querySelector('#fw-launch')?.addEventListener('click', () => {
      if (!this.canLaunch()) return;
      this.close();
      if (this.custom) {
        const shots = this.editor.getProgram().shots.map(s => ({ ...s, colors: [...s.colors] }));
        this.onLaunch?.({ kind: 'program', shots, isTest: false });
      } else {
        this.onLaunch?.({ kind: 'design', design: { symbols: [...this.selected], shape: this.shape, count: this.count } });
      }
    });
  }

  private canLaunch(): boolean {
    return this.custom ? this.editor.getProgram().shots.length > 0 : this.selected.length > 0;
  }

  private renderProgramSummary(): string {
    const tr = t().fireworks;
    const p = this.editor.getProgram();
    const title = (p.title || tr.editor.defaultTitle).replace(/[&<>"']/g, '');
    return `
      <div class="fw-program-summary">
        <div class="fw-program-text">${p.shots.length > 0 ? tr.programSummary(title, p.shots.length, programDuration(p).toFixed(1)) : tr.programEmpty}</div>
        <button class="fw-option" id="fw-edit-program">${tr.editProgram}</button>
      </div>`;
  }
}
