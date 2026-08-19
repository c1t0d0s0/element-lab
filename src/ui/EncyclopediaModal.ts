import { ELEMENTS_DATA, getElementName, getElementDescription, getElementFact } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, getCompoundDescription, getCompoundFact, getCompoundToxicWarning } from '../data/compounds';
import { REACTIONS_DATA, getReactionName, getReactionDescription, getReactionCategory } from '../data/reactions';
import { GameStats } from '../data/quests';
import { t, getLanguage, onLanguageChange } from '../i18n';

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
    const stats = this.getStats();
    const tr = t().encyclopedia;

    const compFound = Object.keys(stats.createdCompounds).length;
    const compTotal = Object.keys(COMPOUNDS_DATA).length;
    const rxnFound = Object.keys(stats.triggeredReactions).length;
    const rxnTotal = REACTIONS_DATA.length;
    const elemTotal = Object.keys(ELEMENTS_DATA).length;

    this.modalEl.innerHTML = `
      <div class="modal-card encyclopedia-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.subtitle}</span>
          </div>
          <button class="close-btn" id="close-encyclopedia-modal">✕</button>
        </div>

        <div class="encyclopedia-tabs">
          <button class="tab-btn ${this.currentTab === 'compounds' ? 'active' : ''}" data-tab="compounds">
            ${tr.tabCompounds(compFound, compTotal)}
          </button>
          <button class="tab-btn ${this.currentTab === 'reactions' ? 'active' : ''}" data-tab="reactions">
            ${tr.tabReactions(rxnFound, rxnTotal)}
          </button>
          <button class="tab-btn ${this.currentTab === 'elements' ? 'active' : ''}" data-tab="elements">
            ${tr.tabElements(elemTotal)}
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
    tabs.forEach(tabEl => {
      tabEl.addEventListener('click', () => {
        const tab = tabEl.getAttribute('data-tab') as 'compounds' | 'reactions' | 'elements';
        if (tab) {
          this.currentTab = tab;
          this.render();
        }
      });
    });
  }

  private renderTabContent(stats: GameStats): string {
    const tr = t().encyclopedia;
    const lang = getLanguage();

    if (this.currentTab === 'compounds') {
      const allCompounds = Object.values(COMPOUNDS_DATA);
      return `
        <div class="cards-grid">
          ${allCompounds.map(comp => {
            const discovered = (stats.createdCompounds[comp.id] || 0) > 0;
            if (!discovered) {
              const elemCount = Object.keys(comp.elements).length;
              const stateLabel = comp.stateAtRoomTemp === 'solid' ? (lang === 'en' ? 'Solid 🧊' : '固体 🧊') : (comp.stateAtRoomTemp === 'liquid' ? (lang === 'en' ? 'Liquid 💧' : '液体 💧') : (lang === 'en' ? 'Gas ♨' : '気体 ♨'));
              return `
                <div class="zukan-card undiscovered">
                  <div class="card-formula">❓</div>
                  <div class="card-name">${tr.undiscoveredCompound(elemCount, stateLabel)}</div>
                  <div class="card-hint">${tr.undiscoveredCompoundHint(!!comp.isToxic)}</div>
                </div>
              `;
            }

            const name = getCompoundName(comp, lang);
            const desc = getCompoundDescription(comp, lang);
            const fact = getCompoundFact(comp, lang);
            const toxicWarn = getCompoundToxicWarning(comp, lang);

            const cardSub = lang === 'en'
              ? `${comp.formula} (Molar mass: ${comp.molarMass.toFixed(1)} g/mol)`
              : `${comp.nameEn} (分子量: ${comp.molarMass.toFixed(1)})`;

            return `
              <div class="zukan-card ${comp.isToxic ? 'toxic' : ''}">
                <div class="card-header-line">
                  <div class="card-badge" style="background: ${comp.color}; color: #0F172A">
                    ${comp.formula}
                  </div>
                  <div class="card-title-group">
                    <div class="card-name">${name}</div>
                    <div class="card-sub">${cardSub}</div>
                  </div>
                </div>

                ${comp.isToxic ? `
                  <div class="toxic-badge">⚠️ ${toxicWarn}</div>
                ` : ''}

                <div class="card-desc">${desc}</div>
                <div class="card-mext">📘 <strong>${tr.mextFactTitle}</strong> ${fact}</div>
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
            const rxnName = getReactionName(rule, lang);
            const rxnCat = getReactionCategory(rule, lang);

            if (!discovered) {
              const condStr = rule.condition.minTemp ? (lang === 'en' ? `Heat to >${rule.condition.minTemp}°C` : `${rule.condition.minTemp}℃以上加熱`) : (lang === 'en' ? 'Contact' : '接触反応');
              return `
                <div class="zukan-card undiscovered">
                  <div class="card-category-badge">${rxnCat}</div>
                  <div class="card-formula">${tr.undiscoveredReaction}</div>
                  <div class="card-hint">${tr.undiscoveredReactionHint(rxnName, condStr)}</div>
                </div>
              `;
            }

            const rxnDesc = getReactionDescription(rule, lang);
            const heatStr = rule.heatRelease > 0 ? tr.reactionHeatExo(rule.heatRelease) : tr.reactionHeatEndo(rule.heatRelease);

            return `
              <div class="zukan-card reaction-card">
                <div class="card-category-badge">${rxnCat}</div>
                <div class="card-equation">${rule.equation}</div>
                <div class="reaction-name-ja">${rxnName} (${tr.experimentCount(count)})</div>
                <div class="card-desc">${rxnDesc}</div>
                <div class="reaction-meta">
                  <span>${tr.reactionHeatLabel} <strong>${heatStr}</strong></span>
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
          ${allElements.map(el => {
            const name = getElementName(el, lang);
            const desc = getElementDescription(el, lang);
            const fact = getElementFact(el, lang);
            const flameColorName = lang === 'en' && el.flameColorNameEn ? el.flameColorNameEn : el.flameColorNameJa;
            const flameMnemonic = lang === 'en' && el.flameMnemonicEn ? el.flameMnemonicEn : el.flameMnemonicJa;

            const elemCardSub = lang === 'en'
              ? `Radius: ${el.atomicRadius} pm / Weight: ${el.atomicWeight}`
              : `原子半径: ${el.atomicRadius} pm / 質量: ${el.atomicWeight}`;
            const flameLabel = lang === 'en' ? 'Flame Test' : '炎色反応';

            return `
            <div class="zukan-card">
              <div class="card-header-line">
                <div class="card-badge" style="background: ${el.color}; border: 1.5px solid ${el.secondaryColor || el.color}">
                  ${el.symbol}
                </div>
                <div class="card-title-group">
                  <div class="card-name">${name} (#${el.number})</div>
                  <div class="card-sub">${elemCardSub}</div>
                </div>
              </div>
              <div class="card-desc">${desc}</div>
              ${el.flameColor ? `
                <div class="flame-reaction-badge" style="border-color: ${el.flameColor}; padding: 4px 8px; margin: 4px 0;">
                  <span class="flame-icon" style="font-size: 14px;">🔥</span>
                  <span style="font-size: 11px; font-weight: 700; color: ${el.flameColor};">${flameLabel}: ${flameColorName}</span>
                  ${flameMnemonic ? `<span style="font-size: 10px; color: var(--accent-cyan);">(${flameMnemonic})</span>` : ''}
                </div>
              ` : ''}
              <div class="card-mext">📘 <strong>${tr.mextFactTitle}</strong> ${fact}</div>
            </div>
          `;}).join('')}
        </div>
      `;
    }
  }
}
