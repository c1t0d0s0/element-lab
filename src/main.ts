import { PhysicsWorld, GlassContainer, LabBalance, MAX_CHEMICAL_PARTICLES } from './engine/PhysicsWorld';
import { ReactionEngine } from './engine/ReactionEngine';
import { Particle } from './engine/Particle';
import { Toolbar } from './ui/Toolbar';
import { Inspector } from './ui/Inspector';
import { PeriodicTableModal } from './ui/PeriodicTableModal';
import { EncyclopediaModal } from './ui/EncyclopediaModal';
import { QuestModal } from './ui/QuestModal';
import { TutorialManager } from './ui/TutorialManager';
import { FireworksModal } from './ui/FireworksModal';
import { Professor } from './ui/Professor';
import { getMoleculeViewer } from './ui/MoleculeViewer';
import { FIREWORK_ELEMENTS, isWillowUnlocked, isMagnesiumWhiteUnlocked } from './engine/Fireworks';
import { soundManager } from './engine/AudioEffects';
import { Quest, getQuestTitle } from './data/quests';
import { ELEMENTS_DATA, getElementName } from './data/elements';
import { COMPOUNDS_DATA, getCompoundName } from './data/compounds';
import { getReactionName } from './data/reactions';
import { t, getLanguage, onLanguageChange } from './i18n';
import { getWallType } from './data/walls';

// 粒子からマウスが離れてから説明カードを消すまでの時間 (ms)。この間にカードへ移ればボタンを押せる
const INSPECTOR_CLEAR_DELAY_MS = 800;
// 壁ツールでドラッグしたとき、この間隔 (px) ごとに壁を置いて途切れないようにする
const WALL_DRAG_STEP = 12;

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
  private fireworksModal: FireworksModal;
  private professor: Professor;

  private isPointerDown: boolean = false;
  private pointerX: number = 0;
  private pointerY: number = 0;
  private lastSpawnTime: number = 0;
  // 壁ツールで最後に壁を置いた位置 (ドラッグの間を補間して途切れずに置くため)
  private lastWallPoint: { x: number; y: number } | null = null;
  private hoveredTarget: Particle | GlassContainer | LabBalance | null = null;
  // 閉じるボタンで閉じた対象 (別の対象に移るまでホバーで再表示しない)
  private dismissedTarget: Particle | GlassContainer | LabBalance | null = null;
  // 観察モードでクリックして固定した対象 (マウスを動かしても説明カードを表示したままにする)
  private pinnedTarget: Particle | GlassContainer | LabBalance | null = null;
  // 直近のポインター種別 ('touch' ではホバー前提の自動ポップアップを控える)
  private lastPointerType: string = 'mouse';
  private nextParticleId: number = 1;
  // 発射プログラムの試し打ちを見終わったらエディタを開き直す
  private returnToEditorAfterShow: boolean = false;
  // ポインターが説明カード (インスペクター) の上にあるか
  private pointerOverInspector: boolean = false;
  // 何もない所へ動いた時、説明カードを少し待ってから消すためのタイマー
  private inspectorClearTimer: number | undefined;

  constructor() {
    this.canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.world = new PhysicsWorld(window.innerWidth, window.innerHeight);
    this.reactionEngine = new ReactionEngine(this.world);
    this.inspector = new Inspector('inspector-container');
    this.inspector.world = this.world;
    this.toolbar = new Toolbar();
    this.tutorialManager = new TutorialManager(this.world);

    this.periodicModal = new PeriodicTableModal((symbol) => {
      this.toolbar.setSelectedElement(symbol);
      const el = ELEMENTS_DATA[symbol];
      const name = el ? getElementName(el, getLanguage()) : symbol;
      this.showToast(t().toasts.elementSelected(name, symbol));
    });

    this.encyclopediaModal = new EncyclopediaModal(() => this.reactionEngine.stats);
    this.questModal = new QuestModal(() => this.reactionEngine.stats);
    this.fireworksModal = new FireworksModal(() => this.reactionEngine.stats);
    this.professor = new Professor(document.getElementById('main-area')!);

    this.setupCallbacks();
    this.setupEventListeners();
    this.resizeCanvas();

    onLanguageChange(() => {
      document.title = `${t().appTitle} - ${t().appSubtitle}`;
    });

    // 初回訪問時は自動でチュートリアルを開始 (2回目以降は博士があいさつ)
    try {
      if (!localStorage.getItem('element_lab_tutorial_done')) {
        setTimeout(() => {
          this.tutorialManager.startTutorial();
        }, 600);
      } else {
        setTimeout(() => this.professor.greet(), 1200);
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
      this.showToast(t().toasts.labCleared);
    };

    this.toolbar.onLanguageChanged = () => {
      if (getLanguage() === 'en') this.showToast(t().toasts.englishBeta);
    };
    this.toolbar.onOpenTutorial = () => this.tutorialManager.startTutorial();
    this.toolbar.onOpenPeriodicTable = () => this.periodicModal.open();
    this.toolbar.onOpenEncyclopedia = (tab) => this.encyclopediaModal.open(tab);
    this.encyclopediaModal.onSelectCompound = (id) => {
      this.toolbar.setSelectedCompound(id);
      const comp = COMPOUNDS_DATA[id];
      const name = comp ? getCompoundName(comp, getLanguage()) : id;
      this.showToast(t().toasts.compoundSelected(name, comp?.formula ?? id));
    };
    this.toolbar.onOpenQuests = () => this.questModal.open();
    this.toolbar.onOpenFireworks = () => this.fireworksModal.open();

    // 花火工房から打ち上げ
    let burstsSinceLaunch = 0;
    // 試し打ちの後は、花火が終わったらエディタに戻る
    this.fireworksModal.onLaunch = (request) => {
      burstsSinceLaunch = 0;
      if (request.kind === 'design') {
        this.world.fireworks.launch(request.design, this.world.chamber);
        this.reactionEngine.recordFireworkLaunch(request.design);
      } else {
        this.world.fireworks.launchShots(request.shots, this.world.chamber);
        // クエスト (3色の花火) は、プログラムの中でいちばん色の多い発で判定する
        const widest = request.shots.reduce((best, s) => (s.colors.length > best.colors.length ? s : best), request.shots[0]);
        this.reactionEngine.recordFireworkLaunch({ symbols: widest.colors, shape: widest.shape, count: request.shots.length });
        this.returnToEditorAfterShow = request.isTest;
      }
      this.questModal.checkAllQuests();
    };
    this.world.fireworks.onBurst = (design) => {
      // 博士のひとことは1回の打ち上げにつき最初の1発だけ
      if (burstsSinceLaunch++ === 0) {
        this.professor.say({ type: 'firework', symbols: design.symbols, shape: design.shape });
      }
    };

    // 炎色反応を初めて見た元素は花火の色として使えるようになる
    this.world.onFlameTest = (symbol) => {
      if (!this.reactionEngine.recordFlameTest(symbol)) return;
      // 花火に使わない元素 (Cs など) は、トーストを出さず博士が理由を説明する
      if (FIREWORK_ELEMENTS.includes(symbol)) {
        const el = ELEMENTS_DATA[symbol];
        const name = el ? getElementName(el, getLanguage()) : symbol;
        this.showToast(t().toasts.flameColorUnlocked(name), 'toast-discovery');
      }
      this.professor.say({ type: 'flameTest', symbol });
      this.questModal.checkAllQuests();
    };

    // 指示薬の色が変わった時
    this.world.onIndicatorChange = (p, phClass, isInitial) => {
      if (!isInitial) soundManager.playColorChange();
      if (!this.reactionEngine.recordIndicatorResult(p.symbolOrId, phClass)) return;
      const comp = COMPOUNDS_DATA[p.symbolOrId];
      const name = comp ? getCompoundName(comp, getLanguage()) : p.symbolOrId;
      this.showToast(t().toasts.indicatorDiscovered(name, t().indicatorChips[phClass]), 'toast-discovery');
      this.professor.say({ type: 'indicator', compoundId: p.symbolOrId, phClass });
      this.questModal.checkAllQuests();
    };

    // 博士: しばらく操作がなければ未発見の反応のヒント (モーダルやチュートリアル表示中は控える)
    this.professor.getIdleEvent = () => ({ type: 'idle', stats: this.reactionEngine.stats });
    this.professor.canShowIdleHint = () =>
      !this.toolbar.isPaused && document.querySelector('.modal-overlay:not(.hidden)') === null && !this.tutorialManager.isActive;
    this.professor.onMuteChanged = (muted) => {
      this.showToast(muted ? t().professor.mutedToast : t().professor.unmutedToast);
    };

    // フラスコの蓋トグル (インスペクターから)
    this.inspector.onToggleCap = (c) => {
      const isNowCapped = this.world.toggleFlaskCap(c);
      soundManager.playCork(isNowCapped);
      const flaskName = c.type === 'erlenmeyer' ? t().tools.erlenmeyer : (c.type === 'beaker' ? t().tools.beaker : t().tools.testtube);
      this.showToast(isNowCapped ? t().toasts.capAdded(flaskName) : t().toasts.capRemoved(flaskName));
      this.world.addEffect(isNowCapped ? 'sparkles' : 'steam', c.cx, c.capBounds.minY + 6, isNowCapped ? '#38BDF8' : '#E2E8F0', 20);
      this.inspector.inspect(c);
    };

    // 天秤の皿クリア (インスペクターから)
    this.inspector.onClose = (target) => {
      this.dismissedTarget = target;
      if (this.pinnedTarget === target) this.pinnedTarget = null;
    };

    // 実験室の化合物の粒子から分子構造の 3D 表示を開く
    this.inspector.onViewStructure = (compoundId) => {
      soundManager.playClick();
      getMoleculeViewer().open(compoundId);
    };

    this.inspector.onClearPan = (b, side) => {
      this.world.clearPan(b, side);
      soundManager.playErase();
      this.showToast(t().toasts.balanceCleared);
      this.inspector.inspect(b);
    };

    // 天秤の固定/解除 (インスペクターから)
    this.inspector.onToggleBalanceLock = (b) => {
      const isLocked = this.world.toggleBalanceLock(b);
      soundManager.playClick();
      this.showToast(isLocked ? t().balance.lock : t().balance.unlock);
      this.inspector.inspect(b);
    };

    // 反応トリガー時
    // 炭や鉄を初めて燃やすと、しだれ柳 (金色の尾) が使えるようになる
    let willowUnlocked = isWillowUnlocked(this.reactionEngine.stats);
    const checkWillowUnlock = () => {
      if (!willowUnlocked && isWillowUnlocked(this.reactionEngine.stats)) {
        willowUnlocked = true;
        this.showToast(t().toasts.willowUnlocked, 'toast-discovery');
        this.professor.say({ type: 'goldSparks' });
      }
    };
    this.world.onGoldSparks = (symbol) => {
      if (this.reactionEngine.recordGoldSparks(symbol)) checkWillowUnlock();
    };
    // マグネシウムを初めて燃やすと、花火の白い輝きが使えるようになる
    let magnesiumWhiteUnlocked = isMagnesiumWhiteUnlocked(this.reactionEngine.stats);
    const checkMagnesiumWhiteUnlock = () => {
      if (!magnesiumWhiteUnlocked && isMagnesiumWhiteUnlocked(this.reactionEngine.stats)) {
        magnesiumWhiteUnlocked = true;
        this.showToast(t().toasts.magnesiumWhiteUnlocked, 'toast-discovery');
      }
    };
    this.reactionEngine.onReactionTriggered = (event) => {
      checkWillowUnlock();
      checkMagnesiumWhiteUnlock();
      this.professor.say({ type: 'reaction', rule: event.rule, firstTime: event.isFirstDiscovery });
      this.questModal.checkAllQuests();
      this.tutorialManager.checkProgress('reaction');
    };

    // フラスコ内の爆発で容器が破裂した時
    this.reactionEngine.onContainerShattered = (container, rule) => {
      if (this.hoveredTarget === container) {
        this.hoveredTarget = null;
      }
      if (this.inspector.isInspecting(container)) {
        this.inspector.renderEmpty();
      }
      const typeName = container.type === 'erlenmeyer' ? t().tools.erlenmeyer : (container.type === 'beaker' ? t().tools.beaker : t().tools.testtube);
      this.showToast(t().toasts.flaskShattered(typeName, getReactionName(rule, getLanguage())), 'toast-warning');
      this.professor.say({ type: 'shatter' });
    };

    // 新発見時
    this.reactionEngine.onNewDiscovery = (id, nameJa, isCompound) => {
      if (isCompound) {
        soundManager.playSuccessChime();
        const comp = COMPOUNDS_DATA[id];
        const name = comp ? getCompoundName(comp, getLanguage()) : nameJa;
        this.showToast(t().toasts.newCompound(name, id), 'toast-discovery');
        this.professor.say({ type: 'newCompound', compoundId: id });
      }
    };

    // クエストクリア時
    this.questModal.onQuestComplete = (quest: Quest) => {
      const title = getQuestTitle(quest, getLanguage());
      this.showToast(t().toasts.questComplete(title), 'toast-discovery');
      this.professor.say({ type: 'questComplete', title });
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
      this.lastPointerType = e.pointerType;
      this.professor.notifyActivity();
      updatePointerCoords(e);
      this.handlePointerAction(true);
    });

    window.addEventListener('pointermove', (e) => {
      this.lastPointerType = e.pointerType;
      updatePointerCoords(e);
      // 説明カードの上では表示を保つ (カードのボタンを押せるように)
      this.pointerOverInspector = !!(e.target as Element | null)?.closest?.('#inspector-container');
      if (this.pointerOverInspector) {
        this.cancelInspectorClear();
      } else if (e.target === this.canvas) {
        this.findHoveredTarget();
        // カードから何もない所へ戻った時も、少し待ってから消す
        if (!this.hoveredTarget && this.inspector.hasTarget()) this.scheduleInspectorClear();
      }

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

  // ポインターの下にある粒子・容器・天秤
  private targetAtPointer(): Particle | GlassContainer | LabBalance | null {
    let closestParticle: Particle | null = null;
    let minDist = 25;

    for (const p of this.world.particles) {
      const dist = Math.hypot(p.x - this.pointerX, p.y - this.pointerY);
      if (dist < p.radius + 10 && dist < minDist) {
        minDist = dist;
        closestParticle = p;
      }
    }

    let closestTarget: Particle | GlassContainer | LabBalance | null = closestParticle;
    if (!closestTarget) {
      closestTarget = this.world.getHoveredContainer(this.pointerX, this.pointerY);
    }
    if (!closestTarget) {
      closestTarget = this.world.getHoveredBalance(this.pointerX, this.pointerY);
    }
    return closestTarget;
  }

  private findHoveredTarget() {
    const closestTarget = this.targetAtPointer();
    // クリックで固定中は、マウスを動かしても説明カードを変えない
    if (this.pinnedTarget) {
      this.hoveredTarget = closestTarget;
      return;
    }

    if (closestTarget !== this.hoveredTarget) {
      this.hoveredTarget = closestTarget;
      if (closestTarget !== this.dismissedTarget) {
        this.dismissedTarget = null;
      }
      if (this.dismissedTarget) return;
      if (!closestTarget) {
        // すぐには消さない: 説明カードのボタンへマウスを動かす途中で、何もない所を通るため
        this.scheduleInspectorClear();
        return;
      }
      this.cancelInspectorClear();
      this.inspector.inspect(closestTarget);
      this.tutorialManager.checkProgress('inspect', closestTarget);
    }
  }

  // 観察モードのクリック: 対象の説明カードを固定する。何もない所をクリックすると固定を外して閉じる
  private togglePinnedTarget() {
    const target = this.targetAtPointer();
    this.cancelInspectorClear();
    this.hoveredTarget = target;
    this.dismissedTarget = null;
    this.pinnedTarget = target;
    if (target) {
      this.inspector.inspect(target);
      this.tutorialManager.checkProgress('inspect', target);
    } else {
      this.inspector.renderEmpty();
    }
  }

  // 固定した対象が反応や消しゴムでなくなったら、固定を外して説明カードを閉じる
  private releaseVanishedPin() {
    const pin = this.pinnedTarget;
    if (!pin) return;
    // 観察モード以外のツールに切り替えたら、固定を外していつものマウスオーバー表示に戻す
    if (this.toolbar.activeTool !== 'inspect') {
      this.pinnedTarget = null;
      return;
    }
    const exists = pin instanceof Particle
      ? this.world.particles.includes(pin)
      : 'leftPan' in pin ? this.world.balances.includes(pin) : this.world.containers.includes(pin);
    if (!exists) {
      this.pinnedTarget = null;
      this.hoveredTarget = null;
      this.inspector.renderEmpty();
    }
  }

  private scheduleInspectorClear() {
    if (this.inspectorClearTimer !== undefined) return;
    this.inspectorClearTimer = window.setTimeout(() => {
      this.inspectorClearTimer = undefined;
      if (!this.pointerOverInspector && !this.hoveredTarget && !this.pinnedTarget) this.inspector.renderEmpty();
    }, INSPECTOR_CLEAR_DELAY_MS);
  }

  private cancelInspectorClear() {
    window.clearTimeout(this.inspectorClearTimer);
    this.inspectorClearTimer = undefined;
  }

  private handlePointerAction(isInitialTap: boolean) {
    const now = performance.now();
    const tool = this.toolbar.activeTool;

    // チャンバー上部の「💨 換気」ボタン直接タップ判定
    if (isInitialTap && this.world.isPointInExhaustButton(this.pointerX, this.pointerY)) {
      const res = this.world.ventilateChamber();
      soundManager.playVentilation();
      this.showToast(t().toasts.ventilated(res.purgedCount));
      return;
    }

    // フラスコの蓋 (栓) 直接タップ判定 (消しゴムツール以外は口付近のタップで開閉を優先)
    if (isInitialTap && tool !== 'erase') {
      const capContainer = this.world.getContainerAtCapPoint(this.pointerX, this.pointerY);
      if (capContainer) {
        const isNowCapped = this.world.toggleFlaskCap(capContainer);
        soundManager.playCork(isNowCapped);
        const flaskName = capContainer.type === 'erlenmeyer' ? t().tools.erlenmeyer : (capContainer.type === 'beaker' ? t().tools.beaker : t().tools.testtube);
        this.showToast(isNowCapped ? t().toasts.capAdded(flaskName) : t().toasts.capRemoved(flaskName));
        this.world.addEffect(isNowCapped ? 'sparkles' : 'steam', capContainer.cx, capContainer.capBounds.minY + 6, isNowCapped ? '#38BDF8' : '#E2E8F0', 20);
        // スマートフォンでは蓋の開閉はトーストで十分伝わるため、説明カードを自動で開かない
        if (this.lastPointerType !== 'touch') {
          this.inspector.inspect(capContainer);
        }
        return;
      }
    }

    if (tool === 'spawn') {
      // 粒子配置 (連続生成の間隔制御)
      if (isInitialTap || (now - this.lastSpawnTime > 80)) {
        this.lastSpawnTime = now;
        this.spawnSelectedParticle(this.pointerX, this.pointerY, isInitialTap);
      }
    } else if (tool === 'wall') {
      this.placeWalls(isInitialTap);
    } else if (tool === 'balance') {
      // 精密上皿天秤の設置 (1タップで1台設置)
      if (isInitialTap) {
        const canSpawnBal = this.world.canSpawnBalance(this.pointerX, this.pointerY);
        if (!canSpawnBal.allowed) {
          this.showToast(canSpawnBal.reason === 'overlap_wall' ? t().toasts.cannotOverlapWall : t().toasts.balanceOverlap);
          return;
        }
        const bal = this.world.spawnBalance(this.pointerX, this.pointerY);
        soundManager.playGlass();
        this.world.addEffect('sparkles', bal.cx, bal.cy - bal.pillarHeight, '#F59E0B', 24);
        this.showToast(t().toasts.balancePlaced);
        this.inspector.inspect(bal);
      }
    } else if (tool === 'flask') {
      // フラスコ・実験器具の設置 (1タップで1個設置、重ねて置くことを防止)
      if (isInitialTap) {
        const canSpawn = this.world.canSpawnFlask(this.pointerX, this.pointerY, this.toolbar.selectedFlaskType);
        if (!canSpawn.allowed) {
          if (canSpawn.reason === 'pan_occupied') {
            this.showToast(t().toasts.panAlreadyOccupied);
          } else if (canSpawn.reason === 'overlap_balance') {
            this.showToast(t().toasts.cannotOverlapBalance);
          } else if (canSpawn.reason === 'overlap_wall') {
            this.showToast(t().toasts.cannotOverlapWall);
          } else {
            this.showToast(t().toasts.cannotOverlapFlask);
          }
          return;
        }

        const spawned = this.world.spawnFlask(this.pointerX, this.pointerY, this.toolbar.selectedFlaskType);
        if (spawned) {
          soundManager.playGlass();
          const typeName = this.toolbar.selectedFlaskType === 'erlenmeyer' ? t().tools.erlenmeyer : (this.toolbar.selectedFlaskType === 'beaker' ? t().tools.beaker : t().tools.testtube);
          this.showToast(t().toasts.flaskPlaced(typeName));
          this.tutorialManager.checkProgress('flask');
        }
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
      // 電気分解・オゾン生成を化合物図鑑・反応式録に記録 (保存も行われる)
      this.reactionEngine.recordElectricResult(res, this.pointerX, this.pointerY);
      // 純水は電気をほとんど通さない。なぞるたびに出ないよう、1回のタップにつき1回だけ教える
      if (res.pureWaterOnly && isInitialTap) {
        this.showToast(t().toasts.pureWaterHint, 'toast-warning');
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
      if (isInitialTap) this.togglePinnedTarget();
      else this.findHoveredTarget();
    }
  }

  // 壁ツール: 選んだ強さ・大きさの壁を置く。ドラッグ中は前の位置から今の位置までを補間して、速く動かしても途切れないようにする
  private placeWalls(isInitialTap: boolean) {
    const to = { x: this.pointerX, y: this.pointerY };
    const from = isInitialTap || !this.lastWallPoint ? to : this.lastWallPoint;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / WALL_DRAG_STEP));
    const { selectedWallType, wallCols, wallRows } = this.toolbar;
    let placed = 0;
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      placed += this.world.placeWallBrush(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, wallCols, wallRows, selectedWallType);
    }
    this.lastWallPoint = to;
    if (placed > 0) {
      this.reactionEngine.registerSpawn('wall', selectedWallType);
      const now = Date.now();
      if (isInitialTap || now - this.lastSpawnTime > 80) {
        this.lastSpawnTime = now;
        soundManager.playPop(440);
      }
    }
  }

  private spawnSelectedParticle(x: number, y: number, isInitialTap: boolean) {
    if (this.world.countChemicalParticles() >= MAX_CHEMICAL_PARTICLES) {
      if (isInitialTap) this.showToast(t().toasts.particleLimit(MAX_CHEMICAL_PARTICLES), 'toast-warning');
      return;
    }
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

      // 天秤使用クエスト判定 (皿に試料が乗って測定された場合)
      for (const b of this.world.balances) {
        if (b.leftPan.particles.length > 0 || b.rightPan.particles.length > 0) {
          if (!this.reactionEngine.stats.balanceUsedCount) {
            this.reactionEngine.stats.balanceUsedCount = 1;
            this.questModal.checkAllQuests();
          }
        }
      }

      this.tutorialManager.checkProgress();

      this.releaseVanishedPin();

      if (this.returnToEditorAfterShow && !this.world.fireworks.isActive()) {
        this.returnToEditorAfterShow = false;
        this.fireworksModal.reopenEditor();
      }
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
    } else if (tool === 'balance') {
      // 上皿天秤設置プレビュー (ほかの天秤やフラスコと重なる場所では赤く表示)
      const canSpawnBal = this.world.canSpawnBalance(this.pointerX, this.pointerY);
      ctx.strokeStyle = canSpawnBal.allowed ? 'rgba(245, 158, 11, 0.75)' : 'rgba(244, 63, 94, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);

      const cx = canSpawnBal.targetX;
      const cy = canSpawnBal.targetY;
      const pivotY = cy - 105;

      ctx.beginPath();
      // 台座
      ctx.rect(cx - 70, cy - 14, 140, 14);
      // 支柱
      ctx.rect(cx - 6, pivotY, 12, 105 - 14);
      // アーム
      ctx.moveTo(cx - 95, pivotY);
      ctx.lineTo(cx + 95, pivotY);
      // 左ロッド & 皿
      ctx.moveTo(cx - 95, pivotY);
      ctx.lineTo(cx - 95, pivotY - 18);
      ctx.moveTo(cx - 95 - 40, pivotY - 18 - 14);
      ctx.quadraticCurveTo(cx - 95 - 38, pivotY - 18, cx - 95, pivotY - 18);
      ctx.quadraticCurveTo(cx - 95 + 38, pivotY - 18, cx - 95 + 40, pivotY - 18 - 14);
      // 右ロッド & 皿
      ctx.moveTo(cx + 95, pivotY);
      ctx.lineTo(cx + 95, pivotY - 18);
      ctx.moveTo(cx + 95 - 40, pivotY - 18 - 14);
      ctx.quadraticCurveTo(cx + 95 - 38, pivotY - 18, cx + 95, pivotY - 18);
      ctx.quadraticCurveTo(cx + 95 + 38, pivotY - 18, cx + 95 + 40, pivotY - 18 - 14);

      ctx.stroke();
      ctx.setLineDash([]);
      if (!canSpawnBal.allowed) this.drawOverlapBadge(ctx, cx, pivotY + 40);
    } else if (tool === 'flask') {
      // フラスコ設置プレビュー
      const fType = this.toolbar.selectedFlaskType;
      const canSpawn = this.world.canSpawnFlask(this.pointerX, this.pointerY, fType);
      const isAllowed = canSpawn.allowed;

      ctx.strokeStyle = isAllowed ? 'rgba(56, 189, 248, 0.75)' : 'rgba(244, 63, 94, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);

      const cx = canSpawn.targetX;
      const cy = canSpawn.targetY;

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

      // 重なって置けない場合の視覚的警告バッジ
      if (!isAllowed) this.drawOverlapBadge(ctx, cx, cy - 50);
    } else if (tool === 'wall') {
      // 置く範囲 (幅×高さのマス) を格子にそろえた枠で表示
      const area = this.world.wallBrushBounds(this.pointerX, this.pointerY, this.toolbar.wallCols, this.toolbar.wallRows);
      const wt = getWallType(this.toolbar.selectedWallType);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = wt.color;
      ctx.fillRect(area.minX, area.minY, area.maxX - area.minX, area.maxY - area.minY);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(area.minX, area.minY, area.maxX - area.minX, area.maxY - area.minY);
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

  // 重なって置けない場所に出す「🚫 重ねて置けません」のバッジ
  private drawOverlapBadge(ctx: CanvasRenderingContext2D, cx: number, y: number) {
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const msg = t().toasts.cannotOverlapPreview;
    const textWidth = ctx.measureText(msg).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(cx - textWidth / 2 - 6, y - 9, textWidth + 12, 18);
    ctx.strokeStyle = '#F43F5E';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - textWidth / 2 - 6, y - 9, textWidth + 12, 18);
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(msg, cx, y);
    ctx.restore();
  }
}

// アプリケーション起動
window.addEventListener('DOMContentLoaded', () => {
  new ElementGameApp();
});
