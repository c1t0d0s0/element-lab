import { QUESTS_DATA, Quest, GameStats, getQuestTitle, getQuestCategory, getQuestObjective, getQuestHint, getQuestNote } from '../data/quests';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange, getGrade, setGrade, Grade, GRADES } from '../i18n';
import { kidText } from '../i18n/furigana';

export class QuestModal {
  private modalEl: HTMLElement;
  private getStats: () => GameStats;
  private completedQuests: Set<string> = new Set();
  public onQuestComplete?: (quest: Quest) => void;
  // ミッションの「◯◯モードにする」ボタンで学年を変えた
  public onGradeChanged?: (grade: Grade) => void;
  // 表示している学年のタブ (開くたびに、いまの学年モードにもどす)
  private gradeTab: Grade | 'all' = 'junior';

  constructor(getStats: () => GameStats) {
    this.getStats = getStats;
    this.loadSavedProgress();
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'quest-modal';
    document.body.appendChild(this.modalEl);

    onLanguageChange(() => {
      if (!this.modalEl.classList.contains('hidden')) {
        this.render();
      }
    });
  }

  private loadSavedProgress() {
    try {
      const saved = localStorage.getItem('element_lab_completed_quests');
      if (saved) {
        const arr = JSON.parse(saved);
        arr.forEach((id: string) => this.completedQuests.add(id));
      }
    } catch {
      // ignore
    }
  }

  private saveProgress() {
    try {
      localStorage.setItem('element_lab_completed_quests', JSON.stringify(Array.from(this.completedQuests)));
    } catch {
      // ignore
    }
  }

  public checkAllQuests() {
    const stats = this.getStats();
    for (const quest of QUESTS_DATA) {
      if (!this.completedQuests.has(quest.id)) {
        if (quest.checkCompletion(stats)) {
          this.completedQuests.add(quest.id);
          this.saveProgress();
          soundManager.playSuccessChime();
          this.onQuestComplete?.(quest);
        }
      }
    }
  }

  public getCompletedCount(): number {
    return this.completedQuests.size;
  }

  public getTotalCount(): number {
    return QUESTS_DATA.length;
  }

  public open() {
    this.gradeTab = getGrade();
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private render() {
    this.checkAllQuests();
    const tr = t().quests;
    const gtr = t().grade;
    const lang = getLanguage();
    const shown = QUESTS_DATA.filter(q => this.gradeTab === 'all' || q.grade === this.gradeTab);
    const tabs = [...GRADES, 'all' as const].map(g => {
      const list = QUESTS_DATA.filter(q => g === 'all' || q.grade === g);
      const done = list.filter(q => this.completedQuests.has(q.id)).length;
      const label = g === 'all' ? gtr.allGrades : gtr.names[g];
      return `<button class="fw-option quest-grade-tab ${g === this.gradeTab ? 'selected' : ''}" data-grade-tab="${g}" type="button">${label} <small>${done}/${list.length}</small></button>`;
    }).join('');

    this.modalEl.innerHTML = kidText(`
      <div class="modal-card quest-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.subtitle(this.completedQuests.size, QUESTS_DATA.length)}</span>
          </div>
          <button class="close-btn" id="close-quest-modal">✕</button>
        </div>

        <div class="fw-option-row quest-grade-tabs">${tabs}</div>

        <div class="quest-list">
          ${shown.map(quest => {
            const isDone = this.completedQuests.has(quest.id);
            const title = getQuestTitle(quest, lang);
            const cat = getQuestCategory(quest, lang);
            const obj = getQuestObjective(quest, lang);
            const hint = getQuestHint(quest, lang);
            const note = getQuestNote(quest, lang);
            // 道具がいまの学年モードにないミッションは、どのモードならできるかを出す
            const needs = !isDone && quest.requiresGrade && quest.requiresGrade !== getGrade() ? quest.requiresGrade : null;

            return `
              <div class="quest-item ${isDone ? 'completed' : ''}">
                <div class="quest-header-line">
                  <span class="quest-badge">${cat}</span>
                  <span class="quest-status-icon">${isDone ? tr.statusDone : tr.statusInProgress}</span>
                </div>
                <h3 class="quest-title">${title}</h3>
                <p class="quest-objective"><strong>🎯 ${tr.objective}</strong> ${obj}</p>
                <div class="quest-hint"><strong>💡 ${tr.hint}</strong> ${hint}</div>
                ${needs ? `
                <div class="quest-needs-grade">
                  <span>🔒 ${tr.needsGrade(gtr.names[needs])}</span>
                  <button class="fw-option" data-switch-grade="${needs}" type="button">${tr.switchGrade(gtr.names[needs])}</button>
                </div>` : ''}
                <div class="quest-mext-note">${note}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);

    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-grade-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        soundManager.playClick();
        this.gradeTab = btn.dataset.gradeTab as Grade | 'all';
        this.render();
      });
    });
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-switch-grade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grade = btn.dataset.switchGrade as Grade;
        soundManager.playClick();
        // 学年を変えると onLanguageChange で描き直される (見ているタブはそのまま)
        setGrade(grade);
        this.onGradeChanged?.(grade);
      });
    });
    const closeBtn = this.modalEl.querySelector('#close-quest-modal');
    closeBtn?.addEventListener('click', () => this.close());
  }
}
