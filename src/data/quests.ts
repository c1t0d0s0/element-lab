import { Language, Grade } from '../i18n';

export interface Quest {
  id: string;
  // どの学年向けのミッションか (学年モードで分けて表示する)
  grade: Grade;
  // このミッションに使う道具 (滴定・平衡のボタンなど) が、この学年モードでしか出ない
  requiresGrade?: Grade;
  titleJa: string;
  titleEn?: string;
  categoryJa: string;
  categoryEn?: string;
  objectiveJa: string;
  objectiveEn?: string;
  hintJa: string;
  hintEn?: string;
  mextNoteJa: string;
  mextNoteEn?: string;
  checkCompletion: (stats: GameStats) => boolean;
}

export interface GameStats {
  createdCompounds: Record<string, number>;
  triggeredReactions: Record<string, number>;
  spawnedElements: Record<string, number>;
  maxTemperatureReached: number;
  minTemperatureReached: number;
  balanceUsedCount?: number;
  balanceBalancedCount?: number;
  shatteredFlasks?: number;
  indicatorResults?: Record<string, number>; // 指示薬の色の発見 (キー例: 'BTB:acid')
  flameTestsSeen?: Record<string, number>; // 炎色反応を見た元素
  goldSparksSeen?: Record<string, number>; // 炭・鉄が燃えて金色の火花を散らすのを見た元素
  fireworksLaunched?: number;
  maxFireworkColors?: number; // 1発の花火に使った色の最大数
  dissolvedSolutes?: Record<string, number>; // 水に溶かした物質
  saturatedSolutes?: Record<string, number>; // 溶け残りが出るまで溶かした (飽和させた) 物質
  crystallizedSolutes?: Record<string, number>; // 水溶液から結晶として取り出した物質
  massConservation?: Record<string, number>; // 天秤で確かめた質量保存 ('sealed_same': 密閉で変わらない、'open_lighter': 開いた容器で軽くなる)
  electrodeElectrolysis?: Record<string, number>; // 電極をつないだビーカーで起こした電気分解 (反応ID)
  periodicTrendsViewed?: Record<string, number>; // 周期表を値で色分けして見た (電気陰性度・イオン化エネルギーなど)
  equilibriumReached?: Record<string, number>; // 反応速度と化学平衡ラボで平衡に達した ('reactants' = H₂ と I₂ から、'product' = HI から)
  maxSealedPressure?: number; // 蓋をした容器の中の圧力の最高値 (kPa)
  titrationEndpoints?: Record<string, number>; // 中和滴定で、中和点とほぼ同じところで指示薬の色が変わった ('CH3COOH:Phenolphthalein' など)
  temperaturePlateaus?: Record<string, number>; // 温度グラフで見た、状態変化中の温度が一定の部分 (キー例: 'H2O:boiling')
  fireWentOut?: Record<string, number>; // 栓をした容器の中で、酸素がなくなって炭の火が消えたのを見た ('sealed')
  waterStatesSeen?: Record<string, number>; // 水がなったのを見たすがた ('solid' = 氷、'liquid' = 水、'gas' = 水蒸気)
}

export function getQuestTitle(q: Quest, lang: Language): string {
  return lang === 'en' && q.titleEn ? q.titleEn : q.titleJa;
}

export function getQuestCategory(q: Quest, lang: Language): string {
  return lang === 'en' && q.categoryEn ? q.categoryEn : q.categoryJa;
}

export function getQuestObjective(q: Quest, lang: Language): string {
  return lang === 'en' && q.objectiveEn ? q.objectiveEn : q.objectiveJa;
}

export function getQuestHint(q: Quest, lang: Language): string {
  return lang === 'en' && q.hintEn ? q.hintEn : q.hintJa;
}

export function getQuestNote(q: Quest, lang: Language): string {
  return lang === 'en' && q.mextNoteEn ? q.mextNoteEn : q.mextNoteJa;
}

export const QUESTS_DATA: Quest[] = [
  {
    id: 'quest_water',
    grade: 'junior',
    titleJa: 'ミッション1: 水（H₂O）を作ろう！',
    titleEn: 'Mission 1: Synthesize Water (H₂O)!',
    categoryJa: '入門・中学2年理科',
    categoryEn: 'Introductory Chemistry',
    objectiveJa: '実験室で「水（H₂O）」を3個以上合成する。',
    objectiveEn: 'Synthesize 3 or more Water (H₂O) molecules in the lab.',
    hintJa: '水素（H）粒子2個と酸素（O）粒子1個を近づけるか、H₂とO₂の気体にバーナーやスパークで点火してみましょう。',
    hintEn: 'Place 2 Hydrogen (H) and 1 Oxygen (O) nearby, or ignite H₂ and O₂ gases with a burner or spark.',
    mextNoteJa: '【学習ポイント】水素と酸素の化合では熱と光が発生します。化学反応式: 2H₂ + O₂ → 2H₂O',
    mextNoteEn: '[Key Point] Hydrogen and oxygen combine with heat and light release. Equation: 2H₂ + O₂ → 2H₂O',
    checkCompletion: (stats) => (stats.createdCompounds['H2O'] || 0) >= 3
  },
  {
    id: 'quest_floating_gas',
    grade: 'junior',
    titleJa: 'ミッション2: 軽い気体を浮かべよう！',
    titleEn: 'Mission 2: Float Light Gases!',
    categoryJa: '物理・化学基礎',
    categoryEn: 'Physical Properties',
    objectiveJa: '空気より軽い気体「He」または「H₂」を5個以上出現させて上昇させる。',
    objectiveEn: 'Spawn 5 or more lighter-than-air gas particles (He or H₂) to let them float upward.',
    hintJa: 'ヘリウム（He）や水素（H）を配置してみましょう。空気（分子量28.8）より軽いため浮力で上に昇っていきます。',
    hintEn: 'Spawn Helium (He) or Hydrogen (H). Because their molar mass is less than air (28.8 g/mol), buoyancy carries them upward.',
    mextNoteJa: '【学習ポイント】Heは原子半径が極小（31pm）で非常に軽く、不活性で安全なため気球や風船に使われます。',
    mextNoteEn: '[Key Point] Helium has an ultra-small atomic radius (31pm), is inert and non-flammable, making it ideal for airships and balloons.',
    checkCompletion: (stats) => ((stats.spawnedElements['He'] || 0) + (stats.createdCompounds['H2'] || 0)) >= 5
  },
  {
    id: 'quest_red_rust',
    grade: 'junior',
    titleJa: 'ミッション3: 鉄を錆びさせよう（赤サビ）',
    titleEn: 'Mission 3: Rust Iron (Red Rust)',
    categoryJa: '中学2年・高校化学',
    categoryEn: 'Corrosion & Oxidation',
    objectiveJa: '鉄（Fe）に水と酸素を触れさせて「酸化鉄（赤サビ Fe₂O₃）」を1個以上生成する。',
    objectiveEn: 'Form 1 or more Iron(III) Oxide (Red Rust Fe₂O₃) by exposing Iron (Fe) to water and oxygen.',
    hintJa: '鉄（Fe）を4個ほど置き、水（H₂O）と酸素（O₂）を触れさせておくと、常温で時間とともにサビが進み赤褐色の酸化鉄になります。食塩（NaCl）も加えると化学カイロのように一気に進みます。',
    hintEn: 'Place about 4 Iron (Fe) with Water (H₂O) and Oxygen (O₂). Over time at room temperature, rust builds up into reddish-brown iron oxide. Adding salt (NaCl) makes it react at once, like a hand warmer.',
    mextNoteJa: '【学習ポイント】鉄の腐食（赤サビ）には「水」と「酸素」の両方が必須です。どちらか片方だけでは錆びません。',
    mextNoteEn: '[Key Point] Both water and oxygen are required for iron corrosion. Without either, red rust will not form.',
    checkCompletion: (stats) => (stats.createdCompounds['Fe2O3'] || 0) >= 1
  },
  {
    id: 'quest_black_rust',
    grade: 'high',
    titleJa: 'ミッション4: 赤熱鉄と水蒸気で黒サビを作れ！',
    titleEn: 'Mission 4: Form Black Rust with Red-Hot Iron & Steam!',
    categoryJa: '高校化学・無機物質',
    categoryEn: 'Inorganic Chemistry',
    objectiveJa: '鉄（Fe）をバーナーで500℃以上に赤熱させ、100℃以上の水蒸気を当てて「四酸化三鉄（Fe₃O₄）」と水素を生成する。',
    objectiveEn: 'Heat Iron (Fe) to >500°C (red-hot) and expose to steam (>100°C) to synthesize Triiron Tetroxide (Fe₃O₄) and Hydrogen.',
    hintJa: '鉄（Fe）と水（H₂O）を配置し、バーナーで激しく加熱して鉄を赤熱（発光）させ、水蒸気を接触させてみましょう。',
    hintEn: 'Place Iron (Fe) and Water (H₂O), heat vigorously until iron glows red-hot, and let high-temp steam react with it.',
    mextNoteJa: '【学習ポイント】高温下では 3Fe + 4H₂O → Fe₃O₄ + 4H₂ の反応が起き、中華鍋などの表面を守る良質な黒サビ被膜ができます。',
    mextNoteEn: '[Key Point] At high temps, 3Fe + 4H₂O → Fe₃O₄ + 4H₂ creates protective black oxide coating used on iron woks.',
    checkCompletion: (stats) => (stats.createdCompounds['Fe3O4'] || 0) >= 1
  },
  {
    id: 'quest_combustion_co2',
    grade: 'junior',
    titleJa: 'ミッション5: 完全燃焼でCO₂を作ろう！',
    titleEn: 'Mission 5: Complete Combustion to form CO₂!',
    categoryJa: '中学2年理科',
    categoryEn: 'Combustion Reactions',
    objectiveJa: '炭素（C）を十分な酸素（O₂）のもとで加熱し、「二酸化炭素（CO₂）」を2個以上生成する。',
    objectiveEn: 'Heat Carbon (C) in ample Oxygen (O₂) to produce 2 or more Carbon Dioxide (CO₂) molecules.',
    hintJa: '炭素（C）の周りに酸素（O₂）を複数配置し、バーナーで加熱してみましょう。',
    hintEn: 'Place multiple Oxygen (O₂) particles around Carbon (C) and heat with the burner.',
    mextNoteJa: '【学習ポイント】酸素が不足すると有毒な一酸化炭素（CO）が発生しますが、十分な酸素があると完全燃焼してCO₂になります。',
    mextNoteEn: '[Key Point] Incomplete combustion with limited oxygen produces toxic CO, whereas complete combustion produces non-toxic CO₂.',
    checkCompletion: (stats) => (stats.createdCompounds['CO2'] || 0) >= 2
  },
  {
    id: 'quest_copper_reduction',
    grade: 'junior',
    titleJa: 'ミッション6: 酸化銅の炭素還元実験',
    titleEn: 'Mission 6: Reduction of Copper(II) Oxide with Carbon',
    categoryJa: '中学2年・最重要実験',
    categoryEn: 'Redox Reactions',
    objectiveJa: '酸化銅（CuO）と炭素（C）を加熱して還元し、赤褐色の「銅（Cu）」を生成する。',
    objectiveEn: 'Heat Copper(II) Oxide (CuO) and Carbon (C) to reduce it into metallic reddish Copper (Cu).',
    hintJa: '銅を酸化させてCuOを作った後（またはCuOに）、炭素（C）を接触させてバーナーで加熱してみましょう。',
    hintEn: 'Combine CuO with Carbon (C) and heat with the burner to strip oxygen away from copper.',
    mextNoteJa: '【学習ポイント】2CuO + C → 2Cu + CO₂。炭素が酸化銅から酸素を奪う「還元」の代表的実験です。',
    mextNoteEn: '[Key Point] 2CuO + C → 2Cu + CO₂. Classic reduction experiment where carbon removes oxygen from metal oxide.',
    checkCompletion: (stats) => (stats.triggeredReactions['copper_oxide_reduction'] || 0) >= 1
  },
  {
    id: 'quest_neutralization',
    grade: 'junior',
    titleJa: 'ミッション7: 酸とアルカリの中和反応',
    titleEn: 'Mission 7: Acid-Base Neutralization',
    categoryJa: '中学3年・イオン',
    categoryEn: 'Acids, Bases & Salts',
    objectiveJa: '塩化水素（HCl）と水酸化ナトリウム（NaOH）を反応させて「食塩（NaCl）」と水を作る。',
    objectiveEn: 'React Hydrogen Chloride (HCl) and Sodium Hydroxide (NaOH) to produce Salt (NaCl) and Water.',
    hintJa: 'HClとNaOHを同じ場所に配置して接触させてみましょう。中和熱とともにNaClが生成します。',
    hintEn: 'Bring HCl and NaOH into contact. The exothermic neutralization produces table salt (NaCl) and water.',
    mextNoteJa: '【学習ポイント】酸のH⁺とアルカリのOH⁻が結合してH₂Oになり、塩（NaCl）が生じます（HCl + NaOH → NaCl + H₂O）。',
    mextNoteEn: '[Key Point] H⁺ from acid and OH⁻ from base combine into H₂O along with salt (HCl + NaOH → NaCl + H₂O).',
    checkCompletion: (stats) => (stats.createdCompounds['NaCl'] || 0) >= 1
  },
  {
    id: 'quest_magnesium_combustion',
    grade: 'junior',
    titleJa: 'ミッション8: マグネシウムの燃焼（まばゆい閃光）',
    titleEn: 'Mission 8: Magnesium Combustion (Dazzling Flash)',
    categoryJa: '中学2年理科・最重要実験',
    categoryEn: 'Metal Oxidation',
    objectiveJa: 'マグネシウム（Mg）を酸素のもとで加熱・点火し、「酸化マグネシウム（MgO）」を2個以上生成する。',
    objectiveEn: 'Ignite Magnesium (Mg) in oxygen to produce 2 or more Magnesium Oxide (MgO) particles.',
    hintJa: 'マグネシウム（Mg）の周りに酸素（O₂）を配置し、バーナーやスパークで加熱・点火してみましょう。強烈な閃光とともに白色の粉末（MgO）ができます。',
    hintEn: 'Surround Magnesium (Mg) with Oxygen (O₂) and ignite. A brilliant white flash leaves behind white powder MgO.',
    mextNoteJa: '【学習ポイント】2Mg + O₂ → 2MgO。金属のマグネシウムが激しく発熱・発光して酸化され、質量の増加した白色の酸化マグネシウムになります。',
    mextNoteEn: '[Key Point] 2Mg + O₂ → 2MgO. Highly exothermic and luminous oxidation of metallic magnesium into white oxide powder.',
    checkCompletion: (stats) => (stats.createdCompounds['MgO'] || 0) >= 2
  },
  {
    id: 'quest_flame_reaction',
    grade: 'junior',
    titleJa: 'ミッション9: 炎色反応を観察しよう（リアカー無きK村…）',
    titleEn: 'Mission 9: Observe Flame Test Emission Colors',
    categoryJa: '中学・高校化学・最重要',
    categoryEn: 'Spectroscopy & Flame Tests',
    objectiveJa: 'ナトリウム（Na）、銅（Cu）、カルシウム（Ca）、カリウム（K）のいずれかを配置し、バーナー（🔥 加熱）で熱して炎色反応の炎を立ち上らせる。',
    objectiveEn: 'Place Na, Cu, Ca, or K, heat with burner to trigger characteristic atomic flame emissions.',
    hintJa: 'Na（黄）、Cu（青緑）、Ca（橙）、K（紫）などをキャンバスに置き、バーナーで加熱してみましょう。美しい特有色の炎が立ち上ります！',
    hintEn: 'Place Na (Yellow), Cu (Blue-Green), Ca (Brick Red), or K (Lilac) and heat to >200°C with the burner.',
    mextNoteJa: '【学習ポイント】金属元素を熱すると電子が励起され、特有の波長の光を放出します（花火の着色原理）。語呂合わせ: リアカー(Li:赤)無き(Na:黄)K村(K:紫)動力(Cu:青緑)借りる(Ca:橙)とする(Sr:紅)もくれない(Ba:黄緑)。',
    mextNoteEn: '[Key Point] Thermal energy excites outer electrons; relaxation emits discrete spectral photons characteristic of each metal cation (used in fireworks).',
    // 実際に炎色反応の炎を見たときだけ達成 (元素を置いて、別の場所を熱しただけでは達成しない)
    checkCompletion: (stats) => {
      const flameElements = ['Na', 'Cu', 'Ca', 'K', 'Li', 'Sr', 'Ba', 'Cs', 'Rb'];
      return flameElements.some(sym => (stats.flameTestsSeen?.[sym] || 0) > 0);
    }
  },
  {
    id: 'quest_electrolysis',
    grade: 'junior',
    titleJa: 'ミッション10: 水の電気分解に挑戦しよう！',
    titleEn: 'Mission 10: Electrolysis of Water',
    categoryJa: '中学2年理科・最重要実験',
    categoryEn: 'Electrochemistry',
    objectiveJa: '水（H₂O）に水酸化ナトリウム（NaOH）を少し溶かし、「⚡ 電気」ツールで通電して「水素（H₂）」と「酸素（O₂）」に分解する。',
    objectiveEn: 'Dissolve a little Sodium Hydroxide (NaOH) in Water (H₂O) and apply the Electricity tool (⚡) to decompose it into Hydrogen (H₂) and Oxygen (O₂).',
    hintJa: 'ビーカーに水（H₂O）を入れ、水酸化ナトリウム（NaOH）を1つ加えてから、下部メニューの「⚡ 電気」ツールでタップ・なぞってみましょう。純水は電気をほとんど通さないので、水酸化ナトリウムを溶かして電流を流れやすくするのがポイントです！',
    hintEn: 'Put Water (H₂O) in a beaker, add one Sodium Hydroxide (NaOH), then tap or drag with the "⚡ Electricity" tool. Pure water barely conducts, so dissolving NaOH lets the current flow!',
    mextNoteJa: '【学習ポイント】2H₂O → 2H₂ + O₂。電流のエネルギーによって水が水素と酸素（体積比 2 : 1）に分解されます。陰極に水素、陽極に酸素が集まります。純水は電流を通しにくいため、水酸化ナトリウムを溶かして実験します（水酸化ナトリウム自体は変化しません）。',
    mextNoteEn: '[Key Point] 2H₂O → 2H₂ + O₂. Electrical energy decomposes water into hydrogen (cathode) and oxygen (anode) in a 2:1 volume ratio.',
    // 水の電気分解そのものを起こしたときだけ達成 (亜鉛と塩酸などで水素ができても達成しない)
    checkCompletion: (stats) => (stats.triggeredReactions['water_electrolysis'] || 0) >= 1
  },
  {
    id: 'quest_balance_mass',
    grade: 'junior',
    titleJa: 'ミッション11: 天秤で物質の重さを比べてみよう！',
    titleEn: 'Mission 11: Compare Mass with the Pan Balance!',
    categoryJa: '中学1年・上皿天秤と質量',
    categoryEn: 'Mass & Density Measurement',
    objectiveJa: '「⚖️ 天秤」ツールで上皿天秤を設置し、左右の皿に物質を乗せて重さを比較する。',
    objectiveEn: 'Place a pan balance using the "⚖️ Balance" tool and place elements or compounds on both pans to compare their masses.',
    hintJa: 'ツールバーの「⚖️ 天秤」を選んで実験台をタップして天秤を置き、左右の皿に異なる元素（例: 水素Hと酸素O）を置いてみましょう。',
    hintEn: 'Select the "⚖️ Balance" tool and tap inside the chamber to place a balance. Put different elements (e.g. Hydrogen and Oxygen) on the two pans.',
    mextNoteJa: '【学習ポイント】上皿天秤は質量を比較する器具です。原子や分子によって固有のモル質量（原子量・分子量）があり、天秤でその差を物理的に確かめることができます。',
    mextNoteEn: '[Key Point] A pan balance compares mass. Each atom and molecule has an intrinsic molar mass (atomic/molecular weight), allowing direct physical comparison on the pans.',
    checkCompletion: (stats) => (stats.balanceUsedCount || 0) >= 1
  },
  {
    id: 'quest_btb_three_colors',
    grade: 'elementary',
    titleJa: 'ミッション12: BTB液を3色に変身させよう！',
    titleEn: 'Mission 12: Turn BTB Solution Into All Three Colors!',
    categoryJa: '小学6年・水溶液の性質',
    categoryEn: 'Acids, Alkalis & Indicators',
    objectiveJa: '指示薬のBTB液を、黄色（酸性）・緑色（中性）・青色（アルカリ性）の3色すべてに変える。',
    objectiveEn: 'Make BTB solution show all three colors: yellow (acidic), green (neutral) and blue (alkaline).',
    hintJa: '化合物の「指示薬」タブからBTB液を出してビーカーに入れよう。塩酸(HCl)や二酸化炭素(CO₂)を入れると…？水酸化ナトリウム(NaOH)やアンモニア(NH₃)なら…？',
    hintEn: 'Take BTB from the "Indicators" tab and put it in a beaker. What happens with HCl or CO₂? And with NaOH or NH₃?',
    mextNoteJa: '【小6 水溶液の性質】水溶液は酸性・中性・アルカリ性の3つに分けられます。BTB液は酸性で黄、中性で緑、アルカリ性で青になります。',
    mextNoteEn: '[Key Point] Solutions are acidic, neutral or alkaline. BTB is yellow in acid, green when neutral and blue in alkali.',
    checkCompletion: (stats) => ['acid', 'neutral', 'alkaline'].every(cls => (stats.indicatorResults?.[`BTB:${cls}`] || 0) > 0)
  },
  {
    id: 'quest_limewater',
    grade: 'elementary',
    titleJa: 'ミッション13: 石灰水を白くにごらせよう！',
    titleEn: 'Mission 13: Make Limewater Turn Cloudy!',
    categoryJa: '小学6年・ものの燃え方',
    categoryEn: 'Combustion & Carbon Dioxide',
    objectiveJa: '石灰水（水酸化カルシウム）に二酸化炭素をふれさせて、白くにごらせる。',
    objectiveEn: 'Bring carbon dioxide into contact with limewater (calcium hydroxide) to make it cloudy.',
    hintJa: '「指示薬」タブの石灰水(Ca(OH)₂)と、二酸化炭素(CO₂)を近づけよう。炭素(C)を燃やしてCO₂を作るのもおすすめ！',
    hintEn: 'Bring limewater (Ca(OH)₂ in the Indicators tab) close to CO₂. You can also burn carbon (C) to make CO₂!',
    mextNoteJa: '【小6 ものの燃え方】ものが燃えると二酸化炭素ができます。石灰水は二酸化炭素にふれると白くにごるので、二酸化炭素があるかを調べられます。',
    mextNoteEn: '[Key Point] Burning produces carbon dioxide. Limewater turns cloudy when it meets CO₂, so it can detect carbon dioxide.',
    checkCompletion: (stats) => (stats.triggeredReactions['limewater_co2_turbidity'] || 0) >= 1
  },
  {
    id: 'quest_fireworks',
    grade: 'elementary',
    titleJa: 'ミッション14: 3色の花火を打ち上げよう！',
    titleEn: 'Mission 14: Launch a Three-Color Firework!',
    categoryJa: '炎色反応・花火のしくみ',
    categoryEn: 'Flame Tests & Fireworks',
    objectiveJa: '炎色反応で3つ以上の色を見つけ、🎆花火工房で3色を使った花火を打ち上げる。',
    objectiveEn: 'Discover at least three flame test colors and launch a three-color firework in the 🎆 Fireworks Workshop.',
    hintJa: 'バーナー🔥でストロンチウム(Sr)・銅(Cu)・ナトリウム(Na)などを熱すると、炎の色が花火工房で使えるようになるよ。',
    hintEn: 'Heat strontium (Sr), copper (Cu), sodium (Na) and others with the 🔥 burner to unlock their colors in the workshop.',
    mextNoteJa: '【炎色反応】花火の色は、金属の炎色反応でつけられています。赤はストロンチウム、緑はバリウム、青緑は銅、黄色はナトリウムです。',
    mextNoteEn: '[Key Point] Firework colors come from metal flame tests: red from strontium, green from barium, blue-green from copper, yellow from sodium.',
    checkCompletion: (stats) => (stats.maxFireworkColors || 0) >= 3
  },
  {
    id: 'quest_dissolve_salt',
    grade: 'elementary',
    titleJa: 'ミッション15: 食塩をとけ残るまで水に溶かそう！',
    titleEn: 'Mission 15: Dissolve Salt Until No More Will Dissolve!',
    categoryJa: '小学5年・もののとけ方',
    categoryEn: 'Dissolving & Solubility',
    objectiveJa: '水に食塩（NaCl）を溶かし、さらに加えて、もう溶けきれずに溶け残りが出る（飽和する）ところを確かめる。',
    objectiveEn: 'Dissolve salt (NaCl) in water, then keep adding more until some is left undissolved (the solution is saturated).',
    hintJa: '「溶かす」タブから水（H₂O）を数つぶビーカーに入れ、食塩（NaCl）を1つずつ加えてみよう。水の量が少ないと、すぐに溶けきれなくなるよ。',
    hintEn: 'From the "Dissolve" tab, put a few water (H₂O) particles in a beaker and add salt (NaCl) one at a time. With little water it soon stops dissolving.',
    mextNoteJa: '【小5 もののとけ方】ものが水に溶けると見えなくなりますが、なくなったわけではなく、水溶液の重さは水と溶かしたものの重さの和になります。決まった量の水に溶ける量には限りがあり、水の量をふやすと溶ける量もふえます。',
    mextNoteEn: '[Key Point] A dissolved substance becomes invisible but is still there: the solution weighs as much as the water plus the solute. A given amount of water can only dissolve a limited amount, and more water dissolves more.',
    checkCompletion: (stats) => (stats.dissolvedSolutes?.['NaCl'] || 0) > 0 && (stats.saturatedSolutes?.['NaCl'] || 0) > 0
  },
  {
    id: 'quest_recrystallize',
    grade: 'elementary',
    titleJa: 'ミッション16: 水溶液から結晶を取り出そう！',
    titleEn: 'Mission 16: Get Crystals Back Out of a Solution!',
    categoryJa: '小学5年・中学1年・溶解度と再結晶',
    categoryEn: 'Solubility & Recrystallization',
    objectiveJa: '水に溶かした硝酸カリウム（KNO₃）かミョウバンを、冷やすか水を蒸発させて、結晶として取り出す。',
    objectiveEn: 'Dissolve potassium nitrate (KNO₃) or alum in water, then cool it or evaporate the water to get crystals back out.',
    hintJa: '温めた水に硝酸カリウムやミョウバンをたくさん溶かしてから、❄️ 冷却で冷やしてみよう。バーナー🔥で水を蒸発させても結晶が出てくるよ。',
    hintEn: 'Dissolve plenty of potassium nitrate or alum in warm water, then cool it with ❄️ Cool. Evaporating the water with the 🔥 burner also brings crystals out.',
    mextNoteJa: '【小5・中1 溶解度】100gの水に溶ける物質の最大の量を溶解度といいます。硝酸カリウムやミョウバンは温度が下がると溶解度が大きく下がるので、冷やすと溶けきれなくなった分が結晶として出てきます（再結晶）。食塩は温度による変化が小さいので、水を蒸発させて取り出します。',
    mextNoteEn: '[Key Point] Solubility is the largest mass that dissolves in 100 g of water. Potassium nitrate and alum become much less soluble as the water cools, so the excess comes out as crystals (recrystallization). Salt changes little with temperature, so it is recovered by evaporating the water.',
    checkCompletion: (stats) => ['KNO3', 'Alum'].some(id => (stats.crystallizedSolutes?.[id] || 0) > 0)
  },
  {
    id: 'quest_ethanol_combustion',
    grade: 'elementary',
    titleJa: 'ミッション17: アルコールランプの燃料を燃やそう！',
    titleEn: 'Mission 17: Burn Alcohol Lamp Fuel!',
    categoryJa: '小学6年・ものの燃え方',
    categoryEn: 'Combustion of Organic Matter',
    objectiveJa: 'エタノール（C₂H₅OH）を酸素（O₂）の中で燃やし、二酸化炭素と水ができるのを確かめる。',
    objectiveEn: 'Burn ethanol (C₂H₅OH) in oxygen (O₂) and confirm that carbon dioxide and water form.',
    hintJa: '「有機」タブのエタノールのまわりに酸素を3つ置いて、「💥 点火」で火をつけよう。できた気体を石灰水に近づけると…？',
    hintEn: 'Put three oxygen (O₂) around ethanol from the "Organic" tab and light it with "💥 Spark". What happens when the gas meets limewater?',
    mextNoteJa: '【小6 ものの燃え方】エタノールのように炭素をふくむ物（有機物）が燃えると、二酸化炭素ができます。水素もふくむので水もできます。C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O',
    mextNoteEn: '[Key Point] When substances containing carbon (organic matter) such as ethanol burn, they make carbon dioxide. Because they also contain hydrogen, water forms too. C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O',
    checkCompletion: (stats) => (stats.triggeredReactions['ethanol_combustion'] || 0) >= 1
  },
  {
    id: 'quest_silver_oxide',
    grade: 'junior',
    titleJa: 'ミッション18: 酸化銀を分解して銀を取り出そう！',
    titleEn: 'Mission 18: Break Down Silver Oxide to Get Silver!',
    categoryJa: '中学2年・分解（必修実験）',
    categoryEn: 'Decomposition',
    objectiveJa: '黒い酸化銀（Ag₂O）を加熱して、銀（Ag）と酸素（O₂）に分解する。',
    objectiveEn: 'Heat black silver oxide (Ag₂O) and break it down into silver (Ag) and oxygen (O₂).',
    hintJa: '「塩」タブの酸化銀を2つ並べて、バーナー🔥で熱してみよう。出てきた気体は何かな？',
    hintEn: 'Put two silver oxide particles from the "Salts" tab side by side and heat them with the 🔥 burner. What gas comes out?',
    mextNoteJa: '【中2 分解】2Ag₂O → 4Ag + O₂。1種類の物質が2種類以上の物質に分かれる化学変化を分解といいます。残った白い物質は、みがくと光り、電気を通すので金属（銀）です。',
    mextNoteEn: '[Key Point] 2Ag₂O → 4Ag + O₂. A chemical change in which one substance splits into two or more is called decomposition. The white solid left shines when rubbed and conducts electricity, so it is a metal (silver).',
    checkCompletion: (stats) => (stats.triggeredReactions['silver_oxide_decomposition'] || 0) >= 1
  },
  {
    id: 'quest_barium_sulfate_precipitate',
    grade: 'junior',
    titleJa: 'ミッション19: 中和で白い沈殿をつくろう！',
    titleEn: 'Mission 19: Make a White Precipitate by Neutralization!',
    categoryJa: '中学3年・中和と塩（必修実験）',
    categoryEn: 'Neutralization & Salts',
    objectiveJa: '硫酸（H₂SO₄）と水酸化バリウム（Ba(OH)₂）を中和させて、硫酸バリウム（BaSO₄）の白い沈殿をつくる。',
    objectiveEn: 'Neutralize sulfuric acid (H₂SO₄) with barium hydroxide (Ba(OH)₂) to make a white precipitate of barium sulfate (BaSO₄).',
    hintJa: '「酸・塩基」タブの硫酸と水酸化バリウムを近づけてみよう。',
    hintEn: 'Bring sulfuric acid and barium hydroxide from the "Acids/Bases" tab together.',
    mextNoteJa: '【中3 中和と塩】酸とアルカリが中和すると、水と塩ができます。硫酸と水酸化バリウムからできる塩（硫酸バリウム）は水にとけにくいので、白い沈殿になります。',
    mextNoteEn: '[Key Point] When an acid and an alkali neutralize each other, water and a salt form. The salt from sulfuric acid and barium hydroxide (barium sulfate) hardly dissolves in water, so it appears as a white precipitate.',
    checkCompletion: (stats) => (stats.triggeredReactions['sulfuric_acid_barium_hydroxide'] || 0) >= 1
  },
  {
    id: 'quest_ion_migration',
    grade: 'junior',
    titleJa: 'ミッション20: イオンの動きを見ながら塩化銅を電気分解しよう！',
    titleEn: 'Mission 20: Watch the Ions Move as You Electrolyze Copper Chloride!',
    categoryJa: '中学3年・イオン（必修実験）',
    categoryEn: 'Ions',
    objectiveJa: 'ビーカーの水に塩化銅（CuCl₂）を溶かして電極をつなぎ、陰極に銅（Cu）、陽極に塩素（Cl₂）を出す。',
    objectiveEn: 'Dissolve copper(II) chloride (CuCl₂) in water in a beaker, connect electrodes, and get copper (Cu) at the cathode and chlorine (Cl₂) at the anode.',
    hintJa: 'ビーカーに水を入れ、「塩」タブの塩化銅を加えよう。「⚡ 電気」ツールの「🔋 電極」を選んでビーカーをタップすると電流が流れるぞ。Cu²⁺ と Cl⁻ はどちらの電極へ動くかな？',
    hintEn: 'Fill a beaker with water and add copper(II) chloride from the "Salts" tab. Choose "🔋 Electrodes" in the "⚡ Electricity" tool and tap the beaker to switch on the current. Which electrode do Cu²⁺ and Cl⁻ move to?',
    mextNoteJa: '【中3 イオン】塩化銅は水の中で Cu²⁺ と Cl⁻ に分かれています（CuCl₂ → Cu²⁺ + 2Cl⁻）。電流を流すと、＋の電気をもつ銅イオンは陰極へ、−の電気をもつ塩化物イオンは陽極へ引き寄せられます。陰極では銅イオンが電子を2個受け取って銅になり（Cu²⁺ + 2e⁻ → Cu）、陽極では塩化物イオンが電子をわたして塩素になります（2Cl⁻ → Cl₂ + 2e⁻）。',
    mextNoteEn: '[Key Point] In water, copper(II) chloride is split into Cu²⁺ and Cl⁻ (CuCl₂ → Cu²⁺ + 2Cl⁻). With current flowing, positive copper ions are pulled to the cathode and negative chloride ions to the anode. At the cathode each copper ion gains two electrons and becomes copper (Cu²⁺ + 2e⁻ → Cu); at the anode chloride ions give up electrons and become chlorine (2Cl⁻ → Cl₂ + 2e⁻).',
    checkCompletion: (stats) => (stats.electrodeElectrolysis?.['copper_chloride_electrolysis'] || 0) >= 1
  },
  {
    id: 'quest_mass_conservation',
    grade: 'junior',
    titleJa: 'ミッション21: 質量保存の法則を天秤で確かめよう！',
    titleEn: 'Mission 21: Check the Law of Conservation of Mass on a Balance!',
    categoryJa: '中学2年・化学変化と質量（必修実験）',
    categoryEn: 'Chemical Changes & Mass',
    objectiveJa: '天秤にのせた容器の中で石灰石（CaCO₃）と塩酸（HCl）を反応させ、①密閉した容器では質量が変わらないこと、②蓋を外した容器では軽くなることを確かめる。',
    objectiveEn: 'React limestone (CaCO₃) with hydrochloric acid (HCl) in a container on a balance, and check that (1) the mass stays the same in a sealed container and (2) the container gets lighter once it is open.',
    hintJa: '天秤の皿にビーカーを置き、「塩」タブの炭酸カルシウムを入れて、ビーカーの口をタップして蓋をしよう。そこへ「酸・塩基」タブの塩化水素を2つ入れると反応するぞ。天秤の値を見てから、蓋を外してみよう。',
    hintEn: 'Put a beaker on a balance pan, add calcium carbonate from the "Salts" tab, and tap the mouth of the beaker to put on a lid. Then add two hydrogen chloride from the "Acids/Bases" tab to start the reaction. Watch the balance, then take the lid off.',
    mextNoteJa: '【中2 化学変化と質量】CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂。化学変化の前後で、物質全体の質量は変わりません（質量保存の法則）。原子の組み合わせが変わるだけで、原子の種類と数は変わらないからです。容器が開いていると、発生した二酸化炭素が空気中へ出ていくので、その分だけ軽くなります。',
    mextNoteEn: '[Key Point] CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂. The total mass of the substances does not change in a chemical change (the law of conservation of mass), because the atoms only change partners while their kinds and numbers stay the same. If the container is open, the carbon dioxide that forms escapes into the air, so the container gets lighter by that amount.',
    checkCompletion: (stats) => (stats.massConservation?.['sealed_same'] || 0) >= 1 && (stats.massConservation?.['open_lighter'] || 0) >= 1
  },
  {
    id: 'quest_ionization_tendency',
    grade: 'junior',
    titleJa: 'ミッション22: 金属のイオンへのなりやすさをくらべよう！',
    titleEn: 'Mission 22: Compare How Easily Metals Form Ions!',
    categoryJa: '中学3年・金属のイオンへのなりやすさ（必修実験）',
    categoryEn: 'How Easily Metals Form Ions',
    objectiveJa: '①硫酸銅水溶液に亜鉛（Zn）を入れて銅を出す。②硫酸亜鉛水溶液にマグネシウム（Mg）を入れて亜鉛を出す。マグネシウム・亜鉛・銅のイオンへのなりやすさの順を確かめる。',
    objectiveEn: '(1) Put zinc (Zn) in copper sulfate solution to get copper. (2) Put magnesium (Mg) in zinc sulfate solution to get zinc. Find the order in which magnesium, zinc and copper form ions.',
    hintJa: 'ビーカーに水を入れ、「塩」タブの硫酸銅を溶かしてから亜鉛を入れよう。次は硫酸亜鉛を溶かした水にマグネシウムを入れてみよう。水に溶かさないと反応しないぞ。銅を硫酸亜鉛水溶液に入れるとどうなるかな？',
    hintEn: 'Fill a beaker with water, dissolve copper sulfate from the "Salts" tab, then add zinc. Next, put magnesium in water with zinc sulfate dissolved in it. They only react in solution. What happens if you put copper in zinc sulfate solution?',
    mextNoteJa: '【中3 金属のイオンへのなりやすさ】Zn + Cu²⁺ → Zn²⁺ + Cu、Mg + Zn²⁺ → Mg²⁺ + Zn。イオンになりやすい金属は電子を出して陽イオンになり、水溶液中のイオンになりにくい金属の陽イオンが電子を受け取って金属として出てきます。銅を硫酸亜鉛水溶液に入れても変化しません。イオンへのなりやすさは Mg ＞ Zn ＞ Cu の順です。',
    mextNoteEn: '[Key Point] Zn + Cu²⁺ → Zn²⁺ + Cu, Mg + Zn²⁺ → Mg²⁺ + Zn. A metal that forms ions more easily gives up electrons and becomes a cation, while the cations of a metal that forms ions less easily take those electrons and come out as metal. Copper in zinc sulfate solution does not change. The order is Mg > Zn > Cu.',
    checkCompletion: (stats) => (stats.triggeredReactions['zinc_copper_sulfate'] || 0) >= 1 && (stats.triggeredReactions['magnesium_zinc_sulfate'] || 0) >= 1
  },
  {
    id: 'quest_daniell_cell',
    grade: 'junior',
    titleJa: 'ミッション23: ダニエル電池でモーターを回そう！',
    titleEn: 'Mission 23: Turn a Motor with a Daniell Cell!',
    categoryJa: '中学3年・化学変化と電池（必修実験）',
    categoryEn: 'Chemical Changes & Batteries',
    objectiveJa: 'ビーカーをダニエル電池にして、亜鉛板の側に硫酸亜鉛水溶液、銅板の側に硫酸銅水溶液を入れ、電流を流してモーターを回す。',
    objectiveEn: 'Turn a beaker into a Daniell cell, put zinc sulfate solution on the zinc side and copper sulfate solution on the copper side, and run a current to turn the motor.',
    hintJa: 'ビーカーに水を入れて、「⚡ 電気」ツールの「⚙️ 電池」を選んでビーカーをタップしよう。セロハンの左（亜鉛板の側）に硫酸亜鉛、右（銅板の側）に硫酸銅を入れると…？',
    hintEn: 'Fill a beaker with water, choose "⚙️ Battery" in the "⚡ Electricity" tool and tap the beaker. Add zinc sulfate on the left of the cellophane (zinc side) and copper sulfate on the right (copper side)...',
    mextNoteJa: '【中3 化学変化と電池】−極（亜鉛板）: Zn → Zn²⁺ + 2e⁻、＋極（銅板）: Cu²⁺ + 2e⁻ → Cu。亜鉛板から出た電子が導線を通って銅板へ移動するので、電流は銅板（＋極）から亜鉛板（−極）へ流れます。セロハンは2つの水溶液がすぐに混ざらないようにしながら、イオンを少しずつ通します。物質のもつ化学エネルギーが電気エネルギーに変わる装置を化学電池といいます。',
    mextNoteEn: '[Key Point] Negative plate (zinc): Zn → Zn²⁺ + 2e⁻; positive plate (copper): Cu²⁺ + 2e⁻ → Cu. Electrons from the zinc travel through the wire to the copper, so current flows from the copper (+) to the zinc (−). The cellophane keeps the two solutions from mixing right away while letting ions slowly pass. A device that turns the chemical energy of substances into electrical energy is called a chemical cell (battery).',
    checkCompletion: (stats) => (stats.triggeredReactions['daniell_cell'] || 0) >= 1
  },
  {
    id: 'quest_temperature_graph',
    grade: 'junior',
    titleJa: 'ミッション24: 温度グラフで氷がとけて水が沸騰するようすを見よう！',
    titleEn: 'Mission 24: Graph Ice Melting and Water Boiling!',
    categoryJa: '中学1年・状態変化と温度',
    categoryEn: 'Changes of State & Temperature',
    objectiveJa: '氷（固体の水）の温度を温度グラフに記録しながら加熱し、①融けている間は0℃、②沸騰している間は100℃のまま温度が変わらないことを確かめる。',
    objectiveEn: 'Record the temperature of ice (solid water) on the temperature graph while heating it, and check that the temperature stays at (1) 0°C while it melts and (2) 100°C while it boils.',
    hintJa: '水を置いて ❄️ 冷却で氷にしよう。🔍 観察で氷の粒を選び、「📈 温度グラフ」を押してから、🔥 加熱を続けてみよう。グラフに黄色の平らな部分が2回あらわれるかな？',
    hintEn: 'Place water and freeze it with ❄️ Cool. Choose an ice particle with 🔍 Inspect, press "📈 Temperature graph", then keep heating it with 🔥. Do two flat yellow parts appear on the graph?',
    mextNoteJa: '【中1 状態変化と温度】純粋な物質では、固体がとけて液体になる温度（融点）と、液体が沸騰して気体になる温度（沸点）が決まっています。状態が変わっている間は、加えた熱が状態を変えるのに使われるので、加熱を続けても温度は変わりません。水の融点は0℃、沸点は100℃です。',
    mextNoteEn: '[Key Point] A pure substance has a fixed temperature at which its solid melts into a liquid (melting point) and at which its liquid boils into a gas (boiling point). While the state is changing, the added heat goes into changing the state, so the temperature stays the same even if you keep heating. Water melts at 0°C and boils at 100°C.',
    checkCompletion: (stats) => (stats.temperaturePlateaus?.['H2O:melting'] || 0) >= 1 && (stats.temperaturePlateaus?.['H2O:boiling'] || 0) >= 1
  },
  {
    id: 'quest_periodic_trends',
    grade: 'high',
    requiresGrade: 'high',
    titleJa: 'ミッション25: 周期表で元素の性質の周期的な変化を見つけよう！',
    titleEn: 'Mission 25: Find the Periodic Trends in the Periodic Table!',
    categoryJa: '高校化学・元素の周期律',
    categoryEn: 'Periodic Law (High School)',
    objectiveJa: '周期表を「電気陰性度」と「第一イオン化エネルギー」で色分けして、周期表の位置で値がどう変わるかを見る。',
    objectiveEn: 'Color the periodic table by "electronegativity" and by "first ionization energy," and see how the values change with position in the table.',
    hintJa: '上の「⚛️ 周期表」を開き、「色分け」を切り替えてみよう。いちばん明るい色はどこにあるかな？元素を選ぶと、電子殻の図も見られるぞ。',
    hintEn: 'Open "⚛️ Periodic" at the top and switch "Color by". Where are the brightest colors? Choose an element to see its electron shells too.',
    mextNoteJa: '【高校 元素の周期律】元素を原子番号の順に並べると、性質が周期的に変わります（周期律）。電気陰性度は周期表の右上（フッ素）ほど大きく、第一イオン化エネルギーは同じ周期では右へ（希ガスで最大）、同じ族では上へいくほど大きくなります。これは、価電子の数と、原子核が最外殻電子を引きつける強さが周期的に変わるためです。',
    mextNoteEn: '[Key Point] When the elements are arranged by atomic number, their properties change periodically (the periodic law). Electronegativity is largest at the top right (fluorine), and the first ionization energy rises to the right across a period (highest for noble gases) and upward in a group. This is because the number of valence electrons and how strongly the nucleus holds the outermost electrons change periodically.',
    checkCompletion: (stats) => (stats.periodicTrendsViewed?.['electronegativity'] || 0) >= 1 && (stats.periodicTrendsViewed?.['ionizationEnergy'] || 0) >= 1
  },
  {
    id: 'quest_titration',
    grade: 'high',
    requiresGrade: 'high',
    titleJa: 'ミッション26: 指示薬を選んで中和滴定をしよう！',
    titleEn: 'Mission 26: Choose the Right Indicator for a Titration!',
    categoryJa: '高校 化学基礎・中和滴定',
    categoryEn: 'Neutralization Titration (High School)',
    objectiveJa: '中和滴定ラボで、酢酸水溶液を水酸化ナトリウム水溶液で、アンモニア水を塩酸で滴定する。それぞれ合う指示薬を選び、中和点（±0.2 mL）で色が変わるのを確かめる。',
    objectiveEn: 'In the Titration Lab, titrate acetic acid with sodium hydroxide, and ammonia solution with hydrochloric acid. Choose a suitable indicator for each and see it change color at the equivalence point (±0.2 mL).',
    hintJa: '上の「🧪 滴定」を開こう。中和点の pH を考えて、変色域が pH の急な変化（pH ジャンプ）に入る指示薬を選ぶのがコツ。メチルオレンジは酸性側、フェノールフタレインは塩基性側で色が変わるぞ。',
    hintEn: 'Open "🧪 Titration" at the top. Think about the pH at the equivalence point and pick an indicator whose color change range lies inside the steep pH jump. Methyl orange changes on the acidic side, phenolphthalein on the basic side.',
    mextNoteJa: '【高校 化学基礎 中和滴定】濃度のわかった酸（塩基）で、濃度のわからない塩基（酸）を中和して濃度を求める操作を中和滴定といいます。中和点では、酸の H⁺ と塩基の OH⁻ の物質量が等しくなります（価数 × 濃度 × 体積 が等しい）。弱酸と強塩基の中和点は塩基性（CH₃COONa ができる）なのでフェノールフタレイン、強酸と弱塩基の中和点は酸性（NH₄Cl ができる）なのでメチルオレンジを使います。強酸と強塩基では pH ジャンプが大きいので、どちらも使えます。',
    mextNoteEn: '[Key Point] Neutralization titration finds an unknown concentration of a base (or acid) by neutralizing it with an acid (or base) of known concentration. At the equivalence point the amounts of H⁺ from the acid and OH⁻ from the base are equal (valence × concentration × volume match). A weak acid with a strong base has a basic equivalence point (CH₃COONa forms), so use phenolphthalein; a strong acid with a weak base has an acidic one (NH₄Cl forms), so use methyl orange. A strong acid with a strong base has a large pH jump, so either works.',
    checkCompletion: (stats) => (stats.titrationEndpoints?.['CH3COOH:Phenolphthalein'] || 0) >= 1 && (stats.titrationEndpoints?.['NH3:MethylOrange'] || 0) >= 1
  },
  {
    id: 'quest_limewater_clears',
    grade: 'high',
    titleJa: 'ミッション27: 白くにごった石灰水を透明にもどそう！',
    titleEn: 'Mission 27: Turn Milky Limewater Clear Again!',
    categoryJa: '高校化学・カルシウムの化合物',
    categoryEn: 'Calcium Compounds (High School)',
    objectiveJa: '石灰水に二酸化炭素を入れ続けて、白いにごり（炭酸カルシウム）が溶けて透明になるのを見る。その液を加熱して、再び白くにごるのも確かめる。',
    objectiveEn: 'Keep adding carbon dioxide to limewater until the milky calcium carbonate dissolves and it turns clear. Then heat the liquid and see it turn milky again.',
    hintJa: 'ビーカーに水と石灰水(Ca(OH)₂)を入れ、二酸化炭素(CO₂)をたくさん入れよう。石灰水がなくなってからも CO₂ を入れ続けるのがコツ。透明になったら🔥で80℃以上に温めてみよう。',
    hintEn: 'Put water and limewater (Ca(OH)₂) in a beaker and add plenty of carbon dioxide (CO₂). Keep adding CO₂ even after the limewater is used up. Once it is clear, heat it 🔥 above 80°C.',
    mextNoteJa: '【高校 化学】石灰水に CO₂ を通すと CaCO₃ の白い沈殿ができて白くにごりますが、さらに通し続けると CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ の反応で水に溶ける炭酸水素カルシウムになり、透明にもどります。加熱すると逆向きに反応して再び白くにごります。石灰岩の地域で、雨水（CO₂ をふくむ）が石灰岩を溶かして鍾乳洞ができ、しみ出した水から CaCO₃ がまた出てきて鍾乳石ができるのも、この反応です。',
    mextNoteEn: '[Key Point] CO₂ turns limewater milky with a white precipitate of CaCO₃, but if you keep bubbling it, CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ forms calcium hydrogen carbonate, which dissolves, and the liquid turns clear. Heating reverses the reaction and it turns milky again. In limestone areas, rainwater containing CO₂ dissolves limestone to form caves, and CaCO₃ coming back out of dripping water forms stalactites: the same reaction.',
    checkCompletion: (stats) => (stats.triggeredReactions['limewater_excess_co2'] || 0) >= 1 && (stats.triggeredReactions['calcium_hydrogen_carbonate_decomposition'] || 0) >= 1
  },
  {
    id: 'quest_gas_law',
    grade: 'high',
    titleJa: 'ミッション28: 密閉した容器の圧力を上げよう！',
    titleEn: 'Mission 28: Raise the Pressure in a Sealed Container!',
    categoryJa: '高校化学・気体の法則',
    categoryEn: 'Gas Laws (High School)',
    objectiveJa: '容器に栓（ふた）をして、中の圧力を 150 kPa 以上にする（はじめは大気圧 約101 kPa）。',
    objectiveEn: 'Seal a container and raise the pressure inside to 150 kPa or more (it starts at about 101 kPa, atmospheric pressure).',
    hintJa: 'フラスコに栓をすると、上に圧力が出るぞ。🔥で温めるか、中に気体をたくさん入れてみよう。気体の粒1つを 1 mmol とした目安じゃ。',
    hintEn: 'Seal a flask and its pressure appears above it. Heat it 🔥 or put lots of gas inside. Each gas particle counts as 1 mmol (an estimate).',
    mextNoteJa: '【高校 化学 気体の法則】気体の圧力 P、体積 V、物質量 n、絶対温度 T の間には PV = nRT（気体の状態方程式）が成り立ちます。体積が一定の密閉容器では、温めると絶対温度に比例して圧力が上がり、気体を加えると物質量に比例して圧力が上がります。混ぜた気体の圧力は、それぞれの気体の圧力（分圧）の和になります。',
    mextNoteEn: '[Key Point] Pressure P, volume V, amount n and absolute temperature T of a gas obey PV = nRT (the ideal gas law). In a sealed container of fixed volume, heating raises the pressure in proportion to the absolute temperature, and adding gas raises it in proportion to the amount. The pressure of a gas mixture is the sum of each gas\'s partial pressure.',
    checkCompletion: (stats) => (stats.maxSealedPressure || 0) >= 150
  },
  {
    id: 'quest_equilibrium',
    grade: 'high',
    requiresGrade: 'high',
    titleJa: 'ミッション29: どちらから始めても同じ平衡になることを確かめよう！',
    titleEn: 'Mission 29: Reach the Same Equilibrium from Both Sides!',
    categoryJa: '高校化学・反応速度と化学平衡',
    categoryEn: 'Reaction Rate & Equilibrium (High School)',
    objectiveJa: '反応速度と化学平衡ラボで、H₂ と I₂ から始めた場合と、HI だけから始めた場合の両方で平衡状態（v₁ = v₂）にする。',
    objectiveEn: 'In the Reaction Rate & Equilibrium lab, reach equilibrium (v₁ = v₂) both when starting from H₂ and I₂ and when starting from HI only.',
    hintJa: '上の「⚖️ 平衡」を開こう。温度が高いほど早く平衡に着くぞ。平衡になったら、はじめの物質を「HI だけ」に変えてもう一度。',
    hintEn: 'Open "⚖️ Equilibrium" at the top. The higher the temperature, the sooner it reaches equilibrium. Then switch the starting substance to "HI only" and try again.',
    mextNoteJa: '【高校 化学 反応速度と化学平衡】反応の速さは濃度と温度で変わり、温度が高いほど速くなります（活性化エネルギーをこえる分子がふえるため）。可逆反応では、正反応と逆反応の速さが等しくなった平衡状態で濃度が変わらなくなり、[HI]²/([H₂][I₂]) は温度で決まる平衡定数 K になります。H₂ と I₂ から始めても、HI から始めても、同じ温度・同じ量なら同じ平衡状態になります。',
    mextNoteEn: '[Key Point] Reaction rates depend on concentration and temperature, and rise with temperature (more molecules get over the activation energy). In a reversible reaction, concentrations stop changing at equilibrium, when the forward and reverse rates are equal, and [HI]²/([H₂][I₂]) equals the equilibrium constant K, which depends only on temperature. Starting from H₂ and I₂ or from HI gives the same equilibrium at the same temperature and amounts.',
    checkCompletion: (stats) => (stats.equilibriumReached?.['reactants'] || 0) >= 1 && (stats.equilibriumReached?.['product'] || 0) >= 1
  },
  {
    id: 'quest_water_states',
    grade: 'elementary',
    titleJa: 'ミッション30: 水を氷にも水蒸気にも変身させよう！',
    titleEn: 'Mission 30: Turn Water Into Ice and Into Steam!',
    categoryJa: '小学4年・水のすがた',
    categoryEn: 'Ice, Water & Steam',
    objectiveJa: '水（H₂O）を冷やして氷（固体）にし、温めて水蒸気（気体）にする。',
    objectiveEn: 'Cool water (H₂O) until it becomes ice (a solid), and heat it until it becomes steam (a gas).',
    hintJa: '「基本」タブの水（H₂O）を置いて、❄️ 冷却をしばらく当てると0℃で氷になるよ。🔥 加熱を当て続けると、100℃でふっとうして水蒸気になって上にのぼっていくよ。',
    hintEn: 'Place water (H₂O) from the "Basic" tab and keep ❄️ Cool on it: it freezes at 0°C. Keep 🔥 Heat on it and it boils at 100°C, rising as steam.',
    mextNoteJa: '【小4 水のすがた】水は温度によって、氷（固体）・水（液体）・水蒸気（気体）とすがたを変えます。水は0℃でこおり、100℃近くでふっとうします。水蒸気は目に見えません。湯気の白いけむりは、水蒸気が冷えて小さな水のつぶにもどったものです。',
    mextNoteEn: '[Key Point] Depending on its temperature, water changes between ice (solid), water (liquid) and steam (gas). Water freezes at 0°C and boils at about 100°C. Steam itself is invisible; the white mist you see is steam that has cooled back into tiny drops of water.',
    checkCompletion: (stats) => (stats.waterStatesSeen?.['solid'] || 0) >= 1 && (stats.waterStatesSeen?.['gas'] || 0) >= 1
  },
  {
    id: 'quest_metal_in_acid',
    grade: 'elementary',
    titleJa: 'ミッション31: 塩酸で金属をとかそう！',
    titleEn: 'Mission 31: Dissolve a Metal in Hydrochloric Acid!',
    categoryJa: '小学6年・水溶液の性質',
    categoryEn: 'Acids & Metals',
    objectiveJa: 'アルミニウム（Al）か鉄（Fe）に塩酸（HCl）をふれさせて、あわを出しながらとけるのを見る。',
    objectiveEn: 'Bring hydrochloric acid (HCl) into contact with aluminium (Al) or iron (Fe) and watch it dissolve while fizzing.',
    hintJa: 'ビーカーに鉄（Fe）を1つ入れて、「酸・塩基」タブの塩酸（HCl）を2つ近づけてみよう。アルミニウム（Al）なら、Al 2つに塩酸6つだよ。出てくるあわは何の気体かな？',
    hintEn: 'Put one iron (Fe) in a beaker and bring two hydrochloric acid (HCl) from the "Acids/Bases" tab close to it. For aluminium (Al), use 2 Al and 6 HCl. What gas is in the bubbles?',
    mextNoteJa: '【小6 水溶液の性質】塩酸は、アルミニウムや鉄などの金属をとかします。このとき出るあわは水素です。とけた液から水を蒸発させると、もとの金属とはちがう白や黄色っぽい粉が出てきます。金属は、べつのものに変わったのです。Fe + 2HCl → FeCl₂ + H₂',
    mextNoteEn: '[Key Point] Hydrochloric acid dissolves metals such as aluminium and iron, and the bubbles are hydrogen. If you evaporate the water from the solution, a powder that is not the original metal is left: the metal has changed into a different substance. Fe + 2HCl → FeCl₂ + H₂',
    checkCompletion: (stats) => (stats.triggeredReactions['aluminium_hcl_reaction'] || 0) >= 1 || (stats.triggeredReactions['iron_acid_reaction'] || 0) >= 1
  },
  {
    id: 'quest_burning_and_air',
    grade: 'elementary',
    titleJa: 'ミッション32: 炭を燃やして、できた気体を石灰水で調べよう！',
    titleEn: 'Mission 32: Burn Charcoal and Test the Gas With Limewater!',
    categoryJa: '小学6年・ものの燃え方と空気',
    categoryEn: 'Burning & Air',
    objectiveJa: '炭（炭素 C）を酸素（O₂）の中で燃やして二酸化炭素を作り、その二酸化炭素で石灰水を白くにごらせる。',
    objectiveEn: 'Burn charcoal (carbon, C) in oxygen (O₂) to make carbon dioxide, then use that carbon dioxide to turn limewater cloudy.',
    hintJa: 'ビーカーに炭素（C）を置き、まわりに酸素（O₂）をたっぷり入れて、🔥 加熱で200℃より熱くしよう。「指示薬」タブの石灰水（Ca(OH)₂）を炭のすぐとなりに置いておくと…？酸素がないと燃えないことも、ためしてみよう。',
    hintEn: 'Put carbon (C) in a beaker with plenty of oxygen (O₂) around it and heat it above 200°C with 🔥 Heat. Put limewater (Ca(OH)₂ in the "Indicators" tab) right next to the charcoal and see what happens. Also try it without oxygen: it will not burn.',
    mextNoteJa: '【小6 ものの燃え方と空気】ものが燃えるには酸素が必要です。ものが燃えると、空気中の酸素の一部が使われて、二酸化炭素ができます。二酸化炭素は石灰水を白くにごらせます。ちっ素は、ものを燃やすはたらきがありません。C + O₂ → CO₂',
    mextNoteEn: '[Key Point] Burning needs oxygen. When something burns, part of the oxygen in the air is used up and carbon dioxide forms, which turns limewater cloudy. Nitrogen does not help things burn. C + O₂ → CO₂',
    checkCompletion: (stats) => (stats.triggeredReactions['carbon_complete_combustion'] || 0) >= 1 && (stats.triggeredReactions['limewater_co2_turbidity'] || 0) >= 1
  },
  {
    id: 'quest_fire_goes_out',
    grade: 'elementary',
    titleJa: 'ミッション33: ふたをしたびんの中で、火が消えるわけを調べよう！',
    titleEn: 'Mission 33: Find Out Why a Fire Goes Out in a Closed Jar!',
    categoryJa: '小学6年・ものの燃え方と空気',
    categoryEn: 'Burning & Air',
    objectiveJa: '栓をした容器の中で炭（炭素 C）を燃やし、酸素がなくなると、炭が熱いままでも燃えなくなる（火が消える）のを確かめる。',
    objectiveEn: 'Burn charcoal (carbon, C) inside a stoppered container and see that once the oxygen is used up, the charcoal stops burning even though it is still hot (the fire goes out).',
    hintJa: '🏺 フラスコを置いて、中に炭素（C）を3つと酸素（O₂）を1つ入れよう。🔍 観察でフラスコを選び、栓をしてから 🔥 加熱で200℃より熱くしよう。酸素を使いきったあとも、炭を温めつづけると…？',
    hintEn: 'Place a 🏺 flask and put 3 carbon (C) and 1 oxygen (O₂) inside. Choose the flask with 🔍 Inspect, put the stopper on, then heat it above 200°C with 🔥 Heat. What happens if you keep heating the charcoal after the oxygen is used up?',
    mextNoteJa: '【小6 ものの燃え方と空気】ものが燃えつづけるには、新しい空気（酸素）が必要です。ふたをしたびんの中では、燃えると酸素が使われて少なくなり、火が消えてしまいます。実際には酸素が全部なくなる前（空気中の約21%から約17%まで減ったころ）に火が消えます。びんの下にすき間をあけて空気が入れかわるようにすると、燃えつづけます。酸素が足りないまま燃えると、体に毒な一酸化炭素ができることもあるので、部屋で火を使うときは換気が大切です。',
    mextNoteEn: '[Key Point] To keep burning, a fire needs fresh air (oxygen). In a closed jar, burning uses up the oxygen and the fire goes out. In real life it goes out before all the oxygen is gone (when it drops from about 21% to about 17% of the air). If air can flow in through a gap at the bottom of the jar, the fire keeps burning. Burning without enough oxygen can also make poisonous carbon monoxide, which is why rooms need fresh air when something is burning.',
    checkCompletion: (stats) => (stats.fireWentOut?.['sealed'] || 0) >= 1
  }
];
