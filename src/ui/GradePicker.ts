import { t, setGrade, Grade, GRADES } from '../i18n';
import { soundManager } from '../engine/AudioEffects';

// 初めて開いたときに学年をえらぶ画面 (あとから上の「学年」でも変えられる)
export class GradePicker {
  private modalEl: HTMLElement;
  public onChoose?: (grade: Grade) => void;

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-overlay hidden';
    this.modalEl.id = 'grade-picker';
    document.body.appendChild(this.modalEl);
  }

  public open() {
    const tr = t().grade;
    this.modalEl.innerHTML = `
      <div class="modal-card grade-picker-card" role="dialog" aria-labelledby="grade-picker-title">
        <div class="modal-header">
          <h2 id="grade-picker-title">${tr.pickerTitle}</h2>
        </div>
        <div class="grade-picker-body">
          <p class="fw-subtitle">${tr.pickerText}</p>
          ${GRADES.map(g => `
            <button class="grade-picker-option" type="button" data-grade="${g}">
              ${tr.names[g]}
              <small>${tr.descriptions[g]}</small>
            </button>`).join('')}
        </div>
      </div>
    `;
    this.modalEl.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const grade = btn.dataset.grade as Grade;
        soundManager.playClick();
        setGrade(grade);
        this.modalEl.classList.add('hidden');
        this.onChoose?.(grade);
      });
    });
    this.modalEl.classList.remove('hidden');
  }
}
