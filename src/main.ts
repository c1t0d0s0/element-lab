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
    this.toolbar.onVentilate = () => {
      const res = this.world.ventilateChamber();
      this.showToast(`💨 実験チャンバーを換気しました（気体${res.purgedCount}個を排気・正常化）`);
    };

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
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });

    if (this.canvas.parentElement && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      resizeObserver.observe(this.canvas.parentElement);
    }

    // ポインターイベント (マウス & タッチ共通)
    const updatePointerCoords = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.world.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.world.height / rect.height : 1;
      this.pointerX = (e.clientX - rect.left) * scaleX;
      this.pointerY = (e.clientY - rect.top) * scaleY;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isPointerDown = true;
      updatePointerCoords(e);
      this.handlePointerAction(true);
    });

    window.addEventListener('pointermove', (e) => {
      updatePointerCoords(e);
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

    // チャンバー上部の「💨 換気」ボタン直接タップ判定
    if (isInitialTap && this.world.isPointInExhaustButton(this.pointerX, this.pointerY)) {
      const res = this.world.ventilateChamber();
      soundManager.playVentilation();
      this.showToast(`💨 実験チャンバーを換気しました（気体${res.purgedCount}個を排気）`);
      return;
    }

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
      if (Math.random() < 0.35) {
        soundManager.playFlame();
      }
      this.tutorialManager.checkProgress('heat');
    } else if (tool === 'cool') {
      // 冷却スプレー
      this.world.applyCool(this.pointerX, this.pointerY, 40, 25);
      if (Math.random() < 0.2) {
        soundManager.playSteam();
      }
      this.tutorialManager.checkProgress('cool');
    } else if (tool === 'electric') {
      // 通電・電気分解 (水の電気分解、塩化銅の電気分解、金属の導電性など)
      const res = this.world.applyElectric(this.pointerX, this.pointerY, 42);
      if (isInitialTap || Math.random() < 0.45) {
        soundManager.playElectric();
      }
      for (const compId of res.createdCompounds) {
        this.reactionEngine.registerSpawn('compound', compId);
      }
      if (res.decomposedCount > 0) {
        this.reactionEngine.onReactionTriggered?.({
          rule: {
            id: 'water_electrolysis',
            equation: '2H₂O → 2H₂ + O₂',
            nameJa: '電気分解',
            mextCategoryJa: '中学理科・電気分解',
            reactants: [],
            products: [],
            descriptionJa: '電流によって物質が分解されました。',
            heatRelease: 0,
            soundEffect: 'spark',
            condition: {}
          },
          x: this.pointerX,
          y: this.pointerY,
          timestamp: Date.now()
        });
      }
    } else if (tool === 'spark') {
      // 点火スパーク
      if (isInitialTap || Math.random() < 0.3) {
        this.world.applySpark(this.pointerX, this.pointerY, 35);
        this.world.addEffect('sparkles', this.pointerX, this.pointerY, '#38BDF8', 25);
        soundManager.playSpark();
        soundManager.playFlame();
        this.tutorialManager.checkProgress('spark');
      }
    } else if (tool === 'erase') {
      // 消しゴム
      const erased = this.world.eraseAt(this.pointerX, this.pointerY, 35);
      if (erased > 0 && Math.random() < 0.35) {
        soundManager.playErase();
      }
    } else if (tool === 'inspect') {
      this.findHoveredTarget();
    }
  }

  private spawnSelectedParticle(x: number, y: number) {
    const sel = this.toolbar.selectedItem;
    const jitterX = (Math.random() - 0.5) * 8;
    const jitterY = (Math.random() - 0.5) * 8;

    const clampedX = Math.max(this.world.chamber.minX + 16, Math.min(this.world.chamber.maxX - 16, x + jitterX));
    const clampedY = Math.max(this.world.chamber.minY + 16, Math.min(this.world.chamber.maxY - 16, y + jitterY));

    const p = new Particle(
      `p_${this.nextParticleId++}`,
      sel.kind,
      sel.id,
      clampedX,
      clampedY,
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
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const displayWidth = Math.floor(rect.width);
    const displayHeight = Math.floor(rect.height);

    // Canvas の内部解像度を設定 (CSS の absolute 100% と完全一致)
    this.canvas.width = Math.floor(displayWidth * dpr);
    this.canvas.height = Math.floor(displayHeight * dpr);

    // DPR スケールを確実に適用 (歪みのない 1:1 正円描画を保証)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.world.setSize(displayWidth, displayHeight);
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

    // 描画バッファのクリア
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

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
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.pointerX, this.pointerY, 35, 0, Math.PI * 2);
      ctx.stroke();

      if (this.isPointerDown) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        ctx.beginPath();
        ctx.arc(this.pointerX, this.pointerY, 35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// アプリケーション起動
window.addEventListener('DOMContentLoaded', () => {
  new ElementGameApp();
});
