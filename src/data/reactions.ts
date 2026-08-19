export interface ReactionCondition {
  minTemp?: number; // 最低必要温度 (°C)
  maxTemp?: number; // 最高制限温度 (°C)
  requiresSpark?: boolean; // 火花・点火が必要か
  requiresMoisture?: boolean; // 水分の存在が必要か
  timeFactor?: number; // 反応完了までの所要時間 (フレーム数または接触時間係数)
}

export interface ReactionRule {
  id: string;
  nameJa: string;
  equation: string; // 化学反応式 (例: "2H₂ + O₂ → 2H₂O")
  descriptionJa: string;
  mextCategoryJa: string; // 文科省の単元 (例: "中学2年: 物質どうしの化学変化", "高校化学: 酸化還元")
  reactants: { type: 'element' | 'compound'; id: string; count: number }[];
  products: { type: 'element' | 'compound'; id: string; count: number }[];
  condition: ReactionCondition;
  heatRelease: number; // 反応熱 (正: 発熱反応で周囲を加熱, 負: 吸熱反応)
  soundEffect: 'spark' | 'water' | 'burn' | 'rust' | 'pop' | 'steam' | 'fizz';
  visualEffect?: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud';
}

export const REACTIONS_DATA: ReactionRule[] = [
  {
    id: 'water_synthesis_atomic',
    nameJa: '水の合成 (原子から)',
    equation: '2H + O → H₂O',
    descriptionJa: '2つの水素原子と1つの酸素原子が結合して水分子（H₂O）が生成されます。',
    mextCategoryJa: '中学2年: 化合と化学変化',
    reactants: [
      { type: 'element', id: 'H', count: 2 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'h2_synthesis',
    nameJa: '水素分子の形成',
    equation: '2H → H₂',
    descriptionJa: '2つの水素原子が共有結合して安定な水素分子（H₂）になります。',
    mextCategoryJa: '中学2年・高校化学: 化学結合',
    reactants: [
      { type: 'element', id: 'H', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'o2_synthesis',
    nameJa: '酸素分子の形成',
    equation: '2O → O₂',
    descriptionJa: '2つの酸素原子が二重結合して酸素分子（O₂）になります。',
    mextCategoryJa: '中学2年・高校化学: 化学結合',
    reactants: [
      { type: 'element', id: 'O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'O2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'water_combustion',
    nameJa: '水素の燃焼・爆発反応',
    equation: '2H₂ + O₂ → 2H₂O',
    descriptionJa: '水素気体と酸素気体の混合気に点火または加熱すると、激しい爆発音とともに水が生成します。',
    mextCategoryJa: '中学2年: 酸化と燃焼 / 高校化学: 反応熱',
    reactants: [
      { type: 'compound', id: 'H2', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 250,
      requiresSpark: false
    },
    heatRelease: 200,
    soundEffect: 'spark',
    visualEffect: 'explosion'
  },
  {
    id: 'iron_red_rust',
    nameJa: '鉄の赤サビ生成 (常温酸化)',
    equation: '4Fe + 3O₂ + 6H₂O → 2Fe₂O₃·3H₂O',
    descriptionJa: '常温で鉄が水分と酸素に触れ続けることで、徐々に酸化されて脆い赤サビ（酸化鉄(III)）ができます。',
    mextCategoryJa: '中学2年: 身の回りの化学変化 / 高校化学: 金属の腐食',
    reactants: [
      { type: 'element', id: 'Fe', count: 2 },
      { type: 'compound', id: 'O2', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'Fe2O3', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {
      maxTemp: 150,
      timeFactor: 1
    },
    heatRelease: 10,
    soundEffect: 'rust',
    visualEffect: 'smoke'
  },
  {
    id: 'iron_steam_black_rust',
    nameJa: '赤熱鉄と高温水蒸気の反応 (黒サビ生成)',
    equation: '3Fe + 4H₂O(気) → Fe₃O₄ + 4H₂',
    descriptionJa: '赤熱した鉄（>500℃）に高温の水蒸気（>100℃）を通すと、緻密な黒サビ（四酸化三鉄）が生成し、水素ガスが発生します。',
    mextCategoryJa: '高校化学: 無機物質・遷移元素の性質',
    reactants: [
      { type: 'element', id: 'Fe', count: 3 },
      { type: 'compound', id: 'H2O', count: 4 }
    ],
    products: [
      { type: 'compound', id: 'Fe3O4', count: 1 },
      { type: 'compound', id: 'H2', count: 4 }
    ],
    condition: {
      minTemp: 250
    },
    heatRelease: 80,
    soundEffect: 'steam',
    visualEffect: 'glow'
  },
  {
    id: 'carbon_incomplete_combustion',
    nameJa: '不完全燃焼 (一酸化炭素の生成)',
    equation: '2C + O₂ → 2CO',
    descriptionJa: '酸素が不十分な環境で炭素を燃焼させると、無色・無臭で猛毒の一酸化炭素（CO）が発生します。',
    mextCategoryJa: '中学2年: 燃焼と換気 / 高校化学: 炭素化合物',
    reactants: [
      { type: 'element', id: 'C', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CO', count: 2 }
    ],
    condition: {
      minTemp: 120
    },
    heatRelease: 60,
    soundEffect: 'burn',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'carbon_complete_combustion',
    nameJa: '炭素の完全燃焼 (二酸化炭素の生成)',
    equation: 'C + O₂ → CO₂',
    descriptionJa: '炭素が十分な酸素の中で燃焼すると、熱と光を出して無害な二酸化炭素（CO₂）になります。',
    mextCategoryJa: '中学2年: 酸化と還元',
    reactants: [
      { type: 'element', id: 'C', count: 1 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 120,
    soundEffect: 'burn',
    visualEffect: 'sparkles'
  },
  {
    id: 'co_combustion',
    nameJa: '一酸化炭素の燃焼',
    equation: '2CO + O₂ → 2CO₂',
    descriptionJa: '一酸化炭素が青い炎を上げて燃焼し、安定な二酸化炭素（CO₂）に変化します。',
    mextCategoryJa: '高校化学: 気体の性質',
    reactants: [
      { type: 'compound', id: 'CO', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 2 }
    ],
    condition: {
      minTemp: 250
    },
    heatRelease: 140,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'copper_oxidation',
    nameJa: '銅の酸化 (黒色化)',
    equation: '2Cu + O₂ → 2CuO',
    descriptionJa: '赤褐色の銅を空気中で加熱すると、空気中の酸素と化合して表面が真っ黒な酸化銅(II)になります。',
    mextCategoryJa: '中学2年: 金属の酸化と質量変化',
    reactants: [
      { type: 'element', id: 'Cu', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CuO', count: 2 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 50,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'copper_oxide_reduction',
    nameJa: '酸化銅の炭素による還元',
    equation: '2CuO + C → 2Cu + CO₂',
    descriptionJa: '黒色の酸化銅(II)と炭素粉末を混ぜて強熱すると、炭素が酸素を奪い（還元）、赤褐色の金属銅と二酸化炭素が生じます。',
    mextCategoryJa: '中学2年: 酸化と還元 (最重要実験)',
    reactants: [
      { type: 'compound', id: 'CuO', count: 2 },
      { type: 'element', id: 'C', count: 1 }
    ],
    products: [
      { type: 'element', id: 'Cu', count: 2 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {
      minTemp: 350
    },
    heatRelease: 40,
    soundEffect: 'burn',
    visualEffect: 'sparkles'
  },
  {
    id: 'methane_combustion',
    nameJa: 'メタンの燃焼',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    descriptionJa: '天然ガスの主成分メタンが酸素と反応して燃焼し、二酸化炭素と水が発生します。',
    mextCategoryJa: '中学2年: 有機物の燃焼 / 高校化学: 炭化水素',
    reactants: [
      { type: 'compound', id: 'CH4', count: 1 },
      { type: 'compound', id: 'O2', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 250
    },
    heatRelease: 180,
    soundEffect: 'burn',
    visualEffect: 'explosion'
  },
  {
    id: 'neutralization',
    nameJa: '中和反応 (塩酸 + 水酸化ナトリウム)',
    equation: 'HCl + NaOH → NaCl + H₂O',
    descriptionJa: '強酸の塩酸と強塩基の水酸化ナトリウムが中和し、食塩（NaCl）と水（H₂O）が生じ、中和熱が発生します。',
    mextCategoryJa: '中学3年: 酸・アルカリと塩 / 高校化学: 中和滴定',
    reactants: [
      { type: 'compound', id: 'HCl', count: 1 },
      { type: 'compound', id: 'NaOH', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaCl', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {},
    heatRelease: 70,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'zinc_acid_reaction',
    nameJa: '亜鉛と塩酸の反応 (水素の発生)',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂',
    descriptionJa: '金属の亜鉛にうすい塩酸を加えると、激しく泡（水素ガス）を出しながら溶けて塩化亜鉛になります。',
    mextCategoryJa: '中学1年・3年: 気体の発生・イオン / 高校化学: イオン化傾向',
    reactants: [
      { type: 'element', id: 'Zn', count: 1 },
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'ZnCl2', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  }
];
