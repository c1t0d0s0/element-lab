import { Language } from '../i18n';

export interface Quest {
  id: string;
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
  }
];
