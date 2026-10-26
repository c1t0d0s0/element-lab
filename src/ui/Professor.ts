import { ProfessorEvent, ProfessorLine, ProfessorMood, selectProfessorLine } from '../data/professorLines';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';

export const PROFESSOR_MUTED_STORAGE_KEY = 'element_lab_professor_muted';

// 表示中のセリフを、優先度の低いセリフで上書きしない最短時間 (ms)
const MIN_SHOW_MS = 2500;
// 操作がない時間がこれを超えたら、未発見の反応のヒントを出す (ms)
const IDLE_HINT_AFTER_MS = 25000;
// ヒント同士の最短間隔 (ms)
const IDLE_HINT_INTERVAL_MS = 45000;

// 博士の顔 (はげ頭に白いもじゃもじゃの横髪・丸めがね・大きな鼻・白いひげ・白衣のオリジナルデザイン)
// 口は気分 (data-mood) に合わせて CSS で切り替える
export const PROFESSOR_SVG = `
<svg class="professor-face" viewBox="0 0 64 64" aria-hidden="true">
  <!-- 白衣と蝶ネクタイ -->
  <path d="M10 64 C12 52 20 47 32 47 C44 47 52 52 54 64 Z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
  <path d="M26 47 L32 57 L38 47 Z" fill="#7DD3FC"/>
  <path d="M27 51 L32 53.5 L27 56 Z M37 51 L32 53.5 L37 56 Z" fill="#DC2626"/>
  <circle cx="32" cy="53.5" r="1.3" fill="#B91C1C"/>
  <!-- 耳 -->
  <ellipse cx="15.5" cy="31" rx="2.6" ry="3.6" fill="#F6C9A8"/>
  <ellipse cx="48.5" cy="31" rx="2.6" ry="3.6" fill="#F6C9A8"/>
  <!-- 顔 (はげ頭) -->
  <ellipse cx="32" cy="29" rx="16" ry="18" fill="#FBD9BC"/>
  <ellipse cx="26" cy="15" rx="5" ry="2.6" fill="#FFFFFF" opacity="0.6" transform="rotate(-18 26 15)"/>
  <!-- 横のもじゃもじゃ白髪 -->
  <g fill="#F1F5F9" stroke="#CBD5E1" stroke-width="0.8">
    <circle cx="14" cy="22" r="4.2"/><circle cx="11.5" cy="27" r="4"/><circle cx="13" cy="32.5" r="3.6"/>
    <circle cx="50" cy="22" r="4.2"/><circle cx="52.5" cy="27" r="4"/><circle cx="51" cy="32.5" r="3.6"/>
  </g>
  <!-- もじゃもじゃ眉毛 -->
  <path d="M20.5 22.5 Q25 19 29.5 22" stroke="#E2E8F0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M34.5 22 Q39 19 43.5 22.5" stroke="#E2E8F0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <!-- 丸めがね -->
  <g stroke="#1E293B" stroke-width="1.8" fill="rgba(186, 230, 253, 0.45)">
    <circle cx="25" cy="28" r="5.6"/><circle cx="39" cy="28" r="5.6"/>
  </g>
  <path d="M30.6 28 Q32 26.8 33.4 28" stroke="#1E293B" stroke-width="1.6" fill="none"/>
  <circle cx="25" cy="28.5" r="1.5" fill="#1E293B"/><circle cx="39" cy="28.5" r="1.5" fill="#1E293B"/>
  <circle cx="23" cy="26" r="1.1" fill="#FFFFFF" opacity="0.8"/><circle cx="37" cy="26" r="1.1" fill="#FFFFFF" opacity="0.8"/>
  <!-- 口 (気分ごと) -->
  <g class="pf-mouth pf-mouth-happy"><path d="M27.5 41 Q32 45 36.5 41" stroke="#7F1D1D" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
  <g class="pf-mouth pf-mouth-excited"><ellipse cx="32" cy="42.3" rx="3.2" ry="3.4" fill="#7F1D1D"/><ellipse cx="32" cy="43.8" rx="2" ry="1.3" fill="#F87171"/></g>
  <g class="pf-mouth pf-mouth-warning"><path d="M27 42.5 Q29 40.5 31 42.5 Q33 44.5 35 42.5 Q36 41.5 37 42.5" stroke="#7F1D1D" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>
  <g class="pf-mouth pf-mouth-thinking"><path d="M29 42.5 L35 41.5" stroke="#7F1D1D" stroke-width="1.6" stroke-linecap="round"/></g>
  <!-- 白いひげ -->
  <path d="M21 38.5 Q26 34.5 32 37.5 Q38 34.5 43 38.5 Q38.5 41.5 32 39.8 Q25.5 41.5 21 38.5 Z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.8"/>
  <!-- 大きな丸い鼻 -->
  <ellipse cx="32" cy="34" rx="4.4" ry="3.6" fill="#F4A383"/>
  <ellipse cx="30.6" cy="32.8" rx="1.3" ry="0.9" fill="#FFFFFF" opacity="0.55"/>
  <!-- あせ (注意のとき) -->
  <path class="pf-sweat" d="M47 14 Q49.5 18 47 19.5 Q44.5 18 47 14 Z" fill="#7DD3FC"/>
</svg>`;

const MOOD_BADGES: Record<ProfessorMood, string> = {
  excited: '❗',
  happy: '✨',
  warning: '⚠️',
  thinking: '💡'
};

// 画面左下の博士キャラ。反応やできごとに合わせて吹き出しでしゃべる
export class Professor {
  private rootEl: HTMLElement;
  private bubbleEl: HTMLElement;
  private avatarEl: HTMLButtonElement;
  private muted: boolean = false;
  private current: ProfessorLine | null = null;
  private shownAt: number = 0;
  private hideTimer: number | undefined;
  private lastActivity: number = Date.now();
  private lastIdleHint: number = 0;
  // 吹き出しが邪魔にならないか (モーダル表示中など) を外から判定する
  public canShowIdleHint: () => boolean = () => true;
  public getIdleEvent?: () => ProfessorEvent;
  public onMuteChanged?: (muted: boolean) => void;

  constructor(parent: HTMLElement) {
    this.muted = this.loadMuted();

    this.rootEl = document.createElement('div');
    this.rootEl.id = 'professor';
    this.rootEl.innerHTML = `
      <button class="professor-avatar" type="button">
        ${PROFESSOR_SVG}
        <span class="professor-badge"></span>
      </button>
      <div class="professor-bubble hidden" role="status" aria-live="polite"></div>
    `;
    parent.appendChild(this.rootEl);
    this.avatarEl = this.rootEl.querySelector('.professor-avatar') as HTMLButtonElement;
    this.bubbleEl = this.rootEl.querySelector('.professor-bubble') as HTMLElement;

    this.avatarEl.addEventListener('click', () => this.toggleMute());
    this.bubbleEl.addEventListener('click', () => this.hide());

    this.updateAvatar();
    onLanguageChange(() => this.updateAvatar());

    window.setInterval(() => this.checkIdle(), 1000);
  }

  private loadMuted(): boolean {
    try {
      return localStorage.getItem(PROFESSOR_MUTED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(PROFESSOR_MUTED_STORAGE_KEY, this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    if (this.muted) this.hide();
    soundManager.playClick();
    this.updateAvatar();
    this.onMuteChanged?.(this.muted);
  }

  private updateAvatar() {
    const tr = t().professor;
    this.avatarEl.title = this.muted ? tr.unmute : tr.mute;
    this.avatarEl.setAttribute('aria-label', this.avatarEl.title);
    this.rootEl.classList.toggle('muted', this.muted);
  }

  // ユーザーが操作した (待機ヒントのタイマーをリセット)
  public notifyActivity() {
    this.lastActivity = Date.now();
  }

  public say(event: ProfessorEvent) {
    if (this.muted) return;
    const line = selectProfessorLine(event, getLanguage());
    if (line) this.show(line);
  }

  public greet() {
    if (this.muted) return;
    this.show({ text: t().professor.greeting, mood: 'happy', priority: 1 });
  }

  private show(line: ProfessorLine) {
    const now = Date.now();
    // 表示したばかりのセリフより優先度が低いものは間引く
    if (this.current && now - this.shownAt < MIN_SHOW_MS && line.priority < this.current.priority) {
      return;
    }
    this.current = line;
    this.shownAt = now;

    const badge = this.rootEl.querySelector('.professor-badge') as HTMLElement;
    badge.textContent = MOOD_BADGES[line.mood];
    this.rootEl.dataset.mood = line.mood;
    this.bubbleEl.innerHTML = `<span class="professor-name"></span><span class="professor-text"></span>`;
    (this.bubbleEl.querySelector('.professor-name') as HTMLElement).textContent = t().professor.name;
    (this.bubbleEl.querySelector('.professor-text') as HTMLElement).textContent = line.text;
    this.bubbleEl.classList.remove('hidden');
    // アニメーションをやり直す
    this.rootEl.classList.remove('talking');
    void this.rootEl.offsetWidth;
    this.rootEl.classList.add('talking');
    soundManager.playProfessorBlip();

    window.clearTimeout(this.hideTimer);
    const duration = Math.min(10000, 3500 + line.text.length * 60);
    this.hideTimer = window.setTimeout(() => this.hide(), duration);
  }

  private hide() {
    window.clearTimeout(this.hideTimer);
    this.bubbleEl.classList.add('hidden');
    this.rootEl.classList.remove('talking');
    this.current = null;
  }

  private checkIdle() {
    if (this.muted || this.current || !this.getIdleEvent) return;
    const now = Date.now();
    if (now - this.lastActivity < IDLE_HINT_AFTER_MS) return;
    if (now - this.lastIdleHint < IDLE_HINT_INTERVAL_MS) return;
    if (!this.canShowIdleHint()) return;
    this.lastIdleHint = now;
    this.say(this.getIdleEvent());
  }
}
