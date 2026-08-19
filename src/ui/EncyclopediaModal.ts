import { ELEMENTS_DATA } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';
import { REACTIONS_DATA } from '../data/reactions';
import { GameStats } from '../data/quests';

export class EncyclopediaModal {
  private modalEl: HTMLElement;
  private currentTab: 'compounds' | 'reactions' | 'elements' = 'compounds';
  private getStats: () => GameStats;

  constructor(getStats: () => GameStats) {
    this.getStats = getStats;
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'encyclopedia-modal';
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
    const stats = this.getStats();

    this.modalEl.innerHTML = `
      <div class="modal-card encyclopedia-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>📖 化学図鑑 & 反応式録 (Encyclopedia)</h2>
            <span class="sub-badge">文科省 理科・化学完全対応</span>
          </div>
          <button class="close-btn" id="close-encyclopedia-modal">✕</button>
        </div>

        <div class="encyclopedia-tabs">
          <button class="tab-btn ${this.currentTab === 'compounds' ? 'active' : ''}" data-tab="compounds">
            🧪 化合物図鑑 (${Object.keys(stats.createdCompounds).length}/${Object.keys(COMPOUNDS_DATA).length})
          </button>
          <button class="tab-btn ${this.currentTab === 'reactions' ? 'active' : ''}" data-tab="reactions">
            ⚗️ 発見した化学反応式 (${Object.keys(stats.triggeredReactions).length}/${REACTIONS_DATA.length})
          </button>
          <button class="tab-btn ${this.currentTab === 'elements' ? 'active' : ''}" data-tab="elements">
            ⚛️ 元素一覧 (${Object.keys(ELEMENTS_DATA).length})
          </button>
        </div>

        <div class="encyclopedia-body">
          ${this.renderTabContent(stats)}
        </div>
      </div>
    `;

    const closeBtn = this.modalEl.querySelector('#close-encyclopedia-modal');
    closeBtn?.addEventListener('click', () => this.close());

    const tabs = this.modalEl.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        const tab = t.getAttribute('data-tab') as 'compounds' | 'reactions' | 'elements';
        if (tab) {
          this.currentTab = tab;
          this.render();
        }
      });
    });
  }

  private renderTabContent(stats: GameStats): string {
    if (this.currentTab === 'compounds') {
      const allCompounds = Object.values(COMPOUNDS_DATA);
      return `
        <div class="cards-grid">
          ${allCompounds.map(comp => {
            const discovered = (stats.createdCompounds[comp.id] || 0) > 0;
            if (!discovered) {
              const elemCount = Object.keys(comp.elements).length;
              const stateLabel = comp.stateAtRoomTemp === 'solid' ? '固体 🧊' : (comp.stateAtRoomTemp === 'liquid' ? '液体 💧' : '気体 ♨');
              return `
                <div class="zukan-card undiscovered">
                  <div class="card-formula">❓</div>
                  <div class="card-name">未発見の化合物 (${elemCount}元素 / 常温${stateLabel})</div>
                  <div class="card-hint">${comp.isToxic ? '⚠️ 特徴: 有毒・危険物質 / ' : ''}実験室で元素や化合物を組み合わせて発見しよう！</div>
                </div>
              `;
            }

            return `
              <div class="zukan-card ${comp.isToxic ? 'toxic' : ''}">
                <div class="card-header-line">
                  <div class="card-badge" style="background: ${comp.color}; color: #0F172A">
                    ${comp.formula}
                  </div>
                  <div class="card-title-group">
                    <div class="card-name">${comp.nameJa}</div>
                    <div class="card-sub">${comp.nameEn} (分子量: ${comp.molarMass.toFixed(1)})</div>
                  </div>
                </div>

                ${comp.isToxic ? `
                  <div class="toxic-badge">⚠️ ${comp.toxicWarning || '有毒物質'}</div>
                ` : ''}

                <div class="card-desc">${comp.descriptionJa}</div>
                <div class="card-mext">📘 <strong>文科省解説:</strong> ${comp.mextFactJa}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (this.currentTab === 'reactions') {
      return `
        <div class="cards-grid">
          ${REACTIONS_DATA.map(rule => {
            const count = stats.triggeredReactions[rule.id] || 0;
            const discovered = count > 0;

            if (!discovered) {
              const condStr = rule.condition.minTemp ? `${rule.condition.minTemp}℃以上加熱` : '接触反応';
              return `
                <div class="zukan-card undiscovered">
                  <div class="card-category-badge">${rule.mextCategoryJa}</div>
                  <div class="card-formula">⚗️ 未知の化学反応</div>
                  <div class="card-hint">ヒント: 【${rule.nameJa}】 (${condStr}) を実験室で試してみよう！</div>
                </div>
              `;
            }

            return `
              <div class="zukan-card reaction-card">
                <div class="card-category-badge">${rule.mextCategoryJa}</div>
                <div class="card-equation">${rule.equation}</div>
                <div class="reaction-name-ja">${rule.nameJa} (実験回数: ${count}回)</div>
                <div class="card-desc">${rule.descriptionJa}</div>
                <div class="reaction-meta">
                  <span>反応熱: <strong>${rule.heatRelease > 0 ? `+${rule.heatRelease}℃ (発熱)` : `${rule.heatRelease}℃ (吸熱)`}</strong></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      const allElements = Object.values(ELEMENTS_DATA);
      return `
        <div class="cards-grid">
          ${allElements.map(el => `
            <div class="zukan-card">
              <div class="card-header-line">
                <div class="card-badge" style="background: ${el.color}; border: 1.5px solid ${el.secondaryColor || el.color}">
                  ${el.symbol}
                </div>
                <div class="card-title-group">
                  <div class="card-name">${el.nameJa} (${el.number}番)</div>
                  <div class="card-sub">原子半径: ${el.atomicRadius} pm / 質量: ${el.atomicWeight}</div>
                </div>
              </div>
              <div class="card-desc">${el.descriptionJa}</div>
              ${el.flameColor ? `
                <div class="flame-reaction-badge" style="border-color: ${el.flameColor}; padding: 4px 8px; margin: 4px 0;">
                  <span class="flame-icon" style="font-size: 14px;">🔥</span>
                  <span style="font-size: 11px; font-weight: 700; color: ${el.flameColor};">炎色反応: ${el.flameColorNameJa}</span>
                  ${el.flameMnemonicJa ? `<span style="font-size: 10px; color: var(--accent-cyan);">(${el.flameMnemonicJa})</span>` : ''}
                </div>
              ` : ''}
              <div class="card-mext">📘 <strong>文科省ポイント:</strong> ${el.mextFactJa}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
}
