import { ELEMENTS_DATA, ElementData, getAtomicRenderRadius, getElementName, getElementDescription, getElementFact } from '../data/elements';
import { t, getLanguage, onLanguageChange } from '../i18n';

export class PeriodicTableModal {
  private modalEl: HTMLElement;
  private onSelectElement?: (symbol: string) => void;
  private isRadiusMode: boolean = false;
  private selectedSymbol: string = 'H';
  private searchQuery: string = '';
  private selectedCategory: string = 'all';

  private readonly categories = [
    { id: 'all', color: '#94A3B8' },
    { id: 'nonmetal', color: '#38BDF8' },
    { id: 'noble-gas', color: '#F97316' },
    { id: 'alkali-metal', color: '#EC4899' },
    { id: 'alkaline-earth', color: '#10B981' },
    { id: 'metalloid', color: '#A855F7' },
    { id: 'halogen', color: '#84CC16' },
    { id: 'transition-metal', color: '#64748B' },
    { id: 'post-transition-metal', color: '#3B82F6' },
    { id: 'lanthanide', color: '#F59E0B' },
    { id: 'actinide', color: '#059669' },
  ];

  constructor(onSelectElement?: (symbol: string) => void) {
    this.onSelectElement = onSelectElement;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'periodic-table-modal';
    document.body.appendChild(this.modalEl);

    onLanguageChange(() => {
      if (!this.modalEl.classList.contains('hidden')) {
        this.render();
      }
    });
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
    const tr = t().periodicTable;

    this.modalEl.innerHTML = `
      <div class="modal-card periodic-table-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.subtitle(totalCount)}</span>
          </div>
          <div class="header-controls">
            <div class="periodic-search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="periodic-search-input" placeholder="${tr.searchPlaceholder}" value="${this.searchQuery}" />
              ${this.searchQuery ? '<button id="clear-search-btn" class="clear-search-btn">✕</button>' : ''}
            </div>
            <button class="toggle-btn ${this.isRadiusMode ? 'active' : ''}" id="toggle-radius-mode" title="Atomic radius comparison">
              ${tr.radiusComparison(this.isRadiusMode)}
            </button>
            <button class="close-btn" id="close-periodic-modal" title="Close">✕</button>
          </div>
        </div>

        <div class="periodic-modal-body">
          <div class="periodic-grid-container">
            <!-- 族番号ヘッダー (1〜18) -->
            <div class="periodic-group-headers">
              <div class="group-header-label">${tr.periodGroupHeader}</div>
              ${Array.from({ length: 18 }, (_, i) => `<div class="group-header-num">${i + 1}</div>`).join('')}
            </div>

            <div class="periodic-grid">
              ${this.renderGridCells()}
            </div>
            
            <!-- 凡例 & カテゴリフィルター -->
            <div class="periodic-legend">
              <span class="legend-title">${tr.filterLabel}</span>
              ${this.categories.map(cat => {
                const name = tr.categories[cat.id as keyof typeof tr.categories] || cat.id;
                return `
                <button class="legend-item ${this.selectedCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
                  <span class="legend-dot" style="background:${cat.color}"></span>
                  <span>${name}</span>
                </button>
              `;}).join('')}
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

      const lang = getLanguage();
      const name = getElementName(el, lang);

      html += `
        <div class="grid-cell ${isSelected ? 'selected' : ''} ${!matched ? 'dimmed' : ''} ${isHit ? 'search-hit' : ''} category-${el.category}" 
             style="grid-row: ${gridRow}; grid-column: ${gridCol};" 
             data-symbol="${el.symbol}"
             title="${el.number}. ${name} (${el.symbol})">
          ${this.isRadiusMode ? `
            <div class="radius-circle" style="width: ${radiusPx * 1.4}px; height: ${radiusPx * 1.4}px; background: ${el.color}; border: 1.5px solid ${el.secondaryColor || el.color};">
              <span class="radius-label">${el.symbol}</span>
            </div>
          ` : `
            <div class="cell-top-row">
              <span class="cell-num">${el.number}</span>
              ${el.isRadioactive ? '<span class="cell-rad-icon" title="Radioactive">☢</span>' : ''}
            </div>
            <span class="cell-symbol">${el.symbol}</span>
            <span class="cell-name">${name}</span>
          `}
        </div>
      `;
    }

    const tr = t().periodicTable;

    // ランタノイド・プレースホルダー (行6, 列3+1=4)
    html += `
      <div class="grid-cell placeholder-cell category-lanthanide" 
           style="grid-row: 6; grid-column: 4;"
           data-symbol="La"
           title="${tr.lanthanideLabel}">
        <div class="cell-top-row"><span class="cell-num">57-71</span></div>
        <span class="cell-symbol placeholder-sym">La-Lu</span>
        <span class="cell-name">${tr.lanthanideShort}</span>
      </div>
    `;

    // アクチノイド・プレースホルダー (行7, 列3+1=4)
    html += `
      <div class="grid-cell placeholder-cell category-actinide" 
           style="grid-row: 7; grid-column: 4;"
           data-symbol="Ac"
           title="${tr.actinideLabel}">
        <div class="cell-top-row"><span class="cell-num">89-103</span></div>
        <span class="cell-symbol placeholder-sym">Ac-Lr</span>
        <span class="cell-name">${tr.actinideShort}</span>
      </div>
    `;

    // 行8: スペーサー
    html += `<div class="f-block-spacer" style="grid-row: 8; grid-column: 1 / -1;"></div>`;

    // 行9: ランタノイド系列ラベル
    html += `
      <div class="f-block-label" style="grid-row: 9; grid-column: 1 / 5;">
        <span>${tr.lanthanideLabel}</span>
      </div>
    `;

    // 行10: アクチノイド系列ラベル
    html += `
      <div class="f-block-label" style="grid-row: 10; grid-column: 1 / 5;">
        <span>${tr.actinideLabel}</span>
      </div>
    `;

    return html;
  }

  private renderDetailPane(el: ElementData): string {
    const radiusPx = getAtomicRenderRadius(el.atomicRadius);
    const tr = t().periodicTable;
    const lang = getLanguage();
    const categoryName = tr.categories[el.category as keyof typeof tr.categories] || el.category;
    const categoryColor = this.categories.find(c => c.id === el.category)?.color || '#FFF';

    const stateStr = lang === 'en'
      ? (el.stateAtRoomTemp === 'gas' ? 'Gas ♨' : (el.stateAtRoomTemp === 'liquid' ? 'Liquid 💧' : 'Solid 🧊'))
      : (el.stateAtRoomTemp === 'gas' ? '気体 ♨' : (el.stateAtRoomTemp === 'liquid' ? '液体 💧' : '固体 🧊'));
    const flameColorName = lang === 'en' && el.flameColorNameEn ? el.flameColorNameEn : el.flameColorNameJa;
    const flameMnemonic = lang === 'en' && el.flameMnemonicEn ? el.flameMnemonicEn : el.flameMnemonicJa;

    let subScaleText = '';
    if (el.symbol === 'He') subScaleText = tr.smallestInAll;
    else if (el.symbol === 'Fr') subScaleText = tr.largestNatural;
    else if (el.symbol === 'Cs') subScaleText = tr.largestStable;

    const groupStr = el.category === 'lanthanide' ? tr.lanthanideShort : (el.category === 'actinide' ? tr.actinideShort : tr.groupLabel(el.group));

    return `
      <div class="detail-card">
        <div class="detail-preview">
          <div class="detail-atom-preview" style="background: ${el.color}; border: 3px solid ${el.secondaryColor || el.color}; width: ${radiusPx * 3.4}px; height: ${radiusPx * 3.4}px;">
            <span class="atom-symbol-big">${el.symbol}</span>
          </div>
          <div class="atom-scale-info">
            ${tr.atomScale}: <strong>${el.atomicRadius} pm</strong>
            <div class="atom-sub-scale">
              ${subScaleText}
            </div>
          </div>
        </div>

        <div class="detail-header-info">
          <div class="detail-title-line">
            <h3>${lang === 'en' ? el.nameEn : `${el.nameJa} <span class="en-name">(${el.nameEn})</span>`}</h3>
            ${el.isRadioactive ? `<span class="radioactive-pill" title="Radioactive">${tr.radioactivePill}</span>` : ''}
          </div>
          <div class="detail-sub-header">${tr.atomicNumber}: <strong>${el.number}</strong> / ${tr.atomicWeight}: <strong>${el.atomicWeight}</strong></div>
        </div>

        <div class="detail-specs">
          <div class="spec-row">
            <span>${tr.category}:</span>
            <strong style="color: ${categoryColor}">${categoryName}</strong>
          </div>
          <div class="spec-row">
            <span>${tr.periodGroup}:</span>
            <strong>${tr.periodLabel(el.period)} / ${groupStr}</strong>
          </div>
          <div class="spec-row">
            <span>${tr.stateAtRoomTemp}:</span>
            <strong>${stateStr}</strong>
          </div>
          <div class="spec-row">
            <span>${tr.meltingBoiling}:</span>
            <strong>${el.meltingPoint}℃ / ${el.boilingPoint}℃</strong>
          </div>
          <div class="spec-row">
            <span>${tr.molarMass}:</span>
            <strong>${el.molarMass.toFixed(2)} g/mol</strong>
          </div>
        </div>

        ${el.flameColor ? `
        <div class="flame-reaction-badge" style="border-color: ${el.flameColor}; margin: 8px 0;">
          <span class="flame-icon">🔥</span>
          <div class="flame-text-wrap">
            <div class="flame-title">${lang === 'en' ? 'Flame Test' : '炎色反応'}: <strong style="color: ${el.flameColor}; text-shadow: 0 0 8px ${el.flameColor};">${flameColorName}</strong></div>
            ${flameMnemonic ? `<div class="flame-mnemonic">${lang === 'en' ? 'Mnemonic' : '語呂合わせ'}: <span>${flameMnemonic}</span></div>` : ''}
          </div>
        </div>` : ''}

        <div class="detail-description-box">
          <p>${getElementDescription(el, lang)}</p>
        </div>

        <div class="detail-mext-section">
          <div class="mext-section-title">${tr.mextTitle}</div>
          <p class="mext-section-text">${getElementFact(el, lang)}</p>
        </div>

        <button class="primary-btn spawn-btn" id="spawn-selected-element">
          ${tr.spawnBtn(el.symbol)}
        </button>
      </div>
    `;
  }
}

