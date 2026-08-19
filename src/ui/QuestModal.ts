import { QUESTS_DATA, Quest, GameStats, getQuestTitle, getQuestCategory, getQuestObjective, getQuestHint, getQuestNote } from '../data/quests';
import { soundManager } from '../engine/AudioEffects';
import { t, getLanguage, onLanguageChange } from '../i18n';

export class QuestModal {
  private modalEl: HTMLElement;
  private getStats: () => GameStats;
  private completedQuests: Set<string> = new Set();
  public onQuestComplete?: (quest: Quest) => void;

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
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public close() {
    this.modalEl.classList.add('hidden');
  }

  private render() {
    this.checkAllQuests();
    const tr = t().quests;
    const lang = getLanguage();

    this.modalEl.innerHTML = `
      <div class="modal-card quest-card">
        <div class="modal-header">
          <div class="title-with-badge">
            <h2>${tr.title}</h2>
            <span class="sub-badge">${tr.subtitle(this.completedQuests.size, QUESTS_DATA.length)}</span>
          </div>
          <button class="close-btn" id="close-quest-modal">✕</button>
        </div>

        <div class="quest-list">
          ${QUESTS_DATA.map(quest => {
            const isDone = this.completedQuests.has(quest.id);
            const title = getQuestTitle(quest, lang);
            const cat = getQuestCategory(quest, lang);
            const obj = getQuestObjective(quest, lang);
            const hint = getQuestHint(quest, lang);
            const note = getQuestNote(quest, lang);

            return `
              <div class="quest-item ${isDone ? 'completed' : ''}">
                <div class="quest-header-line">
                  <span class="quest-badge">${cat}</span>
                  <span class="quest-status-icon">${isDone ? tr.statusDone : tr.statusInProgress}</span>
                </div>
                <h3 class="quest-title">${title}</h3>
                <p class="quest-objective"><strong>🎯 ${tr.objective}</strong> ${obj}</p>
                <div class="quest-hint"><strong>💡 ${tr.hint}</strong> ${hint}</div>
                <div class="quest-mext-note">${note}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const closeBtn = this.modalEl.querySelector('#close-quest-modal');
    closeBtn?.addEventListener('click', () => this.close());
  }
}
