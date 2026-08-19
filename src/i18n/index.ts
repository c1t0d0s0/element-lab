export type Language = 'ja' | 'en';

type Listener = (lang: Language) => void;
const listeners: Set<Listener> = new Set();

let currentLanguage: Language = detectInitialLanguage();

function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem('element_lab_lang');
    if (saved === 'ja' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    if (browserLang.toLowerCase().startsWith('ja')) {
      return 'ja';
    }
  }
  return 'en';
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language) {
  if (currentLanguage === lang) return;
  currentLanguage = lang;
  try {
    localStorage.setItem('element_lab_lang', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  } catch {
    // ignore
  }
  listeners.forEach(fn => fn(lang));
}

export function onLanguageChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const TRANSLATIONS = {
  ja: {
    appTitle: '元素ラボ',
    appSubtitle: 'Element Lab',
    nav: {
      guide: '🔰 ガイド',
      quests: '🎯 クエスト',
      periodic: '⚛️ 周期表',
      encyclopedia: '📖 図鑑',
      ventilate: '💨 換気',
      play: '▶️ 再生',
      pause: '⏸️ 停止',
      clear: '🗑️ 全消去',
      soundOn: '🔊',
      soundOff: '🔇',
      langToggle: '🌐 English'
    },
    tools: {
      spawn: '🧪 配置',
      flask: '🏺 フラスコ',
      heat: '🔥 加熱',
      cool: '❄️ 冷却',
      electric: '⚡ 電気',
      spark: '💥 点火',
      wall: '🧱 壁',
      erase: '🧹 消しゴム',
      ventilate: '💨 換気',
      inspect: '🔍 観察',
      moreElements: '＋ 他の元素',
      paletteSectionFlask: '器具:',
      paletteSectionElement: '元素:',
      paletteSectionCompound: '化合物:',
      erlenmeyer: '三角フラスコ',
      beaker: 'ビーカー',
      testtube: '丸底試験管'
    },
    tooltips: {
      spawn: '元素・化合物を配置',
      flask: '液体を入れるフラスコ・ビーカーを配置',
      heat: 'バーナーで加熱 (>500℃で鉄が赤熱！)',
      cool: '冷却スプレーで冷却 (<0℃で水が氷結！)',
      electric: '通電・電気分解 (水の電気分解 2H₂O→2H₂+O₂、金属の導電性など)',
      spark: '点火・火花 (水素爆発など)',
      wall: '耐熱壁を配置',
      erase: '画面をなぞって粒子やフラスコを消去',
      ventilate: '実験ケースの有毒ガス・気体を換気排気',
      inspect: '粒子やフラスコを調べる',
      moreElements: '周期表から探す'
    },
    chamber: {
      title: '🔬 密閉実験ケース (Sealed Chamber)',
      cleanStatus: '🟢 正常 (CLEAN)',
      toxicAlert: (name: string, sym: string) => `⚠️ 有毒ガス検知: ${name} (${sym}) 充満中!`,
      ventilateBtn: '💨 換気',
      exhaustingBtn: '⚡ 排気中...'
    },
    inspector: {
      emptyHint: '粒子やフラスコにカーソルを合わせると詳細が表示されます',
      flaskCategory: '耐熱ガラス器具 (ホウケイ酸ガラス)',
      temp: '温度',
      material: '材質',
      materialGlassVal: 'ホウケイ酸ガラス',
      heatResistance: '耐熱温度',
      heatResistanceVal: '約 500 ℃',
      state: '状態',
      conductivity: '導電性',
      molarMass: '分子量/質量',
      atomicRadius: '原子半径',
      solid: '固体 🧊',
      liquid: '液体 💧',
      gas: '気体 ♨',
      condConductorMetal: '良導体 (金属・自由電子)',
      condConductorGraphite: '良導体 (黒鉛・自由電子)',
      condElectrolyte: '電解質 (イオン電離)',
      condElectrolyzable: '電解可能 (電気分解)',
      condInsulator: '絶縁体 (不導体)',
      fixedObstacle: '固定障害物',
      wallDesc: '熱と粒子を遮断する耐熱壁です。',
      flameReaction: '炎色反応',
      mnemonic: '語呂合わせ',
      rustMeter: '赤サビ進行度',
      mextKnowledgeTitle: '📘 文科省・理科の重要知識',
      mextGlassDesc: '熱膨張率が小さく急熱・急冷に強い理化学用耐熱ガラスです。バーナーで直接加熱して液体を沸騰させたり、試薬を入れて反応させる容器として使用します。'
    },
    periodicTable: {
      title: '⚛️ 元素周期表 (Periodic Table)',
      subtitle: (count: number) => `全${count}元素完全収録 / 文科省理科・化学準拠`,
      searchPlaceholder: '元素名・記号・番号で検索...',
      radiusComparison: (on: boolean) => `📏 原子半径 比較: ${on ? 'ON' : 'OFF'}`,
      filterLabel: '分類フィルター:',
      periodGroupHeader: '周期＼族',
      lanthanideLabel: '＊ ランタノイド系列 (La〜Lu)',
      actinideLabel: '＊＊ アクチノイド系列 (Ac〜Lr)',
      lanthanideShort: '＊ランタノイド',
      actinideShort: '＊＊アクチノイド',
      radioactivePill: '☢ 放射性元素',
      atomScale: '原子半径',
      smallestInAll: '🌟 (全元素で最小)',
      largestNatural: '🌟 (天然元素で最大)',
      largestStable: '🌟 (安定元素で最大)',
      atomicNumber: '原子番号',
      atomicWeight: '原子量',
      category: '分類',
      periodGroup: '周期・族',
      periodLabel: (p: number) => `第${p}周期`,
      groupLabel: (g: number) => `${g}族`,
      stateAtRoomTemp: '常温での状態',
      meltingBoiling: '融点 / 沸点',
      molarMass: 'モル質量',
      mextTitle: '📘 文部科学省 教科書の重要ポイント',
      spawnBtn: (sym: string) => `🧪 この元素を実験室に配置 (${sym})`,
      categories: {
        all: 'すべて',
        nonmetal: '非金属',
        'noble-gas': '希ガス',
        'alkali-metal': 'アルカリ金属',
        'alkaline-earth': 'アルカリ土類金属',
        metalloid: '半金属',
        halogen: 'ハロゲン',
        'transition-metal': '遷移金属',
        'post-transition-metal': '典型金属',
        lanthanide: 'ランタノイド',
        actinide: 'アクチノイド'
      }
    },
    encyclopedia: {
      title: '📖 化学図鑑 & 反応式録 (Encyclopedia)',
      subtitle: '文科省 理科・化学完全対応',
      tabCompounds: (found: number, total: number) => `🧪 化合物図鑑 (${found}/${total})`,
      tabReactions: (found: number, total: number) => `⚗️ 発見した化学反応式 (${found}/${total})`,
      tabElements: (total: number) => `⚛️ 元素一覧 (${total})`,
      undiscoveredCompound: (elementsCount: number, stateStr: string) => `未発見の化合物 (${elementsCount}元素 / 常温${stateStr})`,
      undiscoveredCompoundHint: (toxic: boolean) => `${toxic ? '⚠️ 特徴: 有毒・危険物質 / ' : ''}実験室で元素や化合物を組み合わせて発見しよう！`,
      undiscoveredReaction: '⚗️ 未知の化学反応',
      undiscoveredReactionHint: (name: string, cond: string) => `ヒント: 【${name}】 (${cond}) を実験室で試してみよう！`,
      reactionHeatExo: (heat: number) => `+${heat}℃ (発熱)`,
      reactionHeatEndo: (heat: number) => `${heat}℃ (吸熱)`,
      reactionHeatLabel: '反応熱:',
      experimentCount: (cnt: number) => `実験回数: ${cnt}回`,
      mextFactTitle: '文科省解説:'
    },
    quests: {
      title: '🎯 理科・化学 学習クエスト (Quests)',
      subtitle: (done: number, total: number) => `達成: ${done} / ${total}`,
      objective: '目標:',
      hint: 'ヒント:',
      statusDone: '✅ 達成！',
      statusInProgress: '⏳ 挑戦中'
    },
    tutorial: {
      guideTitle: '🔰 初心者操作ガイド',
      prevBtn: '◀ 戻る',
      nextBtn: '次へ ▶',
      closeBtn: '✕ 閉じる',
      startBtn: '🚀 実験室をはじめる！',
      step1Title: '🔰 ステップ 1: 元素を配置してみよう',
      step1Desc: '元素ラボへようこそ！ここでは118種類の全元素や様々な化合物を自由に実験できます。まずは基本となる **水素 (H)** を実験室に置いてみましょう！',
      step1Goal: '下部パレットで【H】を選んで、画面の好きな場所をタップしてください。',
      step2Title: '⚗️ ステップ 2: 化学反応を起こしてみよう (水の合成)',
      step2Desc: '水素が配置できました！次は **酸素 (O)** を選んで、水素のすぐ近くに置いてみましょう。水素2個と酸素1個が出会うと **水分子 (H₂O)** が合成されます！',
      step2Goal: '下部パレットで【O】を選び、水素粒子の近くをタップして【H₂O】を作ろう！',
      step3Title: '🔥 ステップ 3: バーナーで加熱して沸騰させよう',
      step3Desc: '水分子が合成されました！次はツールバーの **【🔥 加熱】** を選択して、水分子をバーナーで温めてみましょう。100℃を超えると気体（水蒸気 ♨）に状態変化します！',
      step3Goal: 'ツールバーの【🔥 加熱】を選び、水分子をタップ/ドラッグして加熱しよう！',
      step4Title: '🏺 ステップ 4: フラスコを置いて液体を溜めよう',
      step4Desc: '気体になってフワフワと上昇しましたね！次は **【🏺 フラスコ】** ツールを使って、耐熱ガラスの実験器具を設置してみましょう。中に液体や試薬を安全に溜められます！',
      step4Goal: 'ツールバーの【🏺 フラスコ】を選び、キャンバスをタップしてフラスコを設置しよう！',
      step5Title: '🔍 ステップ 5: 粒子やフラスコを観察しよう',
      step5Desc: 'フラスコが設置できました！ツールバーの **【🔍 観察】** を選んで粒子やフラスコに触れると、右上のインスペクターに温度や質量、文科省の重要知識が表示されます！',
      step5Goal: 'ツールバーの【🔍 観察】を選び、粒子やフラスコをタップして観察しよう！',
      step6Title: '🎉 チュートリアル完了！',
      step6Desc: '基本操作のマスターおめでとうございます！画面上部の **【🎯 クエスト】** で課題に挑戦したり、**【📖 図鑑】** や **【⚛️ 周期表】** を開いて新しい反応を自由に探求しましょう！',
      step6Goal: '「実験室をはじめる！」ボタンを押して自由研究をスタートしましょう！'
    },
    toasts: {
      elementSelected: (name: string, sym?: string) => `元素 [${name}${sym ? ` (${sym})` : ''}] を選択しました！キャンバスをタップして配置できます。`,
      labCleared: '実験室を全消去しました',
      flaskPlaced: (name: string) => `🏺 ${name} を設置しました！`,
      ventilated: (count: number) => `💨 実験チャンバーを換気しました（気体${count}個を排気・正常化）`,
      newCompound: (name: string, id: string) => `✨ 新しい化合物【${name} (${id})】を発見！図鑑に登録されました！`,
      questComplete: (title: string) => `🎉 クエスト達成！『${title}』`
    }
  },
  en: {
    appTitle: 'Element Lab',
    appSubtitle: 'Interactive Chemistry Simulator',
    nav: {
      guide: '🔰 Guide',
      quests: '🎯 Quests',
      periodic: '⚛️ Periodic Table',
      encyclopedia: '📖 Encyclopedia',
      ventilate: '💨 Vent',
      play: '▶️ Play',
      pause: '⏸️ Pause',
      clear: '🗑️ Clear',
      soundOn: '🔊',
      soundOff: '🔇',
      langToggle: '🌐 日本語'
    },
    tools: {
      spawn: '🧪 Spawn',
      flask: '🏺 Glassware',
      heat: '🔥 Heat',
      cool: '❄️ Cool',
      electric: '⚡ Electricity',
      spark: '💥 Spark',
      wall: '🧱 Wall',
      erase: '🧹 Eraser',
      ventilate: '💨 Vent',
      inspect: '🔍 Inspect',
      moreElements: '＋ More Elements',
      paletteSectionFlask: 'Apparatus:',
      paletteSectionElement: 'Elements:',
      paletteSectionCompound: 'Compounds:',
      erlenmeyer: 'Erlenmeyer Flask',
      beaker: 'Beaker',
      testtube: 'Test Tube'
    },
    tooltips: {
      spawn: 'Place elements and chemical compounds',
      flask: 'Place glassware (flasks, beakers, test tubes) to contain liquids',
      heat: 'Heat with bunsen burner (>500°C turns iron red-hot!)',
      cool: 'Cool down with cryo-spray (<0°C freezes water into ice!)',
      electric: 'Electrolysis & Electrical Conduction (2H₂O→2H₂+O₂, metal conductivity)',
      spark: 'Ignition spark (trigger explosions, flame tests)',
      wall: 'Place heat-resistant barrier wall',
      erase: 'Erase particles or glassware by dragging',
      ventilate: 'Purge & exhaust toxic gases from chamber',
      inspect: 'Inspect properties of particles and glassware',
      moreElements: 'Browse complete 118 periodic table'
    },
    chamber: {
      title: '🔬 Sealed Experiment Chamber',
      cleanStatus: '🟢 Normal (CLEAN)',
      toxicAlert: (name: string, sym: string) => `⚠️ TOXIC GAS ALERT: ${name} (${sym}) Detected!`,
      ventilateBtn: '💨 Purge',
      exhaustingBtn: '⚡ Purging...'
    },
    inspector: {
      emptyHint: 'Hover or tap particles and glassware to inspect detailed chemistry data',
      flaskCategory: 'Laboratory Glassware (Borosilicate Glass)',
      temp: 'Temperature',
      material: 'Material',
      materialGlassVal: 'Borosilicate Glass (Pyrex)',
      heatResistance: 'Heat Tolerance',
      heatResistanceVal: 'Approx. 500 °C',
      state: 'State',
      conductivity: 'Conductivity',
      molarMass: 'Molar Mass',
      atomicRadius: 'Atomic Radius',
      solid: 'Solid 🧊',
      liquid: 'Liquid 💧',
      gas: 'Gas ♨',
      condConductorMetal: 'Conductor (Metal, Free Electrons)',
      condConductorGraphite: 'Conductor (Graphite, Delocalized π)',
      condElectrolyte: 'Electrolyte (Ionized Solution)',
      condElectrolyzable: 'Electrolyzable (Decomposable)',
      condInsulator: 'Insulator (Non-conductor)',
      fixedObstacle: 'Fixed Barrier',
      wallDesc: 'Heat-resistant insulating barrier wall.',
      flameReaction: 'Flame Test',
      mnemonic: 'Mnemonic',
      rustMeter: 'Red Rust Progress',
      mextKnowledgeTitle: '📘 Chemistry Knowledge & Facts',
      mextGlassDesc: 'High thermal-shock resistance borosilicate glass. Used for heating, boiling liquids, and performing chemical reactions safely.'
    },
    periodicTable: {
      title: '⚛️ Periodic Table of Elements',
      subtitle: (count: number) => `Complete ${count} Elements / Standard IUPAC Classification`,
      searchPlaceholder: 'Search by name, symbol, number...',
      radiusComparison: (on: boolean) => `📏 Atomic Radius Scale: ${on ? 'ON' : 'OFF'}`,
      filterLabel: 'Categories:',
      periodGroupHeader: 'Period＼Group',
      lanthanideLabel: '＊ Lanthanide Series (La〜Lu)',
      actinideLabel: '＊＊ Actinide Series (Ac〜Lr)',
      lanthanideShort: '＊Lanthanides',
      actinideShort: '＊＊Actinides',
      radioactivePill: '☢ Radioactive',
      atomScale: 'Atomic Radius',
      smallestInAll: '🌟 (Smallest in all elements)',
      largestNatural: '🌟 (Largest natural element)',
      largestStable: '🌟 (Largest stable element)',
      atomicNumber: 'Atomic Number',
      atomicWeight: 'Atomic Weight',
      category: 'Category',
      periodGroup: 'Period / Group',
      periodLabel: (p: number) => `Period ${p}`,
      groupLabel: (g: number) => `Group ${g}`,
      stateAtRoomTemp: 'State at 25°C',
      meltingBoiling: 'Melting / Boiling Point',
      molarMass: 'Molar Mass',
      mextTitle: '📘 Scientific Facts & Educational Insights',
      spawnBtn: (sym: string) => `🧪 Spawn this element in chamber (${sym})`,
      categories: {
        all: 'All',
        nonmetal: 'Nonmetal',
        'noble-gas': 'Noble Gas',
        'alkali-metal': 'Alkali Metal',
        'alkaline-earth': 'Alkaline Earth',
        metalloid: 'Metalloid',
        halogen: 'Halogen',
        'transition-metal': 'Transition Metal',
        'post-transition-metal': 'Post-transition Metal',
        lanthanide: 'Lanthanide',
        actinide: 'Actinide'
      }
    },
    encyclopedia: {
      title: '📖 Chemical Encyclopedia & Reactions',
      subtitle: 'Complete Inorganic & General Chemistry Reference',
      tabCompounds: (found: number, total: number) => `🧪 Compounds (${found}/${total})`,
      tabReactions: (found: number, total: number) => `⚗️ Discovered Reactions (${found}/${total})`,
      tabElements: (total: number) => `⚛️ Elements (${total})`,
      undiscoveredCompound: (elementsCount: number, stateStr: string) => `Undiscovered Compound (${elementsCount} elements / ${stateStr})`,
      undiscoveredCompoundHint: (toxic: boolean) => `${toxic ? '⚠️ Hazardous/Toxic Compound / ' : ''}Combine elements in the laboratory chamber to discover!`,
      undiscoveredReaction: '⚗️ Undiscovered Reaction',
      undiscoveredReactionHint: (name: string, cond: string) => `Hint: Try experimenting with [${name}] (${cond})!`,
      reactionHeatExo: (heat: number) => `+${heat}°C (Exothermic)`,
      reactionHeatEndo: (heat: number) => `${heat}°C (Endothermic)`,
      reactionHeatLabel: 'Enthalpy/Heat:',
      experimentCount: (cnt: number) => `Experiments: ${cnt} times`,
      mextFactTitle: 'Chemistry Notes:'
    },
    quests: {
      title: '🎯 Chemistry Quests & Challenges',
      subtitle: (done: number, total: number) => `Completed: ${done} / ${total}`,
      objective: 'Objective:',
      hint: 'Hint:',
      statusDone: '✅ Completed!',
      statusInProgress: '⏳ In Progress'
    },
    tutorial: {
      guideTitle: '🔰 Interactive Lab Guide',
      prevBtn: '◀ Prev',
      nextBtn: 'Next ▶',
      closeBtn: '✕ Close',
      startBtn: '🚀 Start Experimenting!',
      step1Title: '🔰 Step 1: Spawn an Element',
      step1Desc: 'Welcome to Element Lab! Here you can experiment with all 118 elements and synthesize real compounds. First, let\'s place **Hydrogen (H)** inside the chamber!',
      step1Goal: 'Select 【H】 from the bottom palette and tap anywhere inside the chamber.',
      step2Title: '⚗️ Step 2: Trigger a Chemical Reaction (Water Synthesis)',
      step2Desc: 'Hydrogen placed! Now select **Oxygen (O)** and place it right next to Hydrogen. When 2 Hydrogen atoms meet 1 Oxygen atom, a **Water molecule (H₂O)** is synthesized!',
      step2Goal: 'Select 【O】 from the bottom palette and place it near Hydrogen particles to make 【H₂O】!',
      step3Title: '🔥 Step 3: Heat with Burner & Boil into Steam',
      step3Desc: 'Water synthesized! Next, select **【🔥 Heat】** from the toolbar and warm up the water. When temperature exceeds 100°C, it phase-changes into gas (Steam ♨) and rises!',
      step3Goal: 'Select 【🔥 Heat】 and tap/drag over the water molecule to heat it up!',
      step4Title: '🏺 Step 4: Place Glassware to Contain Liquids',
      step4Desc: 'Steam floats up! Now select the **【🏺 Glassware】** tool to place laboratory borosilicate glassware. You can safely hold liquids and chemical reagents inside!',
      step4Goal: 'Select 【🏺 Glassware】 and tap the canvas to place a flask!',
      step5Title: '🔍 Step 5: Inspect Particles & Apparatus',
      step5Desc: 'Flask placed! Select **【🔍 Inspect】** and hover/tap on particles or flasks to inspect real-time temperature, mass, and chemistry curriculum facts in the top-right inspector!',
      step5Goal: 'Select 【🔍 Inspect】 and tap on particles or flasks to observe details!',
      step6Title: '🎉 Tutorial Complete!',
      step6Desc: 'Congratulations on mastering lab operations! Explore **【🎯 Quests】** at the top for fun challenges, and open **【📖 Encyclopedia】** or **【⚛️ Periodic Table】** to discover reactions freely!',
      step6Goal: 'Click "Start Experimenting!" to begin your scientific journey!'
    },
    toasts: {
      elementSelected: (name: string, sym?: string) => `Element [${name}${sym ? ` (${sym})` : ''}] selected! Tap inside the chamber to spawn.`,
      labCleared: 'Laboratory cleared',
      flaskPlaced: (name: string) => `🏺 Placed ${name}!`,
      ventilated: (count: number) => `💨 Chamber ventilated (purged ${count} gas particles)`,
      newCompound: (name: string, id: string) => `✨ New Compound Discovered: [${name} (${id})]! Added to Encyclopedia!`,
      questComplete: (title: string) => `🎉 Quest Completed: "${title}"!`
    }
  }
};

export function t() {
  return TRANSLATIONS[currentLanguage];
}
