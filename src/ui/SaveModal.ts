import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';
import { kidText } from '../i18n/furigana';
import {
  LabSnapshot, SavedLab, MAX_SAVED_LABS, encodeSnapshot, isEmptySnapshot, loadSavedLabs, saveLab, deleteSavedLab, SHARE_HASH_PREFIX
} from '../engine/LabSnapshot';
import { QrMatrix, QrFullscreen, makeQrMatrix, drawQr } from './qrCode';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

function snapshotCounts(snap: LabSnapshot): string {
  const walls = snap.p.filter(r => r[0] === 2).length;
  return t().lab.counts(snap.p.length - walls, snap.c.length + snap.b.length, walls);
}

// 💾 実験の保存・共有: いまの実験室を URL にしてコピーする・名前をつけてこのブラウザに保存する・保存したものを読みこむ
export class SaveModal {
  private modalEl: HTMLElement;
  private shareUrl = '';
  // 共有 URL の QR コード (長すぎて作れなければ null)
  private qr: QrMatrix | null = null;
  private qrFullscreen = new QrFullscreen();
  private armedDelete: number | null = null;
  // 入力した名前 (保存したあとも残して、同じ名前で上書きできるようにする)
  private nameDraft = '';
  public capture?: () => LabSnapshot;
  public onLoad?: (lab: SavedLab) => void;
  public onMessage?: (text: string, kind?: string) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'save-modal';
    document.body.appendChild(this.modalEl);
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });
    onLanguageChange(() => {
      if (!this.modalEl.classList.contains('hidden')) this.render();
    });
  }

  public async open() {
    this.armedDelete = null;
    this.shareUrl = '';
    this.qr = null;
    this.nameDraft = '';
    this.modalEl.classList.remove('hidden');
    this.render();
    const snap = this.capture?.();
    if (snap && !isEmptySnapshot(snap)) {
      this.shareUrl = `${location.origin}${location.pathname}${location.search}${SHARE_HASH_PREFIX}${await encodeSnapshot(snap)}`;
      this.qr = makeQrMatrix(this.shareUrl);
      this.render();
    }
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private render() {
    const tr = t().lab;
    const lang = getLanguage();
    const labs = loadSavedLabs();
    const snap = this.capture?.();
    const empty = !snap || isEmptySnapshot(snap);
    const time = new Date().toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    this.modalEl.innerHTML = kidText(`
      <div class="modal-card save-card" role="dialog" aria-labelledby="save-modal-title">
        <div class="modal-header">
          <h2 id="save-modal-title">${tr.modalTitle}</h2>
          <button class="close-btn" id="close-save-modal" aria-label="${t().inspector.close}">✕</button>
        </div>
        <div class="save-body">
          ${empty ? `<p class="save-empty">${tr.emptyLab}</p>` : `<p class="save-counts">${snapshotCounts(snap)}</p>`}
          <section class="save-section">
            <h3>${tr.shareHeading}</h3>
            <p class="fw-subtitle">${tr.shareText}</p>
            <div class="save-row">
              <input type="text" id="share-url" readonly value="${escapeHtml(this.shareUrl)}" aria-label="URL">
              <button class="primary-btn save-action" id="btn-copy-share" type="button" ${this.shareUrl ? '' : 'disabled'}>${tr.copyUrl}</button>
            </div>
            ${!this.shareUrl ? '' : this.qr ? `
              <div class="share-qr">
                <canvas id="share-qr-canvas" aria-label="QR"></canvas>
                <div class="share-qr-side">
                  <p class="fw-subtitle">${tr.qrText}</p>
                  <button class="primary-btn save-action" id="btn-qr-fullscreen" type="button">${tr.qrShow}</button>
                </div>
              </div>` : `<p class="save-empty">${tr.qrTooLong}</p>`}
          </section>
          <section class="save-section">
            <h3>${tr.saveHeading}</h3>
            <p class="fw-subtitle">${tr.saveText(MAX_SAVED_LABS)}</p>
            <div class="save-row">
              <input type="text" id="save-name" maxlength="40" placeholder="${tr.namePlaceholder}" value="${escapeHtml(this.nameDraft || tr.defaultName(time))}">
              <button class="primary-btn save-action" id="btn-save-lab" type="button" ${empty ? 'disabled' : ''}>${tr.saveButton}</button>
            </div>
            <ul class="saved-lab-list">
              ${labs.length === 0 ? `<li class="saved-lab-empty">${tr.noSaved}</li>` : labs.map((lab, i) => `
                <li class="saved-lab-item">
                  <div class="saved-lab-info">
                    <strong>${escapeHtml(lab.name)}</strong>
                    <small>${new Date(lab.savedAt).toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')} · ${snapshotCounts(lab.snapshot)}</small>
                  </div>
                  <button class="fw-option" data-load-lab="${i}" type="button">${tr.load}</button>
                  <button class="fw-option save-delete" data-delete-lab="${i}" type="button">${this.armedDelete === i ? tr.deleteAgain : tr.delete}</button>
                </li>`).join('')}
            </ul>
          </section>
        </div>
      </div>
    `);

    this.modalEl.querySelector('#close-save-modal')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-copy-share')?.addEventListener('click', () => this.copyShareUrl());
    const qrCanvas = this.modalEl.querySelector<HTMLCanvasElement>('#share-qr-canvas');
    if (qrCanvas && this.qr) drawQr(qrCanvas, this.qr, 168);
    this.modalEl.querySelector('#btn-qr-fullscreen')?.addEventListener('click', () => {
      if (!this.qr) return;
      soundManager.playClick();
      this.qrFullscreen.open(this.qr);
    });
    this.modalEl.querySelector('#btn-save-lab')?.addEventListener('click', () => this.saveCurrent());
    this.modalEl.querySelector<HTMLInputElement>('#save-name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveCurrent();
    });
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-load-lab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lab = labs[Number(btn.dataset.loadLab)];
        if (!lab) return;
        soundManager.playClick();
        this.close();
        this.onLoad?.(lab);
      });
    });
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-delete-lab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.deleteLab);
        soundManager.playClick();
        // まちがえて消さないように、2回押したときだけ消す
        if (this.armedDelete === i) {
          deleteSavedLab(i);
          this.armedDelete = null;
        } else {
          this.armedDelete = i;
        }
        this.render();
      });
    });
  }

  private async copyShareUrl() {
    if (!this.shareUrl) return;
    soundManager.playClick();
    const input = this.modalEl.querySelector<HTMLInputElement>('#share-url');
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.onMessage?.(t().lab.copied);
    } catch {
      input?.focus();
      input?.select();
      this.onMessage?.(t().lab.copyFailed, 'toast-warning');
    }
  }

  private saveCurrent() {
    const snap = this.capture?.();
    if (!snap || isEmptySnapshot(snap)) return;
    const input = this.modalEl.querySelector<HTMLInputElement>('#save-name');
    const name = input?.value.trim() || t().lab.defaultName(new Date().toLocaleString());
    this.nameDraft = name.slice(0, 40);
    soundManager.playClick();
    if (saveLab(name, snap)) this.onMessage?.(t().lab.saved(name.slice(0, 40)));
    else this.onMessage?.(t().lab.saveFailed, 'toast-warning');
    this.armedDelete = null;
    this.render();
  }
}
