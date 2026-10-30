import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, getCompoundFormula, CompoundCategory, COMPOUND_CATEGORY_LIST } from '../data/compounds';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, setLanguage, onLanguageChange, getGrade, setGrade, Grade, GRADES } from '../i18n';
import { WALL_TYPES, WALL_TYPE_IDS, WallTypeId, MAX_WALL_SIZE, WALL_BLOCK, isWallTypeId } from '../data/walls';
import { drawWallBlock } from '../engine/Particle';
import type { ClearTarget } from '../engine/PhysicsWorld';

// 壁ツールの設定 (強さ・大きさ) の保存キー
export const WALL_SETTINGS_STORAGE_KEY = 'element_lab_wall_settings';
export const ERASER_SIZE_STORAGE_KEY = 'element_lab_eraser_size';

// 全消去メニューの並び (いちばん下が「すべて」)
export const CLEAR_TARGETS: ClearTarget[] = ['chemicals', 'walls', 'apparatus', 'all'];

export type ToolType = 'spawn' | 'balance' | 'flask' | 'heat' | 'cool' | 'electric' | 'spark' | 'wall' | 'erase' | 'inspect';
export type FlaskType = 'erlenmeyer' | 'beaker' | 'testtube';
// 電気ツールの使い方: なぞったところに放電する / ビーカーに電極をつなぐ
export type ElectricMode = 'discharge' | 'electrodes' | 'cell';
// 消しゴムの大きさ。「1つずつ」と「小」は粒子だけを消し、ガラス器具・天秤は残す
export type EraserSize = 'one' | 'small' | 'medium' | 'large';
export const ERASER_SIZES: EraserSize[] = ['one', 'small', 'medium', 'large'];
// 消す範囲の半径 (px)。「1つずつ」は指・カーソルの下の粒子だけなので 0
export const ERASER_RADIUS: Record<EraserSize, number> = { one: 0, small: 15, medium: 35, large: 70 };
export function eraserErasesGlassware(size: EraserSize): boolean {
  return size === 'medium' || size === 'large';
}

export interface SelectedItem {
  kind: 'element' | 'compound' | 'wall';
  id: string;
}

export class Toolbar {
  public activeTool: ToolType = 'spawn';
  public selectedItem: SelectedItem = { kind: 'element', id: 'H' };
  public selectedFlaskType: FlaskType = 'erlenmeyer';
  public electricMode: ElectricMode = 'discharge';
  public selectedCompoundCategory: CompoundCategory = 'basic';
  // 壁ツール: 置く壁の強さと、一度に置く大きさ (ブロック数)。初期値は今までと同じ耐熱壁 1×1
  public selectedWallType: WallTypeId = 'wall';
  public wallCols: number = 1;
  public wallRows: number = 1;
  // 消しゴムの大きさ。初期値は今までと同じ「中」
  public eraserSize: EraserSize = 'medium';
  public isPaused: boolean = false;
  
  public onClear?: (target: ClearTarget) => void;
  // 全消去ボタンの「消すものを選ぶ」メニューが開いているか
  private clearMenuOpen = false;
  public onOpenPeriodicTable?: () => void;
  public onOpenEncyclopedia?: (tab?: 'compounds') => void;
  public onOpenQuests?: () => void;
  public onOpenFireworks?: () => void;
  public onOpenTitration?: () => void;
  public onOpenEquilibrium?: () => void;
  public onOpenTutorial?: () => void;
  public onLanguageChanged?: () => void;
  public onGradeChanged?: (grade: Grade) => void;
  public onUndo?: () => void;
  public onOpenSave?: () => void;
  // 「元に戻す」で戻れる操作があるか
  private canUndo = false;

  public setUndoAvailable(available: boolean) {
    if (this.canUndo === available) return;
    this.canUndo = available;
    const btn = document.getElementById('btn-undo') as HTMLButtonElement | null;
    if (btn) btn.disabled = !available;
  }

  public quickElements = [
    'H', 'He', 'Li', 'B', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl',
    'K', 'Ca', 'Mn', 'Fe', 'Cu', 'Zn', 'As', 'Se', 'Rb', 'Sr', 'Mo', 'Ag', 'In',
    'Sb', 'Te', 'Cs', 'Ba', 'Tl', 'Pb', 'Ra'
  ];

  constructor() {
    this.loadWallSettings();
    this.loadEraserSize();
    // 全消去メニューは、メニューの外をクリックするか Esc で閉じる (render() で作り直されるので document で受ける)
    if (typeof document !== 'undefined') {
      // 実験チャンバーをタップして閉じたときは、そのタップで粒子などを置かないように、キャンバスへ届く前に止める
      document.addEventListener('pointerdown', e => {
        const target = e.target as Element | null;
        if (!this.clearMenuOpen || target?.closest?.('.clear-wrap')) return;
        if (target?.id === 'sim-canvas') {
          e.stopPropagation();
          e.preventDefault();
        }
        this.closeClearMenu();
      }, true);
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.clearMenuOpen) this.closeClearMenu();
      });
    }
    this.render();
    onLanguageChange(() => {
      this.render();
    });
  }

  private closeClearMenu() {
    this.clearMenuOpen = false;
    this.render();
  }

  public setSelectedElement(symbol: string) {
    this.selectedItem = { kind: 'element', id: symbol };
    this.activeTool = 'spawn';
    this.render();
  }

  // 図鑑から化合物を選んだ時。パレットにある化合物ならそのタブに切り替えて選択中のチップを見せる
  public setSelectedCompound(compoundId: string) {
    this.selectedItem = { kind: 'compound', id: compoundId };
    this.activeTool = 'spawn';
    const current = COMPOUND_CATEGORY_LIST.find(c => c.id === this.selectedCompoundCategory);
    if (!current?.compoundIds.includes(compoundId)) {
      const cat = COMPOUND_CATEGORY_LIST.find(c => c.compoundIds.includes(compoundId));
      if (cat) this.selectedCompoundCategory = cat.id;
    }
    this.render();
  }

  // 再生・一時停止を外から切りかえる (読みこんだ実験を止めた状態で見せるときなど)
  public setPaused(paused: boolean) {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    this.render();
  }

  public render() {
    if (typeof document === 'undefined') return;
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
          ${getGrade() === 'high' ? `
          <button class="nav-btn" id="btn-open-titration" title="${tr.titration.title}">
            <span class="nav-btn-icon">🧪</span>
            <span class="nav-btn-text">${tr.titration.navLabel}</span>
          </button>
          <button class="nav-btn" id="btn-open-equilibrium" title="${tr.equilibrium.title}">
            <span class="nav-btn-icon">⚖️</span>
            <span class="nav-btn-text">${tr.equilibrium.navLabel}</span>
          </button>` : ''}
          <button class="nav-btn" id="btn-open-fireworks" title="${tr.fireworks.title}">
            <span class="nav-btn-icon">🎆</span>
            <span class="nav-btn-text">${lang === 'ja' ? '花火' : 'Fireworks'}</span>
          </button>
        </div>
      </div>

      <div class="top-nav-row top-nav-secondary">
        <div class="top-nav-right">
          <label class="icon-btn grade-btn" title="${tr.grade.label}">
            <span class="grade-label">${tr.grade.label}</span>
            <select id="grade-select" aria-label="${tr.grade.label}">
              ${GRADES.map(g => `<option value="${g}" ${g === getGrade() ? 'selected' : ''}>${tr.grade.names[g]}</option>`).join('')}
            </select>
          </label>
          <button class="icon-btn lang-btn" id="btn-toggle-lang" title="${lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}">
            <span class="btn-icon">🌐</span>
            <span class="btn-text-lang">${lang === 'ja' ? 'English' : '日本語'}</span>
          </button>
          <button class="icon-btn" id="btn-undo" title="${tr.lab.undoTitle}" aria-label="${tr.lab.undo}" ${this.canUndo ? '' : 'disabled'}>
            <span class="btn-icon">↩️</span>
            <span class="btn-text-ctrl">${tr.lab.undo}</span>
          </button>
          <button class="icon-btn" id="btn-open-save" title="${tr.lab.saveTitle}" aria-label="${tr.lab.saveTitle}">
            <span class="btn-icon">💾</span>
            <span class="btn-text-ctrl">${tr.lab.save}</span>
          </button>
          <button class="icon-btn ${this.isPaused ? 'paused' : ''}" id="btn-play-pause" title="${this.isPaused ? tr.nav.play : tr.nav.pause}">
            <span class="btn-icon">${this.isPaused ? '▶️' : '⏸️'}</span>
            <span class="btn-text-ctrl">${this.isPaused ? (lang === 'ja' ? '再生' : 'Play') : (lang === 'ja' ? '停止' : 'Pause')}</span>
          </button>
          <div class="clear-wrap">
            <button class="icon-btn ${this.clearMenuOpen ? 'active' : ''}" id="btn-clear-lab" title="${tr.nav.clearTitle}" aria-haspopup="menu" aria-expanded="${this.clearMenuOpen}">
              <span class="btn-icon">🗑️</span>
              <span class="btn-text-ctrl">${lang === 'ja' ? '全消去' : 'Clear'}</span>
            </button>
            ${this.clearMenuOpen ? `
              <div class="clear-menu" role="menu">
                ${CLEAR_TARGETS.map(target => `
                  <button class="clear-menu-item ${target === 'all' ? 'danger' : ''}" role="menuitem" data-clear="${target}">${tr.nav.clearMenu[target]}</button>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <button class="icon-btn sound-btn" id="btn-toggle-sound" title="Sound Mute/Unmute">
            <span class="btn-icon">${soundManager.isEnabled() ? '🔊' : '🔇'}</span>
          </button>
        </div>
      </div>
    `;

    // ボトムバー (ツール選択 & 元素パレット / 化合物パレット 2行表示)
    bottomBarEl.innerHTML = `
      <div class="bottom-tools-row">
        <!-- ツールセレクタ -->
        <div class="tool-group">
          <button class="tool-btn ${this.activeTool === 'spawn' ? 'active' : ''}" data-tool="spawn" title="${tr.tooltips.spawn}">
            ${tr.tools.spawn}
          </button>
          <button class="tool-btn ${this.activeTool === 'balance' ? 'active' : ''}" data-tool="balance" title="${tr.tooltips.balance}">
            ${tr.tools.balance}
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
          <button class="tool-btn ${this.activeTool === 'inspect' ? 'active' : ''}" data-tool="inspect" title="${tr.tooltips.inspect}">
            ${tr.tools.inspect}
          </button>
        </div>
      </div>

      <!-- 元素クイックパレット / 器具セレクタ (1行目) -->
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

          ${this.activeTool === 'electric' ? `
            <div class="palette-section-title">${tr.tools.paletteSectionElectric}</div>
            <button class="element-chip electric-chip ${this.electricMode === 'discharge' ? 'selected' : ''}" data-electric="discharge" style="border-color: #38BDF8;" title="${tr.tools.electricDischargeDesc}">
              <span class="chip-symbol">⚡</span>
              <span class="chip-name">${tr.tools.electricDischarge}</span>
            </button>
            <button class="element-chip electric-chip ${this.electricMode === 'electrodes' ? 'selected' : ''}" data-electric="electrodes" style="border-color: #FACC15;" title="${tr.tools.electricElectrodesDesc}">
              <span class="chip-symbol">🔋</span>
              <span class="chip-name">${tr.tools.electricElectrodes}</span>
            </button>
            <button class="element-chip electric-chip ${this.electricMode === 'cell' ? 'selected' : ''}" data-electric="cell" style="border-color: #FB923C;" title="${tr.tools.electricCellDesc}">
              <span class="chip-symbol">⚙️</span>
              <span class="chip-name">${tr.tools.electricCell}</span>
            </button>
            <div class="palette-divider"></div>
          ` : ''}

          ${this.activeTool === 'wall' ? `
            <div class="palette-section-title">${tr.tools.paletteSectionWall}</div>
            ${WALL_TYPE_IDS.map(id => {
              const wt = WALL_TYPES[id];
              return `
                <button class="element-chip wall-chip ${this.selectedWallType === id ? 'selected' : ''}" data-wall="${id}" style="border-color: ${wt.color};" title="${lang === 'en' ? wt.descEn : wt.descJa}">
                  <canvas class="wall-swatch" data-wall-swatch="${id}" width="${WALL_BLOCK}" height="${WALL_BLOCK}"></canvas>
                  <span class="chip-name">${lang === 'en' ? wt.nameEn : wt.nameJa}</span>
                  <span class="wall-stars">${'★'.repeat(wt.stars)}${'☆'.repeat(4 - wt.stars)}</span>
                </button>`;
            }).join('')}
            <div class="palette-divider"></div>
            <div class="palette-section-title">${tr.tools.paletteSectionWallSize}</div>
            ${(['cols', 'rows'] as const).map(axis => {
              const value = axis === 'cols' ? this.wallCols : this.wallRows;
              return `
                <div class="wall-size-stepper">
                  <span class="wall-size-label">${axis === 'cols' ? tr.tools.wallWidth : tr.tools.wallHeight}</span>
                  <button class="wall-size-btn" data-wall-axis="${axis}" data-delta="-1" ${value <= 1 ? 'disabled' : ''} aria-label="-">−</button>
                  <span class="wall-size-value">${value}</span>
                  <button class="wall-size-btn" data-wall-axis="${axis}" data-delta="1" ${value >= MAX_WALL_SIZE ? 'disabled' : ''} aria-label="+">＋</button>
                </div>`;
            }).join('')}
            <div class="palette-divider"></div>
          ` : ''}

          ${this.activeTool === 'erase' ? `
            <div class="palette-section-title">${tr.tools.paletteSectionEraserSize}</div>
            ${ERASER_SIZES.map(size => `
              <button class="element-chip eraser-chip ${this.eraserSize === size ? 'selected' : ''}" data-eraser="${size}" style="border-color: #F43F5E;" title="${tr.tools.eraserSizeDesc[size]}">
                <span class="eraser-dot" style="--eraser-dot: ${size === 'one' ? 4 : Math.round(ERASER_RADIUS[size] / 4) + 4}px;"></span>
                <span class="chip-name">${tr.tools.eraserSizes[size]}</span>
              </button>`).join('')}
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

          <button class="more-elements-btn" id="btn-more-elements" title="${tr.tooltips.moreElements}">
            ${tr.tools.moreElements}
          </button>
        </div>
      </div>

      <!-- 化合物クイックパレット (2行目: カテゴリタブ切り替え付き) -->
      <div class="bottom-palette-row compound-palette-row">
        <div class="palette-scroll">
          <div class="palette-section-title">${tr.tools.paletteSectionCompound}</div>
          
          <div class="compound-tabs-group">
            ${COMPOUND_CATEGORY_LIST.map(cat => {
              const isActive = this.selectedCompoundCategory === cat.id;
              const tabName = tr.tools.compoundTabs[cat.id] || (lang === 'ja' ? cat.nameJa : cat.nameEn);
              return `
                <button class="compound-tab-btn ${isActive ? 'active' : ''}" data-cat="${cat.id}">
                  ${tabName}
                </button>
              `;
            }).join('')}
          </div>

          <div class="palette-divider"></div>

          ${(COMPOUND_CATEGORY_LIST.find(c => c.id === this.selectedCompoundCategory)?.compoundIds || []).map(compKey => {
            const comp = COMPOUNDS_DATA[compKey];
            if (!comp) return '';
            const isSelected = this.activeTool === 'spawn' && this.selectedItem.kind === 'compound' && this.selectedItem.id === compKey;
            const displayName = getCompoundName(comp, lang);
            return `
              <button class="compound-chip ${isSelected ? 'selected' : ''} ${comp.isToxic ? 'toxic-chip' : ''}" data-kind="compound" data-id="${compKey}" style="border-color: ${comp.color};">
                <span class="chip-symbol">${getCompoundFormula(comp, lang)}</span>
                <span class="chip-name">${displayName}</span>
              </button>
            `;
          }).join('')}

          <button class="more-elements-btn" id="btn-more-compounds" title="${tr.encyclopedia.title}">
            ${lang === 'ja' ? '＋ 図鑑' : '＋ Library'}
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

    document.getElementById('grade-select')?.addEventListener('change', (e) => {
      const grade = (e.target as HTMLSelectElement).value as Grade;
      soundManager.playClick();
      setGrade(grade);
      this.onGradeChanged?.(grade);
    });

    document.getElementById('btn-open-tutorial')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenTutorial?.();
    });

    document.getElementById('btn-open-quests')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenQuests?.();
    });

    document.getElementById('btn-open-fireworks')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenFireworks?.();
    });

    document.getElementById('btn-open-titration')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenTitration?.();
    });

    document.getElementById('btn-open-equilibrium')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenEquilibrium?.();
    });

    document.getElementById('btn-open-periodic')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenPeriodicTable?.();
    });

    document.getElementById('btn-open-encyclopedia')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenEncyclopedia?.();
    });

    document.getElementById('btn-undo')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onUndo?.();
    });

    document.getElementById('btn-open-save')?.addEventListener('click', () => {
      soundManager.playClick();
      this.onOpenSave?.();
    });

    document.getElementById('btn-play-pause')?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      soundManager.playClick();
      this.render();
    });

    document.getElementById('btn-clear-lab')?.addEventListener('click', () => {
      soundManager.playClick();
      this.clearMenuOpen = !this.clearMenuOpen;
      this.render();
    });
    document.querySelectorAll<HTMLButtonElement>('.clear-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.clear as ClearTarget | undefined;
        if (!target || !CLEAR_TARGETS.includes(target)) return;
        this.clearMenuOpen = false;
        soundManager.playClick();
        this.render();
        this.onClear?.(target);
      });
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

    document.getElementById('btn-more-compounds')?.addEventListener('click', () => {
      soundManager.playClick();
      // 周期表の「＋ 他の元素」と同じく、化合物図鑑を開いてそこから配置できる
      this.onOpenEncyclopedia?.('compounds');
    });

    // 化合物カテゴリタブボタン
    const catBtns = bottomBarEl.querySelectorAll('.compound-tab-btn');
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') as CompoundCategory;
        if (cat && cat !== this.selectedCompoundCategory) {
          this.selectedCompoundCategory = cat;
          soundManager.playClick();
          this.render();
        }
      });
    });

    // マウスホイールによる横スクロール対応 (PCデスクトップ向け)
    const paletteRows = bottomBarEl.querySelectorAll<HTMLElement>('.bottom-palette-row');
    paletteRows.forEach(row => {
      row.addEventListener('wheel', (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          row.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    });

    // ツールボタン
    const toolBtns = bottomBarEl.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool') as ToolType;
        if (tool) {
          this.activeTool = tool;
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

    // 電気ツールの使い方 (放電 / 電極 / 電池)
    bottomBarEl.querySelectorAll<HTMLButtonElement>('.electric-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const mode = chip.dataset.electric;
        if (mode !== 'discharge' && mode !== 'electrodes' && mode !== 'cell') return;
        this.electricMode = mode;
        soundManager.playClick();
        this.render();
      });
    });

    // 壁の強さ: 見本に実際の壁と同じ模様を描く
    bottomBarEl.querySelectorAll<HTMLCanvasElement>('.wall-swatch').forEach(cv => {
      const id = cv.dataset.wallSwatch;
      const ctx = cv.getContext('2d');
      if (!ctx || !id || !isWallTypeId(id)) return;
      ctx.translate(WALL_BLOCK / 2, WALL_BLOCK / 2);
      drawWallBlock(ctx, WALL_TYPES[id], WALL_BLOCK / 2, 0, false, `swatch_${id}`);
    });
    // 壁の強さ・大きさを変えても壁ツールのままにして、続けて置けるようにする
    bottomBarEl.querySelectorAll<HTMLButtonElement>('.wall-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.wall;
        if (!id || !isWallTypeId(id)) return;
        this.selectedWallType = id;
        this.saveWallSettings();
        soundManager.playClick();
        this.render();
      });
    });
    bottomBarEl.querySelectorAll<HTMLButtonElement>('.wall-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = Number(btn.dataset.delta);
        const clamp = (v: number) => Math.max(1, Math.min(MAX_WALL_SIZE, v + delta));
        if (btn.dataset.wallAxis === 'cols') this.wallCols = clamp(this.wallCols);
        else this.wallRows = clamp(this.wallRows);
        this.saveWallSettings();
        soundManager.playClick();
        this.render();
      });
    });

    // 消しゴムの大きさを変えても消しゴムツールのままにする
    bottomBarEl.querySelectorAll<HTMLButtonElement>('.eraser-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const size = chip.dataset.eraser as EraserSize | undefined;
        if (!size || !ERASER_SIZES.includes(size)) return;
        this.eraserSize = size;
        this.saveEraserSize();
        soundManager.playClick();
        this.render();
      });
    });

    // パレットボタン
    const chips = bottomBarEl.querySelectorAll('.element-chip:not(.flask-chip):not(.wall-chip):not(.electric-chip):not(.eraser-chip), .compound-chip');
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

  private loadWallSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(WALL_SETTINGS_STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (typeof saved.type === 'string' && isWallTypeId(saved.type)) this.selectedWallType = saved.type;
      const size = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? Math.max(1, Math.min(MAX_WALL_SIZE, v)) : 1);
      this.wallCols = size(saved.cols);
      this.wallRows = size(saved.rows);
    } catch {
      // 壊れた保存データは無視して初期値のまま
    }
  }

  private saveWallSettings() {
    try {
      localStorage.setItem(WALL_SETTINGS_STORAGE_KEY, JSON.stringify({ type: this.selectedWallType, cols: this.wallCols, rows: this.wallRows }));
    } catch {
      // ignore
    }
  }

  private loadEraserSize() {
    try {
      const saved = localStorage.getItem(ERASER_SIZE_STORAGE_KEY);
      if (saved && ERASER_SIZES.includes(saved as EraserSize)) this.eraserSize = saved as EraserSize;
    } catch {
      // 読めないときは初期値のまま
    }
  }

  private saveEraserSize() {
    try {
      localStorage.setItem(ERASER_SIZE_STORAGE_KEY, this.eraserSize);
    } catch {
      // ignore
    }
  }
}
