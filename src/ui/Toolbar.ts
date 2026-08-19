import { ELEMENTS_DATA } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';
import { soundManager } from '../engine/AudioEffects';

export type ToolType = 'spawn' | 'heat' | 'cool' | 'spark' | 'wall' | 'flask' | 'erase' | 'inspect';
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
  public onOpenPeriodicTable?: () => void;
  public onOpenEncyclopedia?: () => void;
  public onOpenQuests?: () => void;
  public onOpenTutorial?: () => void;

  private quickElements = ['H', 'He', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'S', 'Cl', 'Ca', 'Mn', 'Fe', 'Cu', 'Fr'];
  private quickCompounds = ['H2', 'O2', 'H2O', 'H2O2', 'CO', 'CO2', 'SO2', 'H2SO4', 'NH3', 'FeS', 'CaCO3', 'CaO', 'CaOH2', 'CuO', 'MgO', 'HCl', 'NaOH'];

  constructor() {
    this.render();
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

    // トップバー (タイトル、チュートリアル・図鑑・クエスト・周期表ボタン、シミュレーション制御)
    topBarEl.innerHTML = `
      <div class="top-nav-left">
        <div class="app-logo">
          <span class="logo-icon">⚗️</span>
          <div class="logo-text">
            <span class="logo-title">元素ラボ</span>
            <span class="logo-subtitle">Element Lab</span>
          </div>
        </div>
      </div>

      <div class="top-nav-center">
        <button class="nav-btn tutorial-nav-btn" id="btn-open-tutorial" title="初心者向け操作ガイド">
          🔰 使い方
        </button>
        <button class="nav-btn highlight-btn" id="btn-open-quests">
          🎯 クエスト
        </button>
        <button class="nav-btn" id="btn-open-periodic">
          ⚛️ 元素周期表
        </button>
        <button class="nav-btn" id="btn-open-encyclopedia">
          📖 化学図鑑
        </button>
      </div>

      <div class="top-nav-right">
        <button class="icon-btn ${this.isPaused ? 'paused' : ''}" id="btn-play-pause" title="一時停止/再生">
          ${this.isPaused ? '▶️ 再生' : '⏸️ 停止'}
        </button>
        <button class="icon-btn" id="btn-clear-lab" title="実験室を全消去">
          🗑️ 消去
        </button>
        <button class="icon-btn" id="btn-toggle-sound" title="音声切り替え">
          ${soundManager.isEnabled() ? '🔊' : '🔇'}
        </button>
      </div>
    `;

    // ボトムバー (ツール選択 & 元素パレット)
    bottomBarEl.innerHTML = `
      <div class="bottom-tools-row">
        <!-- ツールセレクタ -->
        <div class="tool-group">
          <button class="tool-btn ${this.activeTool === 'spawn' ? 'active' : ''}" data-tool="spawn" title="元素・化合物を配置">
            🧪 配置
          </button>
          <button class="tool-btn ${this.activeTool === 'flask' ? 'active' : ''}" data-tool="flask" title="液体を入れるフラスコ・ビーカーを配置">
            🏺 フラスコ
          </button>
          <button class="tool-btn ${this.activeTool === 'heat' ? 'active' : ''}" data-tool="heat" title="バーナーで加熱 (>500℃で鉄が赤熱！)">
            🔥 加熱
          </button>
          <button class="tool-btn ${this.activeTool === 'cool' ? 'active' : ''}" data-tool="cool" title="冷却スプレーで冷却 (<0℃で水が氷結！)">
            ❄️ 冷却
          </button>
          <button class="tool-btn ${this.activeTool === 'spark' ? 'active' : ''}" data-tool="spark" title="点火・火花 (水素爆発など)">
            ⚡ 点火
          </button>
          <button class="tool-btn ${this.activeTool === 'wall' ? 'active' : ''}" data-tool="wall" title="耐熱壁を配置">
            🧱 壁
          </button>
          <button class="tool-btn ${this.activeTool === 'erase' ? 'active' : ''}" data-tool="erase" title="粒子を消去">
            🧹 消去
          </button>
          <button class="tool-btn ${this.activeTool === 'inspect' ? 'active' : ''}" data-tool="inspect" title="粒子を調べる">
            🔍 観察
          </button>
        </div>
      </div>

      <!-- 元素・物質クイックパレット / 器具セレクタ -->
      <div class="bottom-palette-row">
        ${this.activeTool === 'flask' ? `
          <div class="palette-scroll">
            <div class="palette-section-title">実験ガラス器具:</div>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'erlenmeyer' ? 'selected' : ''}" data-flask="erlenmeyer" style="border-color: #38BDF8;">
              <span class="chip-symbol">🏺</span>
              <span class="chip-name">三角フラスコ</span>
            </button>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'beaker' ? 'selected' : ''}" data-flask="beaker" style="border-color: #38BDF8;">
              <span class="chip-symbol">🥛</span>
              <span class="chip-name">ビーカー</span>
            </button>
            <button class="element-chip flask-chip ${this.selectedFlaskType === 'testtube' ? 'selected' : ''}" data-flask="testtube" style="border-color: #38BDF8;">
              <span class="chip-symbol">🧪</span>
              <span class="chip-name">丸底試験管</span>
            </button>
            <span class="palette-hint-text">💡 キャンバスをタップして器具を設置（液体を注げます）</span>
          </div>
        ` : `
          <div class="palette-scroll ${this.activeTool === 'spawn' ? '' : 'dimmed'}">
            <div class="palette-section-title">元素:</div>
            ${this.quickElements.map(sym => {
              const el = ELEMENTS_DATA[sym];
              if (!el) return '';
              const isSelected = this.activeTool === 'spawn' && this.selectedItem.kind === 'element' && this.selectedItem.id === sym;
              return `
                <button class="element-chip ${isSelected ? 'selected' : ''}" data-kind="element" data-id="${sym}" style="border-color: ${el.color};">
                  <span class="chip-symbol">${el.symbol}</span>
                  <span class="chip-name">${el.nameJa}</span>
                </button>
              `;
            }).join('')}

            <div class="palette-divider"></div>
            <div class="palette-section-title">化合物:</div>
            ${this.quickCompounds.map(compKey => {
              const comp = COMPOUNDS_DATA[compKey];
              if (!comp) return '';
              const isSelected = this.activeTool === 'spawn' && this.selectedItem.kind === 'compound' && this.selectedItem.id === compKey;
              return `
                <button class="compound-chip ${isSelected ? 'selected' : ''} ${comp.isToxic ? 'toxic-chip' : ''}" data-kind="compound" data-id="${compKey}" style="border-color: ${comp.color};">
                  <span class="chip-symbol">${comp.formula}</span>
                  <span class="chip-name">${comp.nameJa}</span>
                </button>
              `;
            }).join('')}

            <button class="more-elements-btn" id="btn-more-elements" title="周期表から探す">
              ＋ 他の元素
            </button>
          </div>
        `}
      </div>
    `;

    // イベントバインド
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
