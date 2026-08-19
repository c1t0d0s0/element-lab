import { Particle } from '../engine/Particle';
import { GlassContainer } from '../engine/PhysicsWorld';
import { ELEMENTS_DATA, getFlameReactionInfo } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';

export class Inspector {
  private container: HTMLElement;

  constructor(containerId: string) {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      document.body.appendChild(el);
    }
    this.container = el;
    this.renderEmpty();
  }

  public renderEmpty() {
    this.container.innerHTML = '';
  }

  public inspect(target: Particle | GlassContainer | null) {
    if (!target) {
      this.renderEmpty();
      return;
    }

    // ガラス容器 (フラスコ・ビーカー・試験管) の場合
    if ('segments' in target) {
      const c = target as GlassContainer;
      const icons = { erlenmeyer: '🏺', beaker: '🥛', testtube: '🧪' };
      const tempColor = c.temperature > 100 ? '#EF4444' : (c.temperature < 0 ? '#38BDF8' : '#10B981');

      this.container.innerHTML = `
        <div class="inspector-card">
          <div class="inspector-header">
            <div class="symbol-badge" style="background: rgba(186, 230, 253, 0.4); border-color: #38BDF8; font-size: 20px;">
              ${icons[c.type]}
            </div>
            <div class="name-box">
              <div class="name-ja">${c.nameJa}</div>
              <div class="category-tag">耐熱ガラス器具 (ホウケイ酸ガラス)</div>
            </div>
          </div>

          <div class="inspector-stats">
            <div class="stat-item">
              <span class="stat-label">温度</span>
              <span class="stat-value" style="color: ${tempColor}">${Math.round(c.temperature)} ℃</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">材質</span>
              <span class="stat-value">ホウケイ酸ガラス</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">耐熱温度</span>
              <span class="stat-value">約 500 ℃</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">状態</span>
              <span class="stat-value">固体 🧊</span>
            </div>
          </div>

          <div class="mext-box">
            <div class="mext-title">📘 文科省・理科実験の重要知識</div>
            <div class="mext-content">熱膨張率が小さく急熱・急冷に強い理化学用耐熱ガラスです。バーナーで直接加熱して液体を沸騰させたり、試薬を入れて反応させる容器として使用します。</div>
          </div>
        </div>
      `;
      return;
    }

    const p = target as Particle;
    let mextNote = '';
    let category = '';
    let atomicRadiusStr = '';

    if (p.kind === 'element') {
      const el = ELEMENTS_DATA[p.symbolOrId];
      if (el) {
        mextNote = el.mextFactJa;
        category = `第${el.period}周期・${el.group}族 (${el.category})`;
        atomicRadiusStr = `原子半径: <strong>${el.atomicRadius} pm</strong>`;
      }
    } else if (p.kind === 'compound') {
      const comp = COMPOUNDS_DATA[p.symbolOrId];
      if (comp) {
        mextNote = comp.mextFactJa;
        category = `化合物 (分子量: ${comp.molarMass.toFixed(1)} g/mol)`;
      }
    } else if (p.kind === 'wall') {
      category = '固定障害物';
      mextNote = '熱と粒子を遮断する耐熱壁です。';
    }

    const stateJa = p.state === 'solid' ? '固体 🧊' : (p.state === 'liquid' ? '液体 💧' : '気体 ♨');
    const tempColor = p.temperature > 300 ? '#EF4444' : (p.temperature < 0 ? '#38BDF8' : '#10B981');
    const displayBadge = p.displayName || '🧱';
    const flameInfo = getFlameReactionInfo(p.kind, p.symbolOrId);

    let conductivityStr = '絶縁体 (不導体)';
    let conductivityColor = '#94A3B8';
    if (p.kind === 'element') {
      if (p.symbolOrId === 'C') {
        conductivityStr = '良導体 (黒鉛・自由電子)';
        conductivityColor = '#38BDF8';
      } else {
        const el = ELEMENTS_DATA[p.symbolOrId];
        const conductorCategories = ['alkali-metal', 'alkaline-earth', 'transition-metal', 'post-transition-metal', 'lanthanide', 'actinide'];
        if (el && conductorCategories.includes(el.category)) {
          conductivityStr = '良導体 (金属・自由電子)';
          conductivityColor = '#38BDF8';
        }
      }
    } else if (p.kind === 'compound') {
      if (p.symbolOrId === 'H2O') {
        conductivityStr = '電解可能 (電気分解)';
        conductivityColor = '#38BDF8';
      } else if (['NaCl', 'CuCl2', 'HCl', 'NaOH', 'H2SO4', 'CaCl2', 'CuSO4', 'FeCl2'].includes(p.symbolOrId)) {
        conductivityStr = '電解質 (イオン電離)';
        conductivityColor = '#38BDF8';
      }
    }

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="symbol-badge" style="background: ${p.color}; border-color: ${p.secondaryColor}">
            ${displayBadge}
          </div>
          <div class="name-box">
            <div class="name-ja">${p.nameJa}</div>
            <div class="category-tag">${category}</div>
          </div>
        </div>

        <div class="inspector-stats">
          <div class="stat-item">
            <span class="stat-label">温度</span>
            <span class="stat-value" style="color: ${tempColor}">${Math.round(p.temperature)} ℃</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">状態</span>
            <span class="stat-value">${stateJa}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">導電性</span>
            <span class="stat-value" style="color: ${conductivityColor}">${conductivityStr}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">分子量/質量</span>
            <span class="stat-value">${p.molarMass.toFixed(1)} g/mol</span>
          </div>
          ${atomicRadiusStr ? `
          <div class="stat-item">
            <span class="stat-label">原子半径</span>
            <span class="stat-value">${p.kind === 'element' ? ELEMENTS_DATA[p.symbolOrId]?.atomicRadius : ''} pm</span>
          </div>` : ''}
        </div>

        ${flameInfo ? `
        <div class="flame-reaction-badge" style="border-color: ${flameInfo.flameColor};">
          <span class="flame-icon">🔥</span>
          <div class="flame-text-wrap">
            <div class="flame-title">炎色反応: <strong style="color: ${flameInfo.flameColor}; text-shadow: 0 0 8px ${flameInfo.flameColor};">${flameInfo.flameColorNameJa}</strong></div>
            ${flameInfo.flameMnemonicJa ? `<div class="flame-mnemonic">語呂合わせ: <span>${flameInfo.flameMnemonicJa}</span></div>` : ''}
          </div>
        </div>` : ''}

        ${p.isToxic ? `
        <div class="toxic-alert">
          <span class="alert-icon">⚠️</span>
          <span>${p.toxicWarning || '人体に有害な物質です。'}</span>
        </div>` : ''}

        ${p.symbolOrId === 'Fe' && p.rustProgress > 0 ? `
        <div class="rust-meter">
          <div class="rust-label">赤サビ進行度: ${Math.round(p.rustProgress * 100)}%</div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${Math.round(p.rustProgress * 100)}%"></div></div>
        </div>` : ''}

        ${mextNote ? `
        <div class="mext-box">
          <div class="mext-title">📘 文科省・理科の重要知識</div>
          <div class="mext-content">${mextNote}</div>
        </div>` : ''}
      </div>
    `;
  }
}
