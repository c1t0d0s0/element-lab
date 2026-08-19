import { soundManager } from '../engine/AudioEffects';
import { PhysicsWorld } from '../engine/PhysicsWorld';
import { getLanguage, onLanguageChange } from '../i18n';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  titleJa: string;
  titleEn: string;
  instructionJa: string;
  instructionEn: string;
  taskGoalJa: string;
  taskGoalEn: string;
  highlightSelector?: string;
  checkCondition: (context: TutorialContext) => boolean;
}

export interface TutorialContext {
  lastAction?: string;
  lastActionPayload?: any;
  world: PhysicsWorld;
}

export class TutorialManager {
  public isActive: boolean = false;
  public currentStepIndex: number = 0;
  private containerEl: HTMLElement | null = null;
  private world: PhysicsWorld;
  private manualNavigatedAt: number = 0;

  private steps: TutorialStep[] = [
    {
      id: 'welcome_spawn_h',
      stepNumber: 1,
      titleJa: '🔰 ステップ 1: 元素を配置してみよう',
      titleEn: '🔰 Step 1: Spawn an Element',
      instructionJa: '元素ラボへようこそ！ここでは118種類の全元素や様々な化合物を自由に実験できます。まずは基本となる **水素 (H)** を実験室に置いてみましょう！',
      instructionEn: 'Welcome to Element Lab! Here you can experiment with all 118 elements and synthesize real compounds. First, let\'s place **Hydrogen (H)** inside the chamber!',
      taskGoalJa: '下部パレットで【H】を選んで、画面の好きな場所をタップしてください。',
      taskGoalEn: 'Select 【H】 from the bottom palette and tap anywhere inside the chamber.',
      highlightSelector: '.element-chip[data-id="H"]',
      checkCondition: (ctx) => {
        return ctx.lastAction === 'spawn' && (ctx.lastActionPayload?.id === 'H' || ctx.world.particles.some(p => p.symbolOrId === 'H'));
      }
    },
    {
      id: 'synthesize_water',
      stepNumber: 2,
      titleJa: '⚗️ ステップ 2: 化学反応を起こしてみよう (水の合成)',
      titleEn: '⚗️ Step 2: Trigger Chemical Reactions (Water Synthesis)',
      instructionJa: '水素が配置できました！次は **酸素 (O)** を選んで、水素のすぐ近くに置いてみましょう。水素2個と酸素1個が出会うと **水分子 (H₂O)** が合成されます！',
      instructionEn: 'Hydrogen placed! Now select **Oxygen (O)** and place it right next to Hydrogen. When 2 Hydrogen atoms meet 1 Oxygen atom, a **Water molecule (H₂O)** is synthesized!',
      taskGoalJa: '下部パレットで【O】を選び、水素粒子の近くをタップして【H₂O】を作ろう！',
      taskGoalEn: 'Select 【O】 from the bottom palette and place it near Hydrogen particles to make 【H₂O】!',
      highlightSelector: '.element-chip[data-id="O"]',
      checkCondition: (ctx) => {
        return (ctx.lastAction === 'reaction' || ctx.lastAction === 'spawn') && ctx.world.particles.some(p => p.symbolOrId === 'H2O');
      }
    },
    {
      id: 'heat_and_steam',
      stepNumber: 3,
      titleJa: '🔥 ステップ 3: バーナーで加熱して沸騰させよう',
      titleEn: '🔥 Step 3: Heat with Burner & Boil into Steam',
      instructionJa: '水分子が合成されました！次はツールバーの **【🔥 加熱】** を選択して、水分子をバーナーで温めてみましょう。100℃を超えると気体（水蒸気 ♨）に状態変化します！',
      instructionEn: 'Water synthesized! Next, select **【🔥 Heat】** from the toolbar and warm up the water. When temperature exceeds 100°C, it phase-changes into gas (Steam ♨) and rises!',
      taskGoalJa: 'ツールバーの【🔥 加熱】を選び、水分子をタップ/ドラッグして加熱しよう！',
      taskGoalEn: 'Select 【🔥 Heat】 and tap/drag over the water molecule to heat it up!',
      highlightSelector: '.tool-btn[data-tool="heat"]',
      checkCondition: (ctx) => {
        return ctx.world.particles.some(p => p.symbolOrId === 'H2O' && p.state === 'gas');
      }
    },
    {
      id: 'spawn_flask',
      stepNumber: 4,
      titleJa: '🏺 ステップ 4: フラスコを置いて液体を溜めよう',
      titleEn: '🏺 Step 4: Place Glassware to Contain Liquids',
      instructionJa: '気体になってフワフワと上昇しましたね！次は **【🏺 フラスコ】** ツールを使って、耐熱ガラスの実験器具を設置してみましょう。中に液体や試薬を安全に溜められます！',
      instructionEn: 'Steam floats up! Now select the **【🏺 Glassware】** tool to place laboratory borosilicate glassware. You can safely hold liquids and chemical reagents inside!',
      taskGoalJa: 'ツールバーの【🏺 フラスコ】を選び、キャンバスをタップしてフラスコを設置しよう！',
      taskGoalEn: 'Select 【🏺 Glassware】 and tap the canvas to place a flask!',
      highlightSelector: '.tool-btn[data-tool="flask"]',
      checkCondition: (ctx) => {
        return ctx.lastAction === 'flask';
      }
    },
    {
      id: 'inspect_details',
      stepNumber: 5,
      titleJa: '🔍 ステップ 5: 粒子やフラスコを観察しよう',
      titleEn: '🔍 Step 5: Inspect Particles & Apparatus',
      instructionJa: 'フラスコが設置できました！ツールバーの **【🔍 観察】** を選んで粒子やフラスコに触れると、右上のインスペクターに温度や質量、文科省の重要知識が表示されます！',
      instructionEn: 'Flask placed! Select **【🔍 Inspect】** and hover/tap on particles or flasks to inspect real-time temperature, mass, and chemistry curriculum facts in the top-right inspector!',
      taskGoalJa: 'ツールバーの【🔍 観察】を選び、粒子やフラスコをタップして観察しよう！',
      taskGoalEn: 'Select 【🔍 Inspect】 and tap on particles or flasks to observe details!',
      highlightSelector: '.tool-btn[data-tool="inspect"]',
      checkCondition: (ctx) => {
        return ctx.lastAction === 'inspect';
      }
    },
    {
      id: 'tutorial_complete',
      stepNumber: 6,
      titleJa: '🎉 チュートリアル完了！',
      titleEn: '🎉 Tutorial Complete!',
      instructionJa: '基本操作のマスターおめでとうございます！画面上部の **【🎯 クエスト】** で課題に挑戦したり、**【📖 図鑑】** や **【⚛️ 周期表】** を開いて新しい反応を自由に探求しましょう！',
      instructionEn: 'Congratulations on mastering lab operations! Explore **【🎯 Quests】** at the top for fun challenges, and open **【📖 Encyclopedia】** or **【⚛️ Periodic Table】** to discover reactions freely!',
      taskGoalJa: '「実験室をはじめる！」ボタンを押して自由研究をスタートしましょう！',
      taskGoalEn: 'Click "Start Experimenting!" to begin your scientific journey!',
      checkCondition: () => false
    }
  ];

  constructor(world: PhysicsWorld) {
    this.world = world;
    this.createDom();

    onLanguageChange(() => {
      if (this.isActive) {
        this.render();
      }
    });
  }

  private createDom() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('tutorial-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial-overlay';
      el.className = 'tutorial-overlay hidden';
      document.body.appendChild(el);
    }
    this.containerEl = el;
  }

  public startTutorial() {
    this.isActive = true;
    this.currentStepIndex = 0;
    this.manualNavigatedAt = performance.now();
    soundManager.playFanfare();
    this.render();
  }

  public stopTutorial() {
    this.isActive = false;
    this.clearHighlights();
    if (this.containerEl) {
      this.containerEl.className = 'tutorial-overlay hidden';
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('element_lab_tutorial_done', 'true');
      }
    } catch {
      // ignore
    }
  }

  public checkProgress(actionType?: string, actionPayload?: any) {
    if (!this.isActive) return;

    // 手動で前へ戻った直後（1.2秒間）は自動判定を保留
    if (!actionType && performance.now() - this.manualNavigatedAt < 1200) {
      return;
    }

    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    if (currentStep.id === 'tutorial_complete') return;

    const context: TutorialContext = {
      lastAction: actionType,
      lastActionPayload: actionPayload,
      world: this.world
    };

    if (currentStep.checkCondition(context)) {
      this.nextStep();
    }
  }

  public nextStep() {
    soundManager.playFanfare();
    this.currentStepIndex++;
    this.manualNavigatedAt = performance.now();
    if (this.currentStepIndex >= this.steps.length) {
      this.stopTutorial();
      return;
    }
    this.render();
  }

  public prevStep() {
    if (this.currentStepIndex > 0) {
      soundManager.playClick();
      this.currentStepIndex--;
      this.manualNavigatedAt = performance.now();
      this.render();
    }
  }

  private clearHighlights() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }

  public render() {
    if (typeof document === 'undefined') return;
    if (!this.containerEl || !this.isActive) return;

    const step = this.steps[this.currentStepIndex];
    if (!step) return;

    this.clearHighlights();
    if (step.highlightSelector) {
      const target = document.querySelector(step.highlightSelector);
      if (target) {
        target.classList.add('tutorial-highlight');
      }
    }

    const totalSteps = this.steps.length;
    const isLast = this.currentStepIndex === totalSteps - 1;
    const progressPercent = Math.round(((this.currentStepIndex + 1) / totalSteps) * 100);
    const lang = getLanguage();
    const title = lang === 'en' ? step.titleEn : step.titleJa;
    const instruction = lang === 'en' ? step.instructionEn : step.instructionJa;
    const taskGoal = lang === 'en' ? step.taskGoalEn : step.taskGoalJa;

    const stepTag = lang === 'en' ? `Step ${this.currentStepIndex + 1} / ${totalSteps}` : `ステップ ${this.currentStepIndex + 1} / ${totalSteps}`;
    const taskLabel = lang === 'en' ? 'Task:' : 'やること:';
    const prevBtnText = lang === 'en' ? '◀ Prev' : '◀ 前へ';
    const nextBtnText = lang === 'en' ? 'Next ▶' : '次へ ▶';
    const skipBtnText = lang === 'en' ? 'Skip' : 'スキップ';
    const finishBtnText = lang === 'en' ? '✨ Start Experimenting!' : '✨ 実験室をはじめる！';

    this.containerEl.className = 'tutorial-overlay visible';
    this.containerEl.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <div class="tutorial-step-tag">${stepTag}</div>
          <div class="tutorial-title">${title}</div>
          <button class="tutorial-close-btn" id="btn-tutorial-close" title="Close">✕</button>
        </div>

        <div class="tutorial-progress-bar">
          <div class="tutorial-progress-fill" style="width: ${progressPercent}%"></div>
        </div>

        <div class="tutorial-body">
          <div class="tutorial-desc">${instruction}</div>
          <div class="tutorial-task-badge">
            <span class="task-icon">🎯</span>
            <span class="task-text"><strong>${taskLabel}</strong> ${taskGoal}</span>
          </div>
        </div>

        <div class="tutorial-footer">
          ${this.currentStepIndex > 0 && !isLast ? `
            <button class="tutorial-btn secondary" id="btn-tutorial-prev">${prevBtnText}</button>
          ` : ''}
          <div class="footer-spacer"></div>
          ${isLast ? `
            <button class="tutorial-btn primary pulse" id="btn-tutorial-finish">${finishBtnText}</button>
          ` : `
            <button class="tutorial-btn secondary" id="btn-tutorial-skip">${skipBtnText}</button>
            <button class="tutorial-btn primary" id="btn-tutorial-next">${nextBtnText}</button>
          `}
        </div>
      </div>
    `;

    // イベントバインド
    document.getElementById('btn-tutorial-close')?.addEventListener('click', () => {
      soundManager.playClick();
      this.stopTutorial();
    });

    document.getElementById('btn-tutorial-skip')?.addEventListener('click', () => {
      soundManager.playClick();
      this.stopTutorial();
    });

    document.getElementById('btn-tutorial-prev')?.addEventListener('click', () => {
      this.prevStep();
    });

    document.getElementById('btn-tutorial-next')?.addEventListener('click', () => {
      this.nextStep();
    });

    document.getElementById('btn-tutorial-finish')?.addEventListener('click', () => {
      soundManager.playFanfare();
      this.stopTutorial();
    });
  }
}