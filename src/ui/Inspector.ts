import { Particle } from '../engine/Particle';
import { GlassContainer, LabBalance, PhysicsWorld } from '../engine/PhysicsWorld';
import { ELEMENTS_DATA, getElementName, getElementFact, getFlameReactionInfo } from '../data/elements';
import { COMPOUNDS_DATA, getCompoundName, getCompoundFact, getCompoundToxicWarning } from '../data/compounds';
import { t, getLanguage, onLanguageChange } from '../i18n';

export class Inspector {
  private container: HTMLElement;
  private currentTarget: Particle | GlassContainer | LabBalance | null = null;
  public world?: PhysicsWorld;
  public onToggleCap?: (container: GlassContainer) => void;
  public onClearPan?: (balance: LabBalance, side: 'left' | 'right' | 'all') => void;
  public onToggleBalanceLock?: (balance: LabBalance) => void;

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

  public inspect(target: Particle | GlassContainer | LabBalance | null) {
    this.currentTarget = target;
    if (!target) {
      this.renderEmpty();
      return;
    }

    const tr = t();
    const lang = getLanguage();

    // 上皿天秤の場合
    if ('leftPan' in target) {
      const b = target as LabBalance;
      const leftMass = b.leftPan.totalMass;
      const rightMass = b.rightPan.totalMass;
      const diff = rightMass - leftMass;
      const absDiff = Math.abs(diff);

      let balanceStatus = tr.balance.balanced;
      let statusColor = '#10B981';
      if (b.leftPan.totalMass === 0 && b.rightPan.totalMass === 0) {
        balanceStatus = lang === 'ja' ? '⚖️ 空 (0.00 g/mol)' : '⚖️ Empty';
        statusColor = '#94A3B8';
      } else if (absDiff < 0.05) {
        balanceStatus = tr.balance.balanced;
        statusColor = '#10B981';
      } else if (diff < 0) {
        balanceStatus = tr.balance.leftHeavy;
        statusColor = '#38BDF8';
      } else {
        balanceStatus = tr.balance.rightHeavy;
        statusColor = '#F43F5E';
      }

      const ratioStr = (leftMass > 0 && rightMass > 0)
        ? (leftMass < rightMass
            ? `1 : ${(rightMass / leftMass).toFixed(2)}`
            : `${(leftMass / rightMass).toFixed(2)} : 1`)
        : '-';

      const renderPanList = (comp: typeof b.leftPan.composition, color: string) => {
        if (comp.length === 0) {
          return `<div class="pan-empty-note">${tr.balance.emptyPan}</div>`;
        }
        return comp.map(item => {
          const isFlask = item.symbolOrId.startsWith('flask_');
          const titleName = isFlask ? (lang === 'en' ? item.nameEn : item.nameJa) : `${item.displayName} × ${item.count}`;
          return `
            <div class="pan-comp-item">
              <span class="pan-comp-name" style="color: ${color}">${titleName}</span>
              <span class="pan-comp-mass">${item.totalMolarMass.toFixed(2)} g/mol</span>
            </div>
          `;
        }).join('');
      };

      this.container.innerHTML = `
        <div class="inspector-card">
          <div class="inspector-header">
            <div class="symbol-badge" style="background: rgba(245, 158, 11, 0.2); border-color: #F59E0B; font-size: 20px;">
              ⚖️
            </div>
            <div class="name-box">
              <div class="name-ja">${tr.balance.title}</div>
              <div class="category-tag">${tr.balance.subtitle}</div>
            </div>
          </div>

          <div class="inspector-stats">
            <div class="stat-item">
              <span class="stat-label">${tr.balance.leftPan}</span>
              <span class="stat-value" style="color: #38BDF8; font-weight: bold;">${leftMass.toFixed(2)} g/mol</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.balance.rightPan}</span>
              <span class="stat-value" style="color: #F43F5E; font-weight: bold;">${rightMass.toFixed(2)} g/mol</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.balance.massDiff}</span>
              <span class="stat-value" style="color: ${statusColor}; font-weight: bold;">${absDiff.toFixed(2)} g/mol</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.balance.ratio}</span>
              <span class="stat-value">${ratioStr}</span>
            </div>
          </div>

          <!-- 測定状態ステータス -->
          <div class="balance-status-bar" style="border-color: ${statusColor}; color: ${statusColor};">
            ${balanceStatus}
          </div>

          <!-- 左右の皿の内容詳細 -->
          <div class="pan-details-grid">
            <div class="pan-detail-col left-col">
              <div class="pan-col-title" style="color: #38BDF8;">🔵 ${tr.balance.leftPan} (${b.leftPan.particles.length})</div>
              <div class="pan-comp-list">${renderPanList(b.leftPan.composition, '#38BDF8')}</div>
              <button class="pan-action-btn" id="btn-clear-left-pan">${tr.balance.clearLeft}</button>
            </div>
            <div class="pan-detail-col right-col">
              <div class="pan-col-title" style="color: #F43F5E;">🔴 ${tr.balance.rightPan} (${b.rightPan.particles.length})</div>
              <div class="pan-comp-list">${renderPanList(b.rightPan.composition, '#F43F5E')}</div>
              <button class="pan-action-btn" id="btn-clear-right-pan">${tr.balance.clearRight}</button>
            </div>
          </div>

          <!-- 天秤コントロールボタン -->
          <div class="balance-controls-row">
            <button class="inspector-cap-btn ${b.isLocked ? 'btn-cap-remove' : 'btn-cap-add'}" id="btn-toggle-balance-lock">
              ${b.isLocked ? tr.balance.unlock : tr.balance.lock}
            </button>
          </div>

          <!-- 文科省・上皿天秤の使い方知識 -->
          <div class="mext-box">
            <div class="mext-title">${tr.balance.mextKnowledgeTitle}</div>
            <div class="mext-content">${tr.balance.mextKnowledgeDesc}</div>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-clear-left-pan')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClearPan?.(b, 'left');
        this.inspect(b);
      });

      this.container.querySelector('#btn-clear-right-pan')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onClearPan?.(b, 'right');
        this.inspect(b);
      });

      this.container.querySelector('#btn-toggle-balance-lock')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onToggleBalanceLock?.(b);
        this.inspect(b);
      });

      return;
    }

    // ガラス容器 (フラスコ・ビーカー・試験管) の場合
    if ('segments' in target) {
      const c = target as GlassContainer;
      const icons = { erlenmeyer: '🏺', beaker: '🥛', testtube: '🧪' };
      const tempColor = c.temperature > 100 ? '#EF4444' : (c.temperature < 0 ? '#38BDF8' : '#10B981');
      const flaskName = c.type === 'erlenmeyer' ? tr.tools.erlenmeyer : (c.type === 'beaker' ? tr.tools.beaker : tr.tools.testtube);
      const capStatusStr = c.hasCap ? tr.inspector.capClosed : tr.inspector.capOpen;
      const capStatusColor = c.hasCap ? '#38BDF8' : '#94A3B8';
      const capBtnText = c.hasCap ? tr.inspector.btnRemoveCap : tr.inspector.btnAddCap;
      const capBtnClass = c.hasCap ? 'btn-cap-remove' : 'btn-cap-add';
      const capDesc = c.hasCap ? tr.inspector.capDescClosed : tr.inspector.capDescOpen;

      let innerMass = 0;
      let innerCount = 0;
      if (this.world) {
        for (const p of this.world.particles) {
          if (p.containerId === c.id) {
            innerMass += p.molarMass;
            innerCount++;
          }
        }
      }

      let placementStatusStr = tr.inspector.stateOnFloor;
      let placementColor = '#10B981';
      if (c.supportedByBalanceId) {
        placementStatusStr = c.supportedByPanSide === 'left' ? tr.inspector.stateOnLeftPan : tr.inspector.stateOnRightPan;
        placementColor = c.supportedByPanSide === 'left' ? '#38BDF8' : '#F43F5E';
      } else if (!c.isGrounded) {
        placementStatusStr = tr.inspector.stateFalling;
        placementColor = '#F59E0B';
      }

      const totalMass = c.tareMass + innerMass;
      const contentStr = innerCount > 0
        ? `${innerCount} ${lang === 'en' ? 'particles' : '粒子'} (${innerMass.toFixed(1)} g)`
        : (lang === 'en' ? 'Empty' : '空 (0.0 g)');

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
              <span class="stat-label">${tr.inspector.containerState}</span>
              <span class="stat-value" style="color: ${placementColor}; font-weight: bold;">${placementStatusStr}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.tareMass}</span>
              <span class="stat-value">${c.tareMass.toFixed(1)} g</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.innerContent}</span>
              <span class="stat-value" style="color: #38BDF8;">${contentStr}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.totalContainerMass}</span>
              <span class="stat-value" style="color: #F59E0B; font-weight: bold;">${totalMass.toFixed(1)} g</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.temp}</span>
              <span class="stat-value" style="color: ${tempColor}">${Math.round(c.temperature)} ℃</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.capStatus}</span>
              <span class="stat-value" style="color: ${capStatusColor}; font-weight: 600;">${capStatusStr}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.material}</span>
              <span class="stat-value">${tr.inspector.materialGlassVal}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">${tr.inspector.heatResistance}</span>
              <span class="stat-value">${tr.inspector.heatResistanceVal}</span>
            </div>
          </div>

          <!-- 蓋・密閉トグル操作ボタン -->
          <div class="cap-action-box">
            <button class="inspector-cap-btn ${capBtnClass}" id="btn-inspector-toggle-cap">
              ${capBtnText}
            </button>
            <div class="cap-hint-text">${capDesc}</div>
          </div>

          <div class="mext-box">
            <div class="mext-title">${tr.inspector.mextKnowledgeTitle}</div>
            <div class="mext-content">${tr.inspector.mextGlassDesc}</div>
          </div>
        </div>
      `;

      const capBtn = this.container.querySelector('#btn-inspector-toggle-cap') as HTMLButtonElement | null;
      if (capBtn) {
        capBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onToggleCap?.(c);
        });
      }
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
