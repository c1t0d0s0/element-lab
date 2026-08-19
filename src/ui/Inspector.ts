import { Particle } from '../engine/Particle';
import { ELEMENTS_DATA } from '../data/elements';
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
    this.container.innerHTML = `
      <div class="inspector-card empty">
        <div class="inspector-hint">
          <span class="icon">🔍</span>
          <span>粒子にマウスを重ねるかタップすると詳細が表示されます</span>
        </div>
      </div>
    `;
  }

  public inspect(p: Particle | null) {
    if (!p) {
      this.renderEmpty();
      return;
    }

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

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="symbol-badge" style="background: ${p.color}; border-color: ${p.secondaryColor}">
            ${p.displayName}
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
            <span class="stat-label">分子量/質量</span>
            <span class="stat-value">${p.molarMass.toFixed(1)} g/mol</span>
          </div>
          ${atomicRadiusStr ? `
          <div class="stat-item">
            <span class="stat-label">原子半径</span>
            <span class="stat-value">${p.kind === 'element' ? ELEMENTS_DATA[p.symbolOrId]?.atomicRadius : ''} pm</span>
          </div>` : ''}
        </div>

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
