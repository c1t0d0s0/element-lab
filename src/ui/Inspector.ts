import { Particle } from '../engine/Particle';
import { GlassContainer } from '../engine/PhysicsWorld';
import { ELEMENTS_DATA, getElementName, getElementFact, getFlameReactionInfo } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, getCompoundFact, getCompoundToxicWarning } from '../data/compounds';
import { t, getLanguage, onLanguageChange } from '../i18n';

export class Inspector {
  private container: HTMLElement;
  private currentTarget: Particle | GlassContainer | null = null;

  constructor(containerId: string) {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      document.body.appendChild(el);
    }
    this.container = el;
    this.renderEmpty();

    onLanguageChange(() => {
      if (this.currentTarget) {
        this.inspect(this.currentTarget);
      }
    });
  }

  public renderEmpty() {
    this.currentTarget = null;
    this.container.innerHTML = '';
  }

  public inspect(target: Particle | GlassContainer | null) {
    this.currentTarget = target;
    if (!target) {
      this.renderEmpty();
      return;
    }

    const tr = t();
    const lang = getLanguage();

    // ガラス容器 (フラスコ・ビーカー・試験管) の場合
    if ('segments' in target) {
      const c = target as GlassContainer;
      const icons = { erlenmeyer: '🏺', beaker: '🥛', testtube: '🧪' };
      const tempColor = c.temperature > 100 ? '#EF4444' : (c.temperature < 0 ? '#38BDF8' : '#10B981');
      const flaskName = c.type === 'erlenmeyer' ? tr.tools.erlenmeyer : (c.type === 'beaker' ? tr.tools.beaker : tr.tools.testtube);

      this.container.innerHTML = `
        <div class="inspector-card">
          <div class="inspector-header">
            <div class="symbol-badge" style="background: rgba(186, 230, 253, 0.4); border-color: #38BDF8; font-size: 20px;">
              ${icons[c.type]}
            </div>
            <div class="name-box">
              <div class="name-ja">${flaskName}</div>
              <div class="category-tag">${tr.inspector.flaskCategory}</div>
            </div>
          </div>

          <div class="inspector-stats">
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.temp}</span>
              <span class="stat-value" style="color: ${tempColor}">${Math.round(c.temperature)} ℃</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.material}</span>
              <span class="stat-value">${tr.inspector.materialGlassVal}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.heatResistance}</span>
              <span class="stat-value">${tr.inspector.heatResistanceVal}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.state}</span>
              <span class="stat-value">${tr.inspector.solid}</span>
            </div>
          </div>

          <div class="mext-box">
            <div class="mext-title">${tr.inspector.mextKnowledgeTitle}</div>
            <div class="mext-content">${tr.inspector.mextGlassDesc}</div>
          </div>
        </div>
      `;
      return;
    }

    const p = target as Particle;
    let mextNote = '';
    let category = '';
    let atomicRadiusStr = '';
    let nameStr = p.displayName;

    if (p.kind === 'element') {
      const el = ELEMENTS_DATA[p.symbolOrId];
      if (el) {
        nameStr = getElementName(el, lang);
        mextNote = getElementFact(el, lang);
        const catName = tr.periodicTable.categories[el.category] || el.category;
        category = `${tr.periodicTable.periodLabel(el.period)}・${tr.periodicTable.groupLabel(el.group)} (${catName})`;
        atomicRadiusStr = `${tr.inspector.atomicRadius}: <strong>${el.atomicRadius} pm</strong>`;
      }
    } else if (p.kind === 'compound') {
      const comp = COMPOUNDS_DATA[p.symbolOrId];
      if (comp) {
        nameStr = getCompoundName(comp, lang);
        mextNote = getCompoundFact(comp, lang);
        category = `${lang === 'ja' ? '化合物' : 'Compound'} (${tr.inspector.molarMass}: ${comp.molarMass.toFixed(1)} g/mol)`;
      }
    } else if (p.kind === 'wall') {
      nameStr = tr.tools.wall;
      category = tr.inspector.fixedObstacle;
      mextNote = tr.inspector.wallDesc;
    }

    const stateStr = p.state === 'solid' ? tr.inspector.solid : (p.state === 'liquid' ? tr.inspector.liquid : tr.inspector.gas);
    const tempColor = p.temperature > 300 ? '#EF4444' : (p.temperature < 0 ? '#38BDF8' : '#10B981');
    const displayBadge = p.displayName || '🧱';
    const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);

    let conductivityStr = tr.inspector.condInsulator;
    let conductivityColor = '#94A3B8';
    if (p.kind === 'element') {
      if (p.symbolOrId === 'C') {
        conductivityStr = tr.inspector.condConductorGraphite;
        conductivityColor = '#38BDF8';
      } else {
        const el = ELEMENTS_DATA[p.symbolOrId];
        const conductorCategories = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition-metal', 'lanthanide', 'actinide'];
        if (el && conductorCategories.includes(el.category)) {
          conductivityStr = tr.inspector.condConductorMetal;
          conductivityColor = '#38BDF8';
        }
      }
    } else if (p.kind === 'compound') {
      if (p.symbolOrId === 'H2O') {
        conductivityStr = tr.inspector.condElectrolyzable;
        conductivityColor = '#38BDF8';
      } else if (['NaCl', 'CuCl2', 'HCl', 'NaOH', 'H2SO4', 'CaCl2', 'CuSO4', 'FeCl2'].includes(p.symbolOrId)) {
        conductivityStr = tr.inspector.condElectrolyte;
        conductivityColor = '#38BDF8';
      }
    }

    const flameColorName = lang === 'en' && flameInfo?.flameColorNameEn ? flameInfo.flameColorNameEn : flameInfo?.flameColorNameJa;
    const flameMnemonic = lang === 'en' && flameInfo?.flameMnemonicEn ? flameInfo.flameMnemonicEn : flameInfo?.flameMnemonicJa;

    let toxicWarningText = '';
    if (p.isToxic) {
      if (p.kind === 'compound') {
        const comp = COMPOUNDS_DATA[p.symbolOrId];
        toxicWarningText = comp ? getCompoundToxicWarning(comp, lang) : (lang === 'en' ? 'Hazardous/Toxic substance.' : '人体に有害な物質です。');
      } else {
        toxicWarningText = lang === 'en' ? 'Hazardous substance.' : '人体に有害な物質です。';
      }
    }

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="symbol-badge" style="background: ${p.color}; border-color: ${p.secondaryColor}">
            ${displayBadge}
          </div>
          <div class="name-box">
            <div class="name-ja">${nameStr}</div>
            <div class="category-tag">${category}</div>
          </div>
        </div>

        <div class="inspector-stats">
          <div class="stat-item">
            <span class="stat-label">${tr.inspector.temp}</span>
            <span class="stat-value" style="color: ${tempColor}">${Math.round(p.temperature)} ℃</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${tr.inspector.state}</span>
            <span class="stat-value">${stateStr}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${tr.inspector.conductivity}</span>
            <span class="stat-value" style="color: ${conductivityColor}">${conductivityStr}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">${tr.inspector.molarMass}</span>
            <span class="stat-value">${p.molarMass.toFixed(1)} g/mol</span>
          </div>
          ${atomicRadiusStr ? `
          <div class="stat-item">
            <span class="stat-label">${tr.inspector.atomicRadius}</span>
            <span class="stat-value">${p.kind === 'element' ? ELEMENTS_DATA[p.symbolOrId]?.atomicRadius : ''} pm</span>
          </div>` : ''}
        </div>

        ${flameInfo ? `
        <div class="flame-reaction-badge" style="border-color: ${flameInfo.flameColor};">
          <span class="flame-icon">🔥</span>
          <div class="flame-text-wrap">
            <div class="flame-title">${tr.inspector.flameReaction}: <strong style="color: ${flameInfo.flameColor}; text-shadow: 0 0 8px ${flameInfo.flameColor};">${flameColorName}</strong></div>
            ${flameMnemonic ? `<div class="flame-mnemonic">${tr.inspector.mnemonic}: <span>${flameMnemonic}</span></div>` : ''}
          </div>
        </div>` : ''}

        ${p.isToxic ? `
        <div class="toxic-alert">
          <span class="alert-icon">⚠️</span>
          <span>${toxicWarningText}</span>
        </div>` : ''}

        ${p.symbolOrId === 'Fe' && p.rustProgress > 0 ? `
        <div class="rust-meter">
          <div class="rust-label">${tr.inspector.rustMeter}: ${Math.round(p.rustProgress * 100)}%</div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.round(p.rustProgress * 100)}%"></div></div>
        </div>` : ''}

        ${mextNote ? `
        <div class="mext-box">
          <div class="mext-title">${tr.inspector.mextKnowledgeTitle}</div>
          <div class="mext-content">${mextNote}</div>
        </div>` : ''}
      </div>
    `;
  }
}
