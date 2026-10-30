import qrcode from 'qrcode-generator';
import { t } from '../i18n';
import { kidText } from '../i18n/furigana';
import { soundManager } from '../engine/AudioEffects';

export interface QrMatrix {
  size: number;
  isDark: (row: number, col: number) => boolean;
}

// QR コードのまわりに空ける白い余白 (モジュール数。規格では 4)
const QUIET_ZONE = 4;

// URL を QR コードにする。読みとりやすい誤り訂正レベル M で入らなければ L にする。
// いちばん大きい QR コード (40 型) にも入らないほど長ければ null
export function makeQrMatrix(text: string): QrMatrix | null {
  for (const level of ['M', 'L'] as const) {
    try {
      const qr = qrcode(0, level);
      qr.addData(text, 'Byte');
      qr.make();
      return { size: qr.getModuleCount(), isDark: (r, c) => qr.isDark(r, c) };
    } catch {
      // 入りきらない
    }
  }
  return null;
}

// QR コードをキャンバスにかく。1モジュールを整数ピクセルにして、ぼやけないようにする
export function drawQr(canvas: HTMLCanvasElement, qr: QrMatrix, maxPx: number) {
  const total = qr.size + QUIET_ZONE * 2;
  const dpr = window.devicePixelRatio || 1;
  const cell = Math.max(1, Math.floor((maxPx * dpr) / total));
  const px = cell * total;
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${px / dpr}px`;
  canvas.style.height = `${px / dpr}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + QUIET_ZONE) * cell, (r + QUIET_ZONE) * cell, cell, cell);
    }
  }
}

// 授業でクラス全員に見せるための全画面表示。画面いっぱいに白地の QR コードを出す (Esc・✕・どこかをタップで閉じる)
export class QrFullscreen {
  private el: HTMLElement;
  private qr: QrMatrix | null = null;
  private onResize = () => this.layout();
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };
  // Esc でブラウザの全画面が終わったときは、この表示も閉じる
  private onFullscreenChange = () => {
    if (!document.fullscreenElement) this.close();
  };

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'qr-fullscreen';
    this.el.className = 'qr-fullscreen hidden';
    this.el.setAttribute('role', 'dialog');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', () => this.close());
  }

  public open(qr: QrMatrix) {
    const tr = t().lab;
    this.qr = qr;
    this.el.innerHTML = kidText(`
      <button class="qr-fullscreen-close" type="button" aria-label="${t().inspector.close}">✕</button>
      <canvas class="qr-fullscreen-canvas" aria-label="QR"></canvas>
      <p class="qr-fullscreen-caption">${tr.qrCaption}</p>
    `);
    this.el.classList.remove('hidden');
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey);
    // ブラウザの全画面にもする (できなければ、ページいっぱいの表示のまま)
    this.el.requestFullscreen?.().then(() => {
      document.addEventListener('fullscreenchange', this.onFullscreenChange);
    }).catch(() => undefined);
    this.layout();
  }

  public close() {
    if (this.el.classList.contains('hidden')) return;
    soundManager.playClick();
    this.el.classList.add('hidden');
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    if (document.fullscreenElement === this.el) document.exitFullscreen?.().catch(() => undefined);
  }

  public isOpen(): boolean {
    return !this.el.classList.contains('hidden');
  }

  private layout() {
    const canvas = this.el.querySelector<HTMLCanvasElement>('.qr-fullscreen-canvas');
    if (!canvas || !this.qr) return;
    // 説明の文字と閉じるボタンの分をのこして、画面にいちばん大きく入る大きさ
    const side = Math.min(window.innerWidth - 32, window.innerHeight - 110);
    drawQr(canvas, this.qr, Math.max(120, side));
  }
}
