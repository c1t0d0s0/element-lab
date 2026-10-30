import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange, GRADES } from '../i18n';
import { kidText } from '../i18n/furigana';
import {
  LabSnapshot, SavedLab, MAX_SAVED_LABS, MAX_TASK_LENGTH, encodeSnapshot, isEmptySnapshot, loadSavedLabs, saveLab, deleteSavedLab, cleanTaskText, labFileText, labFileName, SHARE_HASH_PREFIX
} from '../engine/LabSnapshot';
import type { QrMatrix, QrFullscreen } from './qrCode';

// QR コードの部品 (qrcode-generator) は、保存・共有の画面を初めて開いたときに読みこむ
type QrModule = typeof import('./qrCode');
let qrModule: Promise<QrModule> | null = null;
function loadQrModule(): Promise<QrModule> {
  qrModule ??= import('./qrCode').catch((e) => {
    qrModule = null;
    throw e;
  });
  return qrModule;
}

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
  // QR コードの部品を読みこめなかった (通信が切れていた) ときは、QR コードの欄を出さない (URL のコピーと保存はそのまま使える)
  private qrFailed = false;
  private qrLib: QrModule | null = null;
  private qrFullscreen: QrFullscreen | null = null;
  private armedDelete: number | null = null;
  // 入力中の名前。削除ボタンなどで描き直しても消えないように、入力のたびにおぼえる。
  // 保存したあとも残して、同じ名前で上書きできるようにする (null はまだ入力していない = 日時の名前を出す)
  private nameDraft: string | null = null;
  // 授業用: 共有 URL に入れる課題文と学年 (GRADES の番号。-1 は指定しない)。
  // 画面を閉じても残す (実験室の課題が読みこみで変わったときだけ、そちらに合わせる)
  private taskDraft = '';
  private labTask = '';
  private shareGrade = -1;
  // 課題文を打つたびに URL を作り直すので、最後に始めたものだけを画面に出す
  private shareSeq = 0;
  private shareTimer: ReturnType<typeof setTimeout> | null = null;
  public capture?: () => LabSnapshot;
  public onLoad?: (lab: SavedLab) => void;
  public onImportFile?: (file: File) => void;
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
    this.qrFailed = false;
    this.nameDraft = null;
    const labTask = this.capture?.().t ?? '';
    if (labTask !== this.labTask) {
      this.labTask = labTask;
      this.taskDraft = labTask;
    }
    this.modalEl.classList.remove('hidden');
    this.render();
    await this.updateShare();
  }

  public close() {
    if (this.shareTimer) clearTimeout(this.shareTimer);
    this.shareTimer = null;
    this.modalEl.classList.add('hidden');
  }

  // いまの実験室に、授業用の課題文と学年を足したもの
  private shareSnapshot(): LabSnapshot | null {
    const snap = this.capture?.();
    if (!snap) return null;
    const { t: _labTask, g: _labGrade, ...lab } = snap;
    const shared: LabSnapshot = lab;
    const task = cleanTaskText(this.taskDraft);
    if (task) shared.t = task;
    if (this.shareGrade >= 0) shared.g = this.shareGrade;
    return shared;
  }

  // 共有 URL と QR コードを作り直す (課題文の入力中もフォーカスが外れないように、URL の欄だけを描き直す)
  private async updateShare() {
    const seq = ++this.shareSeq;
    const snap = this.shareSnapshot();
    let url = '';
    let qr: QrMatrix | null = null;
    let qrFailed = false;
    if (snap && (!isEmptySnapshot(snap) || snap.t)) {
      url = `${location.origin}${location.pathname}${location.search}${SHARE_HASH_PREFIX}${await encodeSnapshot(snap)}`;
      try {
        this.qrLib = await loadQrModule();
        qr = this.qrLib.makeQrMatrix(url);
      } catch {
        qrFailed = true;
      }
    }
    if (seq !== this.shareSeq || this.modalEl.classList.contains('hidden')) return;
    this.shareUrl = url;
    this.qr = qr;
    this.qrFailed = qrFailed;
    this.renderShareResult();
  }

  private scheduleShareUpdate() {
    if (this.shareTimer) clearTimeout(this.shareTimer);
    // 打っている間は古い URL をコピーできないようにしておく
    this.shareSeq++;
    this.shareUrl = '';
    this.renderShareResult();
    this.shareTimer = setTimeout(() => {
      this.shareTimer = null;
      void this.updateShare();
    }, 300);
  }

  private shareResultHtml(): string {
    const tr = t().lab;
    return kidText(`
      <div class="save-row">
        <input type="text" id="share-url" readonly value="${escapeHtml(this.shareUrl)}" aria-label="URL">
        <button class="primary-btn save-action" id="btn-copy-share" type="button" ${this.shareUrl ? '' : 'disabled'}>${tr.copyUrl}</button>
      </div>
      ${!this.shareUrl || this.qrFailed ? '' : this.qr ? `
        <div class="share-qr">
          <canvas id="share-qr-canvas" aria-label="QR"></canvas>
          <div class="share-qr-side">
            <p class="fw-subtitle">${tr.qrText}</p>
            <button class="primary-btn save-action" id="btn-qr-fullscreen" type="button">${tr.qrShow}</button>
          </div>
        </div>` : `<p class="save-empty">${tr.qrTooLong}</p>`}
    `);
  }

  private renderShareResult() {
    const box = this.modalEl.querySelector<HTMLElement>('#share-result');
    if (!box) return;
    box.innerHTML = this.shareResultHtml();
    box.querySelector('#btn-copy-share')?.addEventListener('click', () => this.copyShareUrl());
    const qrCanvas = box.querySelector<HTMLCanvasElement>('#share-qr-canvas');
    if (qrCanvas && this.qr && this.qrLib) this.qrLib.drawQr(qrCanvas, this.qr, 168);
    box.querySelector('#btn-qr-fullscreen')?.addEventListener('click', () => {
      if (!this.qr || !this.qrLib) return;
      soundManager.playClick();
      this.qrFullscreen ??= new this.qrLib.QrFullscreen();
      this.qrFullscreen.open(this.qr);
    });
  }

  private updateTaskCount() {
    const count = this.modalEl.querySelector('#share-task-count');
    if (count) count.textContent = t().lab.taskCount(this.taskDraft.length, MAX_TASK_LENGTH);
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
            <div class="share-class">
              <h4>${tr.classHeading}</h4>
              <p class="fw-subtitle">${tr.classText}</p>
              <label class="share-field" for="share-task">${tr.taskLabel}</label>
              <textarea id="share-task" rows="3" maxlength="${MAX_TASK_LENGTH}" aria-describedby="share-task-count"></textarea>
              <small class="share-task-count" id="share-task-count"></small>
              <label class="share-field" for="share-grade">${tr.shareGradeLabel}</label>
              <select id="share-grade">
                <option value="-1">${tr.shareGradeNone}</option>
                ${GRADES.map((g, i) => `<option value="${i}">${t().grade.names[g]}</option>`).join('')}
              </select>
            </div>
            <div id="share-result"></div>
          </section>
          <section class="save-section">
            <h3>${tr.fileHeading}</h3>
            <p class="fw-subtitle">${tr.fileText}</p>
            <div class="save-row save-file-row">
              <button class="primary-btn save-action" id="btn-export-file" type="button" ${this.canShare(snap) ? '' : 'disabled'}>${tr.exportFile}</button>
              <button class="fw-option save-action" id="btn-import-file" type="button">${tr.importFile}</button>
              <input type="file" id="import-file" accept=".json,application/json" hidden>
            </div>
          </section>
          <section class="save-section">
            <h3>${tr.saveHeading}</h3>
            <p class="fw-subtitle">${tr.saveText(MAX_SAVED_LABS)}</p>
            <div class="save-row">
              <input type="text" id="save-name" maxlength="40" placeholder="${tr.namePlaceholder}" value="${escapeHtml(this.nameDraft ?? tr.defaultName(time))}">
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
    this.renderShareResult();
    // 課題文はふりがなを付けずにそのまま入れる (innerHTML に書くと kidText でふりがなが混ざる)
    const taskInput = this.modalEl.querySelector<HTMLTextAreaElement>('#share-task');
    if (taskInput) {
      taskInput.placeholder = tr.taskPlaceholder;
      taskInput.value = this.taskDraft;
      taskInput.addEventListener('input', () => {
        this.taskDraft = taskInput.value;
        this.updateTaskCount();
        this.scheduleShareUpdate();
        const exportBtn = this.modalEl.querySelector<HTMLButtonElement>('#btn-export-file');
        if (exportBtn) exportBtn.disabled = !this.canShare(this.capture?.());
      });
    }
    this.updateTaskCount();
    const gradeSelect = this.modalEl.querySelector<HTMLSelectElement>('#share-grade');
    if (gradeSelect) {
      gradeSelect.value = String(this.shareGrade);
      gradeSelect.addEventListener('change', () => {
        this.shareGrade = Number(gradeSelect.value);
        void this.updateShare();
      });
    }
    this.modalEl.querySelector('#btn-export-file')?.addEventListener('click', () => this.exportFile());
    const fileInput = this.modalEl.querySelector<HTMLInputElement>('#import-file');
    this.modalEl.querySelector('#btn-import-file')?.addEventListener('click', () => {
      soundManager.playClick();
      fileInput?.click();
    });
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) this.onImportFile?.(file);
    });
    this.modalEl.querySelector('#btn-save-lab')?.addEventListener('click', () => this.saveCurrent());
    this.modalEl.querySelector<HTMLInputElement>('#save-name')?.addEventListener('input', (e) => {
      this.nameDraft = (e.target as HTMLInputElement).value;
    });
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

  // 実験室に何かあるか、課題文があれば共有できる
  private canShare(snap: LabSnapshot | undefined): boolean {
    return !!snap && (!isEmptySnapshot(snap) || !!cleanTaskText(this.taskDraft));
  }

  // 共有 URL と同じ中身 (課題文・学年もふくむ) を JSON ファイルにしてダウンロードする。名前は保存の欄のものを使う
  private exportFile() {
    const snap = this.shareSnapshot();
    if (!snap || !this.canShare(snap)) return;
    soundManager.playClick();
    const input = this.modalEl.querySelector<HTMLInputElement>('#save-name');
    const name = input?.value.trim() || t().lab.defaultName(new Date().toLocaleString());
    const url = URL.createObjectURL(new Blob([labFileText(name, snap)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = labFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.onMessage?.(t().lab.fileExported(a.download));
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
    const snap = this.shareSnapshot();
    if (!snap || isEmptySnapshot(snap)) return;
    // 学年は共有 URL だけに付ける (保存した実験は、読みこんだ人の学年のまま開く)
    delete snap.g;
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
