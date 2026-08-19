import { ELEMENTS_DATA, ElementData, getAtomicRenderRadius } from '../data/elements';

export class PeriodicTableModal {
  private modalEl: HTMLElement;
  private onSelectElement?: (symbol: string) => void;
  private isRadiusMode: boolean = false;
  private selectedSymbol: string = 'H';
  private searchQuery: string = '';
  private selectedCategory: string = 'all';

  private readonly categories = [
    { id: 'all', nameJa: 'すべて', color: '#94A3B8' },
    { id: 'nonmetal', nameJa: '非金属', color: '#38BDF8' },
    { id: 'noble-gas', nameJa: '希ガス', color: '#F97316' },
    { id: 'alkali-metal', nameJa: 'アルカリ金属', color: '#EC4899' },
    { id: 'alkaline-earth', nameJa: 'アルカリ土類金属', color: '#10B981' },
    { id: 'metalloid', nameJa: '半金属', color: '#A855F7' },
    { id: 'halogen', nameJa: 'ハロゲン', color: '#84CC16' },
    { id: 'transition-metal', nameJa: '遷移金属', color: '#64748B' },
    { id: 'post-transition-metal', nameJa: '典型金属', color: '#3B82F6' },
    { id: 'lanthanide', nameJa: 'ランタノイド', color: '#F59E0B' },
    { id: 'actinide', nameJa: 'アクチノイド', color: '#059669' },
  ];

  constructor(onSelectElement?: (symbol: string) => void) {
    this.onSelectElement = onSelectElement;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'periodic-table-modal';
    document.body.appendChild(this.modalEl);
  }

  public open() {
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private render() {
    const selectedEl = ELEMENTS_DATA[this.selectedSymbol] || ELEMENTS_DATA['H'];
    const totalCount = Object.keys(ELEMENTS_DATA).length;

    this.modalEl.innerHTML = `
      <div class="modal-card periodic-table-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>⚛️ 元素周期表 (Periodic Table)</h2>
            <span class="sub-badge">全${totalCount}元素完全収録 / 文科省理科・化学準拠</span>
          </div>
          <div class="header-controls">
            <div class="periodic-search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="periodic-search-input" placeholder="元素名・記号・番号で検索..." value="${this.searchQuery}" />
              ${this.searchQuery ? '<button id="clear-search-btn" class="clear-search-btn">✕</button>' : ''}
            </div>
            <button class="toggle-btn ${this.isRadiusMode ? 'active' : ''}" id="toggle-radius-mode" title="原子半径の比率を視覚化します">
              📏 原子半径 比較: ${this.isRadiusMode ? 'ON' : 'OFF'}
            </button>
            <button class="close-btn" id="close-periodic-modal" title="閉じる">✕</button>
          </div>
        </div>

        <div class="periodic-modal-body">
          <div class="periodic-grid-container">
            <!-- 族番号ヘッダー (1〜18) -->
            <div class="periodic-group-headers">
              <div class="group-header-label">周期＼族</div>
              ${Array.from({ length: 18 }, (_, i) => `<div class="group-header-num">${i + 1}</div>`).join('')}
            </div>

            <div class="periodic-grid">
              ${this.renderGridCells()}
            </div>
            
            <!-- 凡例 & カテゴリフィルター -->
            <div class="periodic-legend">
              <span class="legend-title">分類フィルター:</span>
              ${this.categories.map(cat => `
                <button class="legend-item ${this.selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                  <span class="legend-dot" style="background:${cat.color}"></span>
                  <span>${cat.nameJa}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="element-detail-pane">
            ${this.renderDetailPane(selectedEl)}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // 閉じる
    const closeBtn = this.modalEl.querySelector('#close-periodic-modal');
    closeBtn?.addEventListener('click', () => this.close());

    // 検索入力
    const searchInput = this.modalEl.querySelector('#periodic-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.updateHighlightsAndCells();
      });
      // フォーカス維持
      if (this.searchQuery) {
        searchInput.focus();
        searchInput.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
      }
    }

    const clearSearchBtn = this.modalEl.querySelector('#clear-search-btn');
    clearSearchBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      this.render();
    });

    // 原子半径モード切り替え
    const toggleRadiusBtn = this.modalEl.querySelector('#toggle-radius-mode');
    toggleRadiusBtn?.addEventListener('click', () => {
      this.isRadiusMode = !this.isRadiusMode;
      this.render();
    });

    // カテゴリフィルタークリック
    const legendBtns = this.modalEl.querySelectorAll('.legend-item[data-cat]');
    legendBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') || 'all';
        this.selectedCategory = cat;
        this.render();
      });
    });

    // 元素セルクリック
    const cells = this.modalEl.querySelectorAll('.grid-cell[data-symbol]');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const symbol = cell.getAttribute('data-symbol');
        if (symbol && ELEMENTS_DATA[symbol]) {
          this.selectedSymbol = symbol;
          this.render();
        }
      });
    });

    // 実験室に配置ボタン
    const spawnBtn = this.modalEl.querySelector('#spawn-selected-element');
    spawnBtn?.addEventListener('click', () => {
      this.onSelectElement?.(this.selectedSymbol);
      this.close();
    });
  }

  private isElementMatched(el: ElementData): boolean {
    // カテゴリフィルター
    if (this.selectedCategory !== 'all' && el.category !== this.selectedCategory) {
      return false;
    }

    // 検索クエリ
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      const numMatch = el.number.toString() === q;
      const symMatch = el.symbol.toLowerCase().includes(q);
      const nameJaMatch = el.nameJa.toLowerCase().includes(q);
      const nameEnMatch = el.nameEn.toLowerCase().includes(q);
      return numMatch || symMatch || nameJaMatch || nameEnMatch;
    }

    return true;
  }

  private updateHighlightsAndCells() {
    const cells = this.modalEl.querySelectorAll('.grid-cell[data-symbol]');
    cells.forEach(cell => {
      const symbol = cell.getAttribute('data-symbol');
      if (symbol && ELEMENTS_DATA[symbol]) {
        const el = ELEMENTS_DATA[symbol];
        const matched = this.isElementMatched(el);
        if (matched) {
          cell.classList.remove('dimmed');
          if (this.searchQuery.trim()) {
            cell.classList.add('search-hit');
          } else {
            cell.classList.remove('search-hit');
          }
        } else {
          cell.classList.add('dimmed');
          cell.classList.remove('search-hit');
        }
      }
    });
  }

  private renderGridCells(): string {
    const elementsList = Object.values(ELEMENTS_DATA);
    let html = '';

    // 周期ラベル (第1〜7周期)
    for (let p = 1; p <= 7; p++) {
      html += `
        <div class="period-label" style="grid-row: ${p}; grid-column: 1;">${p}</div>
      `;
    }

    // 主表の元素 (行 1〜7, 列 2〜19 ※列1は周期ラベル用)
    for (const el of elementsList) {
      const isSelected = el.symbol === this.selectedSymbol;
      const matched = this.isElementMatched(el);
      const radiusPx = getAtomicRenderRadius(el.atomicRadius);
      const isHit = Boolean(this.searchQuery.trim() && matched);

      let gridRow: number;
      let gridCol: number;

      if (el.category === 'lanthanide') {
        // ランタノイド系列 (行9, 列 5〜19)
        gridRow = 9;
        gridCol = 4 + (el.number - 57) + 1; // +1 offset for period label
      } else if (el.category === 'actinide') {
        // アクチノイド系列 (行10, 列 5〜19)
        gridRow = 10;
        gridCol = 4 + (el.number - 89) + 1;
      } else {
        gridRow = el.period;
        gridCol = el.group + 1; // +1 offset for period label
      }

      html += `
        <div class="grid-cell ${isSelected ? 'selected' : ''} ${!matched ? 'dimmed' : ''} ${isHit ? 'search-hit' : ''} category-${el.category}" 
             style="grid-row: ${gridRow}; grid-column: ${gridCol};" 
             data-symbol="${el.symbol}"
             title="${el.number}. ${el.nameJa} (${el.symbol}) 原子量: ${el.atomicWeight} 原子半径: ${el.atomicRadius}pm">
          ${this.isRadiusMode ? `
            <div class="radius-circle" style="width: ${radiusPx * 1.4}px; height: ${radiusPx * 1.4}px; background: ${el.color}; border: 1.5px solid ${el.secondaryColor || el.color};">
              <span class="radius-label">${el.symbol}</span>
            </div>
          ` : `
            <div class="cell-top-row">
              <span class="cell-num">${el.number}</span>
              ${el.isRadioactive ? '<span class="cell-rad-icon" title="放射性元素">☢</span>' : ''}
            </div>
            <span class="cell-symbol">${el.symbol}</span>
            <span class="cell-name">${el.nameJa}</span>
          `}
        </div>
      `;
    }

    // ランタノイド・プレースホルダー (行6, 列3+1=4)
    html += `
      <div class="grid-cell placeholder-cell category-lanthanide" 
           style="grid-row: 6; grid-column: 4;"
           data-symbol="La"
           title="ランタノイド系列 (57 La 〜 71 Lu)">
        <div class="cell-top-row"><span class="cell-num">57-71</span></div>
        <span class="cell-symbol placeholder-sym">La-Lu</span>
        <span class="cell-name">＊ランタノイド</span>
      </div>
    `;

    // アクチノイド・プレースホルダー (行7, 列3+1=4)
    html += `
      <div class="grid-cell placeholder-cell category-actinide" 
           style="grid-row: 7; grid-column: 4;"
           data-symbol="Ac"
           title="アクチノイド系列 (89 Ac 〜 103 Lr)">
        <div class="cell-top-row"><span class="cell-num">89-103</span></div>
        <span class="cell-symbol placeholder-sym">Ac-Lr</span>
        <span class="cell-name">＊＊アクチノイド</span>
      </div>
    `;

    // 行8: スペーサー
    html += `<div class="f-block-spacer" style="grid-row: 8; grid-column: 1 / -1;"></div>`;

    // 行9: ランタノイド系列ラベル
    html += `
      <div class="f-block-label" style="grid-row: 9; grid-column: 1 / 5;">
        <span>＊ ランタノイド系列 (La〜Lu)</span>
      </div>
    `;

    // 行10: アクチノイド系列ラベル
    html += `
      <div class="f-block-label" style="grid-row: 10; grid-column: 1 / 5;">
        <span>＊＊ アクチノイド系列 (Ac〜Lr)</span>
      </div>
    `;

    return html;
  }

  private renderDetailPane(el: ElementData): string {
    const radiusPx = getAtomicRenderRadius(el.atomicRadius);
    const categoryObj = this.categories.find(c => c.id === el.category);
    const categoryNameJa = categoryObj ? categoryObj.nameJa : el.category;

    return `
      <div class="detail-card">
        <div class="detail-preview">
          <div class="detail-atom-preview" style="background: ${el.color}; border: 3px solid ${el.secondaryColor || el.color}; width: ${radiusPx * 3.4}px; height: ${radiusPx * 3.4}px;">
            <span class="atom-symbol-big">${el.symbol}</span>
          </div>
          <div class="atom-scale-info">
            原子半径: <strong>${el.atomicRadius} pm</strong>
            <div class="atom-sub-scale">
              ${el.symbol === 'He' ? '🌟 (全元素で最小)' : (el.symbol === 'Fr' ? '🌟 (天然元素で最大)' : (el.symbol === 'Cs' ? '🌟 (安定元素で最大)' : ''))}
            </div>
          </div>
        </div>

        <div class="detail-header-info">
          <div class="detail-title-line">
            <h3>${el.nameJa} <span class="en-name">(${el.nameEn})</span></h3>
            ${el.isRadioactive ? '<span class="radioactive-pill" title="放射性崩壊を起こす元素">☢ 放射性元素</span>' : ''}
          </div>
          <div class="detail-sub-header">原子番号: <strong>${el.number}</strong> / 原子量: <strong>${el.atomicWeight}</strong></div>
        </div>

        <div class="detail-specs">
          <div class="spec-row">
            <span>分類:</span>
            <strong style="color: ${categoryObj?.color || '#FFF'}">${categoryNameJa}</strong>
          </div>
          <div class="spec-row">
            <span>周期・族:</span>
            <strong>第${el.period}周期 / ${el.category === 'lanthanide' ? 'ランタノイド' : (el.category === 'actinide' ? 'アクチノイド' : `${el.group}族`)}</strong>
          </div>
          <div class="spec-row">
            <span>常温での状態:</span>
            <strong>${el.stateAtRoomTemp === 'gas' ? '気体 ♨' : (el.stateAtRoomTemp === 'liquid' ? '液体 💧' : '固体 🧊')}</strong>
          </div>
          <div class="spec-row">
            <span>融点 / 沸点:</span>
            <strong>${el.meltingPoint}℃ / ${el.boilingPoint}℃</strong>
          </div>
          <div class="spec-row">
            <span>モル質量:</span>
            <strong>${el.molarMass.toFixed(2)} g/mol</strong>
          </div>
        </div>

        <div class="detail-description-box">
          <p>${el.descriptionJa}</p>
        </div>

        <div class="detail-mext-section">
          <div class="mext-section-title">📘 文部科学省 教科書の重要ポイント</div>
          <p class="mext-section-text">${el.mextFactJa}</p>
        </div>

        <button class="primary-btn spawn-btn" id="spawn-selected-element">
          🧪 この元素を実験室に配置 (${el.symbol})
        </button>
      </div>
    `;
  }
}

