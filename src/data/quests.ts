export interface Quest {
  id: string;
  titleJa: string;
  categoryJa: string; // 例: "入門", "中学理科", "高校化学"
  objectiveJa: string;
  hintJa: string;
  mextNoteJa: string;
  checkCompletion: (stats: GameStats) => boolean;
}

export interface GameStats {
  createdCompounds: Record<string, number>;
  triggeredReactions: Record<string, number>;
  spawnedElements: Record<string, number>;
  maxTemperatureReached: number;
  minTemperatureReached: number;
}

export const QUESTS_DATA: Quest[] = [
  {
    id: 'quest_water',
    titleJa: 'ミッション1: 水（H₂O）を作ろう！',
    categoryJa: '入門・中学2年理科',
    objectiveJa: '実験室で「水（H₂O）」を3個以上合成する。',
    hintJa: '水素（H）粒子2個と酸素（O）粒子1個を近づけるか、H₂とO₂の気体にバーナーやスパークで点火してみましょう。',
    mextNoteJa: '【文科省ポイント】水素と酸素の化合では熱と光が発生します。化学反応式: 2H₂ + O₂ → 2H₂O',
    checkCompletion: (stats) => (stats.createdCompounds['H2O'] || 0) >= 3
  },
  {
    id: 'quest_floating_gas',
    titleJa: 'ミッション2: 軽い気体を浮かべよう！',
    categoryJa: '物理・化学基礎',
    objectiveJa: '空気より軽い気体「He」または「H₂」を5個以上出現させて上昇させる。',
    hintJa: 'ヘリウム（He）や水素（H）を配置してみましょう。空気（分子量28.8）より軽いため浮力で上に昇っていきます。',
    mextNoteJa: '【文科省ポイント】Heは原子半径が極小（31pm）で非常に軽く、不活性で安全なため気球や風船に使われます。',
    checkCompletion: (stats) => ((stats.spawnedElements['He'] || 0) + (stats.createdCompounds['H2'] || 0)) >= 5
  },
  {
    id: 'quest_red_rust',
    titleJa: 'ミッション3: 鉄を錆びさせよう（赤サビ）',
    categoryJa: '中学2年・高校化学',
    objectiveJa: '鉄（Fe）に水と酸素を触れさせて「酸化鉄（赤サビ Fe₂O₃）」を1個以上生成する。',
    hintJa: '鉄（Fe）を置き、水（H₂O）と酸素（OまたはO₂）を触れさせると、常温で時間とともに酸化が進み赤褐色になります。',
    mextNoteJa: '【文科省ポイント】鉄の腐食（赤サビ）には「水」と「酸素」の両方が必須です。どちらか片方だけでは錆びません。',
    checkCompletion: (stats) => (stats.createdCompounds['Fe2O3'] || 0) >= 1
  },
  {
    id: 'quest_black_rust',
    titleJa: 'ミッション4: 赤熱鉄と水蒸気で黒サビを作れ！',
    categoryJa: '高校化学・無機物質',
    objectiveJa: '鉄（Fe）をバーナーで500℃以上に赤熱させ、100℃以上の水蒸気を当てて「四酸化三鉄（Fe₃O₄）」と水素を生成する。',
    hintJa: '鉄（Fe）と水（H₂O）を配置し、バーナーで激しく加熱して鉄を赤熱（発光）させ、水蒸気を接触させてみましょう。',
    mextNoteJa: '【文科省ポイント】高温下では 3Fe + 4H₂O → Fe₃O₄ + 4H₂ の反応が起き、中華鍋などの表面を守る良質な黒サビ被膜ができます。',
    checkCompletion: (stats) => (stats.createdCompounds['Fe3O4'] || 0) >= 1
  },
  {
    id: 'quest_combustion_co2',
    titleJa: 'ミッション5: 完全燃焼でCO₂を作ろう！',
    categoryJa: '中学2年理科',
    objectiveJa: '炭素（C）を十分な酸素（O₂）のもとで加熱し、「二酸化炭素（CO₂）」を2個以上生成する。',
    hintJa: '炭素（C）の周りに酸素（O₂）を複数配置し、バーナーで加熱してみましょう。',
    mextNoteJa: '【文科省ポイント】酸素が不足すると有毒な一酸化炭素（CO）が発生しますが、十分な酸素があると完全燃焼してCO₂になります。',
    checkCompletion: (stats) => (stats.createdCompounds['CO2'] || 0) >= 2
  },
  {
    id: 'quest_copper_reduction',
    titleJa: 'ミッション6: 酸化銅の炭素還元実験',
    categoryJa: '中学2年・最重要実験',
    objectiveJa: '酸化銅（CuO）と炭素（C）を加熱して還元し、赤褐色の「銅（Cu）」を生成する。',
    hintJa: '銅を酸化させてCuOを作った後（またはCuOに）、炭素（C）を接触させてバーナーで加熱してみましょう。',
    mextNoteJa: '【文科省ポイント】2CuO + C → 2Cu + CO₂。炭素が酸化銅から酸素を奪う「還元」の代表的実験です。',
    checkCompletion: (stats) => (stats.triggeredReactions['copper_oxide_reduction'] || 0) >= 1
  },
  {
    id: 'quest_neutralization',
    titleJa: 'ミッション7: 酸とアルカリの中和反応',
    categoryJa: '中学3年・イオン',
    objectiveJa: '塩化水素（HCl）と水酸化ナトリウム（NaOH）を反応させて「食塩（NaCl）」と水を作る。',
    hintJa: 'HClとNaOHを同じ場所に配置して接触させてみましょう。中和熱とともにNaClが生成します。',
    mextNoteJa: '【文科省ポイント】酸のH⁺とアルカリのOH⁻が結合してH₂Oになり、塩（NaCl）が生じます（HCl + NaOH → NaCl + H₂O）。',
    checkCompletion: (stats) => (stats.createdCompounds['NaCl'] || 0) >= 1
  }
];
