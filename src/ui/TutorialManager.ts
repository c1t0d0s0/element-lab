import { soundManager } from '../engine/AudioEffects';
import { PhysicsWorld } from '../engine/PhysicsWorld';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  titleJa: string;
  instructionJa: string;
  taskGoalJa: string;
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

  private steps: TutorialStep[] = [
    {
      id: 'welcome_spawn_h',
      stepNumber: 1,
      titleJa: '🔰 ステップ 1: 元素を配置してみよう',
      instructionJa: '元素ラボへようこそ！ここでは118種類の全元素や様々な化合物を自由に実験できます。まずは基本となる **水素 (H)** を実験室に置いてみましょう！',
      taskGoalJa: '下部パレットで【H】を選んで、画面の好きな場所をタップしてください。',
      highlightSelector: '.element-chip[data-id="H"]',
      checkCondition: (ctx) => {
        return ctx.world.particles.some(p => p.kind === 'element' && p.symbolOrId === 'H');
      }
    },
    {
      id: 'synthesize_water',
      stepNumber: 2,
      titleJa: '⚗️ ステップ 2: 化学反応を起こしてみよう (水の合成)',
      instructionJa: '水素が配置できました！次は **酸素 (O)** を選んで、水素のすぐ近くに置いてみましょう。水素2個と酸素1個が出会うと **水分子 (H₂O)** が合成されます！',
      taskGoalJa: '下部パレットで【O】を選び、水素粒子の近くをタップして【H₂O】を作ろう！',
      highlightSelector: '.element-chip[data-id="O"]',
      checkCondition: (ctx) => {
        return ctx.world.particles.some(p => p.symbolOrId === 'H2O');
      }
    },
    {
      id: 'heat_and_steam',
      stepNumber: 3,
      titleJa: '🔥 ステップ 3: バーナーで加熱して沸騰させよう',
      instructionJa: '水分子が合成されました！次はツールバーの **【🔥 加熱】** を選択して、水分子をバーナーで温めてみましょう。100℃を超えると気体（水蒸気 ♨）に状態変化します！',
      taskGoalJa: 'ツールバーの【🔥 加熱】を選び、水分子をタップ/ドラッグして加熱しよう！',
      highlightSelector: '.tool-btn[data-tool="heat"]',
      checkCondition: (ctx) => {
        return ctx.world.particles.some(p => p.symbolOrId === 'H2O' && p.state === 'gas');
      }
    },
    {
      id: 'spawn_flask',
      stepNumber: 4,
      titleJa: '🏺 ステップ 4: フラスコを置いて液体を溜めよう',
      instructionJa: '気体になってフワフワと上昇しましたね！次は **【🏺 フラスコ】** ツールを使って、耐熱ガラスの実験器具を設置してみましょう。中に液体や試薬を安全に溜められます！',
      taskGoalJa: 'ツールバーの【🏺 フラスコ】を選び、キャンバスをタップしてフラスコを設置しよう！',
      highlightSelector: '.tool-btn[data-tool="flask"]',
      checkCondition: (ctx) => {
        return ctx.world.containers.length > 0;
      }
    },
    {
      id: 'inspect_details',
      stepNumber: 5,
      titleJa: '🔍 ステップ 5: 粒子やフラスコを観察しよう',
      instructionJa: 'フラスコが設置できました！ツールバーの **【🔍 観察】** を選んで粒子やフラスコに触れると、右上のインスペクターに温度や質量、文科省の重要知識が表示されます！',
      taskGoalJa: 'ツールバーの【🔍 観察】を選び、粒子やフラスコをタップして観察しよう！',
      highlightSelector: '.tool-btn[data-tool="inspect"]',
      checkCondition: (ctx) => {
        return ctx.lastAction === 'inspect';
      }
    },
    {
      id: 'tutorial_complete',
      stepNumber: 6,
      titleJa: '🎉 チュートリアル完了！',
      instructionJa: '基本操作のマスターおめでとうございます！画面上部の **【🎯 クエスト】** で課題に挑戦したり、**【📖 化学図鑑】** や **【⚛️ 元素周期表】** を開いて新しい反応を自由に探求しましょう！',
      taskGoalJa: '「実験室をはじめる！」ボタンを押して自由研究をスタートしましょう！',
      checkCondition: () => false
    }
  ];

  constructor(world: PhysicsWorld) {
    this.world = world;
    this.createDom();
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

    this.containerEl.className = 'tutorial-overlay visible';
    this.containerEl.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <div class="tutorial-step-tag">ステップ ${this.currentStepIndex + 1} / ${totalSteps}</div>
          <div class="tutorial-title">${step.titleJa}</div>
          <button class="tutorial-close-btn" id="btn-tutorial-close" title="チュートリアルを終了">✕</button>
        </div>

        <div class="tutorial-progress-bar">
          <div class="tutorial-progress-fill" style="width: ${progressPercent}%"></div>
        </div>

        <div class="tutorial-body">
          <div class="tutorial-desc">${step.instructionJa}</div>
          <div class="tutorial-task-badge">
            <span class="task-icon">🎯</span>
            <span class="task-text"><strong>やること:</strong> ${step.taskGoalJa}</span>
          </div>
        </div>

        <div class="tutorial-footer">
          ${this.currentStepIndex > 0 && !isLast ? `
            <button class="tutorial-btn secondary" id="btn-tutorial-prev">◀ 前へ</button>
          ` : ''}
          <div class="footer-spacer"></div>
          ${isLast ? `
            <button class="tutorial-btn primary pulse" id="btn-tutorial-finish">✨ 実験室をはじめる！</button>
          ` : `
            <button class="tutorial-btn secondary" id="btn-tutorial-skip">スキップ</button>
            <button class="tutorial-btn primary" id="btn-tutorial-next">次へ ▶</button>
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