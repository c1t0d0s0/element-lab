import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName } from '../data/compounds';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, setLanguage, onLanguageChange } from '../i18n';

export type ToolType = 'spawn' | 'heat' | 'cool' | 'electric' | 'spark' | 'wall' | 'flask' | 'erase' | 'inspect';
export type FlaskType = 'erlenmeyer' | 'beaker' | 'testtube';

export interface SelectedItem {
  kind: 'element' | 'compound' | 'wall';
  id: string;
}

export class Toolbar {
  public activeTool: ToolType = 'spawn';
  public selectedItem: SelectedItem = { kind: 'element', id: 'H' };
  public selectedFlaskType: FlaskType = 'erlenmeyer';
  public isPaused: boolean = false;
  
  public onClear?: () => void;
  public onVentilate?: () => void;
  public onOpenPeriodicTable?: () => void;
  public onOpenEncyclopedia?: () => void;
  public onOpenQuests?: () => void;
  public onOpenTutorial?: () => void;
  public onLanguageChanged?: () => void;

  private quickElements = ['H', 'He', 'Li', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'S', 'Cl', 'K', 'Ca', 'Mn', 'Fe', 'Cu', 'Fr'];
  private quickCompounds = ['H2', 'O2', 'H2O', 'CuCl2', 'NaCl', 'Cl2', 'H2O2', 'CO', 'CO2', 'SO2', 'H2SO4', 'NH3', 'FeS', 'CaCO3', 'CaO', 'CaOH2', 'CuO', 'MgO', 'HCl', 'NaOH'];

  constructor() {
    this.render();
    onLanguageChange(() => {
      this.render();
    });
  }

  public setSelectedElement(symbol: string) {
    this.selectedItem = { kind: 'element', id: symbol };
    this.activeTool = 'spawn';
    this.render();
  }

  public render() {
    const topBarEl = document.getElementById('top-bar');
    const bottomBarEl = document.getElementById('bottom-bar');
    if (!topBarEl || !bottomBarEl) return;

    const tr = t();
    const lang = getLanguage();

    // トップバー (タイトル、チュートリアル・図鑑・クエスト・周期表ボタン、シミュレーション制御、言語切替)
    topBarEl.innerHTML = `
      <div class="top-nav-row top-nav-primary">
        <div class="top-nav-left">
          <div class="app-logo">
            <span class="logo-icon">⚗️</span>
            <div class="logo-text">
              <span class="logo-title">${tr.appTitle}</span>
              <span class="logo-subtitle">${tr.appSubtitle}</span>
            </div>
          </div>
        </div>

        <div class="top-nav-center">
          <button class="nav-btn tutorial-nav-btn" id="btn-open-tutorial" title="${tr.tooltips.inspect}">
            <span class="nav-btn-icon">🔰</span>
            <span class="nav-btn-text">${lang === 'ja' ? 'ガイド' : 'Guide'}</span>
          </button>
          <button class="nav-btn highlight-btn" id="btn-open-quests" title="${tr.quests.title}">
            <span class="nav-btn-icon">🎯</span>
            <span class="nav-btn-text">${lang === 'ja' ? 'クエスト' : 'Quests'}</span>
          </button>
          <button class="nav-btn" id="btn-open-periodic" title="${tr.periodicTable.title}">
            <span class="nav-btn-icon">⚛️</span>
            <span class="nav-btn-text">${lang === 'ja' ? '周期表' : 'Periodic'}</span>
          </button>
          <button class="nav-btn" id="btn-open-encyclopedia" title="${tr.encyclopedia.title}">
            <span class="nav-btn-icon">📖</span>
            <span class="nav-btn-text">${lang === 'ja' ? '図鑑' : 'Library'}</span>
          </button>
        </div>
      </div>

      <div class="top-nav-row top-nav-secondary">
        <div class="top-nav-right">
          <button class="icon-btn lang-btn" id="btn-toggle-lang" title="${lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}">
            <span class="btn-icon">🌐</span>
            <span class="btn-text-lang">${lang === 'ja' ? 'English' : '日本語'}</span>
          </button>
          <button class="icon-btn" id="btn-ventilate-chamber" title="${tr.tooltips.ventilate}">
            <span class="btn-icon">💨</span>
            <span class="btn-text-ctrl">${lang === 'ja' ? '換気' : 'Vent'}</span>
          </button>
          <button class="icon-btn ${this.isPaused ? 'paused' : ''}" id="btn-play-pause" title="${this.isPaused ? tr.nav.play : tr.nav.pause}">
            <span class="btn-icon">${this.isPaused ? '▶️' : '⏸️'}</span>
            <span class="btn-text-ctrl">${this.isPaused ? (lang === 'ja' ? '再生' : 'Play') : (lang === 'ja' ? '停止' : 'Pause')}</span>
          </button>
          <button class="icon-btn" id="btn-clear-lab" title="${tr.toasts.labCleared}">
            <span class="btn-icon">🗑️</span>
            <span class="btn-text-ctrl">${lang === 'ja' ? '全消去' : 'Clear'}</span>
          </button>
          <button class="icon-btn sound-btn" id="btn-toggle-sound" title="Sound Mute/Unmute">
            <span class="btn-icon">${soundManager.isEnabled() ? '🔊' : '🔇'}</span>
          </button>
        </div>
      </div>
    `;

    // ボトムバー (ツール選択 & 元素パレット)
    bottomBarEl.innerHTML = `
      <div class="bottom-tools-row">
        <!-- ツールセレクタ -->
        <div class="tool-group">
          <button class="tool-btn ${this.activeTool === 'spawn' ? 'active' : ''}" data-tool="spawn" title="${tr.tooltips.spawn}">
            ${tr.tools.spawn}
          </button>
          <button class="tool-btn ${this.activeTool === 'flask' ? 'active' : ''}" data-tool="flask" title="${tr.tooltips.flask}">
            ${tr.tools.flask}
          </button>
          <button class="tool-btn ${this.activeTool === 'heat' ? 'active' : ''}" data-tool="heat" title="${tr.tooltips.heat}">
            ${tr.tools.heat}
          </button>
          <button class="tool-btn ${this.activeTool === 'cool' ? 'active' : ''}" data-tool="cool" title="${tr.tooltips.cool}">
            ${tr.tools.cool}
          </button>
          <button class="tool-btn ${this.activeTool === 'electric' ? 'active' : ''}" data-tool="electric" title="${tr.tooltips.electric}">
            ${tr.tools.electric}
          </button>
          <button class="tool-btn ${this.activeTool === 'spark' ? 'active' : ''}" data-tool="spark" title="${tr.tooltips.spark}">
            ${tr.tools.spark}
          </button>
          <button class="tool-btn ${this.activeTool === 'wall' ? 'active' : ''}" data-tool="wall" title="${tr.tooltips.wall}">
            ${tr.tools.wall}
          </button>
          <button class="tool-btn ${this.activeTool === 'erase' ? 'active' : ''}" data-tool="erase" title="${tr.tooltips.erase}">
            ${tr.tools.erase}
          </button>
          <button class="tool-btn" id="btn-bottom-ventilate" title="${tr.tooltips.ventilate}">
            ${tr.tools.ventilate}
          </button>
          <button class="tool-btn ${this.activeTool === 'inspect' ? 'active' : ''}" data-tool="inspect" title="${tr.tooltips.inspect}">
            ${tr.tools.inspect}
          </button>
        </div>
      </div>

      <!-- 元素・物質クイックパレット / 器具セレクタ -->
      <div class="bottom-palette-row">
        <div class="palette-scroll">
          ${this.activeTool === 'flask' ? `
            <div class="palette-section-title">${tr.tools.paletteSectionFlask}</div>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'erlenmeyer' ? 'selected' : ''}" data-flask="erlenmeyer" style="border-color: #38BDF8;">
              <span class="chip-symbol">🏺</span>
              <span class="chip-name">${tr.tools.erlenmeyer}</span>
            </button>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'beaker' ? 'selected' : ''}" data-flask="beaker" style="border-color: #38BDF8;">
              <span class="chip-symbol">🥛</span>
              <span class="chip-name">${tr.tools.beaker}</span>
            </button>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'testtube' ? 'selected' : ''}" data-flask="testtube" style="border-color: #38BDF8;">
              <span class="chip-symbol">🧪</span>
              <span class="chip-name">${tr.tools.testtube}</span>
            </button>
            <div class="palette-divider"></div>
          ` : ''}

          <div class="palette-section-title">${tr.tools.paletteSectionElement}</div>
          ${this.quickElements.map(sym => {
            const el = ELEMENTS_DATA[sym];
            if (!el) return '';
            const isSelected = this.activeTool === 'spawn' && this.selectedItem.kind === 'element' && this.selectedItem.id === sym;
            const displayName = getElementName(el, lang);
            return `
              <button class="element-chip ${isSelected ? 'selected' : ''}" data-kind="element" data-id="${sym}" style="border-color: ${el.color};">
                <span class="chip-symbol">${el.symbol}</span>
                <span class="chip-name">${displayName}</span>
              </button>
            `;
          }).join('')}

          <div class="palette-divider"></div>
          <div class="palette-section-title">${tr.tools.paletteSectionCompound}</div>
          ${this.quickCompounds.map(compKey => {
            const comp = COMPOUNDS_DATA[compKey];
            if (!comp) return '';
            const isSelected = this.activeTool === 'spawn' && this.selectedItem.kind === 'compound' && this.selectedItem.id === compKey;
            const displayName = getCompoundName(comp, lang);
            return `
              <button class="compound-chip ${isSelected ? 'selected' : ''} ${comp.isToxic ? 'toxic-chip' : ''}" data-kind="compound" data-id="${compKey}" style="border-color: ${comp.color};">
                <span class="chip-symbol">${comp.formula}</span>
                <span class="chip-name">${displayName}</span>
              </button>
            `;
          }).join('')}

          <button class="more-elements-btn" id="btn-more-elements" title="${tr.tooltips.moreElements}">
            ${tr.tools.moreElements}
          </button>
        </div>
      </div>
    `;

    // イベントバインド
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
      const nextLang = getLanguage() === 'ja' ? 'en' : 'ja';
      setLanguage(nextLang);
      soundManager.playClick();
      this.onLanguageChanged?.();
    });

    document.getElementById('btn-open-tutorial')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenTutorial?.();
    });

    document.getElementById('btn-open-quests')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenQuests?.();
    });

    document.getElementById('btn-open-periodic')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenPeriodicTable?.();
    });

    document.getElementById('btn-open-encyclopedia')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenEncyclopedia?.();
    });

    document.getElementById('btn-play-pause')?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      soundManager.playClick();
      this.render();
    });

    document.getElementById('btn-ventilate-chamber')?.addEventListener('click', () => {
      soundManager.playVentilation();
      this.onVentilate?.();
    });

    document.getElementById('btn-bottom-ventilate')?.addEventListener('click', () => {
      soundManager.playVentilation();
      this.onVentilate?.();
    });

    document.getElementById('btn-clear-lab')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onClear?.();
    });

    document.getElementById('btn-toggle-sound')?.addEventListener('click', () => {
      soundManager.toggleSound();
      soundManager.playClick();
      this.render();
    });

    document.getElementById('btn-more-elements')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenPeriodicTable?.();
    });

    // ツールボタン
    const toolBtns = bottomBarEl.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ToolType;
        if (tool) {
          if (tool === 'wall') {
            this.activeTool = 'spawn';
            this.selectedItem = { kind: 'wall', id: 'wall' };
          } else {
            this.activeTool = tool;
          }
          soundManager.playClick();
          this.render();
        }
      });
    });

    // フラスコ器具ボタン
    const flaskChips = bottomBarEl.querySelectorAll('.flask-chip');
    flaskChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const fType = chip.getAttribute('data-flask') as FlaskType;
        if (fType) {
          this.selectedFlaskType = fType;
          soundManager.playGlass();
          this.render();
        }
      });
    });

    // パレットボタン
    const chips = bottomBarEl.querySelectorAll('.element-chip:not(.flask-chip), .compound-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const kind = chip.getAttribute('data-kind') as 'element' | 'compound';
        const id = chip.getAttribute('data-id');
        if (kind && id) {
          this.activeTool = 'spawn';
          this.selectedItem = { kind, id };
          soundManager.playPop(520);
          this.render();
        }
      });
    });
  }
}
