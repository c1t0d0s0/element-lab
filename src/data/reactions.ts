import { Language } from '../i18n';

export interface ReactionCondition {
  minTemp?: number; // 最低必要温度 (°C)
  maxTemp?: number; // 最高制限温度 (°C)
  requiresSpark?: boolean; // 火花・点火が必要か
  requiresMoisture?: boolean; // 水分の存在が必要か
  requiresElectricity?: boolean; // 通電・電気分解が必要か (電気ツールapplyElectricでのみ実行)
  minRustProgress?: number; // 反応物の鉄粒子に必要なサビ進行度 (0.0〜1.0)。ゆっくり進むサビの表現用
  isDissolution?: boolean; // 溶解熱: 物質を消費せず、溶質1粒子につき1回だけ発熱する (反応物の先頭が溶質)
  // この粒子 (元素記号または化合物ID) が近くにある間は起こさない。
  // 例: 水素原子は、そばに炭素原子があれば H₂ にならずに待ち、4個そろうとメタンになる
  waitIfNear?: string[];
  // 近くの O₂ が燃料 (反応物の O₂ 以外) の数より少ないときだけ起こす。
  // 例: 炭素の不完全燃焼は酸素が足りないときだけ起こり、酸素が十分なら完全燃焼 (CO₂) になる
  requiresOxygenShortage?: boolean;
  timeFactor?: number; // 反応完了までの所要時間 (フレーム数または接触時間係数)
}

export interface ReactionRule {
  id: string;
  nameJa: string;
  nameEn?: string;
  equation: string; // 化学反応式 (例: "2H₂ + O₂ → 2H₂O")
  equationEn?: string; // 反応式に日本語の注記があるときの英語版
  descriptionJa: string;
  descriptionEn?: string;
  mextCategoryJa: string; // 学習指導要領のどの単元で学ぶか (学年の目安)
  mextCategoryEn?: string;
  reactants: { type: 'element' | 'compound'; id: string; count: number }[];
  products: { type: 'element' | 'compound'; id: string; count: number }[];
  condition: ReactionCondition;
  heatRelease: number; // 反応熱 (正: 発熱反応で周囲を加熱, 負: 吸熱反応)
  soundEffect: 'spark' | 'water' | 'burn' | 'rust' | 'pop' | 'steam' | 'fizz';
  visualEffect?: 'explosion' | 'sparkles' | 'glow' | 'smoke' | 'steam' | 'toxic_cloud' | 'flash';
  // 反応の激しさ区分 (爆発 / 発火 / 発煙 / 発熱)。複数指定可。容器内で 'explosion' が起きるとフラスコが破裂し得る
  intensities?: ReactionIntensity[];
  // 同じ化学変化の別ルート (原子から反応する版など)。図鑑では variantOf の反応にまとめて表示する
  variantOf?: string;
  // 発火時の炎色 (未指定なら反応物の炎色反応色。例: 硫黄・一酸化炭素の青い炎)
  flameColors?: { core: string; outer: string };
  // 追加の見た目 ('cloudy': 石灰水のように白くにごる)
  visualHint?: 'cloudy';
}

export type ReactionIntensity = 'explosion' | 'ignition' | 'smoke' | 'heat';

// 開放容器でも破裂させる爆発反応の反応熱しきい値 (密閉容器は爆発反応で必ず破裂)
export const OPEN_FLASK_SHATTER_HEAT = 180;

export function getReactionName(r: ReactionRule, lang: Language): string {
  if (lang === 'en' && r.nameEn) return r.nameEn;
  if (lang === 'en') {
    return r.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return r.nameJa;
}

export function getReactionEquation(r: ReactionRule, lang: Language): string {
  return lang === 'en' && r.equationEn ? r.equationEn : r.equation;
}

export function getReactionDescription(r: ReactionRule, lang: Language): string {
  if (lang === 'en' && r.descriptionEn) return r.descriptionEn;
  if (lang === 'en') {
    return `Chemical reaction: ${r.equation}.`;
  }
  return r.descriptionJa;
}

export function getReactionCategory(r: ReactionRule, lang: Language): string {
  if (lang === 'en' && r.mextCategoryEn) return r.mextCategoryEn;
  if (lang === 'en') {
    return 'Chemistry Curriculum';
  }
  return r.mextCategoryJa;
}

export const REACTIONS_DATA: ReactionRule[] = [
  {
    id: 'water_synthesis_atomic',
    nameJa: '水の合成 (原子から)',
    nameEn: 'Water Synthesis (from Atoms)',
    equation: '2H + O → H₂O',
    descriptionJa: '2つの水素原子と1つの酸素原子が結合して水分子（H₂O）が生成されます。',
    descriptionEn: 'Two hydrogen atoms and one oxygen atom bond to form a water molecule (H₂O).',
    mextCategoryJa: '中学2年: 化合と化学変化',
    mextCategoryEn: 'Grade 8: Combination and Chemical Change',
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
    id: 'methane_synthesis_atomic',
    nameJa: 'メタンの合成 (原子から)',
    nameEn: 'Methane Synthesis (from Atoms)',
    equation: 'C + 4H → CH₄',
    descriptionJa: '1つの炭素原子と4つの水素原子が共有結合してメタン分子（CH₄）が生成されます。',
    descriptionEn: 'One carbon atom and four hydrogen atoms form covalent bonds to make a methane molecule (CH₄).',
    mextCategoryJa: '高校化学: 炭化水素・共有結合',
    mextCategoryEn: 'High School Chemistry: Hydrocarbons and Covalent Bonds',
    reactants: [
      { type: 'element', id: 'C', count: 1 },
      { type: 'element', id: 'H', count: 4 }
    ],
    products: [
      { type: 'compound', id: 'CH4', count: 1 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'hcl_synthesis_atomic',
    variantOf: 'hcl_synthesis_molecular',
    nameJa: '塩化水素の合成 (原子から)',
    nameEn: 'Hydrogen Chloride Synthesis (from Atoms)',
    equation: 'H + Cl → HCl',
    descriptionJa: '水素原子と塩素原子が共有結合して塩化水素（HCl）気体が生成されます。',
    descriptionEn: 'A hydrogen atom and a chlorine atom form a covalent bond to make hydrogen chloride gas (HCl).',
    mextCategoryJa: '高校化学: ハロゲン化合物・共有結合',
    mextCategoryEn: 'High School Chemistry: Halogen Compounds and Covalent Bonds',
    reactants: [
      { type: 'element', id: 'H', count: 1 },
      { type: 'element', id: 'Cl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HCl', count: 1 }
    ],
    condition: {},
    heatRelease: 65,
    soundEffect: 'pop',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'nacl_synthesis_atomic',
    variantOf: 'nacl_synthesis_molecular',
    nameJa: '塩化ナトリウム（食塩）の合成',
    nameEn: 'Sodium Chloride (Table Salt) Synthesis',
    equation: 'Na + Cl → NaCl',
    descriptionJa: '金属ナトリウムと塩素が激しく反応し、熱と光を放って白色の塩化ナトリウム（食塩）が生成します。',
    descriptionEn: 'Sodium metal and chlorine react violently, giving off heat and light, and form white sodium chloride (table salt).',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 1 },
      { type: 'element', id: 'Cl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaCl', count: 1 }
    ],
    condition: {},
    heatRelease: 140,
    soundEffect: 'spark',
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke']
  },
  {
    id: 'kcl_synthesis_atomic',
    variantOf: 'kcl_synthesis_molecular',
    nameJa: '塩化カリウムの合成',
    nameEn: 'Potassium Chloride Synthesis',
    equation: 'K + Cl → KCl',
    descriptionJa: 'カリウムと塩素が激しく化合して塩化カリウム（KCl）が生成します。',
    descriptionEn: 'Potassium and chlorine combine violently to form potassium chloride (KCl).',
    mextCategoryJa: '高校化学: アルカリ金属の反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkali Metals',
    reactants: [
      { type: 'element', id: 'K', count: 1 },
      { type: 'element', id: 'Cl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KCl', count: 1 }
    ],
    condition: {},
    heatRelease: 150,
    soundEffect: 'spark',
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke']
  },
  {
    id: 'licl_synthesis_atomic',
    variantOf: 'licl_synthesis_molecular',
    nameJa: '塩化リチウムの合成',
    nameEn: 'Lithium Chloride Synthesis',
    equation: 'Li + Cl → LiCl',
    descriptionJa: 'リチウムと塩素が反応して白色の塩化リチウム（LiCl）が生成します。',
    descriptionEn: 'Lithium and chlorine react to form white lithium chloride (LiCl).',
    mextCategoryJa: '高校化学: アルカリ金属の反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkali Metals',
    reactants: [
      { type: 'element', id: 'Li', count: 1 },
      { type: 'element', id: 'Cl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'LiCl', count: 1 }
    ],
    condition: {},
    heatRelease: 130,
    soundEffect: 'spark',
    visualEffect: 'sparkles',
    intensities: ['ignition']
  },
  {
    id: 'cacl2_synthesis_atomic',
    variantOf: 'cacl2_synthesis_molecular',
    nameJa: '塩化カルシウムの直接合成',
    nameEn: 'Direct Synthesis of Calcium Chloride',
    equation: 'Ca + 2Cl → CaCl₂',
    descriptionJa: 'カルシウムと塩素が反応して塩化カルシウム（CaCl₂）が生成します。',
    descriptionEn: 'Calcium and chlorine react to form calcium chloride (CaCl₂).',
    mextCategoryJa: '高校化学: アルカリ土類金属の反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ca', count: 1 },
      { type: 'element', id: 'Cl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CaCl2', count: 1 }
    ],
    condition: {},
    heatRelease: 130,
    soundEffect: 'spark',
    visualEffect: 'sparkles',
    intensities: ['ignition']
  },
  {
    id: 'h2_synthesis',
    nameJa: '水素分子の形成',
    nameEn: 'Forming a Hydrogen Molecule',
    equation: '2H → H₂',
    descriptionJa: '2つの水素原子が共有結合して安定な水素分子（H₂）になります。',
    descriptionEn: 'Two hydrogen atoms form a covalent bond and become a stable hydrogen molecule (H₂).',
    mextCategoryJa: '中学2年・高校化学: 化学結合',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Chemical Bonds',
    reactants: [
      { type: 'element', id: 'H', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2', count: 1 }
    ],
    // そばに C・N・O・Cl の原子があるときは、そちらと結びつく (CH₄・NH₃・H₂O・HCl) のを待つ
    condition: { waitIfNear: ['C', 'N', 'O', 'Cl'] },
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'o2_synthesis',
    nameJa: '酸素分子の形成',
    nameEn: 'Forming an Oxygen Molecule',
    equation: '2O → O₂',
    descriptionJa: '2つの酸素原子が二重結合して酸素分子（O₂）になります。',
    descriptionEn: 'Two oxygen atoms form a double bond and become an oxygen molecule (O₂).',
    mextCategoryJa: '中学2年・高校化学: 化学結合',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Chemical Bonds',
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
    id: 'cl2_synthesis',
    nameJa: '塩素分子の形成',
    nameEn: 'Forming a Chlorine Molecule',
    equation: '2Cl → Cl₂',
    descriptionJa: '2つの塩素原子が共有結合して黄緑色の塩素分子（Cl₂）になります。',
    descriptionEn: 'Two chlorine atoms form a covalent bond and become a yellow-green chlorine molecule (Cl₂).',
    mextCategoryJa: '高校化学: ハロゲンと共有結合',
    mextCategoryEn: 'High School Chemistry: Halogens and Covalent Bonds',
    reactants: [
      { type: 'element', id: 'Cl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'n2_synthesis',
    nameJa: '窒素分子の形成',
    nameEn: 'Forming a Nitrogen Molecule',
    equation: '2N → N₂',
    descriptionJa: '2つの窒素原子が三重結合して非常に安定な窒素分子（N₂）になります。',
    descriptionEn: 'Two nitrogen atoms form a triple bond and become a very stable nitrogen molecule (N₂).',
    mextCategoryJa: '高校化学: 三重結合と分子形成',
    mextCategoryEn: 'High School Chemistry: Triple Bonds and Molecules',
    reactants: [
      { type: 'element', id: 'N', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'N2', count: 1 }
    ],
    condition: {},
    heatRelease: 30,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'water_combustion',
    nameJa: '水素の燃焼・爆発反応',
    nameEn: 'Hydrogen Combustion (Explosion)',
    equation: '2H₂ + O₂ → 2H₂O',
    descriptionJa: '水素気体と酸素気体の混合気に点火または加熱すると、激しい爆発音とともに水が生成します。',
    descriptionEn: 'When a mixture of hydrogen and oxygen gas is lit or heated, it explodes with a loud bang and forms water.',
    mextCategoryJa: '中学2年: 酸化と燃焼 / 高校化学: 反応熱',
    mextCategoryEn: 'Grade 8: Oxidation and Combustion / High School Chemistry: Heat of Reaction',
    reactants: [
      { type: 'compound', id: 'H2', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 500 // 水素の発火点 (約500℃): 点火ツールなら一瞬で達する
    },
    heatRelease: 200,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'water_from_h2_and_atomic_o',
    variantOf: 'water_synthesis_atomic',
    nameJa: '水の合成 (水素分子 + 酸素原子)',
    nameEn: 'Water Synthesis (Hydrogen Molecule + Oxygen Atom)',
    equation: 'H₂ + O → H₂O',
    descriptionJa: '酸素原子（O）は相手を探している、とても反応しやすい原子です。水素分子（H₂）に出会うと、加熱しなくてもすぐに結びついて水（H₂O）になります。',
    descriptionEn: 'An oxygen atom (O) is very reactive because it is looking for partners. When it meets a hydrogen molecule (H₂), it bonds right away to form water (H₂O), even without heating.',
    mextCategoryJa: '中学2年: 化合と化学変化',
    mextCategoryEn: 'Grade 8: Combination and Chemical Change',
    reactants: [
      { type: 'compound', id: 'H2', count: 1 },
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
    id: 'chemical_heat_pack',
    nameJa: '化学カイロの発熱 (鉄粉の酸化)',
    nameEn: 'Chemical Hand Warmer (Iron Oxidation)',
    equation: '4Fe + 3O₂ → 2Fe₂O₃ (食塩水が反応を促進)',
    equationEn: '4Fe + 3O₂ → 2Fe₂O₃ (salt water speeds up the reaction)',
    descriptionJa: '鉄粉が食塩水を含んだ状態で空気中の酸素と触れると、サビ（酸化）が急速に進んで熱を出します。使い捨てカイロはこの発熱を利用しています。食塩水はそのまま残り、反応を速める役割をします。',
    descriptionEn: 'Iron powder moistened with salt water oxidizes rapidly in air, releasing heat. Disposable hand warmers use this reaction; the salt water stays and only speeds it up.',
    mextCategoryJa: '中学2年: 化学変化と熱 (化学カイロ)',
    mextCategoryEn: 'Middle School: Chemical Change and Heat (Hand Warmers)',
    reactants: [
      { type: 'element', id: 'Fe', count: 4 },
      { type: 'compound', id: 'O2', count: 3 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'NaCl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'Fe2O3', count: 2 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'NaCl', count: 1 }
    ],
    condition: {},
    heatRelease: 40, // 実際のカイロと同程度 (約60℃) に収め、水が沸騰しないようにする
    soundEffect: 'rust',
    visualEffect: 'glow',
    intensities: ['heat']
  },
  {
    id: 'iron_red_rust',
    nameJa: '鉄の赤サビ生成 (常温酸化)',
    nameEn: 'Red Rust on Iron (Oxidation at Room Temperature)',
    equation: '4Fe + 3O₂ → 2Fe₂O₃ (水が反応を仲立ちする)',
    equationEn: '4Fe + 3O₂ → 2Fe₂O₃ (water helps the reaction along)',
    descriptionJa: '常温で鉄が水分と酸素に触れ続けることで、徐々に酸化されて脆い赤サビ（酸化鉄(III)）ができます。',
    descriptionEn: 'When iron keeps touching moisture and oxygen at room temperature, it slowly oxidizes into crumbly red rust (iron(III) oxide).',
    mextCategoryJa: '中学2年: 身の回りの化学変化 / 高校化学: 金属の腐食',
    mextCategoryEn: 'Grade 8: Chemical Changes Around Us / High School Chemistry: Corrosion of Metals',
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
      minRustProgress: 1 // 鉄粒子のサビ進行度が100%に達してから赤サビになる
    },
    heatRelease: 10,
    soundEffect: 'rust',
    visualEffect: 'smoke'
  },
  {
    id: 'iron_steam_black_rust',
    nameJa: '赤熱鉄と高温水蒸気の反応 (黒サビ生成)',
    nameEn: 'Red-Hot Iron and Steam (Black Rust)',
    equation: '3Fe + 4H₂O(気) → Fe₃O₄ + 4H₂',
    equationEn: '3Fe + 4H₂O(g) → Fe₃O₄ + 4H₂',
    descriptionJa: '赤熱した鉄（>500℃）に高温の水蒸気（>100℃）を通すと、緻密な黒サビ（四酸化三鉄）が生成し、水素ガスが発生します。',
    descriptionEn: 'Passing hot steam (>100°C) over red-hot iron (>500°C) forms dense black rust (triiron tetroxide) and gives off hydrogen gas.',
    mextCategoryJa: '高校化学: 無機物質・遷移元素の性質',
    mextCategoryEn: 'High School Chemistry: Inorganic Substances and Transition Elements',
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
    nameEn: 'Incomplete Combustion (Carbon Monoxide)',
    equation: '2C + O₂ → 2CO',
    descriptionJa: '酸素が不十分な環境で炭素を燃焼させると、無色・無臭で猛毒の一酸化炭素（CO）が発生します。',
    descriptionEn: 'When carbon burns without enough oxygen, it gives off carbon monoxide (CO), a colorless, odorless, highly toxic gas.',
    mextCategoryJa: '中学2年: 燃焼と換気 / 高校化学: 炭素化合物',
    mextCategoryEn: 'Grade 8: Combustion and Ventilation / High School Chemistry: Carbon Compounds',
    reactants: [
      { type: 'element', id: 'C', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CO', count: 2 }
    ],
    condition: {
      minTemp: 200,
      requiresOxygenShortage: true
    },
    heatRelease: 60,
    soundEffect: 'burn',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'carbon_complete_combustion',
    nameJa: '炭素の完全燃焼 (二酸化炭素の生成)',
    nameEn: 'Complete Combustion of Carbon (Carbon Dioxide)',
    equation: 'C + O₂ → CO₂',
    descriptionJa: '炭素が十分な酸素の中で燃焼すると、熱と光を出して無害な二酸化炭素（CO₂）になります。',
    descriptionEn: 'When carbon burns with plenty of oxygen, it gives off heat and light and becomes harmless carbon dioxide (CO₂).',
    mextCategoryJa: '中学2年: 酸化と還元',
    mextCategoryEn: 'Grade 8: Oxidation and Reduction',
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
    visualEffect: 'sparkles',
    intensities: ['ignition']
  },
  {
    id: 'co_combustion',
    nameJa: '一酸化炭素の燃焼',
    nameEn: 'Combustion of Carbon Monoxide',
    equation: '2CO + O₂ → 2CO₂',
    descriptionJa: '一酸化炭素が青い炎を上げて燃焼し、安定な二酸化炭素（CO₂）に変化します。',
    descriptionEn: 'Carbon monoxide burns with a blue flame and becomes stable carbon dioxide (CO₂).',
    mextCategoryJa: '高校化学: 気体の性質',
    mextCategoryEn: 'High School Chemistry: Properties of Gases',
    reactants: [
      { type: 'compound', id: 'CO', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 2 }
    ],
    condition: {
      minTemp: 600 // 一酸化炭素の発火点 (約610℃)
    },
    heatRelease: 140,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition'],
    flameColors: { core: '#BFDBFE', outer: '#3B82F6' }
  },
  {
    id: 'copper_oxidation',
    nameJa: '銅の酸化 (黒色化)',
    nameEn: 'Oxidation of Copper (Turning Black)',
    equation: '2Cu + O₂ → 2CuO',
    descriptionJa: '赤褐色の銅を空気中で加熱すると、空気中の酸素と化合して表面が真っ黒な酸化銅(II)になります。',
    descriptionEn: 'When reddish-brown copper is heated in air, it combines with oxygen and its surface turns into jet-black copper(II) oxide.',
    mextCategoryJa: '中学2年: 金属の酸化と質量変化',
    mextCategoryEn: 'Grade 8: Oxidation of Metals and Change in Mass',
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
    nameEn: 'Reduction of Copper Oxide by Carbon',
    equation: '2CuO + C → 2Cu + CO₂',
    descriptionJa: '黒色の酸化銅(II)と炭素粉末を混ぜて強熱すると、炭素が酸素を奪い（還元）、赤褐色の金属銅と二酸化炭素が生じます。',
    descriptionEn: 'When black copper(II) oxide and carbon powder are mixed and strongly heated, carbon takes away the oxygen (reduction), leaving reddish-brown copper metal and carbon dioxide.',
    mextCategoryJa: '中学2年: 酸化と還元 (最重要実験)',
    mextCategoryEn: 'Grade 8: Oxidation and Reduction (Key Experiment)',
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
    nameEn: 'Combustion of Methane',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    descriptionJa: '天然ガスの主成分メタンが酸素と反応して燃焼し、二酸化炭素と水が発生します。',
    descriptionEn: 'Methane, the main component of natural gas, burns with oxygen and gives off carbon dioxide and water.',
    mextCategoryJa: '中学2年: 有機物の燃焼 / 高校化学: 炭化水素',
    mextCategoryEn: 'Grade 8: Combustion of Organic Matter / High School Chemistry: Hydrocarbons',
    reactants: [
      { type: 'compound', id: 'CH4', count: 1 },
      { type: 'compound', id: 'O2', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 540 // メタンの発火点 (約540℃)
    },
    heatRelease: 180,
    soundEffect: 'burn',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'neutralization',
    nameJa: '中和反応 (塩酸 + 水酸化ナトリウム)',
    nameEn: 'Neutralization (Hydrochloric Acid + Sodium Hydroxide)',
    equation: 'HCl + NaOH → NaCl + H₂O',
    descriptionJa: '強酸の塩酸と強塩基の水酸化ナトリウムが中和し、食塩（NaCl）と水（H₂O）が生じ、中和熱が発生します。',
    descriptionEn: 'Hydrochloric acid (a strong acid) and sodium hydroxide (a strong base) neutralize each other, forming table salt (NaCl) and water (H₂O) and releasing heat of neutralization.',
    mextCategoryJa: '中学3年: 酸・アルカリと塩 / 高校化学: 中和滴定',
    mextCategoryEn: 'Grade 9: Acids, Alkalis, and Salts / High School Chemistry: Neutralization Titration',
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
    visualEffect: 'sparkles',
    intensities: ['heat']
  },
  {
    id: 'zinc_acid_reaction',
    nameJa: '亜鉛と塩酸の反応 (水素の発生)',
    nameEn: 'Zinc and Hydrochloric Acid (Hydrogen Gas)',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂',
    descriptionJa: '金属の亜鉛にうすい塩酸を加えると、激しく泡（水素ガス）を出しながら溶けて塩化亜鉛になります。',
    descriptionEn: 'When dilute hydrochloric acid is added to zinc metal, it dissolves while fizzing strongly (hydrogen gas) and becomes zinc chloride.',
    mextCategoryJa: '中学1年・3年: 気体の発生・イオン / 高校化学: イオン化傾向',
    mextCategoryEn: 'Grades 7 and 9: Making Gases, Ions / High School Chemistry: Ionization Tendency',
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
    nameEn: 'Combustion of Magnesium (Bright Light and Heat)',
    equation: '2Mg + O₂ → 2MgO',
    descriptionJa: '銀白色のマグネシウムを空気中で加熱・点火すると、まばゆい白色の閃光を放って激しく燃焼し、白色の酸化マグネシウム（MgO）が生成します。',
    descriptionEn: 'When silvery magnesium is heated and lit in air, it burns fiercely with a dazzling white flash and forms white magnesium oxide (MgO).',
    mextCategoryJa: '中学2年: 酸化と燃焼 (最重要実験)',
    mextCategoryEn: 'Grade 8: Oxidation and Combustion (Key Experiment)',
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
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke'],
    // マグネシウムは炎色反応を示さない。まぶしい白色は燃焼の光
    flameColors: { core: '#FFFFFF', outer: '#E2E8F0' }
  },
  {
    id: 'magnesium_oxidation_atomic',
    variantOf: 'magnesium_combustion',
    nameJa: 'マグネシウムの酸化 (原子から)',
    nameEn: 'Oxidation of Magnesium (from Atoms)',
    equation: 'Mg + O → MgO',
    descriptionJa: 'マグネシウム原子と酸素原子が直接化合して酸化マグネシウムになります。',
    descriptionEn: 'A magnesium atom and an oxygen atom combine directly to form magnesium oxide.',
    mextCategoryJa: '中学2年: 化合と酸化',
    mextCategoryEn: 'Grade 8: Combination and Oxidation',
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
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke'],
    // マグネシウムは炎色反応を示さない。まぶしい白色は燃焼の光
    flameColors: { core: '#FFFFFF', outer: '#E2E8F0' }
  },
  {
    id: 'magnesium_co2_combustion',
    nameJa: '二酸化炭素中でのマグネシウム燃焼',
    nameEn: 'Magnesium Burning in Carbon Dioxide',
    equation: '2Mg + CO₂ → 2MgO + C',
    descriptionJa: '激しく燃えるマグネシウムは二酸化炭素（CO₂）中でも燃焼を続け、CO₂から酸素を奪って白色のMgOと黒い炭素（C）を生じます。',
    descriptionEn: 'Burning magnesium keeps burning even in carbon dioxide (CO₂): it takes oxygen from CO₂ and forms white MgO and black carbon (C).',
    mextCategoryJa: '中学2年発展・高校化学: 酸化還元反応',
    mextCategoryEn: 'Grade 8 Advanced / High School Chemistry: Redox Reactions',
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
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke'],
    // マグネシウムは炎色反応を示さない。まぶしい白色は燃焼の光
    flameColors: { core: '#FFFFFF', outer: '#E2E8F0' }
  },
  {
    id: 'h2o2_synthesis_atomic',
    nameJa: '過酸化水素の合成 (ゲーム上の近道)',
    nameEn: 'Hydrogen Peroxide Synthesis (game shortcut)',
    equation: 'H₂O + O → H₂O₂',
    descriptionJa: '元素ラボの中だけの近道です。実際には水と酸素原子から直接は作られません。工業的にはアントラキノン法という方法で、水素と酸素から作られています。',
    descriptionEn: 'A shortcut that only exists in Element Lab. In reality, hydrogen peroxide is not made directly from water and oxygen atoms; industry makes it from hydrogen and oxygen by the anthraquinone process.',
    mextCategoryJa: 'ゲーム上の近道 (実際には起こらない反応)',
    mextCategoryEn: 'Game shortcut (does not happen in reality)',
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
    id: 'mno2_synthesis',
    nameJa: '二酸化マンガンの合成',
    nameEn: 'Manganese Dioxide Synthesis',
    equation: 'Mn + O₂ → MnO₂',
    descriptionJa: 'マンガンが酸化されて黒色の二酸化マンガン（MnO₂）になります。',
    descriptionEn: 'Manganese is oxidized into black manganese dioxide (MnO₂).',
    mextCategoryJa: '高校化学: 遷移元素・触媒',
    mextCategoryEn: 'High School Chemistry: Transition Elements and Catalysts',
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
    nameEn: 'Catalytic Decomposition of Hydrogen Peroxide (Oxygen Gas)',
    equation: '2H₂O₂ + MnO₂ → 2H₂O + O₂ + MnO₂',
    descriptionJa: '過酸化水素水に二酸化マンガン（触媒）を加えると、激しく気泡（酸素）を放出して水と酸素に分解します。二酸化マンガン自身は消費されません。',
    descriptionEn: 'Adding manganese dioxide (a catalyst) to hydrogen peroxide makes it fizz strongly (oxygen) as it breaks down into water and oxygen. The manganese dioxide itself is not used up.',
    mextCategoryJa: '中学1年・2年: 気体の発生 (最重要実験) / 高校化学: 無機触媒',
    mextCategoryEn: 'Grades 7 and 8: Making Gases (Key Experiment) / High School Chemistry: Inorganic Catalysts',
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
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'h2o2_thermal_decomposition',
    nameJa: '過酸化水素水の熱分解',
    nameEn: 'Thermal Decomposition of Hydrogen Peroxide',
    equation: '2H₂O₂ → 2H₂O + O₂',
    descriptionJa: '過酸化水素水を加熱すると熱分解して水と酸素になります。',
    descriptionEn: 'When hydrogen peroxide is heated, it breaks down into water and oxygen.',
    mextCategoryJa: '中学理科: 熱分解',
    mextCategoryEn: 'Junior High Science: Thermal Decomposition',
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
    nameEn: 'Combustion of Sulfur (Sulfur Dioxide)',
    equation: 'S + O₂ → SO₂',
    descriptionJa: '黄色の硫黄が青い炎を上げて燃焼し、刺激臭をもつ有毒な二酸化硫黄（SO₂）が発生します。',
    descriptionEn: 'Yellow sulfur burns with a blue flame and gives off sulfur dioxide (SO₂), a toxic gas with a sharp smell.',
    mextCategoryJa: '中学2年・高校化学: 非金属の酸化',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Oxidation of Nonmetals',
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
    visualEffect: 'toxic_cloud',
    intensities: ['ignition'],
    flameColors: { core: '#C7D2FE', outer: '#6366F1' }
  },
  {
    id: 'so2_oxidation_contact',
    nameJa: '二酸化硫黄の接触酸化 (接触法 Step 1)',
    nameEn: 'Catalytic Oxidation of Sulfur Dioxide (Contact Process Step 1)',
    equation: '2SO₂ + O₂ → 2SO₃',
    descriptionJa: '二酸化硫黄を空気中で加熱・酸化して三酸化硫黄（SO₃）を合成します（工業的硫酸製造の接触法）。',
    descriptionEn: 'Sulfur dioxide is heated in air and oxidized into sulfur trioxide (SO₃), as in the contact process for making sulfuric acid industrially.',
    mextCategoryJa: '高校化学: 硫酸の工業的製法 (接触法)',
    mextCategoryEn: 'High School Chemistry: Industrial Production of Sulfuric Acid (Contact Process)',
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
    nameEn: 'Hydration of Sulfur Trioxide (Contact Process Step 2: Sulfuric Acid)',
    equation: 'SO₃ + H₂O → H₂SO₄',
    descriptionJa: '三酸化硫黄と水が激しく化合し、大量の発熱を伴って強酸の硫酸（H₂SO₄）が生成します。',
    descriptionEn: 'Sulfur trioxide and water combine violently, releasing a lot of heat, and form sulfuric acid (H₂SO₄), a strong acid.',
    mextCategoryJa: '高校化学: 硫酸の性質と製法',
    mextCategoryEn: 'High School Chemistry: Properties and Production of Sulfuric Acid',
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
    visualEffect: 'toxic_cloud',
    intensities: ['heat', 'smoke']
  },
  {
    id: 'iron_sulfur_combination',
    nameJa: '鉄と硫黄の化合 (硫化鉄の生成)',
    nameEn: 'Iron and Sulfur Combine (Iron Sulfide)',
    equation: 'Fe + S → FeS',
    descriptionJa: '鉄粉と硫黄粉末を加熱すると、赤熱して全体に激しく反応が広がり、黒色の硫化鉄（FeS）ができます。',
    descriptionEn: 'When iron powder and sulfur powder are heated, the mixture glows red and the reaction spreads through it, forming black iron sulfide (FeS).',
    mextCategoryJa: '中学2年: 物質の化合 (最重要実験)',
    mextCategoryEn: 'Grade 8: Combining Substances (Key Experiment)',
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
    visualEffect: 'glow',
    intensities: ['heat']
  },
  {
    id: 'fes_acid_reaction',
    nameJa: '硫化鉄と塩酸の反応 (硫化水素の発生)',
    nameEn: 'Iron Sulfide and Hydrochloric Acid (Hydrogen Sulfide Gas)',
    equation: 'FeS + 2HCl → FeCl₂ + H₂S',
    descriptionJa: '硫化鉄に塩酸を加えると、激しく反応して腐卵臭をもつ有毒気体の硫化水素（H₂S）と淡緑色の塩化鉄(II)（FeCl₂）が発生します。',
    descriptionEn: 'Adding hydrochloric acid to iron sulfide causes a vigorous reaction that gives off hydrogen sulfide (H₂S), a toxic gas that smells like rotten eggs, and pale green iron(II) chloride (FeCl₂).',
    mextCategoryJa: '中学2年: 化合物の性質確認 / 高校化学: 気体の製法',
    mextCategoryEn: 'Grade 8: Checking the Properties of Compounds / High School Chemistry: Preparing Gases',
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
    id: 'haber_bosch_ammonia',
    variantOf: 'haber_bosch_molecular',
    nameJa: 'ハーバー・ボッシュ法 (アンモニア合成)',
    nameEn: 'Haber-Bosch Process (Ammonia Synthesis)',
    equation: 'N + 3H → NH₃',
    descriptionJa: '窒素ガスと水素ガスを高温で反応させてアンモニア（NH₃）を合成します。',
    descriptionEn: 'Nitrogen and hydrogen react at high temperature to make ammonia (NH₃).',
    mextCategoryJa: '高校化学: 気体平衡とアンモニア工業',
    mextCategoryEn: 'High School Chemistry: Gas Equilibrium and the Ammonia Industry',
    reactants: [
      { type: 'element', id: 'N', count: 1 },
      { type: 'element', id: 'H', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'NH3', count: 1 }
    ],
    condition: {
      minTemp: 400 // 実際の工業条件は 400〜500℃・高圧・鉄触媒
    },
    heatRelease: 70,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'ammonia_hcl_white_smoke',
    nameJa: '気体の中和 (アンモニア + 塩化水素 → 白煙)',
    nameEn: 'Neutralization of Gases (Ammonia + Hydrogen Chloride → White Smoke)',
    equation: 'NH₃ + HCl → NH₄Cl',
    descriptionJa: '刺激臭のあるアンモニア気体と塩化水素気体が接触すると、瞬時に中和して白い煙（塩化アンモニウムの微粒子）を生じます。',
    descriptionEn: 'When ammonia gas and hydrogen chloride gas, both with sharp smells, meet, they instantly neutralize and form white smoke (tiny particles of ammonium chloride).',
    mextCategoryJa: '中学・高校化学: 気体の検出・中和反応',
    mextCategoryEn: 'Junior High and High School Chemistry: Detecting Gases, Neutralization',
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
    visualEffect: 'smoke',
    intensities: ['smoke']
  },
  {
    id: 'limestone_thermal_decomposition',
    nameJa: '石灰石の熱分解 (生石灰の生成)',
    nameEn: 'Thermal Decomposition of Limestone (Quicklime)',
    equation: 'CaCO₃ → CaO + CO₂',
    descriptionJa: '石灰石（CaCO₃）を高温で強熱すると、熱分解して生石灰（CaO）と二酸化炭素（CO₂）になります。',
    descriptionEn: 'When limestone (CaCO₃) is strongly heated, it breaks down into quicklime (CaO) and carbon dioxide (CO₂).',
    mextCategoryJa: '中学2年・高校化学: 炭酸塩の熱分解',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Thermal Decomposition of Carbonates',
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
    nameEn: 'Hydration of Quicklime (Slaked Lime, Lots of Heat)',
    equation: 'CaO + H₂O → Ca(OH)₂',
    descriptionJa: '生石灰（CaO）に水を加えると、沸騰するほどの激しい発熱を伴って消石灰（Ca(OH)₂）になります。',
    descriptionEn: 'Adding water to quicklime (CaO) turns it into slaked lime (Ca(OH)₂), releasing enough heat to make the water boil.',
    mextCategoryJa: '中学・高校化学: アルカリ土類金属の反応熱',
    mextCategoryEn: 'Junior High and High School Chemistry: Heat of Reaction of Alkaline Earth Metals',
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
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'limewater_co2_turbidity',
    nameJa: '石灰水の白濁 (二酸化炭素の検出)',
    nameEn: 'Limewater Turns Milky (Test for Carbon Dioxide)',
    equation: 'Ca(OH)₂ + CO₂ → CaCO₃ + H₂O',
    descriptionJa: '石灰水（水酸化カルシウム水溶液）に二酸化炭素を通すと、水に難溶な炭酸カルシウム（CaCO₃）の白色沈殿が生じて白く濁ります。',
    descriptionEn: 'When carbon dioxide is bubbled through limewater (calcium hydroxide solution), a white precipitate of calcium carbonate (CaCO₃), which barely dissolves in water, makes it milky.',
    mextCategoryJa: '小中高共通: 二酸化炭素の検出反応',
    mextCategoryEn: 'Elementary to High School: Test for Carbon Dioxide',
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
    visualEffect: 'sparkles',
    visualHint: 'cloudy'
  },
  {
    id: 'limestone_acid_reaction',
    nameJa: '石灰石と塩酸の反応 (二酸化炭素の発生)',
    nameEn: 'Limestone and Hydrochloric Acid (Carbon Dioxide Gas)',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂',
    descriptionJa: '石灰石（大理石・貝殻）にうすい塩酸を加えると、激しく泡（CO₂）を出して溶け、塩化カルシウムになります。',
    descriptionEn: 'When dilute hydrochloric acid is added to limestone (or marble or shells), it dissolves while fizzing strongly (CO₂) and becomes calcium chloride.',
    mextCategoryJa: '中学1年・2年: 二酸化炭素の発生方法 (重要実験)',
    mextCategoryEn: 'Grades 7 and 8: Making Carbon Dioxide (Key Experiment)',
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
    nameEn: 'Oxidation of Copper by Concentrated Sulfuric Acid (Copper Sulfate)',
    equation: 'Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O',
    descriptionJa: '加熱した熱濃硫酸に銅を加えると、銅が酸化されて青色の硫酸銅（CuSO₄）と二酸化硫黄が生じます。',
    descriptionEn: 'When copper is added to hot concentrated sulfuric acid, the copper is oxidized, forming blue copper sulfate (CuSO₄) and sulfur dioxide.',
    mextCategoryJa: '高校化学: 濃硫酸の酸化作用',
    mextCategoryEn: 'High School Chemistry: Oxidizing Action of Concentrated Sulfuric Acid',
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
    nameEn: 'Hydration of Nitrogen Dioxide (Nitric Acid)',
    equation: '4NO₂ + O₂ + 2H₂O → 4HNO₃',
    descriptionJa: '赤褐色の二酸化窒素（NO₂）を酸素（O₂）といっしょに水に吸収させると、すべて硝酸（HNO₃）になります（オストワルト法の最後の段階）。酸素がないと、一部が一酸化窒素（NO）として残ります。',
    descriptionEn: 'When reddish-brown nitrogen dioxide (NO₂) is absorbed into water together with oxygen (O₂), all of it becomes nitric acid (HNO₃), the last step of the Ostwald process. Without oxygen, some is left as nitric oxide (NO).',
    mextCategoryJa: '高校化学: オストワルト法 (硝酸の製法)',
    mextCategoryEn: 'High School Chemistry: Ostwald Process (Making Nitric Acid)',
    // 酸素原子 (O) ではなく酸素分子 (O₂) を使う (O は先に水と H₂O₂ になってしまうため)
    reactants: [
      { type: 'compound', id: 'NO2', count: 4 },
      { type: 'compound', id: 'O2', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'HNO3', count: 4 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'water_electrolysis',
    nameJa: '水の電気分解',
    nameEn: 'Electrolysis of Water',
    equation: '2H₂O → 2H₂ + O₂',
    descriptionJa: '水に通電すると、陰極に水素（気体体積2）、陽極に酸素（気体体積1）が発生します。',
    descriptionEn: 'When electricity passes through water, hydrogen (2 volumes) forms at the cathode and oxygen (1 volume) forms at the anode.',
    mextCategoryJa: '中学2年: 電気分解・化合物の分解',
    mextCategoryEn: 'Grade 8: Electrolysis and Decomposition of Compounds',
    reactants: [
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'H2', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    condition: {
      requiresElectricity: true
    },
    heatRelease: -50,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'copper_chloride_electrolysis',
    nameJa: '塩化銅(II)の電気分解',
    nameEn: 'Electrolysis of Copper(II) Chloride',
    equation: 'CuCl₂ → Cu + Cl₂',
    descriptionJa: '塩化銅水溶液に通電すると、陰極に赤褐色の銅Cuが析出し、陽極から刺激臭の塩素Cl₂が発生します。',
    descriptionEn: 'When electricity passes through copper chloride solution, reddish-brown copper (Cu) forms on the cathode and chlorine (Cl₂), with its sharp smell, bubbles up at the anode.',
    mextCategoryJa: '中学3年: イオンと電気分解',
    mextCategoryEn: 'Grade 9: Ions and Electrolysis',
    reactants: [
      { type: 'compound', id: 'CuCl2', count: 1 }
    ],
    products: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {
      requiresElectricity: true
    },
    heatRelease: -30,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'salt_electrolysis',
    nameJa: '食塩（塩化ナトリウム）の電気分解',
    nameEn: 'Electrolysis of Salt (Sodium Chloride)',
    equation: '2NaCl → 2Na + Cl₂',
    descriptionJa: '高温で融かした食塩（融解塩）に通電すると、金属ナトリウムと黄緑色の塩素ガスCl₂に分解されます（ナトリウムの工業的製法）。固体の食塩はイオンが動けないため電気を通しません。',
    descriptionEn: 'When electricity passes through salt melted at high temperature (molten salt), it breaks down into sodium metal and yellow-green chlorine gas (Cl₂), the industrial way to make sodium. Solid salt does not conduct electricity because its ions cannot move.',
    mextCategoryJa: '高校化学: 融解塩電解 (溶融塩電解)',
    mextCategoryEn: 'High School Chemistry: Molten-Salt Electrolysis',
    reactants: [
      { type: 'compound', id: 'NaCl', count: 2 }
    ],
    products: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {
      requiresElectricity: true
    },
    heatRelease: -40,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'ozone_generation',
    nameJa: 'オゾンの生成 (無声放電)',
    nameEn: 'Ozone Generation (Silent Discharge)',
    equation: '3O₂ → 2O₃',
    descriptionJa: '酸素中で放電すると、酸素分子が酸素の同素体であるオゾン（O₃）に変化します。特有の臭いをもつ淡青色の気体です。',
    descriptionEn: 'Discharging electricity through oxygen converts it into ozone (O₃), a pale blue allotrope of oxygen with a distinctive odor.',
    mextCategoryJa: '高校化学: 酸素の同素体',
    mextCategoryEn: 'High School Chemistry: Allotropes of Oxygen',
    reactants: [
      { type: 'compound', id: 'O2', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'O3', count: 2 }
    ],
    condition: {
      requiresElectricity: true
    },
    heatRelease: -30,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  },
  {
    id: 'ozone_decomposition',
    nameJa: 'オゾンの熱分解',
    nameEn: 'Thermal Decomposition of Ozone',
    equation: '2O₃ → 3O₂',
    descriptionJa: 'オゾンは不安定で、加熱すると分解して酸素分子（O₂）に戻ります。',
    descriptionEn: 'Ozone is unstable and decomposes back into oxygen gas (O₂) when heated.',
    mextCategoryJa: '高校化学: 酸素の同素体',
    mextCategoryEn: 'High School Chemistry: Allotropes of Oxygen',
    reactants: [
      { type: 'compound', id: 'O3', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'O2', count: 3 }
    ],
    condition: {
      minTemp: 120
    },
    heatRelease: 60,
    soundEffect: 'pop',
    visualEffect: 'glow'
  },
  {
    id: 'hcl_synthesis_molecular',
    nameJa: '水素と塩素の化合 (塩化水素の生成)',
    nameEn: 'Hydrogen and Chlorine Combine (Hydrogen Chloride)',
    equation: 'H₂ + Cl₂ → 2HCl',
    descriptionJa: '水素と塩素を混ぜただけでは、暗いところではほとんど反応しません。強い光を当てたり点火・加熱したりすると、連鎖的に激しく反応して、刺激臭のある塩化水素（HCl）気体が生成します。',
    descriptionEn: 'Simply mixing hydrogen and chlorine causes almost no reaction in the dark. Strong light, a spark, or heat starts a violent chain reaction that forms hydrogen chloride (HCl) gas with a sharp smell.',
    mextCategoryJa: '高校化学: ハロゲンと水素の反応 (光・熱連鎖反応)',
    mextCategoryEn: 'High School Chemistry: Reactions of Halogens with Hydrogen (Light and Heat Chain Reactions)',
    reactants: [
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    condition: {
      // 混ぜただけでは反応しない (食塩水の電気分解で出た H₂ と Cl₂ がその場で爆発しないように)。点火ツールなら一瞬で達する
      minTemp: 250
    },
    heatRelease: 120,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'nacl_synthesis_molecular',
    nameJa: 'ナトリウムと塩素気体の激しい化合',
    nameEn: 'Sodium and Chlorine Gas Combine Violently',
    equation: '2Na + Cl₂ → 2NaCl',
    descriptionJa: '金属ナトリウムが塩素ガス中で激しく燃焼し、白色の塩化ナトリウム（食塩）を生じます。',
    descriptionEn: 'Sodium metal burns fiercely in chlorine gas and forms white sodium chloride (table salt).',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaCl', count: 2 }
    ],
    condition: {},
    heatRelease: 200,
    soundEffect: 'spark',
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke']
  },
  {
    id: 'sodium_water_reaction',
    nameJa: 'ナトリウムと水の反応 (水酸化ナトリウムと水素の生成)',
    nameEn: 'Sodium and Water (Sodium Hydroxide and Hydrogen)',
    equation: '2Na + 2H₂O → 2NaOH + H₂',
    descriptionJa: '金属ナトリウムを水に入れると、激しく発熱しながら水面を走り回り、水素ガス（H₂）を発生して強塩基の水酸化ナトリウム（NaOH）になります。',
    descriptionEn: 'Dropped into water, sodium metal races around on the surface, giving off a lot of heat and hydrogen gas (H₂), and becomes sodium hydroxide (NaOH), a strong base.',
    mextCategoryJa: '高校化学: アルカリ金属と水の反応 (最重要実験)',
    mextCategoryEn: 'High School Chemistry: Alkali Metals and Water (Key Experiment)',
    reactants: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'NaOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 150,
    soundEffect: 'fizz',
    visualEffect: 'explosion',
    intensities: ['explosion', 'ignition', 'heat']
  },
  {
    id: 'potassium_water_reaction',
    nameJa: 'カリウムと水の反応 (水酸化カリウムと水素の生成)',
    nameEn: 'Potassium and Water (Potassium Hydroxide and Hydrogen)',
    equation: '2K + 2H₂O → 2KOH + H₂',
    descriptionJa: 'カリウムはナトリウム以上に水と激しく反応し、赤紫色の炎を上げて水素を発生しながら強塩基の水酸化カリウム（KOH）を生じます。',
    descriptionEn: 'Potassium reacts with water even more violently than sodium: it gives off hydrogen with a lilac flame and forms potassium hydroxide (KOH), a strong base.',
    mextCategoryJa: '高校化学: アルカリ金属の反応性比較',
    mextCategoryEn: 'High School Chemistry: Comparing the Reactivity of Alkali Metals',
    reactants: [
      { type: 'element', id: 'K', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'KOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 180,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion', 'ignition']
  },
  {
    id: 'potassium_neutralization',
    nameJa: '水酸化カリウムと塩酸の中和反応',
    nameEn: 'Neutralization of Potassium Hydroxide and Hydrochloric Acid',
    equation: 'KOH + HCl → KCl + H₂O',
    descriptionJa: '強塩基の水酸化カリウムと強酸の塩酸が中和して、塩化カリウム（KCl）と水が生じます。',
    descriptionEn: 'Potassium hydroxide (a strong base) and hydrochloric acid (a strong acid) neutralize each other, forming potassium chloride (KCl) and water.',
    mextCategoryJa: '中学3年・高校化学: 酸と塩基の中和',
    mextCategoryEn: 'Grade 9 and High School Chemistry: Neutralization of Acids and Bases',
    reactants: [
      { type: 'compound', id: 'KOH', count: 1 },
      { type: 'compound', id: 'HCl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KCl', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {},
    heatRelease: 70,
    soundEffect: 'water',
    visualEffect: 'sparkles',
    intensities: ['heat']
  },
  {
    id: 'kcl_synthesis_molecular',
    nameJa: 'カリウムと塩素気体の化合',
    nameEn: 'Potassium and Chlorine Gas Combine',
    equation: '2K + Cl₂ → 2KCl',
    descriptionJa: 'カリウムが塩素気体と激しく反応して塩化カリウム（KCl）を生じます。',
    descriptionEn: 'Potassium reacts violently with chlorine gas and forms potassium chloride (KCl).',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲン',
    mextCategoryEn: 'High School Chemistry: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KCl', count: 2 }
    ],
    condition: {},
    heatRelease: 210,
    soundEffect: 'spark',
    visualEffect: 'flash',
    intensities: ['ignition', 'smoke']
  },
  {
    id: 'licl_synthesis_molecular',
    nameJa: 'リチウムと塩素気体の化合',
    nameEn: 'Lithium and Chlorine Gas Combine',
    equation: '2Li + Cl₂ → 2LiCl',
    descriptionJa: 'リチウムが塩素気体と反応して塩化リチウム（LiCl）を生じます。',
    descriptionEn: 'Lithium reacts with chlorine gas and forms lithium chloride (LiCl).',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲン',
    mextCategoryEn: 'High School Chemistry: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Li', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'LiCl', count: 2 }
    ],
    condition: {},
    heatRelease: 180,
    soundEffect: 'spark',
    visualEffect: 'sparkles',
    intensities: ['ignition']
  },
  {
    id: 'cacl2_synthesis_molecular',
    nameJa: 'カルシウムと塩素気体の化合',
    nameEn: 'Calcium and Chlorine Gas Combine',
    equation: 'Ca + Cl₂ → CaCl₂',
    descriptionJa: 'カルシウムと塩素気体が反応して塩化カルシウム（CaCl₂）を生じます。',
    descriptionEn: 'Calcium reacts with chlorine gas and forms calcium chloride (CaCl₂).',
    mextCategoryJa: '高校化学: アルカリ土類金属の反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ca', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaCl2', count: 1 }
    ],
    condition: {},
    heatRelease: 140,
    soundEffect: 'spark',
    visualEffect: 'sparkles',
    intensities: ['ignition']
  },
  {
    id: 'calcium_oxidation',
    nameJa: 'カルシウムの酸化 (生石灰の生成)',
    nameEn: 'Oxidation of Calcium (Quicklime)',
    equation: '2Ca + O₂ → 2CaO',
    descriptionJa: 'カルシウムを酸素中で加熱すると、橙赤色の炎を伴って酸化カルシウム（生石灰 CaO）が生成します。',
    descriptionEn: 'When calcium is heated in oxygen, it burns with an orange-red flame and forms calcium oxide (quicklime, CaO).',
    mextCategoryJa: '高校化学: アルカリ土類金属の酸化',
    mextCategoryEn: 'High School Chemistry: Oxidation of Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ca', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaO', count: 2 }
    ],
    condition: {
      minTemp: 150
    },
    heatRelease: 160,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'calcium_oxidation_atomic',
    variantOf: 'calcium_oxidation',
    nameJa: 'カルシウムの酸化 (原子から)',
    nameEn: 'Oxidation of Calcium (from Atoms)',
    equation: 'Ca + O → CaO',
    descriptionJa: 'カルシウムと酸素を加熱して酸化カルシウム（生石灰 CaO）を生成します。',
    descriptionEn: 'Heating calcium and oxygen forms calcium oxide (quicklime, CaO).',
    mextCategoryJa: '高校化学: アルカリ土類金属の酸化',
    mextCategoryEn: 'High School Chemistry: Oxidation of Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ca', count: 1 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaO', count: 1 }
    ],
    condition: {
      minTemp: 150
    },
    heatRelease: 140,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'cucl2_synthesis',
    nameJa: '銅と塩素の反応 (塩化銅(II)の生成)',
    nameEn: 'Copper and Chlorine (Copper(II) Chloride)',
    equation: 'Cu + Cl₂ → CuCl₂',
    descriptionJa: '加熱した銅が塩素と反応して青緑色の塩化銅(II)（CuCl₂）が生成します。',
    descriptionEn: 'Heated copper reacts with chlorine and forms blue-green copper(II) chloride (CuCl₂).',
    mextCategoryJa: '高校化学: 遷移元素とハロゲンの反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Transition Elements with Halogens',
    reactants: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CuCl2', count: 1 }
    ],
    condition: {
      minTemp: 120
    },
    heatRelease: 100,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'cucl2_synthesis_atomic',
    variantOf: 'cucl2_synthesis',
    nameJa: '銅と塩素原子の反応 (塩化銅(II)の生成)',
    nameEn: 'Copper and Chlorine Atoms (Copper(II) Chloride)',
    equation: 'Cu + 2Cl → CuCl₂',
    descriptionJa: '銅と塩素を加熱すると化合して塩化銅(II)（CuCl₂）が生成します。',
    descriptionEn: 'Heating copper and chlorine makes them combine into copper(II) chloride (CuCl₂).',
    mextCategoryJa: '高校化学: 遷移元素とハロゲンの反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Transition Elements with Halogens',
    reactants: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'element', id: 'Cl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CuCl2', count: 1 }
    ],
    condition: {
      minTemp: 120
    },
    heatRelease: 100,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'iron_acid_reaction',
    nameJa: '鉄と塩酸の反応 (塩化鉄(II)と水素の発生)',
    nameEn: 'Iron and Hydrochloric Acid (Iron(II) Chloride and Hydrogen)',
    equation: 'Fe + 2HCl → FeCl₂ + H₂',
    descriptionJa: '鉄にうすい塩酸を加えると、水素ガス（H₂）の泡を発生しながら溶けて淡緑色の塩化鉄(II)（FeCl₂）になります。',
    descriptionEn: 'When dilute hydrochloric acid is added to iron, it dissolves while giving off bubbles of hydrogen gas (H₂) and becomes pale green iron(II) chloride (FeCl₂).',
    mextCategoryJa: '中学1年・3年 / 高校化学: 金属と酸の反応',
    mextCategoryEn: 'Grades 7 and 9 / High School Chemistry: Reactions of Metals with Acids',
    reactants: [
      { type: 'element', id: 'Fe', count: 1 },
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'FeCl2', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 65,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'no_synthesis_atomic',
    variantOf: 'no_synthesis',
    nameJa: '窒素原子と酸素原子の化合 (一酸化窒素の生成)',
    nameEn: 'Nitrogen and Oxygen Atoms Combine (Nitric Oxide)',
    equation: 'N + O → NO',
    descriptionJa: '窒素原子と酸素原子が結合して、一酸化窒素（NO）になります。',
    descriptionEn: 'A nitrogen atom and an oxygen atom bond to form nitric oxide (NO).',
    mextCategoryJa: '高校化学: 窒素酸化物 (NOx) の生成',
    mextCategoryEn: 'High School Chemistry: Formation of Nitrogen Oxides (NOx)',
    reactants: [
      { type: 'element', id: 'N', count: 1 },
      { type: 'element', id: 'O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NO', count: 1 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'burn',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'no_synthesis',
    nameJa: '窒素の高温酸化 (一酸化窒素の生成)',
    nameEn: 'High-Temperature Oxidation of Nitrogen (Nitric Oxide)',
    equation: 'N₂ + O₂ → 2NO',
    descriptionJa: '空気中の窒素と酸素は、雷の放電やエンジン内部のような非常な高温（1500℃以上）で反応し、無色の一酸化窒素（NO）になります。',
    descriptionEn: 'Nitrogen and oxygen in air react at very high temperatures (above 1500°C), such as in lightning or inside engines, and form colorless nitric oxide (NO).',
    mextCategoryJa: '高校化学: 窒素酸化物 (NOx) の生成',
    mextCategoryEn: 'High School Chemistry: Formation of Nitrogen Oxides (NOx)',
    reactants: [
      { type: 'compound', id: 'N2', count: 1 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NO', count: 2 }
    ],
    condition: {
      minTemp: 1500
    },
    heatRelease: 50,
    soundEffect: 'burn',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'no2_water_only_nitric_acid',
    nameJa: '二酸化窒素と水の反応 (温水吸収・硝酸生成)',
    nameEn: 'Nitrogen Dioxide and Water (Nitric Acid)',
    equation: '3NO₂ + H₂O → 2HNO₃ + NO',
    descriptionJa: '赤褐色の二酸化窒素（NO₂）を水に溶かすと反応して強酸の硝酸（HNO₃）が生成します（オストワルト法）。',
    descriptionEn: 'When reddish-brown nitrogen dioxide (NO₂) dissolves in water, it reacts to form nitric acid (HNO₃), a strong acid (Ostwald process).',
    mextCategoryJa: '高校化学: オストワルト法 (硝酸の工業的製法)',
    mextCategoryEn: 'High School Chemistry: Ostwald Process (Industrial Production of Nitric Acid)',
    reactants: [
      { type: 'compound', id: 'NO2', count: 3 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HNO3', count: 2 },
      { type: 'compound', id: 'NO', count: 1 }
    ],
    condition: {
      // 酸素 (O₂) があるときは、すべて硝酸になる反応 (4NO₂ + O₂ + 2H₂O → 4HNO₃) の材料がそろうのを待つ
      waitIfNear: ['O2']
    },
    heatRelease: 65,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'haber_bosch_molecular',
    nameJa: 'ハーバー・ボッシュ法 (窒素分子と水素分子からアンモニア合成)',
    nameEn: 'Haber-Bosch Process (Ammonia from Nitrogen and Hydrogen Molecules)',
    equation: 'N₂ + 3H₂ → 2NH₃ (鉄触媒)',
    equationEn: 'N₂ + 3H₂ → 2NH₃ (iron catalyst)',
    descriptionJa: '窒素分子（N₂）と水素分子（H₂）を高温下で反応させてアンモニア（NH₃）を合成します。',
    descriptionEn: 'Nitrogen molecules (N₂) and hydrogen molecules (H₂) react at high temperature to make ammonia (NH₃).',
    mextCategoryJa: '高校化学: 気体平衡とアンモニア工業',
    mextCategoryEn: 'High School Chemistry: Gas Equilibrium and the Ammonia Industry',
    reactants: [
      { type: 'compound', id: 'N2', count: 1 },
      { type: 'compound', id: 'H2', count: 3 },
      { type: 'element', id: 'Fe', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NH3', count: 2 },
      { type: 'element', id: 'Fe', count: 1 }
    ],
    condition: {
      minTemp: 400 // 実際の工業条件は 400〜500℃・高圧・鉄触媒
    },
    heatRelease: 90,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'iron_high_temp_oxidation',
    nameJa: '赤熱鉄の高温酸化 (黒サビ・四酸化三鉄の生成)',
    nameEn: 'High-Temperature Oxidation of Red-Hot Iron (Black Rust, Fe₃O₄)',
    equation: '3Fe + 2O₂ → Fe₃O₄',
    descriptionJa: '鉄を酸素の中でバーナーで真っ赤になるまで（400℃以上）強熱すると、酸素と激しく反応して火花を散らしながら黒色の四酸化三鉄（黒サビ Fe₃O₄）になります。',
    descriptionEn: 'When iron is heated red-hot (above 400°C) with a burner in oxygen, it reacts fiercely, throwing sparks, and becomes black triiron tetroxide (black rust, Fe₃O₄).',
    mextCategoryJa: '中学2年・高校化学: スチールウールの燃焼・鉄の酸化',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Burning Steel Wool, Oxidation of Iron',
    reactants: [
      { type: 'element', id: 'Fe', count: 3 },
      { type: 'compound', id: 'O2', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'Fe3O4', count: 1 }
    ],
    condition: {
      minTemp: 400
    },
    heatRelease: 180,
    soundEffect: 'spark',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'copper_oxide_hydrogen_reduction',
    nameJa: '酸化銅の水素による還元',
    nameEn: 'Reduction of Copper Oxide by Hydrogen',
    equation: 'CuO + H₂ → Cu + H₂O',
    descriptionJa: '黒色の酸化銅(II)を加熱しながら水素ガスを通すと、水素が酸素を奪って水（水蒸気）となり、赤褐色の金属銅（Cu）に還元されます。',
    descriptionEn: 'When hydrogen gas is passed over heated black copper(II) oxide, the hydrogen takes away the oxygen and becomes water (steam), reducing the oxide to reddish-brown copper metal (Cu).',
    mextCategoryJa: '中学2年・高校化学: 酸化と還元 (水素還元実験)',
    mextCategoryEn: 'Grade 8 and High School Chemistry: Oxidation and Reduction (Hydrogen Reduction)',
    reactants: [
      { type: 'compound', id: 'CuO', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    products: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {
      minTemp: 180
    },
    heatRelease: 80,
    soundEffect: 'steam',
    visualEffect: 'sparkles'
  },
  {
    id: 'copper_nitric_acid',
    nameJa: '銅と濃硝酸の反応 (二酸化窒素の発生)',
    nameEn: 'Copper and Concentrated Nitric Acid (Nitrogen Dioxide Gas)',
    equation: 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O',
    descriptionJa: '銅に濃硝酸を加えると、強い酸化作用によって銅が溶け、赤褐色の有毒気体である二酸化窒素（NO₂）が激しく発生します。',
    descriptionEn: 'When concentrated nitric acid is added to copper, its strong oxidizing action dissolves the copper and vigorously gives off nitrogen dioxide (NO₂), a toxic reddish-brown gas.',
    mextCategoryJa: '高校化学: 濃硝酸の酸化作用とNO₂の発生',
    mextCategoryEn: 'High School Chemistry: Oxidizing Action of Concentrated Nitric Acid and NO₂',
    reactants: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'compound', id: 'HNO3', count: 4 }
    ],
    products: [
      { type: 'compound', id: 'CuNO32', count: 1 },
      { type: 'compound', id: 'NO2', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {},
    heatRelease: 90,
    soundEffect: 'fizz',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'phosphorus_combustion',
    nameJa: 'リンの燃焼 (十酸化四リンの白煙生成)',
    nameEn: 'Combustion of Phosphorus (White Smoke of P₄O₁₀)',
    equation: '4P + 5O₂ → P₄O₁₀',
    descriptionJa: 'リンを空気中で加熱・点火すると、淡い青色の炎と激しい白煙を上げて燃焼し、十酸化四リン（五酸化二リン P₄O₁₀）が生成します。',
    descriptionEn: 'When phosphorus is heated and lit in air, it burns with a pale blue flame and thick white smoke, forming tetraphosphorus decoxide (phosphorus pentoxide, P₄O₁₀).',
    mextCategoryJa: '高校化学: 15族元素・リンの燃焼と酸化物',
    mextCategoryEn: 'High School Chemistry: Group 15, Combustion and Oxides of Phosphorus',
    reactants: [
      { type: 'element', id: 'P', count: 4 },
      { type: 'compound', id: 'O2', count: 5 }
    ],
    products: [
      { type: 'compound', id: 'P4O10', count: 1 }
    ],
    condition: {
      minTemp: 34 // 黄リンの発火点 (約34°C): 少し温めるだけで自然発火する
    },
    heatRelease: 200,
    soundEffect: 'burn',
    visualEffect: 'smoke',
    intensities: ['ignition', 'smoke']
  },
  {
    id: 'phosphoric_acid_synthesis',
    nameJa: '十酸化四リンの水和 (リン酸の生成)',
    nameEn: 'Hydration of Tetraphosphorus Decoxide (Phosphoric Acid)',
    equation: 'P₄O₁₀ + 6H₂O → 4H₃PO₄',
    descriptionJa: '十酸化四リン（P₄O₁₀）に水を加えると、激しく発熱しながら反応してリン酸（H₃PO₄）になります。',
    descriptionEn: 'When water is added to tetraphosphorus decoxide (P₄O₁₀), it reacts with a lot of heat and becomes phosphoric acid (H₃PO₄).',
    mextCategoryJa: '高校化学: 酸性酸化物とオキソ酸 (リン酸)',
    mextCategoryEn: 'High School Chemistry: Acidic Oxides and Oxoacids (Phosphoric Acid)',
    reactants: [
      { type: 'compound', id: 'P4O10', count: 1 },
      { type: 'compound', id: 'H2O', count: 6 }
    ],
    products: [
      { type: 'compound', id: 'H3PO4', count: 4 }
    ],
    condition: {},
    heatRelease: 110,
    soundEffect: 'water',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'sodium_bicarbonate_synthesis',
    nameJa: '二酸化炭素の吸収 (炭酸水素ナトリウム・重曹の生成)',
    nameEn: 'Absorbing Carbon Dioxide (Sodium Bicarbonate, Baking Soda)',
    equation: 'NaOH + CO₂ → NaHCO₃',
    descriptionJa: '水酸化ナトリウムが二酸化炭素を吸収して中和し、炭酸水素ナトリウム（重曹 NaHCO₃）が生成します。',
    descriptionEn: 'Sodium hydroxide absorbs carbon dioxide and is neutralized, forming sodium bicarbonate (baking soda, NaHCO₃).',
    mextCategoryJa: '高校化学: 酸性塩の生成 (酸性酸化物と塩基の反応)',
    mextCategoryEn: 'High School Chemistry: Forming Acid Salts (Acidic Oxides and Bases)',
    reactants: [
      { type: 'compound', id: 'NaOH', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaHCO3', count: 1 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'sodium_bicarbonate_decomposition',
    nameJa: '炭酸水素ナトリウム（重曹）の熱分解',
    nameEn: 'Thermal Decomposition of Sodium Bicarbonate (Baking Soda)',
    equation: '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂',
    descriptionJa: '炭酸水素ナトリウム（重曹）を加熱すると、二酸化炭素（CO₂）と水（H₂O）を発生して分解し、強いアルカリ性の炭酸ナトリウム（Na₂CO₃）が残ります。',
    descriptionEn: 'When sodium bicarbonate (baking soda) is heated, it breaks down, giving off carbon dioxide (CO₂) and water (H₂O), and leaves sodium carbonate (Na₂CO₃), which is strongly alkaline.',
    mextCategoryJa: '中学2年: 炭酸水素ナトリウムの熱分解 (最重要実験)',
    mextCategoryEn: 'Grade 8: Thermal Decomposition of Sodium Bicarbonate (Key Experiment)',
    reactants: [
      { type: 'compound', id: 'NaHCO3', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'Na2CO3', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {
      minTemp: 160
    },
    heatRelease: -40,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'sodium_bicarbonate_hcl_reaction',
    nameJa: '重曹と塩酸の反応 (二酸化炭素の発生)',
    nameEn: 'Baking Soda and Hydrochloric Acid (Carbon Dioxide Gas)',
    equation: 'NaHCO₃ + HCl → NaCl + H₂O + CO₂',
    descriptionJa: '炭酸水素ナトリウム（重曹）に塩酸を加えると、激しく泡（二酸化炭素 CO₂）を発泡して食塩と水が生じます。',
    descriptionEn: 'Adding hydrochloric acid to sodium bicarbonate (baking soda) makes it fizz strongly (carbon dioxide, CO₂) and forms table salt and water.',
    mextCategoryJa: '中学・高校化学: 弱酸の遊離反応',
    mextCategoryEn: 'Junior High and High School Chemistry: A Strong Acid Frees a Weak Acid',
    reactants: [
      { type: 'compound', id: 'NaHCO3', count: 1 },
      { type: 'compound', id: 'HCl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaCl', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'aluminium_combustion',
    nameJa: 'アルミニウムの燃焼・酸化 (アルミナの生成)',
    nameEn: 'Combustion and Oxidation of Aluminium (Alumina)',
    equation: '4Al + 3O₂ → 2Al₂O₃',
    descriptionJa: 'アルミニウムを酸素中で強熱すると、白い光と高熱を出して酸化アルミニウム（アルミナ Al₂O₃）が生成します。',
    descriptionEn: 'When aluminium is strongly heated in oxygen, it gives off white light and intense heat and forms aluminium oxide (alumina, Al₂O₃).',
    mextCategoryJa: '高校化学: 両性元素と酸化被膜',
    mextCategoryEn: 'High School Chemistry: Amphoteric Elements and Oxide Layers',
    reactants: [
      { type: 'element', id: 'Al', count: 4 },
      { type: 'compound', id: 'O2', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'Al2O3', count: 2 }
    ],
    condition: {
      minTemp: 220
    },
    heatRelease: 220,
    soundEffect: 'spark',
    visualEffect: 'flash',
    intensities: ['ignition']
  },
  {
    id: 'thermite_reaction',
    nameJa: 'テルミット反応 (酸化鉄のアルミニウム還元)',
    nameEn: 'Thermite Reaction (Reducing Iron Oxide with Aluminium)',
    equation: '2Al + Fe₂O₃ → Al₂O₃ + 2Fe',
    descriptionJa: 'アルミニウム粉末と酸化鉄(III)の混合物（テルミット）に点火すると、激しい閃光と3000℃近い猛烈な反応熱を放って酸化鉄が還元され、融解した鉄（Fe）とアルミナ（Al₂O₃）が生じます。',
    descriptionEn: 'When a mixture of aluminium powder and iron(III) oxide (thermite) is lit, it gives off a fierce flash and tremendous heat close to 3000°C, reducing the iron oxide to molten iron (Fe) and alumina (Al₂O₃).',
    mextCategoryJa: '高校化学: テルミット反応・金属の酸化還元',
    mextCategoryEn: 'High School Chemistry: Thermite Reaction, Redox of Metals',
    reactants: [
      { type: 'element', id: 'Al', count: 2 },
      { type: 'compound', id: 'Fe2O3', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'Al2O3', count: 1 },
      { type: 'element', id: 'Fe', count: 2 }
    ],
    condition: {
      minTemp: 280
    },
    heatRelease: 380,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion', 'heat']
  },
  {
    id: 'silver_nitric_acid',
    nameJa: '銀と硝酸の反応 (硝酸銀の生成)',
    nameEn: 'Silver and Nitric Acid (Silver Nitrate)',
    equation: 'Ag + 2HNO₃ → AgNO₃ + NO₂ + H₂O',
    descriptionJa: 'イオン化傾向の小さい銀（Ag）は塩酸には溶けませんが、酸化力のある硝酸（HNO₃）には溶けて硝酸銀（AgNO₃）と二酸化窒素を生じます。',
    descriptionEn: 'Silver (Ag), which has a low ionization tendency, does not dissolve in hydrochloric acid, but it does dissolve in nitric acid (HNO₃), an oxidizing acid, forming silver nitrate (AgNO₃) and nitrogen dioxide.',
    mextCategoryJa: '高校化学: 貴金属と酸化力のある酸の反応',
    mextCategoryEn: 'High School Chemistry: Reactions of Precious Metals with Oxidizing Acids',
    reactants: [
      { type: 'element', id: 'Ag', count: 1 },
      { type: 'compound', id: 'HNO3', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'AgNO3', count: 1 },
      { type: 'compound', id: 'NO2', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {
      minTemp: 60
    },
    heatRelease: 70,
    soundEffect: 'fizz',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'silver_chloride_precipitation_hcl',
    nameJa: '塩化銀の白色沈殿生成 (硝酸銀 + 塩酸)',
    nameEn: 'White Precipitate of Silver Chloride (Silver Nitrate + Hydrochloric Acid)',
    equation: 'AgNO₃ + HCl → AgCl↓ + HNO₃',
    descriptionJa: '硝酸銀に塩酸（HCl）を加えると、銀イオン（Ag⁺）と塩化物イオン（Cl⁻）が瞬時に結合して、水に難溶な塩化銀（AgCl）の白色沈殿を生じます。',
    descriptionEn: 'When hydrochloric acid (HCl) is added to silver nitrate, silver ions (Ag⁺) and chloride ions (Cl⁻) bond instantly, forming a white precipitate of silver chloride (AgCl), which barely dissolves in water.',
    mextCategoryJa: '高校化学: 金属イオンの沈殿反応 (最重要)',
    mextCategoryEn: 'High School Chemistry: Precipitation Reactions of Metal Ions (Key)',
    reactants: [
      { type: 'compound', id: 'AgNO3', count: 1 },
      { type: 'compound', id: 'HCl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'AgCl', count: 1 },
      { type: 'compound', id: 'HNO3', count: 1 }
    ],
    condition: {},
    heatRelease: 40,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'silver_chloride_direct',
    nameJa: '銀と塩素の直接化合 (塩化銀の生成)',
    nameEn: 'Silver and Chlorine Combine Directly (Silver Chloride)',
    equation: '2Ag + Cl₂ → 2AgCl',
    descriptionJa: '銀と塩素が反応して白色の塩化銀（AgCl）が生成します。',
    descriptionEn: 'Silver reacts with chlorine to form white silver chloride (AgCl).',
    mextCategoryJa: '高校化学: ハロゲン化銀',
    mextCategoryEn: 'High School Chemistry: Silver Halides',
    reactants: [
      { type: 'element', id: 'Ag', count: 2 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'AgCl', count: 2 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'silicon_oxidation',
    nameJa: 'ケイ素の酸化 (二酸化ケイ素・石英の生成)',
    nameEn: 'Oxidation of Silicon (Silicon Dioxide, Quartz)',
    equation: 'Si + O₂ → SiO₂',
    descriptionJa: 'ケイ素（Si）を酸素中で加熱すると、共有結合結晶である二酸化ケイ素（シリカ・石英 SiO₂）が生成します。',
    descriptionEn: 'When silicon (Si) is heated in oxygen, it forms silicon dioxide (silica, quartz, SiO₂), a covalent network crystal.',
    mextCategoryJa: '高校化学: 14族元素・ケイ素と二酸化ケイ素',
    mextCategoryEn: 'High School Chemistry: Group 14, Silicon and Silicon Dioxide',
    reactants: [
      { type: 'element', id: 'Si', count: 1 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'SiO2', count: 1 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 150,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'barium_sulfate_synthesis',
    nameJa: '硫酸バリウムの白色沈殿生成 (バリウム + 硫酸)',
    nameEn: 'White Precipitate of Barium Sulfate (Barium + Sulfuric Acid)',
    equation: 'Ba + H₂SO₄ → BaSO₄↓ + H₂',
    descriptionJa: 'バリウムと硫酸が反応すると、水にも酸にも溶けない極めて安定な硫酸バリウム（BaSO₄）の白色沈殿と水素が生じます。',
    descriptionEn: 'When barium reacts with sulfuric acid, it forms a white precipitate of barium sulfate (BaSO₄), which is extremely stable and dissolves in neither water nor acid, along with hydrogen.',
    mextCategoryJa: '高校化学: アルカリ土類金属の硫酸塩沈殿',
    mextCategoryEn: 'High School Chemistry: Sulfate Precipitates of Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ba', count: 1 },
      { type: 'compound', id: 'H2SO4', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'BaSO4', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 110,
    soundEffect: 'water',
    visualEffect: 'sparkles'
  },
  {
    id: 'lithium_water_reaction',
    nameJa: 'リチウムと水の反応 (穏やかな発熱)',
    nameEn: 'Lithium and Water (Gentle Heat)',
    equation: '2Li + 2H₂O → 2LiOH + H₂',
    descriptionJa: 'リチウムを水に入れると、発熱しながら穏やかに水素の泡を出して水酸化リチウム（LiOH）になります。ナトリウムやカリウムほど激しくはありません。',
    descriptionEn: 'Lithium reacts gently with water, releasing heat and hydrogen bubbles while forming lithium hydroxide (LiOH). Much calmer than sodium or potassium.',
    mextCategoryJa: '高校化学: アルカリ金属と水の反応',
    mextCategoryEn: 'High School: Alkali Metals and Water',
    reactants: [
      { type: 'element', id: 'Li', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'LiOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 80,
    soundEffect: 'fizz',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'rubidium_water_reaction',
    nameJa: 'ルビジウムと水の爆発的反応',
    nameEn: 'Rubidium and Water (Explosive)',
    equation: '2Rb + 2H₂O → 2RbOH + H₂',
    descriptionJa: 'ルビジウムはカリウムよりさらに反応性が高く、水に触れた瞬間に爆発的に反応して水素を発生し、水酸化ルビジウムを生じます。',
    descriptionEn: 'Rubidium is even more reactive than potassium and explodes on contact with water, releasing hydrogen and forming rubidium hydroxide.',
    mextCategoryJa: '高校化学: アルカリ金属と水の反応',
    mextCategoryEn: 'High School: Alkali Metals and Water',
    reactants: [
      { type: 'element', id: 'Rb', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'RbOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 220,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'cesium_water_reaction',
    nameJa: 'セシウムと水の爆発的反応',
    nameEn: 'Cesium and Water (Violent Explosion)',
    equation: '2Cs + 2H₂O → 2CsOH + H₂',
    descriptionJa: 'セシウムはアルカリ金属の中で最も反応性が高く、水と触れると激しく爆発して水素を発生し、水酸化セシウムを生じます。',
    descriptionEn: 'Cesium, the most reactive alkali metal, explodes violently in water, releasing hydrogen and forming cesium hydroxide.',
    mextCategoryJa: '高校化学: アルカリ金属と水の反応',
    mextCategoryEn: 'High School: Alkali Metals and Water',
    reactants: [
      { type: 'element', id: 'Cs', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'CsOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 260,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'f2_synthesis',
    nameJa: 'フッ素分子の生成',
    nameEn: 'Fluorine Molecule Formation',
    equation: '2F → F₂',
    descriptionJa: '2つのフッ素原子が結合して、淡黄色の猛毒気体であるフッ素分子（F₂）になります。',
    descriptionEn: 'Two fluorine atoms bond to form pale yellow, highly toxic fluorine gas (F₂).',
    mextCategoryJa: '高校化学: ハロゲンの単体',
    mextCategoryEn: 'High School: Halogen Molecules',
    reactants: [
      { type: 'element', id: 'F', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'F2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'toxic_cloud',
    intensities: ['heat']
  },
  {
    id: 'br2_synthesis',
    nameJa: '臭素分子の生成',
    nameEn: 'Bromine Molecule Formation',
    equation: '2Br → Br₂',
    descriptionJa: '2つの臭素原子が結合して、常温で赤褐色の液体である臭素（Br₂）になります。',
    descriptionEn: 'Two bromine atoms bond to form bromine (Br₂), a reddish-brown liquid at room temperature.',
    mextCategoryJa: '高校化学: ハロゲンの単体',
    mextCategoryEn: 'High School: Halogen Molecules',
    reactants: [
      { type: 'element', id: 'Br', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'Br2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'toxic_cloud',
    intensities: ['heat']
  },
  {
    id: 'i2_synthesis',
    nameJa: 'ヨウ素分子の生成',
    nameEn: 'Iodine Molecule Formation',
    equation: '2I → I₂',
    descriptionJa: '2つのヨウ素原子が結合して、黒紫色の固体であるヨウ素（I₂）になります。',
    descriptionEn: 'Two iodine atoms bond to form iodine (I₂), a dark violet solid.',
    mextCategoryJa: '高校化学: ハロゲンの単体',
    mextCategoryEn: 'High School: Halogen Molecules',
    reactants: [
      { type: 'element', id: 'I', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'I2', count: 1 }
    ],
    condition: {},
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'sparkles',
    intensities: ['heat']
  },
  {
    id: 'naf_synthesis_molecular',
    nameJa: 'ナトリウムとフッ素の化合 (爆発)',
    nameEn: 'Sodium and Fluorine (Explosive)',
    equation: '2Na + F₂ → 2NaF',
    descriptionJa: '金属ナトリウムとフッ素（F₂）が反応し、爆発しながらイオン結晶のNaFを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Sodium reacts with fluorine (F₂) to form the ionic salt NaF. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'F2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaF', count: 2 }
    ],
    condition: {},
    heatRelease: 260,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'naf_synthesis_atomic',
    variantOf: 'naf_synthesis_molecular',
    nameJa: 'ナトリウムとフッ素原子の化合',
    nameEn: 'Sodium and Fluorine Atoms',
    equation: 'Na + F → NaF',
    descriptionJa: 'ナトリウム原子とフッ素原子が電子をやりとりしてイオン結合し、NaFになります。',
    descriptionEn: 'Sodium and fluorine atoms exchange an electron and form the ionic compound NaF.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 1 },
      { type: 'element', id: 'F', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaF', count: 1 }
    ],
    condition: {},
    heatRelease: 200,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'kf_synthesis_molecular',
    nameJa: 'カリウムとフッ素の化合 (爆発)',
    nameEn: 'Potassium and Fluorine (Explosive)',
    equation: '2K + F₂ → 2KF',
    descriptionJa: '金属カリウムとフッ素（F₂）が反応し、爆発しながらイオン結晶のKFを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Potassium reacts with fluorine (F₂) to form the ionic salt KF. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 2 },
      { type: 'compound', id: 'F2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KF', count: 2 }
    ],
    condition: {},
    heatRelease: 280,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'kf_synthesis_atomic',
    variantOf: 'kf_synthesis_molecular',
    nameJa: 'カリウムとフッ素原子の化合',
    nameEn: 'Potassium and Fluorine Atoms',
    equation: 'K + F → KF',
    descriptionJa: 'カリウム原子とフッ素原子が電子をやりとりしてイオン結合し、KFになります。',
    descriptionEn: 'Potassium and fluorine atoms exchange an electron and form the ionic compound KF.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 1 },
      { type: 'element', id: 'F', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KF', count: 1 }
    ],
    condition: {},
    heatRelease: 220,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'nabr_synthesis_molecular',
    nameJa: 'ナトリウムと臭素の化合 (発火)',
    nameEn: 'Sodium and Bromine (Ignites)',
    equation: '2Na + Br₂ → 2NaBr',
    descriptionJa: '金属ナトリウムと臭素（Br₂）が反応し、発火しながらイオン結晶のNaBrを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Sodium reacts with bromine (Br₂) to form the ionic salt NaBr. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'Br2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaBr', count: 2 }
    ],
    condition: {},
    heatRelease: 160,
    soundEffect: 'burn',
    visualEffect: 'flash',
    intensities: ['ignition']
  },
  {
    id: 'nabr_synthesis_atomic',
    variantOf: 'nabr_synthesis_molecular',
    nameJa: 'ナトリウムと臭素原子の化合',
    nameEn: 'Sodium and Bromine Atoms',
    equation: 'Na + Br → NaBr',
    descriptionJa: 'ナトリウム原子と臭素原子が電子をやりとりしてイオン結合し、NaBrになります。',
    descriptionEn: 'Sodium and bromine atoms exchange an electron and form the ionic compound NaBr.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 1 },
      { type: 'element', id: 'Br', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaBr', count: 1 }
    ],
    condition: {},
    heatRelease: 100,
    soundEffect: 'burn',
    visualEffect: 'flash',
    intensities: ['ignition']
  },
  {
    id: 'kbr_synthesis_molecular',
    nameJa: 'カリウムと臭素の化合 (爆発)',
    nameEn: 'Potassium and Bromine (Explosive)',
    equation: '2K + Br₂ → 2KBr',
    descriptionJa: '金属カリウムと臭素（Br₂）が反応し、爆発しながらイオン結晶のKBrを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Potassium reacts with bromine (Br₂) to form the ionic salt KBr. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 2 },
      { type: 'compound', id: 'Br2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KBr', count: 2 }
    ],
    condition: {},
    heatRelease: 200,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'kbr_synthesis_atomic',
    variantOf: 'kbr_synthesis_molecular',
    nameJa: 'カリウムと臭素原子の化合',
    nameEn: 'Potassium and Bromine Atoms',
    equation: 'K + Br → KBr',
    descriptionJa: 'カリウム原子と臭素原子が電子をやりとりしてイオン結合し、KBrになります。',
    descriptionEn: 'Potassium and bromine atoms exchange an electron and form the ionic compound KBr.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 1 },
      { type: 'element', id: 'Br', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KBr', count: 1 }
    ],
    condition: {},
    heatRelease: 140,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'nai_synthesis_molecular',
    nameJa: 'ナトリウムとヨウ素の化合 (発熱)',
    nameEn: 'Sodium and Iodine (Exothermic)',
    equation: '2Na + I₂ → 2NaI',
    descriptionJa: '金属ナトリウムとヨウ素（I₂）が反応し、発熱しながらイオン結晶のNaIを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Sodium reacts with iodine (I₂) to form the ionic salt NaI. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 2 },
      { type: 'compound', id: 'I2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaI', count: 2 }
    ],
    condition: {},
    heatRelease: 90,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['heat']
  },
  {
    id: 'nai_synthesis_atomic',
    variantOf: 'nai_synthesis_molecular',
    nameJa: 'ナトリウムとヨウ素原子の化合',
    nameEn: 'Sodium and Iodine Atoms',
    equation: 'Na + I → NaI',
    descriptionJa: 'ナトリウム原子とヨウ素原子が電子をやりとりしてイオン結合し、NaIになります。',
    descriptionEn: 'Sodium and iodine atoms exchange an electron and form the ionic compound NaI.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'Na', count: 1 },
      { type: 'element', id: 'I', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaI', count: 1 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['heat']
  },
  {
    id: 'ki_synthesis_molecular',
    nameJa: 'カリウムとヨウ素の化合 (発火)',
    nameEn: 'Potassium and Iodine (Ignites)',
    equation: '2K + I₂ → 2KI',
    descriptionJa: '金属カリウムとヨウ素（I₂）が反応し、発火しながらイオン結晶のKIを生じます。ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂ の順です。',
    descriptionEn: 'Potassium reacts with iodine (I₂) to form the ionic salt KI. Halogen reactivity: F₂ > Cl₂ > Br₂ > I₂.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 2 },
      { type: 'compound', id: 'I2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KI', count: 2 }
    ],
    condition: {},
    heatRelease: 130,
    soundEffect: 'burn',
    visualEffect: 'flash',
    intensities: ['ignition']
  },
  {
    id: 'ki_synthesis_atomic',
    variantOf: 'ki_synthesis_molecular',
    nameJa: 'カリウムとヨウ素原子の化合',
    nameEn: 'Potassium and Iodine Atoms',
    equation: 'K + I → KI',
    descriptionJa: 'カリウム原子とヨウ素原子が電子をやりとりしてイオン結合し、KIになります。',
    descriptionEn: 'Potassium and iodine atoms exchange an electron and form the ionic compound KI.',
    mextCategoryJa: '高校化学: アルカリ金属とハロゲンの反応',
    mextCategoryEn: 'High School: Alkali Metals and Halogens',
    reactants: [
      { type: 'element', id: 'K', count: 1 },
      { type: 'element', id: 'I', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'KI', count: 1 }
    ],
    condition: {},
    heatRelease: 70,
    soundEffect: 'burn',
    visualEffect: 'flash',
    intensities: ['ignition']
  },
  {
    id: 'hf_synthesis',
    nameJa: '水素とフッ素の爆発的反応',
    nameEn: 'Hydrogen and Fluorine (Explodes in the Dark)',
    equation: 'H₂ + F₂ → 2HF',
    descriptionJa: '水素とフッ素は暗所・低温でも混ぜた瞬間に爆発的に反応し、フッ化水素（HF）を生じます。ハロゲンの中でフッ素の反応性が最も高いことを示す反応です。',
    descriptionEn: 'Hydrogen and fluorine explode on contact even in the dark and cold, forming hydrogen fluoride (HF). Fluorine is the most reactive halogen.',
    mextCategoryJa: '高校化学: ハロゲンと水素の反応性',
    mextCategoryEn: 'High School: Reactivity of Halogens with Hydrogen',
    reactants: [
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'compound', id: 'F2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HF', count: 2 }
    ],
    condition: {},
    heatRelease: 260,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion']
  },
  {
    id: 'hbr_synthesis',
    nameJa: '水素と臭素の反応 (加熱で燃焼)',
    nameEn: 'Hydrogen and Bromine (Burns When Heated)',
    equation: 'H₂ + Br₂ → 2HBr',
    descriptionJa: '水素と臭素は常温では反応しませんが、加熱すると水素が臭素の蒸気中で燃えるように反応し、臭化水素（HBr）を生じます。',
    descriptionEn: 'Hydrogen and bromine do not react at room temperature, but when heated, hydrogen burns in bromine vapor to form hydrogen bromide (HBr).',
    mextCategoryJa: '高校化学: ハロゲンと水素の反応性',
    mextCategoryEn: 'High School: Reactivity of Halogens with Hydrogen',
    reactants: [
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'compound', id: 'Br2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HBr', count: 2 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 70,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition'],
    flameColors: { core: '#FECACA', outer: '#DC2626' }
  },
  {
    id: 'hi_synthesis',
    nameJa: '水素とヨウ素の反応 (化学平衡)',
    nameEn: 'Hydrogen and Iodine (Chemical Equilibrium)',
    equation: 'H₂ + I₂ ⇄ 2HI',
    descriptionJa: '水素とヨウ素は高温に加熱するとゆっくり反応してヨウ化水素（HI）を生じますが、逆向きの分解も起こるため一部しか反応しません。化学平衡の代表例です。',
    descriptionEn: 'Hydrogen and iodine react slowly at high temperature to form hydrogen iodide (HI), but the reverse reaction also occurs, so only part reacts. A classic example of chemical equilibrium.',
    mextCategoryJa: '高校化学: 化学平衡',
    mextCategoryEn: 'High School: Chemical Equilibrium',
    reactants: [
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'compound', id: 'I2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'HI', count: 2 }
    ],
    condition: {
      minTemp: 300
    },
    heatRelease: 10,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'aluminium_hcl_reaction',
    nameJa: 'アルミニウムと塩酸の反応 (水素の発生)',
    nameEn: 'Aluminium and Hydrochloric Acid',
    equation: '2Al + 6HCl → 2AlCl₃ + 3H₂',
    descriptionJa: 'アルミニウムに塩酸を加えると、発熱しながら激しく水素の泡を出して溶け、塩化アルミニウムになります。',
    descriptionEn: 'Aluminium dissolves in hydrochloric acid with heat and vigorous hydrogen bubbling, forming aluminium chloride.',
    mextCategoryJa: '高校化学: 両性金属',
    mextCategoryEn: 'High School: Amphoteric Metals',
    reactants: [
      { type: 'element', id: 'Al', count: 2 },
      { type: 'compound', id: 'HCl', count: 6 }
    ],
    products: [
      { type: 'compound', id: 'AlCl3', count: 2 },
      { type: 'compound', id: 'H2', count: 3 }
    ],
    condition: {},
    heatRelease: 110,
    soundEffect: 'fizz',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'aluminium_naoh_reaction',
    nameJa: 'アルミニウムと水酸化ナトリウム水溶液の反応',
    nameEn: 'Aluminium and Sodium Hydroxide Solution',
    equation: '2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂',
    descriptionJa: 'アルミニウムは強塩基の水溶液にも、発熱しながら水素を出して溶けます。酸にも塩基にも溶けるため「両性金属」と呼ばれます。',
    descriptionEn: 'Aluminium also dissolves in strong base, releasing heat and hydrogen. Because it dissolves in both acids and bases, it is called an amphoteric metal.',
    mextCategoryJa: '高校化学: 両性金属',
    mextCategoryEn: 'High School: Amphoteric Metals',
    reactants: [
      { type: 'element', id: 'Al', count: 2 },
      { type: 'compound', id: 'NaOH', count: 2 },
      { type: 'compound', id: 'H2O', count: 6 }
    ],
    products: [
      { type: 'compound', id: 'NaAlOH4', count: 2 },
      { type: 'compound', id: 'H2', count: 3 }
    ],
    condition: {},
    heatRelease: 90,
    soundEffect: 'fizz',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'calcium_carbide_synthesis',
    nameJa: '炭化カルシウムの製造 (電気炉)',
    nameEn: 'Calcium Carbide Production (Electric Furnace)',
    equation: 'CaO + 3C → CaC₂ + CO',
    descriptionJa: '生石灰とコークス（炭素）を電気炉で 2000℃ 近くまで強く加熱すると、炭化カルシウム（カーバイド）と一酸化炭素が生じます。大きな熱を吸収する反応です。',
    descriptionEn: 'Heating quicklime with coke (carbon) to nearly 2000°C in an electric furnace produces calcium carbide and carbon monoxide. This reaction absorbs a lot of heat.',
    mextCategoryJa: '高校化学: アルキン・アセチレン',
    mextCategoryEn: 'High School: Alkynes and Acetylene',
    reactants: [
      { type: 'compound', id: 'CaO', count: 1 },
      { type: 'element', id: 'C', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'CaC2', count: 1 },
      { type: 'compound', id: 'CO', count: 1 }
    ],
    condition: {
      minTemp: 1500
    },
    heatRelease: -80,
    soundEffect: 'burn',
    visualEffect: 'glow'
  },
  {
    id: 'acetylene_generation',
    nameJa: 'アセチレンの発生 (炭化カルシウム + 水)',
    nameEn: 'Acetylene Generation (Calcium Carbide + Water)',
    equation: 'CaC₂ + 2H₂O → C₂H₂ + Ca(OH)₂',
    descriptionJa: '炭化カルシウムに水を加えると、発熱しながら激しく泡を出してアセチレン（C₂H₂）が発生し、水酸化カルシウムが残ります。',
    descriptionEn: 'Adding water to calcium carbide releases heat and vigorous bubbles of acetylene (C₂H₂), leaving calcium hydroxide.',
    mextCategoryJa: '高校化学: アルキン・アセチレン',
    mextCategoryEn: 'High School: Alkynes and Acetylene',
    reactants: [
      { type: 'compound', id: 'CaC2', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'C2H2', count: 1 },
      { type: 'compound', id: 'CaOH2', count: 1 }
    ],
    condition: {},
    heatRelease: 120,
    soundEffect: 'fizz',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'acetylene_combustion',
    nameJa: 'アセチレンの燃焼 (酸素アセチレン炎)',
    nameEn: 'Acetylene Combustion (Oxyacetylene Flame)',
    equation: '2C₂H₂ + 5O₂ → 4CO₂ + 2H₂O',
    descriptionJa: 'アセチレンは酸素と混ざった状態で点火すると爆発的に燃焼し、3000℃ を超える非常に高温でまぶしい炎を出します。金属の溶接・切断に利用されます。',
    descriptionEn: 'Acetylene mixed with oxygen burns explosively when ignited, producing a dazzling flame above 3000°C. Used for welding and cutting metal.',
    mextCategoryJa: '高校化学: アルキン・アセチレン',
    mextCategoryEn: 'High School: Alkynes and Acetylene',
    reactants: [
      { type: 'compound', id: 'C2H2', count: 2 },
      { type: 'compound', id: 'O2', count: 5 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 4 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 300
    },
    heatRelease: 300,
    soundEffect: 'spark',
    visualEffect: 'explosion',
    intensities: ['explosion', 'ignition'],
    flameColors: { core: '#FFFFFF', outer: '#93C5FD' }
  },
  {
    id: 'acetylene_hydrogenation',
    nameJa: 'アセチレンへの水素の付加 (エチレンの生成)',
    nameEn: 'Adding Hydrogen to Acetylene (Making Ethylene)',
    equation: 'C₂H₂ + H₂ → C₂H₄ (ニッケル触媒)',
    equationEn: 'C₂H₂ + H₂ → C₂H₄ (nickel catalyst)',
    descriptionJa: 'アセチレンの三重結合に、ニッケルなどの触媒のはたらきで水素が付け加わり、二重結合をもつエチレンになります。ニッケルは触媒なので変化しません。',
    descriptionEn: 'With a catalyst such as nickel, hydrogen adds to the triple bond of acetylene to make ethylene, which has a double bond. The nickel is a catalyst and is not used up.',
    mextCategoryJa: '高校化学: 付加反応・アルケン',
    mextCategoryEn: 'High School: Addition Reactions and Alkenes',
    reactants: [
      { type: 'compound', id: 'C2H2', count: 1 },
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'element', id: 'Ni', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'C2H4', count: 1 },
      { type: 'element', id: 'Ni', count: 1 } // 触媒として再生
    ],
    condition: {
      minTemp: 150
    },
    heatRelease: 60,
    soundEffect: 'pop',
    visualEffect: 'sparkles',
    intensities: ['heat']
  },
  {
    id: 'ethylene_combustion',
    nameJa: 'エチレンの燃焼',
    nameEn: 'Ethylene Combustion',
    equation: 'C₂H₄ + 3O₂ → 2CO₂ + 2H₂O',
    descriptionJa: 'エチレンは酸素と混ざった状態で点火すると、明るい炎を上げて燃え、二酸化炭素と水になります。',
    descriptionEn: 'Ethylene mixed with oxygen burns with a bright flame when ignited, forming carbon dioxide and water.',
    mextCategoryJa: '中学2年: 有機物の燃焼 / 高校化学: アルケン',
    mextCategoryEn: 'Grade 8: Burning Organic Matter / High School: Alkenes',
    reactants: [
      { type: 'compound', id: 'C2H4', count: 1 },
      { type: 'compound', id: 'O2', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 450 // エチレンの発火点 (約450℃)
    },
    heatRelease: 200,
    soundEffect: 'burn',
    visualEffect: 'explosion',
    intensities: ['explosion', 'ignition'],
    flameColors: { core: '#FEF3C7', outer: '#FBBF24' }
  },
  {
    id: 'ethanol_dehydration',
    nameJa: 'エタノールの脱水 (エチレンの発生)',
    nameEn: 'Dehydrating Ethanol (Making Ethylene)',
    equation: 'C₂H₅OH → C₂H₄ + H₂O (濃硫酸, 160〜170℃)',
    equationEn: 'C₂H₅OH → C₂H₄ + H₂O (conc. sulfuric acid, 160–170°C)',
    descriptionJa: 'エタノールに濃硫酸を加えて160〜170℃に熱すると、濃硫酸が水を奪う（脱水）はたらきでエチレンが発生します。もっと低い温度（約130〜140℃）では、ジエチルエーテルができます。',
    descriptionEn: 'Heating ethanol with concentrated sulfuric acid to 160–170°C removes water (dehydration) and gives off ethylene. At a lower temperature (about 130–140°C), diethyl ether forms instead.',
    mextCategoryJa: '高校化学: アルコールの反応',
    mextCategoryEn: 'High School: Reactions of Alcohols',
    reactants: [
      { type: 'compound', id: 'C2H5OH', count: 1 },
      { type: 'compound', id: 'H2SO4', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'C2H4', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'H2SO4', count: 1 } // 触媒として再生
    ],
    condition: {
      minTemp: 160
    },
    heatRelease: -10,
    soundEffect: 'steam',
    visualEffect: 'steam'
  },
  {
    id: 'ethylene_hydration',
    nameJa: 'エチレンへの水の付加 (エタノールの合成)',
    nameEn: 'Adding Water to Ethylene (Making Ethanol)',
    equation: 'C₂H₄ + H₂O → C₂H₅OH (リン酸触媒, 約300℃)',
    equationEn: 'C₂H₄ + H₂O → C₂H₅OH (phosphoric acid catalyst, about 300°C)',
    descriptionJa: 'エチレンと水蒸気を、リン酸を触媒にして約300℃・高い圧力で反応させると、水が付け加わってエタノールができます。工業的なエタノールのつくり方です。',
    descriptionEn: 'Reacting ethylene with steam at about 300°C and high pressure, with phosphoric acid as a catalyst, adds water to make ethanol. This is how ethanol is made industrially.',
    mextCategoryJa: '高校化学: 付加反応・アルコール',
    mextCategoryEn: 'High School: Addition Reactions and Alcohols',
    reactants: [
      { type: 'compound', id: 'C2H4', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'H3PO4', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'C2H5OH', count: 1 },
      { type: 'compound', id: 'H3PO4', count: 1 } // 触媒として再生
    ],
    condition: {
      minTemp: 250,
      maxTemp: 350
    },
    heatRelease: 20,
    soundEffect: 'pop',
    visualEffect: 'sparkles'
  },
  {
    id: 'glucose_fermentation',
    nameJa: 'アルコール発酵 (ブドウ糖 → エタノール)',
    nameEn: 'Alcoholic Fermentation (Glucose → Ethanol)',
    equation: 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (酵母)',
    equationEn: 'C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (yeast)',
    descriptionJa: '酵母（イースト）は、水にとけたブドウ糖をエタノールと二酸化炭素に分解します。パンがふくらむのも、お酒ができるのもこのはたらきです。本当は酵母という小さな生き物が何時間〜何日もかけて進めますが、ゲームでは酵母を省略して、30〜40℃の水の中で起こるようにしています。',
    descriptionEn: 'Yeast breaks down glucose dissolved in water into ethanol and carbon dioxide. This is what makes bread rise and turns juice into alcoholic drinks. In reality tiny living yeast cells take hours or days; the game leaves out the yeast and lets it happen in water at 30–40°C.',
    mextCategoryJa: '中学・高校: 発酵と微生物のはたらき',
    mextCategoryEn: 'Junior High and High School: Fermentation by Microorganisms',
    reactants: [
      { type: 'compound', id: 'C6H12O6', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'C2H5OH', count: 2 },
      { type: 'compound', id: 'CO2', count: 2 },
      { type: 'compound', id: 'H2O', count: 1 } // 発酵が進む場所としての水
    ],
    condition: {
      // 酵母がよくはたらくぬるま湯 (約30〜40℃)。バーナーで温めすぎても、冷めていく途中で起こるよう少し広めにとる
      minTemp: 28,
      maxTemp: 45
    },
    heatRelease: 10,
    soundEffect: 'fizz',
    visualEffect: 'sparkles'
  },
  {
    id: 'ethanol_combustion',
    nameJa: 'エタノールの燃焼 (アルコールランプ)',
    nameEn: 'Ethanol Combustion (Alcohol Lamp)',
    equation: 'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O',
    descriptionJa: 'エタノールは青白い炎を上げて燃え、二酸化炭素と水ができます。アルコールランプの燃料です。燃えたあとに石灰水を白くにごらせる気体（CO₂）ができることを確かめてみよう。',
    descriptionEn: 'Ethanol burns with a pale blue flame, forming carbon dioxide and water. It is the fuel of alcohol lamps. Check that the gas it makes (CO₂) turns limewater cloudy.',
    mextCategoryJa: '小学6年: ものの燃え方 / 中学2年: 有機物の燃焼',
    mextCategoryEn: 'Grade 6: How Things Burn / Grade 8: Burning Organic Matter',
    reactants: [
      { type: 'compound', id: 'C2H5OH', count: 1 },
      { type: 'compound', id: 'O2', count: 3 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 2 },
      { type: 'compound', id: 'H2O', count: 3 }
    ],
    condition: {
      minTemp: 363 // エタノールの発火点 (約363℃)
    },
    heatRelease: 180,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition'],
    flameColors: { core: '#DBEAFE', outer: '#60A5FA' }
  },
  {
    id: 'ethanol_to_acetic_acid',
    nameJa: 'お酒が酢になる (エタノールの酸化)',
    nameEn: 'Alcohol Turns Into Vinegar (Oxidizing Ethanol)',
    equation: 'C₂H₅OH + O₂ → CH₃COOH + H₂O (酢酸菌)',
    equationEn: 'C₂H₅OH + O₂ → CH₃COOH + H₂O (acetic acid bacteria)',
    descriptionJa: 'お酒の中のエタノールは、酢酸菌のはたらきで空気中の酸素と結びつき（酸化）、酢酸になります。これが食酢のつくり方です。本当は酢酸菌が何日もかけて進めますが、ゲームでは酢酸菌を省略して、水の中で起こるようにしています。',
    descriptionEn: 'Acetic acid bacteria make the ethanol in alcoholic drinks combine with oxygen from the air (oxidation) to form acetic acid. This is how vinegar is made. In reality the bacteria take days; the game leaves them out and lets it happen in water.',
    mextCategoryJa: '高校化学: アルコールの酸化・カルボン酸',
    mextCategoryEn: 'High School: Oxidation of Alcohols and Carboxylic Acids',
    reactants: [
      { type: 'compound', id: 'C2H5OH', count: 1 },
      { type: 'compound', id: 'O2', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CH3COOH', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 15, // 酢酸菌がはたらく温度
      maxTemp: 40
    },
    heatRelease: 20,
    soundEffect: 'fizz',
    visualEffect: 'sparkles'
  },
  {
    id: 'acetic_acid_baking_soda',
    nameJa: '酢酸と重曹の反応 (二酸化炭素の発生)',
    nameEn: 'Acetic Acid and Baking Soda (Carbon Dioxide Gas)',
    equation: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂',
    descriptionJa: 'お酢（酢酸）に重曹（炭酸水素ナトリウム）を加えると、シュワシュワと二酸化炭素のあわが出て、酢酸ナトリウムと水ができます。少し熱をうばうので、まわりがわずかに冷えます。',
    descriptionEn: 'Adding baking soda (sodium bicarbonate) to vinegar (acetic acid) fizzes with bubbles of carbon dioxide and forms sodium acetate and water. It takes in a little heat, so things cool slightly.',
    mextCategoryJa: '小学6年: 水溶液の性質 / 中学3年: 酸・アルカリと塩',
    mextCategoryEn: 'Grade 6: Properties of Solutions / Grade 9: Acids, Alkalis, and Salts',
    reactants: [
      { type: 'compound', id: 'CH3COOH', count: 1 },
      { type: 'compound', id: 'NaHCO3', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CH3COONa', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 },
      { type: 'compound', id: 'CO2', count: 1 }
    ],
    condition: {},
    heatRelease: -5,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'acetic_acid_neutralization',
    nameJa: '中和反応 (酢酸 + 水酸化ナトリウム)',
    nameEn: 'Neutralization (Acetic Acid + Sodium Hydroxide)',
    equation: 'CH₃COOH + NaOH → CH₃COONa + H₂O',
    descriptionJa: '弱い酸の酢酸と、強い塩基の水酸化ナトリウムが中和し、酢酸ナトリウムと水ができます。できた水溶液は弱いアルカリ性になります。',
    descriptionEn: 'Acetic acid (a weak acid) and sodium hydroxide (a strong base) neutralize each other to form sodium acetate and water. The resulting solution is weakly alkaline.',
    mextCategoryJa: '中学3年: 中和と塩 / 高校化学: 弱酸の中和',
    mextCategoryEn: 'Grade 9: Neutralization and Salts / High School: Neutralizing a Weak Acid',
    reactants: [
      { type: 'compound', id: 'CH3COOH', count: 1 },
      { type: 'compound', id: 'NaOH', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CH3COONa', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {},
    heatRelease: 65,
    soundEffect: 'water',
    visualEffect: 'sparkles',
    intensities: ['heat']
  },
  {
    id: 'glucose_combustion',
    nameJa: 'ブドウ糖の燃焼 (呼吸と同じ式)',
    nameEn: 'Burning Glucose (Same Equation as Respiration)',
    equation: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O',
    descriptionJa: 'ブドウ糖を強く熱すると、融けてこげながら燃え、二酸化炭素と水になります。生き物の呼吸も同じ式で、体の中ではゆっくりと少しずつエネルギーを取り出しています。',
    descriptionEn: 'Strongly heated glucose melts, chars, and burns, forming carbon dioxide and water. Respiration in living things follows the same equation, but the body releases the energy slowly, step by step.',
    mextCategoryJa: '中学2年: 有機物の燃焼・呼吸',
    mextCategoryEn: 'Grade 8: Burning Organic Matter and Respiration',
    reactants: [
      { type: 'compound', id: 'C6H12O6', count: 1 },
      { type: 'compound', id: 'O2', count: 6 }
    ],
    products: [
      { type: 'compound', id: 'CO2', count: 6 },
      { type: 'compound', id: 'H2O', count: 6 }
    ],
    condition: {
      minTemp: 400
    },
    heatRelease: 250,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['ignition']
  },
  {
    id: 'silver_oxide_decomposition',
    nameJa: '酸化銀の熱分解 (銀と酸素)',
    nameEn: 'Thermal Decomposition of Silver Oxide (Silver and Oxygen)',
    equation: '2Ag₂O → 4Ag + O₂',
    descriptionJa: '黒い酸化銀を加熱すると、酸素を出して白い銀が残ります。1種類の物質から2種類以上の物質ができる「分解」の代表的な実験です。',
    descriptionEn: 'Heating black silver oxide gives off oxygen and leaves white silver. It is the classic example of decomposition: one substance turning into two or more.',
    mextCategoryJa: '中学2年: 分解 (必修実験)',
    mextCategoryEn: 'Grade 8: Decomposition (Key Experiment)',
    reactants: [
      { type: 'compound', id: 'Ag2O', count: 2 }
    ],
    products: [
      { type: 'element', id: 'Ag', count: 4 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    condition: {
      minTemp: 250 // 酸化銀は約250〜300℃で分解する
    },
    heatRelease: -30,
    soundEffect: 'steam',
    visualEffect: 'sparkles'
  },
  {
    id: 'ammonia_generation',
    nameJa: 'アンモニアの発生 (塩化アンモニウム + 水酸化カルシウム)',
    nameEn: 'Making Ammonia (Ammonium Chloride + Calcium Hydroxide)',
    equation: '2NH₄Cl + Ca(OH)₂ → CaCl₂ + 2NH₃ + 2H₂O',
    descriptionJa: '塩化アンモニウムと水酸化カルシウムを混ぜて加熱すると、アンモニアが発生します。アンモニアは水にとてもよくとけて空気より軽いので、上方置換で集めます。',
    descriptionEn: 'Heating a mixture of ammonium chloride and calcium hydroxide gives off ammonia. Ammonia dissolves very well in water and is lighter than air, so it is collected by upward displacement of air.',
    mextCategoryJa: '中学1年・2年: 気体の発生と性質 (必修実験)',
    mextCategoryEn: 'Grades 7–8: Making Gases and Their Properties (Key Experiment)',
    reactants: [
      { type: 'compound', id: 'NH4Cl', count: 2 },
      { type: 'compound', id: 'CaOH2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CaCl2', count: 1 },
      { type: 'compound', id: 'NH3', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {
      minTemp: 100
    },
    heatRelease: -20,
    soundEffect: 'steam',
    visualEffect: 'steam'
  },
  {
    id: 'magnesium_hcl_reaction',
    nameJa: 'マグネシウムと塩酸の反応 (水素の発生)',
    nameEn: 'Magnesium and Hydrochloric Acid (Hydrogen Gas)',
    equation: 'Mg + 2HCl → MgCl₂ + H₂',
    descriptionJa: 'マグネシウムにうすい塩酸を加えると、さかんにあわ（水素）を出しながらとけて、塩化マグネシウムになります。集めた気体に火を近づけると、ポンと音を立てて燃えます。',
    descriptionEn: 'Adding dilute hydrochloric acid to magnesium makes it dissolve while fizzing strongly with hydrogen, forming magnesium chloride. The collected gas burns with a pop when a flame is brought near.',
    mextCategoryJa: '中学1年: 気体の発生 / 中学3年: イオン',
    mextCategoryEn: 'Grade 7: Making Gases / Grade 9: Ions',
    reactants: [
      { type: 'element', id: 'Mg', count: 1 },
      { type: 'compound', id: 'HCl', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'MgCl2', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 80,
    soundEffect: 'fizz',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'barium_water_reaction',
    nameJa: 'バリウムと水の反応',
    nameEn: 'Barium and Water',
    equation: 'Ba + 2H₂O → Ba(OH)₂ + H₂',
    descriptionJa: 'バリウムは水と反応して水素を出し、強いアルカリの水酸化バリウムになります。',
    descriptionEn: 'Barium reacts with water, giving off hydrogen and forming barium hydroxide, a strong alkali.',
    mextCategoryJa: '高校化学: アルカリ土類金属',
    mextCategoryEn: 'High School: Alkaline Earth Metals',
    reactants: [
      { type: 'element', id: 'Ba', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'BaOH2', count: 1 },
      { type: 'compound', id: 'H2', count: 1 }
    ],
    condition: {},
    heatRelease: 80,
    soundEffect: 'fizz',
    visualEffect: 'steam'
  },
  {
    id: 'sulfuric_acid_barium_hydroxide',
    nameJa: '中和反応 (硫酸 + 水酸化バリウム → 白い沈殿)',
    nameEn: 'Neutralization (Sulfuric Acid + Barium Hydroxide → White Precipitate)',
    equation: 'H₂SO₄ + Ba(OH)₂ → BaSO₄↓ + 2H₂O',
    descriptionJa: '硫酸と水酸化バリウム水溶液を混ぜると中和が起こり、水にとけない硫酸バリウムの白い沈殿ができます。イオンが沈殿と水に変わるので、ちょうど中和したところでは電流がほとんど流れなくなります。',
    descriptionEn: 'Mixing sulfuric acid and barium hydroxide solution neutralizes them and forms a white precipitate of barium sulfate, which does not dissolve in water. The ions turn into the precipitate and water, so almost no current flows at the exact point of neutralization.',
    mextCategoryJa: '中学3年: 中和と塩 (必修実験)',
    mextCategoryEn: 'Grade 9: Neutralization and Salts (Key Experiment)',
    reactants: [
      { type: 'compound', id: 'H2SO4', count: 1 },
      { type: 'compound', id: 'BaOH2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'BaSO4', count: 1 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    condition: {},
    heatRelease: 60,
    soundEffect: 'water',
    visualEffect: 'sparkles',
    intensities: ['heat'],
    visualHint: 'cloudy'
  },
  {
    id: 'copper_sulfur_combination',
    nameJa: '銅と硫黄の化合 (硫化銅の生成)',
    nameEn: 'Copper and Sulfur Combine (Copper Sulfide)',
    equation: 'Cu + S → CuS',
    descriptionJa: '熱した銅を硫黄の蒸気に入れると、赤く光りながら反応して黒い硫化銅になります。中学ではCuSと表しますが、実際に加熱してできる硫化銅にはCu₂Sも多くふくまれます。',
    descriptionEn: 'Heated copper put into sulfur vapor glows red as it reacts and becomes black copper sulfide. Junior high writes it as CuS, but the copper sulfide formed by heating also contains a lot of Cu₂S.',
    mextCategoryJa: '中学2年: 物質の化合 (必修実験)',
    mextCategoryEn: 'Grade 8: Combining Substances (Key Experiment)',
    reactants: [
      { type: 'element', id: 'Cu', count: 1 },
      { type: 'element', id: 'S', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'CuS', count: 1 }
    ],
    condition: {
      minTemp: 200
    },
    heatRelease: 80,
    soundEffect: 'burn',
    visualEffect: 'glow',
    intensities: ['heat']
  },
  {
    id: 'sulfuric_acid_dilution',
    nameJa: '濃硫酸の希釈熱',
    nameEn: 'Heat of Diluting Sulfuric Acid',
    equation: 'H₂SO₄ + 水 → 希硫酸 (溶解熱)',
    equationEn: 'H₂SO₄ + water → dilute sulfuric acid (heat of dissolution)',
    descriptionJa: '濃硫酸が水に溶けると大量の熱が発生します。水に濃硫酸を加えると突沸して飛び散る危険があるため、必ず「水に濃硫酸を少しずつ加える」のが鉄則です。',
    descriptionEn: 'Concentrated sulfuric acid releases a large amount of heat when it dissolves in water. Always add acid to water slowly, never water to acid, to avoid violent boiling.',
    mextCategoryJa: '中学3年・高校化学: 溶解熱',
    mextCategoryEn: 'Chemistry: Heat of Dissolution',
    reactants: [
      { type: 'compound', id: 'H2SO4', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'H2SO4', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {
      isDissolution: true
    },
    heatRelease: 120,
    soundEffect: 'steam',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'naoh_dissolution',
    nameJa: '水酸化ナトリウムの溶解熱',
    nameEn: 'Heat of Dissolving Sodium Hydroxide',
    equation: 'NaOH + 水 → 水酸化ナトリウム水溶液 (溶解熱)',
    equationEn: 'NaOH + water → sodium hydroxide solution (heat of dissolution)',
    descriptionJa: '固体の水酸化ナトリウムを水に溶かすと、かなりの熱が発生して水溶液の温度が上がります。',
    descriptionEn: 'Dissolving solid sodium hydroxide in water releases considerable heat, warming the solution.',
    mextCategoryJa: '中学3年・高校化学: 溶解熱',
    mextCategoryEn: 'Chemistry: Heat of Dissolution',
    reactants: [
      { type: 'compound', id: 'NaOH', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NaOH', count: 1 },
      { type: 'compound', id: 'H2O', count: 1 }
    ],
    condition: {
      isDissolution: true
    },
    heatRelease: 60,
    soundEffect: 'water',
    visualEffect: 'steam',
    intensities: ['heat']
  },
  {
    id: 'no_oxidation',
    nameJa: '一酸化窒素の酸化 (無色から赤褐色へ)',
    nameEn: 'Nitric Oxide Turns Brown in Air',
    equation: '2NO + O₂ → 2NO₂',
    descriptionJa: '無色の一酸化窒素は、空気中の酸素と触れるとすぐに反応して赤褐色の二酸化窒素（NO₂）になります。',
    descriptionEn: 'Colorless nitric oxide reacts immediately with oxygen in air to form reddish-brown nitrogen dioxide (NO₂).',
    mextCategoryJa: '高校化学: 窒素の酸化物',
    mextCategoryEn: 'High School: Nitrogen Oxides',
    reactants: [
      { type: 'compound', id: 'NO', count: 2 },
      { type: 'compound', id: 'O2', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'NO2', count: 2 }
    ],
    condition: {},
    heatRelease: 40,
    soundEffect: 'pop',
    visualEffect: 'toxic_cloud'
  },
  {
    id: 'silver_chloride_direct_atomic',
    nameJa: '銀と塩素原子の化合',
    nameEn: 'Silver and Chlorine Atoms',
    equation: 'Ag + Cl → AgCl',
    descriptionJa: '銀原子と塩素原子が結合して、塩化銀（AgCl）になります。',
    descriptionEn: 'Silver and chlorine atoms combine to form silver chloride (AgCl).',
    mextCategoryJa: '高校化学: ハロゲン化銀',
    mextCategoryEn: 'High School: Silver Halides',
    reactants: [
      { type: 'element', id: 'Ag', count: 1 },
      { type: 'element', id: 'Cl', count: 1 }
    ],
    products: [
      { type: 'compound', id: 'AgCl', count: 1 }
    ],
    condition: {},
    heatRelease: 50,
    soundEffect: 'pop',
    visualEffect: 'sparkles',
    variantOf: 'silver_chloride_direct'
  },
  {
    id: 'brine_electrolysis',
    nameJa: '食塩水の電気分解',
    nameEn: 'Electrolysis of Brine',
    equation: '2NaCl + 2H₂O → 2NaOH + H₂ + Cl₂',
    descriptionJa: '食塩水に電流を流すと、陰極から水素、陽極から塩素が発生し、水溶液には水酸化ナトリウムが残ります。水酸化ナトリウムや塩素の工業的製法（イオン交換膜法）の原理です。',
    descriptionEn: 'Passing current through salt water releases hydrogen at the cathode and chlorine at the anode, leaving sodium hydroxide in solution. This is the basis of the industrial chlor-alkali process.',
    mextCategoryJa: '中学3年・高校化学: 電気分解',
    mextCategoryEn: 'Chemistry: Electrolysis',
    reactants: [
      { type: 'compound', id: 'NaCl', count: 2 },
      { type: 'compound', id: 'H2O', count: 2 }
    ],
    products: [
      { type: 'compound', id: 'NaOH', count: 2 },
      { type: 'compound', id: 'H2', count: 1 },
      { type: 'compound', id: 'Cl2', count: 1 }
    ],
    condition: {
      requiresElectricity: true
    },
    heatRelease: -40,
    soundEffect: 'spark',
    visualEffect: 'sparkles'
  }
];
