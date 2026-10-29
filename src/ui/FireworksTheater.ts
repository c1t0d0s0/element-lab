import { FireworksShow } from '../engine/Fireworks';
import { FireworkShot } from '../data/fireworkProgram';
import { t } from '../i18n';

// 鑑賞モード: チャンバーやツールバーなどを隠し、画面いっぱいの夜空でカスタム花火を打ち上げる。
// 実験室の世界とは別の花火で動かすので、実験の状態 (一時停止・チャンバーの大きさ) には影響しない
export class FireworksTheater {
  private overlayEl: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private show = new FireworksShow();
  private width = 0;
  private height = 0;
  private playing = false;
  private frameId: number | undefined;
  // 終わった時 (最後まで見た・途中でやめた)
  public onEnd?: () => void;

  constructor() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'fireworks-theater';
    this.overlayEl.className = 'hidden';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.overlayEl.appendChild(this.canvas);

    const exitBtn = document.createElement('button');
    exitBtn.className = 'fw-theater-exit';
    exitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stop();
    });
    this.overlayEl.appendChild(exitBtn);
    document.body.appendChild(this.overlayEl);

    // 画面のどこかをダブルクリック (ダブルタップ) しても終われる
    this.overlayEl.addEventListener('dblclick', () => this.stop());
    window.addEventListener('keydown', (e) => {
      if (this.playing && e.key === 'Escape') this.stop();
    });
    window.addEventListener('resize', () => {
      if (this.playing) this.resize();
    });
    // ブラウザの全画面を Esc 等で抜けたら、鑑賞モードも終える
    document.addEventListener('fullscreenchange', () => {
      if (this.playing && !document.fullscreenElement) this.stop();
    });
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public play(shots: FireworkShot[]) {
    if (this.playing) this.show.clear();
    const exitBtn = this.overlayEl.querySelector<HTMLButtonElement>('.fw-theater-exit');
    if (exitBtn) exitBtn.textContent = t().fireworks.theaterExit;
    this.overlayEl.classList.remove('hidden');
    this.playing = true;
    // ブラウザの全画面表示 (使えない環境ではウィンドウいっぱいの表示のまま)
    this.overlayEl.requestFullscreen?.().catch(() => {});
    this.resize();
    this.show.launchShots(shots, this.bounds(), false);
    if (this.frameId === undefined) this.frameId = requestAnimationFrame(() => this.loop());
  }

  public stop() {
    if (!this.playing) return;
    this.playing = false;
    this.show.clear();
    this.overlayEl.classList.add('hidden');
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
    if (document.fullscreenElement === this.overlayEl) document.exitFullscreen?.().catch(() => {});
    this.onEnd?.();
  }

  private bounds() {
    return { minX: 0, minY: 0, maxX: this.width, maxY: this.height };
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop() {
    this.frameId = undefined;
    if (!this.playing) return;
    const bounds = this.bounds();
    this.show.update(bounds);

    const ctx = this.ctx;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, this.width, this.height);
    this.show.draw(ctx, bounds, sym => sym);

    // 全部の花火が消えたら元の画面に戻る
    if (!this.show.isActive()) {
      this.stop();
      return;
    }
    this.frameId = requestAnimationFrame(() => this.loop());
  }
}
