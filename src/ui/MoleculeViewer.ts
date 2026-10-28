import { COMPOUNDS_DATA, getCompoundName, getCompoundFormula } from '../data/compounds';
import { ELEMENTS_DATA, getElementName } from '../data/elements';
import { MolecularStructure, getStructure, getStructureNote, getStructureShape } from '../data/structures';
import { MoleculeDisplayMode, elementColor } from '../engine/MoleculeRenderer';
import type { MoleculeScene } from '../engine/MoleculeScene';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';

const MAX_CANVAS_SIZE = 520;

// 化合物の分子構造の 3D ビューア (図鑑・実験室の粒子から開く)。
// three.js は大きいので、初めて開いた時に読み込む
export class MoleculeViewer {
  private modalEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private infoEl: HTMLElement;
  private headerEl: HTMLElement;
  private controlsEl: HTMLElement;
  private scene: MoleculeScene | null = null;
  private loading: Promise<void> | null = null;
  private compoundId: string | null = null;
  private structure: MolecularStructure | null = null;
  private mode: MoleculeDisplayMode = 'ballStick';
  private showLabels: boolean = true;
  private autoRotate: boolean = true;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'molecule-viewer';
    this.modalEl.innerHTML = `
      <div class="modal-card molecule-card">
        <div class="modal-header">
          <div class="title-with-badge molecule-title"></div>
          <button class="close-btn" id="close-molecule-viewer">✕</button>
        </div>
        <div class="molecule-body">
          <div class="molecule-canvas-wrap">
            <canvas class="molecule-canvas"></canvas>
            <div class="molecule-status"></div>
            <div class="molecule-hint"></div>
          </div>
          <div class="molecule-controls"></div>
          <div class="molecule-info"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modalEl);
    this.canvas = this.modalEl.querySelector('.molecule-canvas') as HTMLCanvasElement;
    this.headerEl = this.modalEl.querySelector('.molecule-title') as HTMLElement;
    this.controlsEl = this.modalEl.querySelector('.molecule-controls') as HTMLElement;
    this.infoEl = this.modalEl.querySelector('.molecule-info') as HTMLElement;

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
    this.modalEl.querySelector('#close-molecule-viewer')?.addEventListener('click', () => this.close());
    window.addEventListener('resize', () => this.resize());
    onLanguageChange(() => {
      if (this.isOpen()) this.renderInfo();
    });
  }

  public isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  public open(compoundId: string) {
    const structure = getStructure(compoundId);
    if (!structure) return;
    this.compoundId = compoundId;
    this.structure = structure;
    this.modalEl.classList.remove('hidden');
    this.renderInfo();
    this.resize();
    void this.ensureScene().then(() => {
      if (!this.scene || !this.isOpen()) return;
      this.applyStructure(true);
      this.scene.start();
    });
  }

  public close() {
    this.modalEl.classList.add('hidden');
    this.scene?.stop();
  }

  private ensureScene(): Promise<void> {
    if (this.scene) return Promise.resolve();
    if (!this.loading) {
      this.setStatus(t().moleculeViewer.loading);
      this.loading = import('../engine/MoleculeScene')
        .then(({ MoleculeScene }) => {
          this.scene = new MoleculeScene(this.canvas);
          this.resize();
          this.setStatus('');
        })
        .catch(() => {
          // WebGL が使えない端末など
          this.setStatus(t().moleculeViewer.unavailable);
          this.loading = null;
        });
    }
    return this.loading;
  }

  private setStatus(text: string) {
    const el = this.modalEl.querySelector('.molecule-status') as HTMLElement;
    el.textContent = text;
    el.classList.toggle('hidden', !text);
  }

  private applyStructure(resetView: boolean) {
    if (!this.scene || !this.structure) return;
    this.scene.setStructure(this.structure, this.mode, this.showLabels, resetView);
    this.scene.setAutoRotate(this.autoRotate);
  }

  private resize() {
    if (!this.isOpen()) return;
    const wrap = this.canvas.parentElement!;
    const size = Math.max(200, Math.floor(Math.min(wrap.clientWidth, MAX_CANVAS_SIZE)));
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.scene?.resize(size);
  }

  private renderInfo() {
    if (!this.structure || !this.compoundId) return;
    const tr = t().moleculeViewer;
    const lang = getLanguage();
    const comp = COMPOUNDS_DATA[this.compoundId];
    const s = this.structure;
    const shape = getStructureShape(s, lang);
    const note = getStructureNote(s, lang);
    const elements = Array.from(new Set(s.atoms.map(a => a.el)));

    this.headerEl.innerHTML = `
      <h2>🧊 ${comp ? getCompoundName(comp, lang) : this.compoundId} <span class="molecule-formula">${comp ? getCompoundFormula(comp, lang) : ''}</span></h2>
      <span class="sub-badge">${tr.kinds[s.kind]}</span>
    `;
    (this.modalEl.querySelector('.molecule-hint') as HTMLElement).textContent = tr.hint;
    this.controlsEl.innerHTML = `
      <button class="fw-option ${this.mode === 'ballStick' ? 'selected' : ''}" data-mode="ballStick">${tr.ballStick}</button>
      <button class="fw-option ${this.mode === 'spaceFill' ? 'selected' : ''}" data-mode="spaceFill">${tr.spaceFill}</button>
      <button class="fw-option ${this.showLabels ? 'selected' : ''}" data-toggle="labels">${tr.labels}</button>
      <button class="fw-option ${this.autoRotate ? 'selected' : ''}" data-toggle="rotate">${tr.autoRotate}</button>
    `;
    this.infoEl.innerHTML = `
      ${shape ? `<div class="molecule-shape">📐 ${tr.shapeLabel}: <strong>${shape}</strong></div>` : ''}
      ${note ? `<div class="molecule-note">${note}</div>` : ''}
      <div class="molecule-legend">
        ${elements.map(el => {
          const data = ELEMENTS_DATA[el];
          return `<span class="molecule-legend-chip"><span class="indicator-dot" style="background: ${elementColor(el)};"></span>${el} ${data ? getElementName(data, lang) : ''}</span>`;
        }).join('')}
      </div>
      ${s.source ? `<div class="molecule-source">${tr.source(s.source)}</div>` : ''}
    `;

    this.controlsEl.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode as MoleculeDisplayMode;
        soundManager.playClick();
        this.renderInfo();
        this.applyStructure(false);
      });
    });
    this.controlsEl.querySelector('[data-toggle="labels"]')?.addEventListener('click', () => {
      this.showLabels = !this.showLabels;
      soundManager.playClick();
      this.renderInfo();
      this.applyStructure(false);
    });
    this.controlsEl.querySelector('[data-toggle="rotate"]')?.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      soundManager.playClick();
      this.renderInfo();
      this.scene?.setAutoRotate(this.autoRotate);
    });
  }
}

// 図鑑とインスペクターで同じビューアを使う (WebGL の描画環境を1つだけにする)
let sharedViewer: MoleculeViewer | null = null;
export function getMoleculeViewer(): MoleculeViewer {
  sharedViewer ??= new MoleculeViewer();
  return sharedViewer;
}
