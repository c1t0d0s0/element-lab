import { PhysicsWorld, GlassContainer } from './engine/PhysicsWorld';
import { ReactionEngine } from './engine/ReactionEngine';
import { Particle } from './engine/Particle';
import { Toolbar } from './ui/Toolbar';
import { Inspector } from './ui/Inspector';
import { PeriodicTableModal } from './ui/PeriodicTableModal';
import { EncyclopediaModal } from './ui/EncyclopediaModal';
import { QuestModal } from './ui/QuestModal';
import { TutorialManager } from './ui/TutorialManager';
import { soundManager } from './engine/AudioEffects';
import { Quest } from './data/quests';

class ElementGameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: PhysicsWorld;
  private reactionEngine: ReactionEngine;
  private toolbar: Toolbar;
  private inspector: Inspector;
  private periodicModal: PeriodicTableModal;
  private encyclopediaModal: EncyclopediaModal;
  private questModal: QuestModal;
  private tutorialManager: TutorialManager;

  private isPointerDown: boolean = false;
  private pointerX: number = 0;
  private pointerY: number = 0;
  private lastSpawnTime: number = 0;
  private hoveredTarget: Particle | GlassContainer | null = null;
  private nextParticleId: number = 1;

  constructor() {
    this.canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.world = new PhysicsWorld(window.innerWidth, window.innerHeight);
    this.reactionEngine = new ReactionEngine(this.world);
    this.inspector = new Inspector('inspector-container');
    this.toolbar = new Toolbar();
    this.tutorialManager = new TutorialManager(this.world);

    this.periodicModal = new PeriodicTableModal((symbol) => {
      this.toolbar.setSelectedElement(symbol);
      this.showToast(`元素 [${symbol}] を選択しました！キャンバスをタップして配置できます。`);
    });

    this.encyclopediaModal = new EncyclopediaModal(() => this.reactionEngine.stats);
    this.questModal = new QuestModal(() => this.reactionEngine.stats);

    this.setupCallbacks();
    this.setupEventListeners();
    this.resizeCanvas();
    this.initStarterScene();

    // 初回訪問時は自動でチュートリアルを開始
    try {
      if (!localStorage.getItem('element_lab_tutorial_done')) {
        setTimeout(() => {
          this.tutorialManager.startTutorial();
        }, 600);
      }
    } catch {
      // ignore
    }

    // ゲームループ開始
    requestAnimationFrame(() => this.loop());
  }

  private setupCallbacks() {
    // ツールバーコールバック
    this.toolbar.onClear = () => {
      this.world.clear();
      this.hoveredTarget = null;
      this.inspector.renderEmpty();
      this.showToast('実験室を全消去しました');
    };

    this.toolbar.onOpenTutorial = () => this.tutorialManager.startTutorial();
    this.toolbar.onOpenPeriodicTable = () => this.periodicModal.open();
    this.toolbar.onOpenEncyclopedia = () => this.encyclopediaModal.open();
    this.toolbar.onOpenQuests = () => this.questModal.open();

    // 反応トリガー時
    this.reactionEngine.onReactionTriggered = () => {
      this.questModal.checkAllQuests();
      this.tutorialManager.checkProgress('reaction');
    };

    // 新発見時
    this.reactionEngine.onNewDiscovery = (id, nameJa, isCompound) => {
      if (isCompound) {
        soundManager.playSuccessChime();
        this.showToast(`✨ 新しい化合物【${nameJa} (${id})】を発見！図鑑に登録されました！`, 'toast-discovery');
      }
    };

    // クエストクリア時
    this.questModal.onQuestComplete = (quest: Quest) => {
      this.showToast(`🎉 クエスト達成！『${quest.titleJa}』`, 'toast-discovery');
    };
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // ポインターイベント (マウス & タッチ共通)
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isPointerDown = true;
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
      this.pointerY = e.clientY - rect.top;
      this.handlePointerAction(true);
    });

    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerX = e.clientX - rect.left;
      this.pointerY = e.clientY - rect.top;

      this.findHoveredTarget();

      if (this.isPointerDown) {
        this.handlePointerAction(false);
      }
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    window.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
    });
  }

  private findHoveredTarget() {
    let closestParticle: Particle | null = null;
    let minDist = 25;

    for (const p of this.world.particles) {
      const dist = Math.hypot(p.x - this.pointerX, p.y - this.pointerY);
      if (dist < p.radius + 10 && dist < minDist) {
        minDist = dist;
        closestParticle = p;
      }
    }

    let closestTarget: Particle | GlassContainer | null = closestParticle;
    if (!closestTarget) {
      closestTarget = this.world.getHoveredContainer(this.pointerX, this.pointerY);
    }

    if (closestTarget !== this.hoveredTarget) {
      this.hoveredTarget = closestTarget;
      this.inspector.inspect(closestTarget);
      if (closestTarget) {
        this.tutorialManager.checkProgress('inspect', closestTarget);
      }
    }
  }

  private handlePointerAction(isInitialTap: boolean) {
    const now = performance.now();
    const tool = this.toolbar.activeTool;

    if (tool === 'spawn') {
      // 粒子配置 (連続生成の間隔制御)
      if (isInitialTap || (now - this.lastSpawnTime > 80)) {
        this.lastSpawnTime = now;
        this.spawnSelectedParticle(this.pointerX, this.pointerY);
      }
    } else if (tool === 'flask') {
      // フラスコ・実験器具の設置 (1タップで1個設置)
      if (isInitialTap) {
        this.world.spawnFlask(this.pointerX, this.pointerY, this.toolbar.selectedFlaskType);
        soundManager.playGlass();
        const typeNames = {
          erlenmeyer: '三角フラスコ',
          beaker: 'ビーカー',
          testtube: '丸底試験管'
        };
        this.showToast(`🏺 ${typeNames[this.toolbar.selectedFlaskType]} を設置しました！`);
        this.tutorialManager.checkProgress('flask');
      }
    } else if (tool === 'heat') {
      // バーナー加熱
      this.world.applyHeat(this.pointerX, this.pointerY, 40, 25);
      if (Math.random() < 0.3) {
        soundManager.playSpark();
      }
      this.tutorialManager.checkProgress('heat');
    } else if (tool === 'cool') {
      // 冷却スプレー
      this.world.applyCool(this.pointerX, this.pointerY, 40, 25);
      if (Math.random() < 0.2) {
        soundManager.playSteam();
      }
      this.tutorialManager.checkProgress('cool');
    } else if (tool === 'spark') {
      // 点火スパーク
      if (isInitialTap || Math.random() < 0.3) {
        this.world.applySpark(this.pointerX, this.pointerY, 35);
        this.world.addEffect('sparkles', this.pointerX, this.pointerY, '#38BDF8', 25);
        soundManager.playSpark();
        this.tutorialManager.checkProgress('spark');
      }
    } else if (tool === 'erase') {
      // 消しゴム
      this.world.eraseAt(this.pointerX, this.pointerY, 25);
    } else if (tool === 'inspect') {
      this.findHoveredTarget();
    }
  }

  private spawnSelectedParticle(x: number, y: number) {
    const sel = this.toolbar.selectedItem;
    const jitterX = (Math.random() - 0.5) * 8;
    const jitterY = (Math.random() - 0.5) * 8;

    const p = new Particle(
      `p_${this.nextParticleId++}`,
      sel.kind,
      sel.id,
      x + jitterX,
      y + jitterY,
      25
    );

    // わずかな初速
    p.vx = (Math.random() - 0.5) * 0.8;
    p.vy = (Math.random() - 0.5) * 0.8;

    this.world.addParticle(p);
    this.reactionEngine.registerSpawn(sel.kind, sel.id);
    soundManager.playPop(p.kind === 'element' && sel.id === 'He' ? 800 : 440);

    this.tutorialManager.checkProgress('spawn', sel);
  }

  private resizeCanvas() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.world.setSize(rect.width, rect.height);
  }

  private initStarterScene() {
    // 初期シーン: 水素原子(H)と酸素原子(O)、ヘリウム(He)、鉄(Fe)を少し配置してすぐに触れるように
    const centerX = this.world.width * 0.4;
    const centerY = this.world.height * 0.5;

    // 水素原子2個
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'element', 'H', centerX - 25, centerY, 25));
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'element', 'H', centerX + 25, centerY, 25));
    // 酸素原子1個
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'element', 'O', centerX, centerY - 25, 25));

    // 軽いヘリウム
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'element', 'He', centerX + 100, centerY + 50, 25));
    
    // 鉄と水滴
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'element', 'Fe', centerX - 120, centerY + 80, 25));
    this.world.addParticle(new Particle(`p_${this.nextParticleId++}`, 'compound', 'H2O', centerX - 120, centerY + 40, 25));

    this.reactionEngine.registerSpawn('element', 'H');
    this.reactionEngine.registerSpawn('element', 'O');
    this.reactionEngine.registerSpawn('element', 'He');
    this.reactionEngine.registerSpawn('element', 'Fe');
    this.reactionEngine.registerSpawn('compound', 'H2O');
  }

  private showToast(message: string, customClass: string = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${customClass}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  }

  private loop() {
    if (!this.toolbar.isPaused) {
      this.reactionEngine.checkReactions();
      this.world.update();
      this.tutorialManager.checkProgress();
    }

    // 描画
    this.ctx.clearRect(0, 0, this.world.width, this.world.height);
    this.world.draw(this.ctx);

    // アクティブツールのカーソルインジケーター
    this.drawToolCursor();

    requestAnimationFrame(() => this.loop());
  }

  private drawToolCursor() {
    const tool = this.toolbar.activeTool;
    const ctx = this.ctx;

    ctx.save();
    if (tool === 'heat') {
      // バーナー範囲サークル
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.pointerX, this.pointerY, 40, 0, Math.PI * 2);
      ctx.stroke();

      if (this.isPointerDown) {
        const grad = ctx.createRadialGradient(this.pointerX, this.pointerY, 0, this.pointerX, this.pointerY, 40);
        grad.addColorStop(0, 'rgba(249, 115, 22, 0.4)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.pointerX, this.pointerY, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tool === 'cool') {
      // 冷却スプレー範囲サークル
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.pointerX, this.pointerY, 40, 0, Math.PI * 2);
      ctx.stroke();

      if (this.isPointerDown) {
        const grad = ctx.createRadialGradient(this.pointerX, this.pointerY, 0, this.pointerX, this.pointerY, 40);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.pointerX, this.pointerY, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tool === 'spark') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.pointerX, this.pointerY, 35, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'flask') {
      // フラスコ設置プレビュー
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);

      const cx = this.pointerX;
      const cy = this.pointerY;
      const fType = this.toolbar.selectedFlaskType;

      ctx.beginPath();
      if (fType === 'erlenmeyer') {
        ctx.moveTo(cx - 15, cy - 110);
        ctx.lineTo(cx - 15, cy - 70);
        ctx.lineTo(cx - 50, cy);
        ctx.lineTo(cx + 50, cy);
        ctx.lineTo(cx + 15, cy - 70);
        ctx.lineTo(cx + 15, cy - 110);
      } else if (fType === 'beaker') {
        ctx.moveTo(cx - 42, cy - 85);
        ctx.lineTo(cx - 42, cy);
        ctx.lineTo(cx + 42, cy);
        ctx.lineTo(cx + 42, cy - 85);
      } else if (fType === 'testtube') {
        ctx.moveTo(cx - 16, cy - 100);
        ctx.lineTo(cx - 16, cy - 16);
        ctx.arc(cx, cy - 16, 16, Math.PI, 0, true);
        ctx.lineTo(cx + 16, cy - 100);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (tool === 'erase') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.pointerX, this.pointerY, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// アプリケーション起動
window.addEventListener('DOMContentLoaded', () => {
  new ElementGameApp();
});
