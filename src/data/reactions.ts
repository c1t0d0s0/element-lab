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
  visualEffect?: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud' | 'flash';
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
      { type: 'element', id: 'Fe', count: 4 },
      { type: 'compound', id: 'O2', count: 3 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'Fe2O3', count: 2 },
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
  },
  {
    id: 'magnesium_combustion',
    nameJa: 'マグネシウムの燃焼 (激しい発光と発熱)',
    equation: '2Mg + O₂ → 2MgO',
    descriptionJa: '銀白色のマグネシウムを空気中で加熱・点火すると、まばゆい白色の閃光を放って激しく燃焼し、白色の酸化マグネシウム（MgO）が生成します。',
    mextCategoryJa: '中学2年: 酸化と燃焼 (最重要実験)',
    reactants: [
      { type: 'element', id: 'Mg', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'MgO', count: 2 }
    ],
    condition: {
      minTemp: 220
    },
    heatRelease: 280,
    soundEffect: 'spark',
    visualEffect: 'flash'
  },
  {
    id: 'magnesium_oxidation_atomic',
    nameJa: 'マグネシウムの酸化 (原子から)',
    equation: 'Mg + O → MgO',
    descriptionJa: 'マグネシウム原子と酸素原子が直接化合して酸化マグネシウムになります。',
    mextCategoryJa: '中学2年: 化合と酸化',
    reactants: [
      { type: 'element', id: 'Mg', count: 1 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'MgO', count: 1 }
    ],
    condition: {},
    heatRelease: 90,
    soundEffect: 'spark',
    visualEffect: 'flash'
  },
  {
    id: 'magnesium_co2_combustion',
    nameJa: '二酸化炭素中でのマグネシウム燃焼',
    equation: '2Mg + CO₂ → 2MgO + C',
    descriptionJa: '激しく燃えるマグネシウムは二酸化炭素（CO₂）中でも燃焼を続け、CO₂から酸素を奪って白色のMgOと黒い炭素（C）を生じます。',
    mextCategoryJa: '中学2年発展・高校化学: 酸化還元反応',
    reactants: [
      { type: 'element', id: 'Mg', count: 2 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'MgO', count: 2 },
      { type: 'element', id: 'C', count: 1 }
    ],
    condition: {
      minTemp: 280
    },
    heatRelease: 220,
    soundEffect: 'burn',
    visualEffect: 'flash'
  },
  {
    id: 'h2o2_synthesis_atomic',
    nameJa: '過酸化水素の合成 (水酸化)',
    equation: 'H₂O + O → H₂O₂',
    descriptionJa: '水分子に酸素原子が結合して過酸化水素（H₂O₂）が生成されます。',
    mextCategoryJa: '高校化学: 酸素化合物と酸化力',
    reactants: [
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O2', count: 1 }
    ],
    condition: {},
    heatRelease: 40,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'h2o2_synthesis_gas',
    nameJa: '過酸化水素の合成 (気体酸化)',
    equation: '2H₂O + O₂ → 2H₂O₂',
    descriptionJa: '高温・高エネルギー下で水と酸素が反応して過酸化水素水が合成されます。',
    mextCategoryJa: '高校化学: 酸化還元',
    reactants: [
      { type: 'compound', id: 'H2O', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O2', count: 2 }
    ],
    condition: {
      minTemp: 180
    },
    heatRelease: 30,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'mno2_synthesis',
    nameJa: '二酸化マンガンの合成',
    equation: 'Mn + O₂ → MnO₂',
    descriptionJa: 'マンガンが酸化されて黒色の二酸化マンガン（MnO₂）になります。',
    mextCategoryJa: '高校化学: 遷移元素・触媒',
    reactants: [
      { type: 'element', id: 'Mn', count: 1 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'MnO2', count: 1 }
    ],
    condition: {
      minTemp: 150
    },
    heatRelease: 100,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'h2o2_catalytic_decomposition',
    nameJa: '過酸化水素水の触媒分解 (酸素の発生)',
    equation: '2H₂O₂ + MnO₂ → 2H₂O + O₂ + MnO₂',
    descriptionJa: '過酸化水素水に二酸化マンガン（触媒）を加えると、激しく気泡（酸素）を放出して水と酸素に分解します。二酸化マンガン自身は消費されません。',
    mextCategoryJa: '中学1年・2年: 気体の発生 (最重要実験) / 高校化学: 無機触媒',
    reactants: [
      { type: 'compound', id: 'H2O2', count: 2 },
      { type: 'compound', id: 'MnO2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O', count: 2 },
      { type: 'compound', id: 'O2', count: 1 },
      { type: 'compound', id: 'MnO2', count: 1 } // 触媒として再生
    ],
    condition: {},
    heatRelease: 90,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'h2o2_thermal_decomposition',
    nameJa: '過酸化水素水の熱分解',
    equation: '2H₂O₂ → 2H₂O + O₂',
    descriptionJa: '過酸化水素水を加熱すると熱分解して水と酸素になります。',
    mextCategoryJa: '中学理科: 熱分解',
    reactants: [
      { type: 'compound', id: 'H2O2', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2O', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    condition: {
      minTemp: 70
    },
    heatRelease: 50,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'sulfur_combustion',
    nameJa: '硫黄の燃焼 (二酸化硫黄の生成)',
    equation: 'S + O₂ → SO₂',
    descriptionJa: '黄色の硫黄が青い炎を上げて燃焼し、刺激臭をもつ有毒な二酸化硫黄（SO₂）が発生します。',
    mextCategoryJa: '中学2年・高校化学: 非金属の酸化',
    reactants: [
      { type: 'element', id: 'S', count: 1 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'SO2', count: 1 }
    ],
    condition: {
      minTemp: 180
    },
    heatRelease: 120,
    soundEffect: 'burn',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'so2_oxidation_contact',
    nameJa: '二酸化硫黄の接触酸化 (接触法 Step 1)',
    equation: '2SO₂ + O₂ → 2SO₃',
    descriptionJa: '二酸化硫黄を空気中で加熱・酸化して三酸化硫黄（SO₃）を合成します（工業的硫酸製造の接触法）。',
    mextCategoryJa: '高校化学: 硫酸の工業的製法 (接触法)',
    reactants: [
      { type: 'compound', id: 'SO2', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'SO3', count: 2 }
    ],
    condition: {
      minTemp: 250
    },
    heatRelease: 100,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'sulfuric_acid_synthesis',
    nameJa: '三酸化硫黄の水和 (接触法 Step 2: 硫酸生成)',
    equation: 'SO₃ + H₂O → H₂SO₄',
    descriptionJa: '三酸化硫黄と水が激しく化合し、大量の発熱を伴って強酸の硫酸（H₂SO₄）が生成します。',
    mextCategoryJa: '高校化学: 硫酸の性質と製法',
    reactants: [
      { type: 'compound', id: 'SO3', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2SO4', count: 1 }
    ],
    condition: {},
    heatRelease: 160,
    soundEffect: 'water',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'iron_sulfur_combination',
    nameJa: '鉄と硫黄の化合 (硫化鉄の生成)',
    equation: 'Fe + S → FeS',
    descriptionJa: '鉄粉と硫黄粉末を加熱すると、赤熱して全体に激しく反応が広がり、黒色の硫化鉄（FeS）ができます。',
    mextCategoryJa: '中学2年: 物質の化合 (最重要実験)',
    reactants: [
      { type: 'element', id: 'Fe', count: 1 },
      { type: 'element', id: 'S', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'FeS', count: 1 }
    ],
    condition: {
      minTemp: 180
    },
    heatRelease: 150,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'fes_acid_reaction',
    nameJa: '硫化鉄と塩酸の反応 (硫化水素の発生)',
    equation: 'FeS + 2HCl → FeCl₂ + H₂S',
    descriptionJa: '硫化鉄に塩酸を加えると、激しく反応して腐卵臭をもつ有毒気体の硫化水素（H₂S）と淡緑色の塩化鉄(II)（FeCl₂）が発生します。',
    mextCategoryJa: '中学2年: 化合物の性質確認 / 高校化学: 気体の製法',
    reactants: [
      { type: 'compound', id: 'FeS', count: 1 },
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2S', count: 1 },
      { type: 'compound', id: 'FeCl2', count: 1 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'fizz',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'habber_bosch_ammonia',
    nameJa: 'ハーバー・ボッシュ法 (アンモニア合成)',
    equation: 'N₂ + 3H₂ → 2NH₃',
    descriptionJa: '窒素ガスと水素ガスを高温で反応させてアンモニア（NH₃）を合成します。',
    mextCategoryJa: '高校化学: 気体平衡とアンモニア工業',
    reactants: [
      { type: 'element', id: 'N', count: 1 },
      { type: 'element', id: 'H', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'NH3', count: 1 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 70,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'ammonia_hcl_white_smoke',
    nameJa: '気体の中和 (アンモニア + 塩化水素 → 白煙)',
    equation: 'NH₃ + HCl → NH₄Cl',
    descriptionJa: '刺激臭のあるアンモニア気体と塩化水素気体が接触すると、瞬時に中和して白い煙（塩化アンモニウムの微粒子）を生じます。',
    mextCategoryJa: '中学・高校化学: 気体の検出・中和反応',
    reactants: [
      { type: 'compound', id: 'NH3', count: 1 },
      { type: 'compound', id: 'HCl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NH4Cl', count: 1 }
    ],
    condition: {},
    heatRelease: 80,
    soundEffect: 'steam',
    visualEffect: 'smoke'
  },
  {
    id: 'limestone_thermal_decomposition',
    nameJa: '石灰石の熱分解 (生石灰の生成)',
    equation: 'CaCO₃ → CaO + CO₂',
    descriptionJa: '石灰石（CaCO₃）を高温で強熱すると、熱分解して生石灰（CaO）と二酸化炭素（CO₂）になります。',
    mextCategoryJa: '中学2年・高校化学: 炭酸塩の熱分解',
    reactants: [
      { type: 'compound', id: 'CaCO3', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaO', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {
      minTemp: 550
    },
    heatRelease: -50, // 吸熱反応
    soundEffect: 'fizz',
    visualEffect: 'smoke'
  },
  {
    id: 'quicklime_hydration',
    nameJa: '生石灰の水和 (消石灰の生成・激しい発熱)',
    equation: 'CaO + H₂O → Ca(OH)₂',
    descriptionJa: '生石灰（CaO）に水を加えると、沸騰するほどの激しい発熱を伴って消石灰（Ca(OH)₂）になります。',
    mextCategoryJa: '中学・高校化学: アルカリ土類金属の反応熱',
    reactants: [
      { type: 'compound', id: 'CaO', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaOH2', count: 1 }
    ],
    condition: {},
    heatRelease: 180,
    soundEffect: 'water',
    visualEffect: 'steam'
  },
  {
    id: 'limewater_co2_turbidity',
    nameJa: '石灰水の白濁 (二酸化炭素の検出)',
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃ + H₂O',
    descriptionJa: '石灰水（水酸化カルシウム水溶液）に二酸化炭素を通すと、水に難溶な炭酸カルシウム（CaCO₃）の白色沈殿が生じて白く濁ります。',
    mextCategoryJa: '小中高共通: 二酸化炭素の検出反応',
    reactants: [
      { type: 'compound', id: 'CaOH2', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaCO3', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {},
    heatRelease: 40,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'limestone_acid_reaction',
    nameJa: '石灰石と塩酸の反応 (二酸化炭素の発生)',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂',
    descriptionJa: '石灰石（大理石・貝殻）にうすい塩酸を加えると、激しく泡（CO₂）を出して溶け、塩化カルシウムになります。',
    mextCategoryJa: '中学1年・2年: 二酸化炭素の発生方法 (重要実験)',
    reactants: [
      { type: 'compound', id: 'CaCO3', count: 1 },
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CaCl2', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {},
    heatRelease: 70,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'copper_sulfuric_acid',
    nameJa: '銅と濃硫酸の酸化反応 (硫酸銅生成)',
    equation: 'Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O',
    descriptionJa: '加熱した熱濃硫酸に銅を加えると、銅が酸化されて青色の硫酸銅（CuSO₄）と二酸化硫黄が生じます。',
    mextCategoryJa: '高校化学: 濃硫酸の酸化作用',
    reactants: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'H2SO4', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CuSO4', count: 1 },
      { type: 'compound', id: 'SO2', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 160
    },
    heatRelease: 80,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'no2_water_nitric_acid',
    nameJa: '二酸化窒素の水和 (硝酸の生成)',
    equation: '2NO₂ + H₂O + O → 2HNO₃',
    descriptionJa: '赤褐色の二酸化窒素（NO₂）が水および酸素と反応して硝酸（HNO₃）になります（オストワルト法）。',
    mextCategoryJa: '高校化学: オストワルト法 (硝酸の製法)',
    reactants: [
      { type: 'compound', id: 'NO2', count: 2 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HNO3', count: 2 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'water_electrolysis',
    nameJa: '水の電気分解',
    equation: '2H₂O → 2H₂ + O₂',
    descriptionJa: '水に通電すると、陰極に水素（気体体積2）、陽極に酸素（気体体積1）が発生します。',
    mextCategoryJa: '中学2年: 電気分解・化合物の分解',
    reactants: [
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    condition: {},
    heatRelease: -50,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'copper_chloride_electrolysis',
    nameJa: '塩化銅(II)の電気分解',
    equation: 'CuCl₂ → Cu + Cl₂',
    descriptionJa: '塩化銅水溶液に通電すると、陰極に赤褐色の銅Cuが析出し、陽極から刺激臭の塩素Cl₂が発生します。',
    mextCategoryJa: '中学3年: イオンと電気分解',
    reactants: [
      { type: 'compound', id: 'CuCl2', count: 1 }
    ],
    products: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {},
    heatRelease: -30,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'salt_electrolysis',
    nameJa: '食塩（塩化ナトリウム）の電気分解',
    equation: '2NaCl → 2Na + Cl₂',
    descriptionJa: '食塩に通電すると、金属ナトリウムと黄緑色の塩素ガスCl₂に分解されます（工業的製法）。',
    mextCategoryJa: '高校化学: イオン交換膜法・融解塩電解',
    reactants: [
      { type: 'compound', id: 'NaCl', count: 2 }
    ],
    products: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {},
    heatRelease: -40,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  }
];
