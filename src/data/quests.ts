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
    mextNoteJa: '【文科省ポイント】水素と酸素の化合では熱と光が発生します。化学反応式: 2H₂ + O₂ → 2H₂O',
    mextNoteEn: '[Science Fact] Hydrogen and oxygen combine with heat and light release. Equation: 2H₂ + O₂ → 2H₂O',
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
    mextNoteJa: '【文科省ポイント】Heは原子半径が極小（31pm）で非常に軽く、不活性で安全なため気球や風船に使われます。',
    mextNoteEn: '[Science Fact] Helium has an ultra-small atomic radius (31pm), is inert and non-flammable, making it ideal for airships and balloons.',
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
    hintJa: '鉄（Fe）を置き、水（H₂O）と酸素（OまたはO₂）を触れさせると、常温で時間とともに酸化が進み赤褐色になります。',
    hintEn: 'Place Iron (Fe), Water (H₂O), and Oxygen (O/O₂). Over time at room temperature, oxidation turns it reddish-brown.',
    mextNoteJa: '【文科省ポイント】鉄の腐食（赤サビ）には「水」と「酸素」の両方が必須です。どちらか片方だけでは錆びません。',
    mextNoteEn: '[Science Fact] Both water and oxygen are required for iron corrosion. Without either, red rust will not form.',
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
    mextNoteJa: '【文科省ポイント】高温下では 3Fe + 4H₂O → Fe₃O₄ + 4H₂ の反応が起き、中華鍋などの表面を守る良質な黒サビ被膜ができます。',
    mextNoteEn: '[Science Fact] At high temps, 3Fe + 4H₂O → Fe₃O₄ + 4H₂ creates protective black oxide coating used on iron woks.',
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
    mextNoteJa: '【文科省ポイント】酸素が不足すると有毒な一酸化炭素（CO）が発生しますが、十分な酸素があると完全燃焼してCO₂になります。',
    mextNoteEn: '[Science Fact] Incomplete combustion with limited oxygen produces toxic CO, whereas complete combustion produces non-toxic CO₂.',
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
    mextNoteJa: '【文科省ポイント】2CuO + C → 2Cu + CO₂。炭素が酸化銅から酸素を奪う「還元」の代表的実験です。',
    mextNoteEn: '[Science Fact] 2CuO + C → 2Cu + CO₂. Classic reduction experiment where carbon removes oxygen from metal oxide.',
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
    mextNoteJa: '【文科省ポイント】酸のH⁺とアルカリのOH⁻が結合してH₂Oになり、塩（NaCl）が生じます（HCl + NaOH → NaCl + H₂O）。',
    mextNoteEn: '[Science Fact] H⁺ from acid and OH⁻ from base combine into H₂O along with salt (HCl + NaOH → NaCl + H₂O).',
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
    mextNoteJa: '【文科省ポイント】2Mg + O₂ → 2MgO。金属のマグネシウムが激しく発熱・発光して酸化され、質量の増加した白色の酸化マグネシウムになります。',
    mextNoteEn: '[Science Fact] 2Mg + O₂ → 2MgO. Highly exothermic and luminous oxidation of metallic magnesium into white oxide powder.',
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
    mextNoteJa: '【文科省ポイント】金属元素を熱すると電子が励起され、特有の波長の光を放出します（花火の着色原理）。語呂合わせ: リアカー(Li:赤)無き(Na:黄)K村(K:紫)動力(Cu:青緑)借りる(Ca:橙)とする(Sr:紅)もくれない(Ba:黄緑)。',
    mextNoteEn: '[Science Fact] Thermal energy excites outer electrons; relaxation emits discrete spectral photons characteristic of each metal cation (used in fireworks).',
    checkCompletion: (stats) => {
      const flameElements = ['Na', 'Cu', 'Ca', 'K', 'Li', 'Sr', 'Ba', 'Cs', 'Rb'];
      const hasSpawnedFlame = flameElements.some(sym => (stats.spawnedElements[sym] || 0) >= 1);
      return hasSpawnedFlame && (stats.maxTemperatureReached >= 200);
    }
  },
  {
    id: 'quest_electrolysis',
    titleJa: 'ミッション10: 水の電気分解に挑戦しよう！',
    titleEn: 'Mission 10: Electrolysis of Water',
    categoryJa: '中学2年理科・最重要実験',
    categoryEn: 'Electrochemistry',
    objectiveJa: '水（H₂O）を配置し、「⚡ 電気」ツールで通電して「水素（H₂）」または「酸素（O₂）」に分解する。',
    objectiveEn: 'Place Water (H₂O) and apply the Electricity tool (⚡) to decompose it into Hydrogen (H₂) or Oxygen (O₂).',
    hintJa: '水（H₂O）をキャンバスやフラスコの中に置き、下部メニューの「⚡ 電気」ツールでタップ・なぞってみましょう。電気が通ってブクブクと気体が発生します！',
    hintEn: 'Place Water (H₂O) and tap or drag with the "⚡ Electricity" tool. Electrolysis generates bubbles of H₂ and O₂ gases.',
    mextNoteJa: '【文科省ポイント】2H₂O → 2H₂ + O₂。電流のエネルギーによって水が水素と酸素（体積比 2 : 1）に分解されます。陰極に水素、陽極に酸素が集まります。',
    mextNoteEn: '[Science Fact] 2H₂O → 2H₂ + O₂. Electrical energy decomposes water into hydrogen (cathode) and oxygen (anode) in a 2:1 volume ratio.',
    checkCompletion: (stats) => ((stats.createdCompounds['H2'] || 0) >= 1 || (stats.createdCompounds['O2'] || 0) >= 1 || (stats.createdCompounds['Cl2'] || 0) >= 1)
  }
];
