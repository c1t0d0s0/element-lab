import { ELEMENTS_DATA, getElementName, getElementDescription, getElementFact } from '../data/elements';
import { SOLUBILITY_TABLES } from '../data/solubility';
import { COMPOUNDS_DATA, isStarterCompound, CompoundData, PhClass, REPRESENTATIVE_PH, getIndicatorColor, getCompoundName, getCompoundFormula, getCompoundDescription, getCompoundFact, getCompoundKidHint, getCompoundToxicWarning } from '../data/compounds';
import { REACTIONS_DATA, ReactionRule, ReactionIntensity, getReactionName, getReactionEquation, getReactionDescription, getReactionCategory } from '../data/reactions';
import { GameStats } from '../data/quests';
import { getStructure, NO_STRUCTURE_COMPOUNDS } from '../data/structures';
import { getMoleculeViewer } from './MoleculeViewer';
import { t, getLanguage, onLanguageChange, getGrade } from '../i18n';
import { kidText } from '../i18n/furigana';
import { getElementKidHint } from '../data/elementKidHints';
import { REACTION_LINES } from '../data/professorLines';
import { flameReferenceTag } from './flameTag';

// 図鑑の絞り込み区分 (反応の激しさ + 有毒)
export type EncyclopediaFilter = 'all' | ReactionIntensity | 'toxic';

// 爆発・発火・発煙・発熱は「反応」の性質なので反応式タブのみ。化合物タブは物質の性質である「有毒」のみ
export const REACTION_FILTERS: EncyclopediaFilter[] = ['all', 'explosion', 'ignition', 'smoke', 'heat', 'toxic'];
export const COMPOUND_FILTERS: EncyclopediaFilter[] = ['all', 'toxic'];

function isToxicCompoundId(id: string): boolean {
  return !!COMPOUNDS_DATA[id]?.isToxic;
}

// 図鑑に載せる反応 (原子から反応する版などの variantOf はまとめ先の1件に集約)
export const DISPLAY_REACTIONS: ReactionRule[] = REACTIONS_DATA.filter(r => !r.variantOf);

// まとめ先の反応とその別ルートを合算した実験回数
export function getMergedReactionCount(rule: ReactionRule, stats: GameStats): number {
  return REACTIONS_DATA
    .filter(r => r.id === rule.id || r.variantOf === rule.id)
    .reduce((sum, r) => sum + (stats.triggeredReactions[r.id] || 0), 0);
}

// 反応: 激しさ区分が一致するか、有毒な物質が反応物・生成物に含まれるか
export function reactionMatchesFilter(rule: ReactionRule, filter: EncyclopediaFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'toxic') {
    return [...rule.reactants, ...rule.products].some(x => x.type === 'compound' && isToxicCompoundId(x.id));
  }
  return !!rule.intensities?.includes(filter);
}

// 化合物: 有毒物質か (化合物タブで選べない区分は絞り込まない)
export function compoundMatchesFilter(comp: CompoundData, filter: EncyclopediaFilter): boolean {
  if (filter === 'toxic') return !!comp.isToxic;
  return true;
}

// 指示薬カードの「見つけた色」チップ (未発見の液性は灰色)
function renderIndicatorChips(comp: CompoundData, stats: GameStats): string {
  const tr = t().indicatorChips;
  const classes: PhClass[] = ['acid', 'neutral', 'alkaline'];
  const chips = classes.map(cls => {
    const found = (stats.indicatorResults?.[`${comp.id}:${cls}`] || 0) > 0;
    const color = getIndicatorColor(comp.indicator!, REPRESENTATIVE_PH[cls]);
    return `
      <span class="indicator-chip ${found ? 'found' : ''}" style="--chip-color: ${found ? color : '#475569'};">
        <span class="indicator-dot"></span>${found ? tr[cls] : '？'}
      </span>`;
  }).join('');
  return `<div class="indicator-chips"><span class="indicator-chips-title">${tr.title}</span>${chips}</div>`;
}

// 溶解度の表 (水100gに溶ける量 g)
function renderSolubilityTable(compoundId: string): string {
  const tr = t().encyclopedia;
  // 図鑑では20℃ごとに見せる
  const rows = SOLUBILITY_TABLES[compoundId].filter(([temp]) => temp % 20 === 0);
  const cells = rows.map(([temp, grams]) => `<tr><td>${temp}℃</td><td>${grams} g</td></tr>`).join('');
  return `
    <div class="solubility-table">
      <div class="solubility-title">💧 ${tr.solubilityTitle}</div>
      <table>
        <thead><tr><th>${tr.solubilityTemp}</th><th>${tr.solubilityAmount}</th></tr></thead>
        <tbody>${cells}</tbody>
      </table>
      ${compoundId === 'Alum' ? `<div class="solubility-note">${tr.solubilityHydrate}</div>` : ''}
    </div>`;
}

export class EncyclopediaModal {
  private modalEl: HTMLElement;
  private currentTab: 'compounds' | 'reactions' | 'elements' = 'compounds';
  // タブごとに絞り込み状態を保持
  private compoundFilter: EncyclopediaFilter = 'all';
  private reactionFilter: EncyclopediaFilter = 'all';
  private getStats: () => GameStats;
  // 化合物カードの「実験室に配置」ボタン (周期表の元素の配置と同じ動き)
  public onSelectCompound?: (compoundId: string) => void;

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

  public open(tab?: 'compounds' | 'reactions' | 'elements') {
    if (tab) this.currentTab = tab;
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private render() {
    const stats = this.getStats();
    const tr = t().encyclopedia;

    const compFound = Object.values(COMPOUNDS_DATA).filter(c => isStarterCompound(c) || (stats.createdCompounds[c.id] || 0) > 0).length;
    const compTotal = Object.keys(COMPOUNDS_DATA).length;
    const rxnFound = DISPLAY_REACTIONS.filter(r => getMergedReactionCount(r, stats) > 0).length;
    const rxnTotal = DISPLAY_REACTIONS.length;
    const elemTotal = Object.keys(ELEMENTS_DATA).length;

    this.modalEl.innerHTML = kidText(`
      <div class="modal-card encyclopedia-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
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

        ${this.renderFilterBar()}

        <div class="encyclopedia-body">
          ${this.renderTabContent(stats)}
        </div>
      </div>
    `);

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

    const chips = this.modalEl.querySelectorAll('.filter-chip');
    chips.forEach(chipEl => {
      chipEl.addEventListener('click', () => {
        const filter = chipEl.getAttribute('data-filter') as EncyclopediaFilter | null;
        if (filter) {
          if (this.currentTab === 'compounds') {
            this.compoundFilter = filter;
          } else {
            this.reactionFilter = filter;
          }
          this.render();
        }
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-view-structure]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.viewStructure;
        if (!id) return;
        getMoleculeViewer().open(id);
      });
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-spawn-compound]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.spawnCompound;
        if (!id) return;
        this.onSelectCompound?.(id);
        this.close();
      });
    });
  }

  private renderFilterBar(): string {
    if (this.currentTab === 'elements') return '';
    const tr = t().encyclopedia;
    const isCompounds = this.currentTab === 'compounds';
    const filters = isCompounds ? COMPOUND_FILTERS : REACTION_FILTERS;
    const active = isCompounds ? this.compoundFilter : this.reactionFilter;
    const countFor = (f: EncyclopediaFilter) => isCompounds
      ? Object.values(COMPOUNDS_DATA).filter(c => compoundMatchesFilter(c, f)).length
      : DISPLAY_REACTIONS.filter(r => reactionMatchesFilter(r, f)).length;

    return `
      <div class="encyclopedia-filters" role="toolbar" aria-label="${tr.filterLabel}">
        ${filters.map(f => `
          <button class="filter-chip filter-${f} ${active === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${active === f}">
            ${tr.filters[f]} <span class="filter-count">${countFor(f)}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderTabContent(stats: GameStats): string {
    const tr = t().encyclopedia;
    const lang = getLanguage();

    if (this.currentTab === 'compounds') {
      const allCompounds = Object.values(COMPOUNDS_DATA).filter(c => compoundMatchesFilter(c, this.compoundFilter));
      if (allCompounds.length === 0) {
        return `<div class="filter-empty">${tr.filterEmpty}</div>`;
      }
      return `
        <div class="cards-grid">
          ${allCompounds.map(comp => {
            // 指示薬は実験道具なので最初から図鑑に載せる
            const discovered = isStarterCompound(comp) || (stats.createdCompounds[comp.id] || 0) > 0;
            const stateLabel = comp.stateAtRoomTemp === 'solid' ? (lang === 'en' ? 'Solid 🧊' : '固体 🧊') : (comp.stateAtRoomTemp === 'liquid' ? (lang === 'en' ? 'Liquid 💧' : '液体 💧') : (lang === 'en' ? 'Gas ♨' : '気体 ♨'));
            const kidHint = getCompoundKidHint(comp, lang);

            if (!discovered) {
              const elemCount = Object.keys(comp.elements).length;
              const recipe = comp.recipe;
              const methodStr = recipe ? (lang === 'en' ? recipe.methodEn : recipe.methodJa) : (lang === 'en' ? 'Combine elements in lab' : '実験室で組み合わせてみよう');

              // レシピ材料バッジのHTML
              let materialsHtml = '';
              if (recipe && recipe.materials.length > 0) {
                materialsHtml = recipe.materials.map(m => {
                  let matName = m.id;
                  let matColor = '#38BDF8';
                  if (m.type === 'element') {
                    const el = ELEMENTS_DATA[m.id];
                    if (el) {
                      matName = getElementName(el, lang);
                      matColor = el.color;
                    }
                  } else {
                    const c = COMPOUNDS_DATA[m.id];
                    if (c) {
                      matName = getCompoundName(c, lang);
                      matColor = c.color;
                    }
                  }
                  return `
                    <span class="recipe-mat-badge" style="border-color: ${matColor};">
                      <span class="mat-dot" style="background: ${matColor};"></span>
                      <strong style="color: #F8FAFC;">${m.id}</strong>
                      <span class="mat-name">${matName}</span>
                      <span class="mat-count">×${m.count}</span>
                    </span>
                  `;
                }).join('');
              } else {
                materialsHtml = Object.entries(comp.elements).map(([elId, count]) => {
                  const el = ELEMENTS_DATA[elId];
                  const elName = el ? getElementName(el, lang) : elId;
                  const elColor = el ? el.color : '#38BDF8';
                  return `
                    <span class="recipe-mat-badge" style="border-color: ${elColor};">
                      <span class="mat-dot" style="background: ${elColor};"></span>
                      <strong style="color: #F8FAFC;">${elId}</strong>
                      <span class="mat-name">${elName}</span>
                      <span class="mat-count">×${count}</span>
                    </span>
                  `;
                }).join('');
              }

              return `
                <div class="zukan-card undiscovered-card ${comp.isToxic ? 'toxic' : ''}">
                  <div class="card-header-line">
                    <div class="card-badge mystery-badge">❓</div>
                    <div class="card-title-group">
                      <div class="card-name">${tr.mysteryCompound} <span class="state-pill">${stateLabel}</span></div>
                      <div class="card-sub">${elemCount}${lang === 'en' ? ' Elements' : '元素の化合物'}</div>
                    </div>
                  </div>

                  <!-- なぞなぞヒント -->
                  <div class="kid-riddle-box">
                    <div class="riddle-tag">${tr.kidHintLabel}</div>
                    <div class="riddle-text">${kidHint}</div>
                  </div>

                  <!-- レシピ材料スロット -->
                  <div class="recipe-box">
                    <div class="recipe-title">${tr.recipeMaterialsLabel}:</div>
                    <div class="material-chips-row">
                      ${materialsHtml}
                    </div>
                  </div>

                  <!-- つくり方 -->
                  <div class="method-box">
                    <span class="method-label">${tr.recipeMethodLabel}:</span>
                    <span class="method-val">${methodStr}</span>
                  </div>

                  ${comp.isToxic ? `
                    <div class="toxic-safety-tip">
                      ${tr.toxicSafetyWarning}
                    </div>
                  ` : ''}
                  <button class="primary-btn spawn-btn zukan-spawn-btn" disabled>${tr.spawnCompoundLocked}</button>
                </div>
              `;
            }

            const name = getCompoundName(comp, lang);
            const desc = getCompoundDescription(comp, lang);
            const fact = getGrade() === 'elementary' ? getCompoundKidHint(comp, lang) : getCompoundFact(comp, lang);
            const toxicWarn = getCompoundToxicWarning(comp, lang);

            const cardSub = lang === 'en'
              ? `${getCompoundFormula(comp, lang)} (Molar mass: ${comp.molarMass.toFixed(1)} g/mol)`
              : `${comp.nameEn} (分子量: ${comp.molarMass.toFixed(1)})`;

            return `
              <div class="zukan-card ${comp.isToxic ? 'toxic' : ''}">
                <div class="card-header-line">
                  <div class="card-badge" style="background: ${comp.color}; color: #0F172A">
                    ${getCompoundFormula(comp, lang)}
                  </div>
                  <div class="card-title-group">
                    <div class="card-name">${name} <span class="state-pill">${stateLabel}</span></div>
                    <div class="card-sub">${cardSub}</div>
                  </div>
                </div>

                ${comp.isToxic ? `
                  <div class="toxic-badge">⚠️ ${toxicWarn}</div>
                ` : ''}

                <!-- なぞなぞヒント (発見後も表示) -->
                <div class="kid-riddle-box discovered">
                  <div class="riddle-tag">${tr.kidHintLabel}</div>
                  <div class="riddle-text">${kidHint}</div>
                </div>

                <div class="card-desc">${desc}</div>
                ${comp.indicator ? renderIndicatorChips(comp, stats) : ''}
                ${SOLUBILITY_TABLES[comp.id] ? renderSolubilityTable(comp.id) : ''}
                <div class="card-mext">📘 <strong>${tr.mextFactTitle}</strong> ${fact}</div>
                ${getStructure(comp.id) ? `
                  <button class="structure-btn" data-view-structure="${comp.id}">${tr.view3d}</button>
                ` : (NO_STRUCTURE_COMPOUNDS.includes(comp.id) ? `<div class="no-structure-note">${tr.noStructure(comp.id)}</div>` : '')}
                <button class="primary-btn spawn-btn zukan-spawn-btn" data-spawn-compound="${comp.id}">
                  ${tr.spawnCompoundBtn(getCompoundFormula(comp, lang))}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else if (this.currentTab === 'reactions') {
      const rules = DISPLAY_REACTIONS.filter(r => reactionMatchesFilter(r, this.reactionFilter));
      if (rules.length === 0) {
        return `<div class="filter-empty">${tr.filterEmpty}</div>`;
      }
      return `
        <div class="cards-grid">
          ${rules.map(rule => {
            const count = getMergedReactionCount(rule, stats);
            const discovered = count > 0;
            const rxnName = getReactionName(rule, lang);
            const rxnCat = getReactionCategory(rule, lang);

            if (!discovered) {
              let condStr = rule.condition.minTemp ? (lang === 'en' ? `Heat to >${rule.condition.minTemp}°C` : `${rule.condition.minTemp}℃以上加熱`) : (lang === 'en' ? 'Contact' : '接触反応');
              if (rule.condition.requiresOxygenShortage) condStr += lang === 'en' ? ' with too little oxygen' : '・酸素が足りないとき';
              return `
                <div class="zukan-card undiscovered">
                  <div class="card-category-badge">${rxnCat}</div>
                  <div class="card-formula">${tr.undiscoveredReaction}</div>
                  <div class="card-hint">${tr.undiscoveredReactionHint(rxnName, condStr)}</div>
                </div>
              `;
            }

            // 小学生モードでは、博士のやさしいセリフがある反応はそれを説明にする
            const kidLine = getGrade() === 'elementary' ? REACTION_LINES[rule.id] : undefined;
            const rxnDesc = kidLine ? kidLine[lang] : getReactionDescription(rule, lang);
            const heatStr = rule.heatRelease > 0 ? tr.reactionHeatExo(rule.heatRelease) : tr.reactionHeatEndo(rule.heatRelease);
            const intensityTag = (rule.intensities ?? [])
              .map(i => `<span class="intensity-tag filter-${i}">${tr.filters[i]}</span>`)
              .join('');

            return `
              <div class="zukan-card reaction-card">
                <div class="card-category-badge">${rxnCat}</div>
                <div class="card-equation">${getReactionEquation(rule, lang)}</div>
                <div class="reaction-name-ja">${rxnName} (${tr.experimentCount(count)})</div>
                <div class="card-desc">${rxnDesc}</div>
                <div class="reaction-meta">
                  ${intensityTag}
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
            const fact = getGrade() === 'elementary' ? getElementKidHint(el, lang) : getElementFact(el, lang);
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
                  ${flameReferenceTag(el.symbol)}
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
