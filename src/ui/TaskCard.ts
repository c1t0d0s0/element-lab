import { t, onLanguageChange } from '../i18n';
import { kidText } from '../i18n/furigana';
import { soundManager } from '../engine/AudioEffects';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

// 📝 課題: 授業用の共有リンクに先生が書いた課題文を、実験室の右下に出しておく (小さくたたんでおける)
export class TaskCard {
  private rootEl: HTMLElement;
  private task = '';
  private collapsed = false;

  constructor(parent: HTMLElement) {
    this.rootEl = document.createElement('aside');
    this.rootEl.id = 'task-card';
    this.rootEl.hidden = true;
    parent.appendChild(this.rootEl);
    onLanguageChange(() => this.render());
  }

  public get text(): string {
    return this.task;
  }

  // 空文字でかくす。新しい課題は広げた状態で出す
  public setTask(text: string) {
    this.task = text;
    this.collapsed = false;
    this.render();
  }

  private render() {
    this.rootEl.hidden = !this.task;
    this.rootEl.classList.toggle('collapsed', this.collapsed);
    if (!this.task) {
      this.rootEl.innerHTML = '';
      return;
    }
    const tr = t().lab;
    this.rootEl.innerHTML = kidText(`
      <button class="task-card-toggle" type="button" aria-expanded="${!this.collapsed}" title="${this.collapsed ? tr.taskShow : tr.taskHide}">
        <span class="task-card-title">${tr.taskTitle}</span>
        <span class="task-card-chevron" aria-hidden="true">${this.collapsed ? '▴' : '▾'}</span>
      </button>
      ${this.collapsed ? '' : `<p class="task-card-text">${escapeHtml(this.task)}</p>`}
    `);
    this.rootEl.querySelector('.task-card-toggle')?.addEventListener('click', () => {
      soundManager.playClick();
      this.collapsed = !this.collapsed;
      this.render();
      this.rootEl.querySelector<HTMLElement>('.task-card-toggle')?.focus();
    });
  }
}
