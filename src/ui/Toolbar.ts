import { ELEMENTS_DATA } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';
import { soundManager } from '../engine/AudioEffects';

export type ToolType = 'spawn' | 'heat' | 'cool' | 'spark' | 'wall' | 'erase' | 'inspect';

export interface SelectedItem {
  kind: 'element' | 'compound' | 'wall';
  id: string;
}

export class Toolbar {
  public activeTool: ToolType = 'spawn';
  public selectedItem: SelectedItem = { kind: 'element', id: 'H' };
  public isPaused: boolean = false;
  
  public onClear?: () => void;
  public onOpenPeriodicTable?: () => void;
  public onOpenEncyclopedia?: () => void;
  public onOpenQuests?: () => void;

  private quickElements = ['H', 'He', 'C', 'N', 'O', 'Na', 'Mg', 'Al', 'Cl', 'Fe', 'Cu', 'Fr'];
  private quickCompounds = ['H2', 'O2', 'H2O', 'CO', 'CO2', 'CuO', 'HCl', 'NaOH'];

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

    // トップバー (タイトル、図鑑・クエスト・周期表ボタン、シミュレーション制御)
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

      <!-- 元素・物質クイックパレット -->
      <div class="bottom-palette-row ${this.activeTool === 'spawn' ? '' : 'dimmed'}">
        <div class="palette-scroll">
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
      </div>
    `;

    // イベントバインド
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

    // パレットボタン
    const chips = bottomBarEl.querySelectorAll('.element-chip, .compound-chip');
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
