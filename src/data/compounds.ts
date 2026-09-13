import { Language } from '../i18n';

export interface CraftMaterial {
  type: 'element' | 'compound';
  id: string;
  count: number;
}

export interface CompoundCraftRecipe {
  materials: CraftMaterial[];
  methodJa: string;
  methodEn: string;
  toolRequired?: 'heat' | 'electric' | 'spawn';
  toastGuideJa: string;
  toastGuideEn: string;
}

export interface CompoundData {
  id: string;
  formula: string;
  nameJa: string;
  nameEn: string;
  elements: Record<string, number>; // 構成元素と個数 (例: { H: 2, O: 1 })
  molarMass: number; // g/mol
  stateAtRoomTemp: 'gas' | 'liquid' | 'solid';
  meltingPoint: number; // °C
  boilingPoint: number; // °C
  color: string;
  secondaryColor?: string;
  isToxic?: boolean;
  toxicWarning?: string;
  toxicWarningEn?: string;
  descriptionJa: string;
  descriptionEn?: string;
  mextFactJa: string;
  mextFactEn?: string;
  renderRadius: number; // ピクセル半径
  // 小学生・子供向けなぞなぞヒント & レシピ
  kidHintJa?: string;
  kidHintEn?: string;
  recipe?: CompoundCraftRecipe;
}

export function getCompoundName(comp: CompoundData, lang: Language): string {
  return lang === 'en' ? comp.nameEn : comp.nameJa;
}

export function getCompoundDescription(comp: CompoundData, lang: Language): string {
  if (lang === 'en' && comp.descriptionEn) return comp.descriptionEn;
  if (lang === 'en') {
    return `${comp.nameEn} (${comp.formula}). Molar mass: ${comp.molarMass} g/mol, room temperature state: ${comp.stateAtRoomTemp}.`;
  }
  return comp.descriptionJa;
}

export function getCompoundFact(comp: CompoundData, lang: Language): string {
  if (lang === 'en' && comp.mextFactEn) return comp.mextFactEn;
  if (lang === 'en') {
    return `Chemical formula: ${comp.formula}. Melting point: ${comp.meltingPoint}°C, boiling point: ${comp.boilingPoint}°C.`;
  }
  return comp.mextFactJa;
}

export function getCompoundKidHint(comp: CompoundData, lang: Language): string {
  if (lang === 'en' && comp.kidHintEn) return comp.kidHintEn;
  if (comp.kidHintJa) return comp.kidHintJa;
  return getCompoundDescription(comp, lang);
}

export function getCompoundToxicWarning(comp: CompoundData, lang: Language): string {
  if (lang === 'en' && comp.toxicWarningEn) return comp.toxicWarningEn;
  if (lang === 'en' && comp.isToxic) {
    return `⚠️ Toxic gas warning: ${comp.nameEn} (${comp.formula}) is hazardous to health.`;
  }
  return comp.toxicWarning || '';
}

export type CompoundCategory = 'basic' | 'gas' | 'acid_base' | 'salt';

export interface CompoundCategoryInfo {
  id: CompoundCategory;
  nameJa: string;
  nameEn: string;
  compoundIds: string[];
}

export const COMPOUND_CATEGORY_LIST: CompoundCategoryInfo[] = [
  {
    id: 'basic',
    nameJa: '基本',
    nameEn: 'Basic',
    compoundIds: ['H2O', 'CO2', 'H2O2', 'NaCl', 'HCl', 'NaOH', 'CH4', 'O2', 'H2', 'CuO', 'Fe2O3']
  },
  {
    id: 'gas',
    nameJa: '気体',
    nameEn: 'Gases',
    compoundIds: ['H2', 'O2', 'CO', 'CO2', 'CH4', 'HCl', 'SO2', 'NH3', 'NO2', 'H2S', 'Cl2']
  },
  {
    id: 'acid_base',
    nameJa: '酸・塩基',
    nameEn: 'Acids/Bases',
    compoundIds: ['HCl', 'H2SO4', 'HNO3', 'H2O2', 'NaOH', 'CaOH2', 'NH3', 'CaO', 'MgO', 'H2S']
  },
  {
    id: 'salt',
    nameJa: '塩',
    nameEn: 'Salts',
    compoundIds: ['NaCl', 'CuCl2', 'ZnCl2', 'CaCl2', 'FeCl2', 'NH4Cl', 'CaCO3', 'CuSO4', 'FeS', 'CuO', 'Fe2O3', 'Fe3O4', 'MnO2', 'SO3']
  }
];

export const COMPOUNDS_DATA: Record<string, CompoundData> = {
  H2: {
    id: 'H2',
    formula: 'H₂',
    nameJa: '水素分子',
    nameEn: 'Hydrogen Gas',
    elements: { H: 2 },
    molarMass: 2.016,
    stateAtRoomTemp: 'gas',
    meltingPoint: -259.1,
    boilingPoint: -252.9,
    color: '#BAE6FD',
    secondaryColor: '#0284C7',
    descriptionJa: 'もっとも軽い気体分子。空気の約1/14の軽さで一気に上昇する。',
    mextFactJa: '無色・無臭。可燃性で、空気と1:2で混合して点火すると爆発的に燃えて水ができる。',
    renderRadius: 10,
    kidHintJa: '🎈 宇宙でいちばん軽い気体！風船に入れると空高く飛んでいくよ。水素カーの燃料にもなるよ！',
    kidHintEn: '🎈 The lightest gas in the universe! Makes balloons float sky-high and fuels eco-friendly cars!',
    recipe: {
      materials: [{ type: 'element', id: 'H', count: 2 }],
      methodJa: '✨ 水素(H)同士を近づけてみよう！',
      methodEn: '✨ Bring Hydrogen (H) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: '水素(H)を近づけてみよう！',
      toastGuideEn: 'Bring Hydrogen atoms together!'
    }
  },
  O2: {
    id: 'O2',
    formula: 'O₂',
    nameJa: '酸素分子',
    nameEn: 'Oxygen Gas',
    elements: { O: 2 },
    molarMass: 31.998,
    stateAtRoomTemp: 'gas',
    meltingPoint: -218.8,
    boilingPoint: -183.0,
    color: '#F87171',
    secondaryColor: '#DC2626',
    descriptionJa: '生命の呼吸と燃焼に不可欠な酸素分子。空気（28.8）よりやや重い。',
    mextFactJa: '助燃性があり、物質の燃焼を支える。水に難溶。',
    renderRadius: 11,
    kidHintJa: '🫁 私たち生き物が呼吸するのにぜったい必要な気体！ものが燃えるのを助けるよ。',
    kidHintEn: '🫁 Essential gas that living things breathe! Helps fire burn brightly.',
    recipe: {
      materials: [{ type: 'element', id: 'O', count: 2 }],
      methodJa: '✨ 酸素(O)同士を近づけてみよう！',
      methodEn: '✨ Bring Oxygen (O) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: '酸素(O)を近づけてみよう！',
      toastGuideEn: 'Bring Oxygen atoms together!'
    }
  },
  H2O: {
    id: 'H2O',
    formula: 'H₂O',
    nameJa: '水',
    nameEn: 'Water',
    elements: { H: 2, O: 1 },
    molarMass: 18.015,
    stateAtRoomTemp: 'liquid',
    meltingPoint: 0,
    boilingPoint: 100,
    color: '#38BDF8',
    secondaryColor: '#0284C7',
    descriptionJa: '水素と酸素が化合してできた生命の源。0℃で氷になり、100℃で水蒸気になる。',
    mextFactJa: '極性分子であり比熱が大きい。氷になると密度が小さくなり水に浮くという特異な性質をもつ。',
    renderRadius: 13,
    kidHintJa: '🥛 のどが渇いたときに飲む透明な液体！冷やすと氷に、温めると湯気になるよ。',
    kidHintEn: '🥛 Clear liquid we drink every day! Becomes ice when cold, steam when hot.',
    recipe: {
      materials: [{ type: 'element', id: 'H', count: 2 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 水素(H)と酸素(O)をバーナーで温めよう！',
      methodEn: '🔥 Heat Hydrogen (H) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '水素と酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Hydrogen and Oxygen with the burner!'
    }
  },
  CO: {
    id: 'CO',
    formula: 'CO',
    nameJa: '一酸化炭素',
    nameEn: 'Carbon Monoxide',
    elements: { C: 1, O: 1 },
    molarMass: 28.01,
    stateAtRoomTemp: 'gas',
    meltingPoint: -205.0,
    boilingPoint: -191.5,
    color: '#94A3B8',
    secondaryColor: '#475569',
    isToxic: true,
    toxicWarning: '【有毒警告】無色・無臭で気づきにくく、ヘモグロビンと強く結合して重篤な酸素欠乏（一酸化炭素中毒）を引き起こします！',
    descriptionJa: '炭素が酸素不足（不完全燃焼）で燃えたときにできる無色・無臭の猛毒気体。',
    mextFactJa: '空気とほぼ同じ密度（28.0 g/mol）。点火すると青い炎を上げて燃えCO2になる。',
    renderRadius: 12,
    kidHintJa: '⚠️ 木や炭が酸素不足で燃えたときに出る、無色無臭でとても危険な有毒ガス！',
    kidHintEn: '⚠️ Deadly colorless odorless gas formed when fuel burns without enough oxygen!',
    recipe: {
      materials: [{ type: 'element', id: 'C', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 炭素(C)と少量の酸素(O)をバーナーで加熱！',
      methodEn: '🔥 Heat Carbon (C) and limited Oxygen (O) with burner!',
      toolRequired: 'heat',
      toastGuideJa: '炭素と酸素を加熱してみよう（フラスコに蓋をすると安全！）',
      toastGuideEn: 'Heat Carbon and Oxygen (Cap the flask for safety!)'
    }
  },
  CO2: {
    id: 'CO2',
    formula: 'CO₂',
    nameJa: '二酸化炭素',
    nameEn: 'Carbon Dioxide',
    elements: { C: 1, O: 2 },
    molarMass: 44.01,
    stateAtRoomTemp: 'gas',
    meltingPoint: -78.5, // 昇華点
    boilingPoint: -78.5,
    color: '#64748B',
    secondaryColor: '#1E293B',
    descriptionJa: '炭素が完全燃焼してできる気体。空気（28.8）より重く下方に沈む。',
    mextFactJa: '石灰水（水酸化カルシウム水溶液）を通すと炭酸カルシウム（CaCO3）の沈殿が生じて白く濁る。',
    renderRadius: 14,
    kidHintJa: '🫧 炭酸ジュースのシュワシュワ泡や、息を吐いたときに出てくる気体だよ！',
    kidHintEn: '🫧 Fizzy bubbles in sodas and the air you breathe out! Turns limewater milky.',
    recipe: {
      materials: [{ type: 'element', id: 'C', count: 1 }, { type: 'element', id: 'O', count: 2 }],
      methodJa: '🔥 炭素(C)と酸素(O)をバーナーでしっかり加熱！',
      methodEn: '🔥 Heat Carbon (C) and Oxygen (O) with burner!',
      toolRequired: 'heat',
      toastGuideJa: '炭素と酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Carbon and Oxygen with the burner!'
    }
  },
  Fe2O3: {
    id: 'Fe2O3',
    formula: 'Fe₂O₃·nH₂O',
    nameJa: '酸化鉄(III) / 赤サビ',
    nameEn: 'Iron(III) Oxide (Red Rust)',
    elements: { Fe: 2, O: 3 },
    molarMass: 159.69,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1565,
    boilingPoint: 2000,
    color: '#B45309',
    secondaryColor: '#78350F',
    descriptionJa: '鉄が常温で水と酸素に触れることで徐々に生じるボロボロの赤褐色サビ。',
    mextFactJa: '水と酸素の両方が存在することで鉄が酸化されて生成する。多孔質で内部まで腐食が進行する。',
    renderRadius: 18,
    kidHintJa: '🌧️ 雨ざらしの鉄が水と空気でボロボロの赤茶色になったサビ！公園の遊具にもあるよ。',
    kidHintEn: '🌧️ Flaky reddish-brown rust on iron left out in the rain! Seen on old playground swings.',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 1 }, { type: 'compound', id: 'H2O', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '💧 鉄(Fe)に水滴と酸素(O)を触れさせよう！',
      methodEn: '💧 Touch Iron (Fe) with Water droplets and Oxygen (O)!',
      toolRequired: 'spawn',
      toastGuideJa: '鉄に水と酸素を触れさせておくと赤サビができるよ！',
      toastGuideEn: 'Expose Iron to water and oxygen to form red rust!'
    }
  },
  Fe3O4: {
    id: 'Fe3O4',
    formula: 'Fe₃O₄',
    nameJa: '四酸化三鉄 / 黒サビ',
    nameEn: 'Iron(II,III) Oxide (Black Rust / Magnetite)',
    elements: { Fe: 3, O: 4 },
    molarMass: 231.53,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1597,
    boilingPoint: 2600,
    color: '#1E293B',
    secondaryColor: '#0F172A',
    descriptionJa: '赤熱した高温の鉄（>500℃）に水蒸気（>100℃）が反応してできる緻密な黒サビ。磁性をもつ。',
    mextFactJa: '中華鍋の焼き入れや南部鉄器の防錆被膜として利用される、内部を保護する強い酸化被膜。磁石に強く引きつけられる。',
    renderRadius: 20,
    kidHintJa: '🍳 中華鍋を強火で焼いた黒い膜や、使い捨てカイロの中に入っている磁石につく黒い粉！',
    kidHintEn: '🍳 Tough black coating on cooking woks and black powder in hand warmers! Sticks to magnets.',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 3 }, { type: 'element', id: 'O', count: 4 }],
      methodJa: '🔥 鉄(Fe)と酸素(O)をバーナーで超高温（>500℃）加熱！',
      methodEn: '🔥 Heat Iron (Fe) and Oxygen (O) to extreme heat (>500°C)!',
      toolRequired: 'heat',
      toastGuideJa: '鉄と酸素をバーナーで真っ赤になるまで強熱してみよう！',
      toastGuideEn: 'Heat Iron and Oxygen red-hot with the burner!'
    }
  },
  CuO: {
    id: 'CuO',
    formula: 'CuO',
    nameJa: '酸化銅(II)',
    nameEn: 'Copper(II) Oxide',
    elements: { Cu: 1, O: 1 },
    molarMass: 79.545,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1326,
    boilingPoint: 2000,
    color: '#334155',
    secondaryColor: '#0F172A',
    descriptionJa: '銅を空気中で加熱すると表面にできる黒色の粉末。',
    mextFactJa: '炭素粉末と一緒に加熱すると還元されて赤褐色の単体銅（Cu）と二酸化炭素（CO2）が生じる（中学重要実験）。',
    renderRadius: 15,
    kidHintJa: '🪙 10円玉（銅）をバーナーで真っ黒に焼くと表面にできる、黒い酸化銅の粉だよ！',
    kidHintEn: '🪙 The black powdery crust that forms when a shiny copper coin is roasted in flame!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 銅(Cu)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Copper (Cu) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '銅と酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Copper and Oxygen with the burner!'
    }
  },
  CH4: {
    id: 'CH4',
    formula: 'CH₄',
    nameJa: 'メタン',
    nameEn: 'Methane',
    elements: { C: 1, H: 4 },
    molarMass: 16.04,
    stateAtRoomTemp: 'gas',
    meltingPoint: -182.5,
    boilingPoint: -161.5,
    color: '#A7F3D0',
    secondaryColor: '#10B981',
    descriptionJa: '都市ガスの主成分。空気（28.8）より軽く、燃えると水と二酸化炭素になる。',
    mextFactJa: '最も構造が単純なアルカン（炭化水素）。温室効果ガスとしても知られる。',
    renderRadius: 13,
    kidHintJa: '🏠 おうちのガスコンロで使う都市ガスの主成分！牛のゲップからもたくさん出るよ。',
    kidHintEn: '🏠 Main flammable fuel in natural gas stoves! Cows also burp this out into the air.',
    recipe: {
      materials: [{ type: 'element', id: 'C', count: 1 }, { type: 'element', id: 'H', count: 4 }],
      methodJa: '✨ 炭素(C)と水素(H)を近づけてみよう！',
      methodEn: '✨ Bring Carbon (C) and Hydrogen (H) together!',
      toolRequired: 'spawn',
      toastGuideJa: '炭素と水素を近づけてみよう！',
      toastGuideEn: 'Bring Carbon and Hydrogen together!'
    }
  },
  NaCl: {
    id: 'NaCl',
    formula: 'NaCl',
    nameJa: '塩化ナトリウム (食塩)',
    nameEn: 'Sodium Chloride',
    elements: { Na: 1, Cl: 1 },
    molarMass: 58.44,
    stateAtRoomTemp: 'solid',
    meltingPoint: 801,
    boilingPoint: 1413,
    color: '#F8FAFC',
    secondaryColor: '#E2E8F0',
    descriptionJa: 'ナトリウムイオンと塩化物イオンがイオン結合した無色・白色の結晶。食塩の主成分。',
    mextFactJa: '水によく溶け、電離してナトリウムイオン(Na+)と塩化物イオン(Cl-)になり電気を通す（電解質）。',
    renderRadius: 16,
    kidHintJa: '🧂 ポテトフライやお料理にかける、あのしょっぱい食塩（お塩）のこと！',
    kidHintEn: '🧂 The salty white table seasoning you sprinkle on french fries and food!',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 1 }, { type: 'element', id: 'Cl', count: 1 }],
      methodJa: '✨ ナトリウム(Na)と塩素(Cl)を近づけよう！',
      methodEn: '✨ Touch Sodium (Na) metal and Chlorine (Cl) together!',
      toolRequired: 'spawn',
      toastGuideJa: 'ナトリウムと塩素を近づけてみよう（激しく反応！）',
      toastGuideEn: 'Bring Sodium and Chlorine together!'
    }
  },
  HCl: {
    id: 'HCl',
    formula: 'HCl',
    nameJa: '塩化水素 (塩酸の気体)',
    nameEn: 'Hydrogen Chloride',
    elements: { H: 1, Cl: 1 },
    molarMass: 36.46,
    stateAtRoomTemp: 'gas',
    meltingPoint: -114.2,
    boilingPoint: -85.05,
    color: '#BEF264',
    secondaryColor: '#65A30D',
    isToxic: true,
    toxicWarning: '刺激臭のある有毒酸性気体。水によく溶けて強酸の塩酸になります。',
    descriptionJa: '刺激臭のある無色気体。水に非常に溶けやすく、水溶液は強酸性の塩酸となる。',
    mextFactJa: 'アンモニア気体（NH3）と接触させると白煙（塩化アンモニウム NH4Cl）を生じる。',
    renderRadius: 12,
    kidHintJa: '👃 胃液の中にも入っている、ツンと強烈なにおいがする酸性の気体！水に溶けると塩酸になるよ。',
    kidHintEn: '👃 Sharp sour acid gas found in stomach acid! Dissolves in water to make hydrochloric acid.',
    recipe: {
      materials: [{ type: 'element', id: 'H', count: 1 }, { type: 'element', id: 'Cl', count: 1 }],
      methodJa: '✨ 水素(H)と塩素(Cl)を近づけよう！',
      methodEn: '✨ Combine Hydrogen (H) and Chlorine (Cl)!',
      toolRequired: 'spawn',
      toastGuideJa: '水素と塩素を近づけてみよう（フラスコに蓋をすると安全！）',
      toastGuideEn: 'Bring Hydrogen and Chlorine together (Cap the flask!)'
    }
  },
  NaOH: {
    id: 'NaOH',
    formula: 'NaOH',
    nameJa: '水酸化ナトリウム (苛性ソーダ)',
    nameEn: 'Sodium Hydroxide',
    elements: { Na: 1, O: 1, H: 1 },
    molarMass: 39.997,
    stateAtRoomTemp: 'solid',
    meltingPoint: 318,
    boilingPoint: 1388,
    color: '#FEF08A',
    secondaryColor: '#EAB308',
    isToxic: true,
    toxicWarning: '強アルカリ性でタンパク質を激しく溶かします。皮膚や目に入ると危険です。',
    descriptionJa: '白色の固体で強アルカリ性。空気中の水分を吸って溶ける潮解性をもつ。',
    mextFactJa: '塩酸（HCl）と反応させると中和して食塩（NaCl）と水（H2O）が生じる。',
    renderRadius: 15,
    kidHintJa: '🧼 油汚れを強力に溶かす強アルカリ！固形せっけんを作るときのたいせつな材料だよ。',
    kidHintEn: '🧼 Strong alkaline substance that dissolves grease! Key ingredient for making soap.',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 1 }, { type: 'compound', id: 'H2O', count: 1 }],
      methodJa: '💧 ナトリウム(Na)を水(H2O)に投入しよう！',
      methodEn: '💧 Drop Sodium (Na) into Water (H2O)!',
      toolRequired: 'spawn',
      toastGuideJa: 'ナトリウムを水に触れさせてみよう（ジュワッと発熱！）',
      toastGuideEn: 'Drop Sodium into Water to see an energetic reaction!'
    }
  },
  ZnCl2: {
    id: 'ZnCl2',
    formula: 'ZnCl₂',
    nameJa: '塩化亜鉛',
    nameEn: 'Zinc Chloride',
    elements: { Zn: 1, Cl: 2 },
    molarMass: 136.31,
    stateAtRoomTemp: 'solid',
    meltingPoint: 290,
    boilingPoint: 732,
    color: '#E2E8F0',
    secondaryColor: '#94A3B8',
    descriptionJa: '亜鉛と塩酸が反応したときに水素とともに生じる白色の塩。',
    mextFactJa: '中学理科で「金属にうすい塩酸を加える実験」の残液から得られる塩。',
    renderRadius: 16,
    kidHintJa: '🔋 マンガン乾電池の電解液にも使われている、亜鉛と塩素からできた白い塩だよ！',
    kidHintEn: '🔋 White salt used inside traditional dry-cell batteries!',
    recipe: {
      materials: [{ type: 'element', id: 'Zn', count: 1 }, { type: 'compound', id: 'HCl', count: 2 }],
      methodJa: '✨ 亜鉛(Zn)に塩酸(HCl)を触れさせよう！',
      methodEn: '✨ React Zinc (Zn) metal with Hydrochloric Acid (HCl)!',
      toolRequired: 'spawn',
      toastGuideJa: '亜鉛に塩化水素を触れさせてみよう（水素も発生！）',
      toastGuideEn: 'Touch Zinc with Hydrogen Chloride!'
    }
  },
  MgO: {
    id: 'MgO',
    formula: 'MgO',
    nameJa: '酸化マグネシウム',
    nameEn: 'Magnesium Oxide',
    elements: { Mg: 1, O: 1 },
    molarMass: 40.304,
    stateAtRoomTemp: 'solid',
    meltingPoint: 2852,
    boilingPoint: 3600,
    color: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    descriptionJa: 'マグネシウムがまぶしい閃光を放って燃焼した後にできる白色の灰・粉末。耐火レンガや胃薬（制酸剤）に使われる。',
    mextFactJa: 'マグネシウムリボンに点火すると、強烈な白色の光と熱を出して激しく燃え、質量の増加した白色の酸化マグネシウム（2Mg + O₂ → 2MgO）になる（中学2年最重要実験）。',
    renderRadius: 15,
    kidHintJa: '🌟 理科の実験でマグネシウムを燃やしたときにできる、まぶしい光と白い灰！胃薬にも使われるよ。',
    kidHintEn: '🌟 Dazzling white flame and powdery ash created when burning magnesium ribbon! Also used in stomach medicine.',
    recipe: {
      materials: [{ type: 'element', id: 'Mg', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 マグネシウム(Mg)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Magnesium (Mg) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: 'マグネシウムと酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Magnesium and Oxygen with the burner!'
    }
  },
  H2O2: {
    id: 'H2O2',
    formula: 'H₂O₂',
    nameJa: '過酸化水素水 (オキシドール)',
    nameEn: 'Hydrogen Peroxide',
    elements: { H: 2, O: 2 },
    molarMass: 34.014,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -0.43,
    boilingPoint: 150.2,
    color: '#E0F2FE',
    secondaryColor: '#38BDF8',
    descriptionJa: '無色透明の液体。消毒薬（オキシドール）や漂白剤として使われる。不安定で酸素を放出して水になりやすい。',
    mextFactJa: '二酸化マンガン（MnO₂）などの触媒を加えるか加熱すると、激しく泡（酸素 O₂）を出して水に分解する（中学理科の気体発生実験）。',
    renderRadius: 13,
    kidHintJa: '🩹 すり傷を消毒するときにつけるシュワシュワ泡立つ「オキシドール」の成分！',
    kidHintEn: '🩹 The bubbly "hydrogen peroxide" used for cleaning scrapes and cuts!',
    recipe: {
      materials: [{ type: 'compound', id: 'H2O', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '💧 水(H2O)と酸素(O)を触れさせよう！',
      methodEn: '💧 Combine Water (H2O) and Oxygen (O)!',
      toolRequired: 'spawn',
      toastGuideJa: '水と酸素を反応させてみよう！',
      toastGuideEn: 'React Water and Oxygen together!'
    }
  },
  MnO2: {
    id: 'MnO2',
    formula: 'MnO₂',
    nameJa: '二酸化マンガン',
    nameEn: 'Manganese Dioxide',
    elements: { Mn: 1, O: 2 },
    molarMass: 86.936,
    stateAtRoomTemp: 'solid',
    meltingPoint: 535,
    boilingPoint: 9999,
    color: '#334155',
    secondaryColor: '#0F172A',
    descriptionJa: '黒色の粉末。過酸化水素水の分解反応を早める代表的な無機触媒。乾電池の正極材料にも使われる。',
    mextFactJa: '過酸化水素水から酸素を発生させる際の触媒として働き、自身は反応の前後で質量や性質が変化しない。',
    renderRadius: 15,
    kidHintJa: '🔋 乾電池の中に入っている黒い粉！オキシドールに入れると激しく酸素の泡を出すよ。',
    kidHintEn: '🔋 Black powder found inside batteries! Makes hydrogen peroxide foam with oxygen bubbles.',
    recipe: {
      materials: [{ type: 'element', id: 'Mn', count: 1 }, { type: 'element', id: 'O', count: 2 }],
      methodJa: '🔥 マンガン(Mn)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Manganese (Mn) and Oxygen (O) with burner!',
      toolRequired: 'heat',
      toastGuideJa: 'マンガンと酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Manganese and Oxygen with the burner!'
    }
  },
  SO2: {
    id: 'SO2',
    formula: 'SO₂',
    nameJa: '二酸化硫黄 (亜硫酸ガス)',
    nameEn: 'Sulfur Dioxide',
    elements: { S: 1, O: 2 },
    molarMass: 64.066,
    stateAtRoomTemp: 'gas',
    meltingPoint: -72.0,
    boilingPoint: -10.0,
    color: '#FEF08A',
    secondaryColor: '#CA8A04',
    isToxic: true,
    toxicWarning: '刺激臭のある有毒気体。水に溶けて酸性雨の原因となります。',
    descriptionJa: '硫黄が燃焼したときに生じる強い刺激臭をもつ気体。硫酸の製造原料や漂白剤として利用。',
    mextFactJa: '火山ガスに含まれ、空気中の水分と反応して亜硫酸を生じ酸性雨を引き起こす。還元剤としても働く。',
    renderRadius: 13,
    kidHintJa: '🌋 火山の噴火口や温泉街で漂う、マッチを擦ったときのようなツンとする刺激臭ガス！',
    kidHintEn: '🌋 The sharp smell of struck matches and volcanic hot springs!',
    recipe: {
      materials: [{ type: 'element', id: 'S', count: 1 }, { type: 'element', id: 'O', count: 2 }],
      methodJa: '🔥 硫黄(S)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Sulfur (S) and Oxygen (O) with burner!',
      toolRequired: 'heat',
      toastGuideJa: '硫黄と酸素を加熱してみよう（フラスコに蓋をすると安全！）',
      toastGuideEn: 'Heat Sulfur and Oxygen (Cap the flask for safety!)'
    }
  },
  SO3: {
    id: 'SO3',
    formula: 'SO₃',
    nameJa: '三酸化硫黄',
    nameEn: 'Sulfur Trioxide',
    elements: { S: 1, O: 3 },
    molarMass: 80.065,
    stateAtRoomTemp: 'liquid',
    meltingPoint: 16.9,
    boilingPoint: 45.0,
    color: '#FDE047',
    secondaryColor: '#EAB308',
    isToxic: true,
    toxicWarning: '強烈な腐食性と刺激性。水と触れると爆発的に発熱して濃硫酸ミストを生じます。',
    descriptionJa: '二酸化硫黄を酸化して得られる無色液体。水と激しく化合して硫酸を生じる。',
    mextFactJa: '接触法（硫酸製造）の中間体。水との反応熱が非常に大きいため、工業的には濃硫酸に吸収させて発煙硫酸にする。',
    renderRadius: 14,
    kidHintJa: '⚡ 二酸化硫黄がさらに酸素と結びついたもの。水と混ざると濃硫酸になるよ！',
    kidHintEn: '⚡ Super-reactive sulfur gas that turns into sulfuric acid when mixed with water!',
    recipe: {
      materials: [{ type: 'compound', id: 'SO2', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 二酸化硫黄(SO2)と酸素(O)をさらに加熱しよう！',
      methodEn: '🔥 Heat Sulfur Dioxide (SO2) with Oxygen (O)!',
      toolRequired: 'heat',
      toastGuideJa: 'SO2と酸素をバーナーでさらに加熱してみよう！',
      toastGuideEn: 'Heat SO2 and Oxygen with the burner!'
    }
  },
  H2SO4: {
    id: 'H2SO4',
    formula: 'H₂SO₄',
    nameJa: '硫酸',
    nameEn: 'Sulfuric Acid',
    elements: { H: 2, S: 1, O: 4 },
    molarMass: 98.079,
    stateAtRoomTemp: 'liquid',
    meltingPoint: 10.38,
    boilingPoint: 337,
    color: '#FACC15',
    secondaryColor: '#B45309',
    isToxic: true,
    toxicWarning: '【危険】強酸性で激しい脱水作用・腐食性があります。皮膚や紙を炭化させます！',
    descriptionJa: '工業的に最も重要な無色油状の強酸。不揮発性、吸湿性、脱水作用をもつ。',
    mextFactJa: '三大強酸の一つ。希硫酸は金属（ZnやFe）を溶かして水素を発生。熱濃硫酸は銅（Cu）をも酸化して溶かす。',
    renderRadius: 16,
    kidHintJa: '🧪 車のバッテリー液にも使われる強力な酸！水と混ざるともの凄くアツアツになるよ。',
    kidHintEn: '🧪 Super-powerful industrial acid used in car batteries! Heats up boiling hot in water.',
    recipe: {
      materials: [{ type: 'compound', id: 'SO3', count: 1 }, { type: 'compound', id: 'H2O', count: 1 }],
      methodJa: '💧 三酸化硫黄(SO3)に水(H2O)を加えよう！',
      methodEn: '💧 Add Water (H2O) to Sulfur Trioxide (SO3)!',
      toolRequired: 'spawn',
      toastGuideJa: 'SO3と水を反応させてみよう！',
      toastGuideEn: 'React SO3 and Water together!'
    }
  },
  NH3: {
    id: 'NH3',
    formula: 'NH₃',
    nameJa: 'アンモニア',
    nameEn: 'Ammonia',
    elements: { N: 1, H: 3 },
    molarMass: 17.031,
    stateAtRoomTemp: 'gas',
    meltingPoint: -77.73,
    boilingPoint: -33.34,
    color: '#BAE6FD',
    secondaryColor: '#0284C7',
    isToxic: true,
    toxicWarning: '強烈な刺激臭をもつ有毒アルカリ性気体です。目や粘膜を刺激します。',
    descriptionJa: '空気より軽く刺激臭のある気体。水に非常によく溶けて弱アルカリ性を示す。肥料の原料。',
    mextFactJa: 'ハーバー・ボッシュ法で合成。塩化水素（HCl）と接触させると塩化アンモニウム（NH₄Cl）の白煙を生じる。',
    renderRadius: 11,
    kidHintJa: '👃 鼻にツンとくる強烈なにおい！畑のおいしい野菜を育てる肥料のたいせつな原料だよ。',
    kidHintEn: '👃 Sharp pungent smell! Vital ingredient for plant fertilizer that feeds crops worldwide.',
    recipe: {
      materials: [{ type: 'element', id: 'N', count: 1 }, { type: 'element', id: 'H', count: 3 }],
      methodJa: '🔥 窒素(N)と水素(H)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Nitrogen (N) and Hydrogen (H) with burner!',
      toolRequired: 'heat',
      toastGuideJa: '窒素と水素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Nitrogen and Hydrogen with the burner!'
    }
  },
  NH4Cl: {
    id: 'NH4Cl',
    formula: 'NH₄Cl',
    nameJa: '塩化アンモニウム (白煙)',
    nameEn: 'Ammonium Chloride',
    elements: { N: 1, H: 4, Cl: 1 },
    molarMass: 53.491,
    stateAtRoomTemp: 'solid',
    meltingPoint: 338,
    boilingPoint: 520,
    color: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    descriptionJa: 'アンモニアと塩化水素の気体が反応してできる白色の固体微粒子（白煙の正体）。',
    mextFactJa: '気体同士の中和反応（NH₃ + HCl → NH₄Cl）で生成。加熱するとアンモニアと塩化水素に熱分解（昇華）する。',
    renderRadius: 14,
    kidHintJa: '💨 アンモニアと塩酸の気体が混ざるとモクモク出てくる、実験で有名な「白い煙」の正体！',
    kidHintEn: '💨 The famous lab "white smoke" that appears magically when ammonia gas meets acid vapors!',
    recipe: {
      materials: [{ type: 'compound', id: 'NH3', count: 1 }, { type: 'compound', id: 'HCl', count: 1 }],
      methodJa: '✨ アンモニア(NH3)と塩化水素(HCl)の気体を触れさせよう！',
      methodEn: '✨ Bring Ammonia (NH3) and Hydrogen Chloride (HCl) gas together!',
      toolRequired: 'spawn',
      toastGuideJa: 'アンモニアと塩化水素を近づけてみよう（モクモク白煙！）',
      toastGuideEn: 'Bring Ammonia and Hydrogen Chloride together for white smoke!'
    }
  },
  HNO3: {
    id: 'HNO3',
    formula: 'HNO₃',
    nameJa: '硝酸',
    nameEn: 'Nitric Acid',
    elements: { H: 1, N: 1, O: 3 },
    molarMass: 63.013,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -42,
    boilingPoint: 83,
    color: '#FED7AA',
    secondaryColor: '#EA580C',
    isToxic: true,
    toxicWarning: '強力な酸化力をもつ強酸・劇物。銅や銀も酸化して溶かします。',
    descriptionJa: '強い酸化作用をもつ代表的な強酸。オストワルト法で製造され、火薬や染料の原料になる。',
    mextFactJa: '光や熱で分解してNO₂（赤褐色）を生じるため褐色ビンに保存する。銅（Cu）を溶かすことができる。',
    renderRadius: 15,
    kidHintJa: '🧨 銅などの金属をも溶かしてしまう強力な酸！花火や火薬の原料としても使われるよ。',
    kidHintEn: '🧨 Fierce acid capable of dissolving shiny copper! Used to manufacture fireworks.',
    recipe: {
      materials: [{ type: 'compound', id: 'NO2', count: 3 }, { type: 'compound', id: 'H2O', count: 1 }],
      methodJa: '💧 二酸化窒素(NO2)を水(H2O)に溶かそう！',
      methodEn: '💧 Dissolve Nitrogen Dioxide (NO2) into Water (H2O)!',
      toolRequired: 'spawn',
      toastGuideJa: '二酸化窒素と水を反応させてみよう！',
      toastGuideEn: 'React Nitrogen Dioxide and Water together!'
    }
  },
  NO2: {
    id: 'NO2',
    formula: 'NO₂',
    nameJa: '二酸化窒素',
    nameEn: 'Nitrogen Dioxide',
    elements: { N: 1, O: 2 },
    molarMass: 46.005,
    stateAtRoomTemp: 'gas',
    meltingPoint: -11.2,
    boilingPoint: 21.15,
    color: '#B45309',
    secondaryColor: '#78350F',
    isToxic: true,
    toxicWarning: '赤褐色の刺激臭をもつ猛毒気体。光化学スモッグの原因物質。',
    descriptionJa: '赤褐色の有毒気体。水に溶けると硝酸になる。冷却すると無色の四酸化二窒素（N₂O₄）になる。',
    mextFactJa: '銅と濃硝酸の反応で激しく発生する。空気より重く水に溶けやすい。',
    renderRadius: 13,
    kidHintJa: '🚗 車の排気ガスなどにも含まれる、赤茶色でツンとする有毒な気体だよ！',
    kidHintEn: '🚗 Red-brown toxic smog gas with a sharp bite, seen in vehicle exhaust fumes!',
    recipe: {
      materials: [{ type: 'element', id: 'N', count: 1 }, { type: 'element', id: 'O', count: 2 }],
      methodJa: '🔥 窒素(N)と酸素(O)をバーナーで強熱しよう！',
      methodEn: '🔥 Heat Nitrogen (N) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '窒素と酸素を強熱してみよう（フラスコ推奨！）',
      toastGuideEn: 'Heat Nitrogen and Oxygen red-hot (Cap the flask!)'
    }
  },
  FeS: {
    id: 'FeS',
    formula: 'FeS',
    nameJa: '硫化鉄',
    nameEn: 'Iron(II) Sulfide',
    elements: { Fe: 1, S: 1 },
    molarMass: 87.91,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1194,
    boilingPoint: 9999,
    color: '#334155',
    secondaryColor: '#0F172A',
    descriptionJa: '鉄粉と硫黄粉末の混合物を加熱すると赤熱して激しく化合してできる黒色固体。',
    mextFactJa: '中学2年「化合」の最重要実験。元の鉄と異なり磁石につかず、塩酸を加えると腐卵臭の硫化水素（H₂S）が発生する。',
    renderRadius: 16,
    kidHintJa: '🧲 鉄と硫黄を混ぜて加熱すると光りながらできる、磁石にくっつかない黒い物質！',
    kidHintEn: '🧲 Black solid formed by roasting iron and yellow sulfur! Loses its magnetic attraction.',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 1 }, { type: 'element', id: 'S', count: 1 }],
      methodJa: '🔥 鉄(Fe)と硫黄(S)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Iron (Fe) and Sulfur (S) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '鉄と硫黄をバーナーで加熱してみよう（ピカッと光る！）',
      toastGuideEn: 'Heat Iron and Sulfur with the burner!'
    }
  },
  H2S: {
    id: 'H2S',
    formula: 'H₂S',
    nameJa: '硫化水素',
    nameEn: 'Hydrogen Sulfide',
    elements: { H: 2, S: 1 },
    molarMass: 34.08,
    stateAtRoomTemp: 'gas',
    meltingPoint: -82,
    boilingPoint: -60,
    color: '#FEF08A',
    secondaryColor: '#EAB308',
    isToxic: true,
    toxicWarning: '【猛毒】腐卵臭（温泉臭）のする気体。高濃度では嗅覚を麻痺させ致死性があります！',
    descriptionJa: '腐卵臭のある無色有毒気体。火山ガスや温泉に含まれ、還元剤として働く。',
    mextFactJa: '硫化鉄（FeS）に酸を加えると発生。金属イオンと反応して様々な色の硫化物沈殿を作る（高校化学系統分析）。',
    renderRadius: 12,
    kidHintJa: '🥚 温泉街や、くさった卵のようなにおいがする危険な気体だよ！',
    kidHintEn: '🥚 Rotten egg smell familiar from volcanic hot springs! Handle with care.',
    recipe: {
      materials: [{ type: 'compound', id: 'FeS', count: 1 }, { type: 'compound', id: 'HCl', count: 2 }],
      methodJa: '✨ 硫化鉄(FeS)に塩酸(HCl)を触れさせよう！',
      methodEn: '✨ React Iron Sulfide (FeS) with Hydrochloric Acid (HCl)!',
      toolRequired: 'spawn',
      toastGuideJa: '硫化鉄と塩化水素を触れさせてみよう（フラスコ推奨！）',
      toastGuideEn: 'Touch Iron Sulfide with Hydrogen Chloride (Cap flask!)'
    }
  },
  CaCO3: {
    id: 'CaCO3',
    formula: 'CaCO₃',
    nameJa: '炭酸カルシウム (石灰石・大理石)',
    nameEn: 'Calcium Carbonate',
    elements: { Ca: 1, C: 1, O: 3 },
    molarMass: 100.086,
    stateAtRoomTemp: 'solid',
    meltingPoint: 825,
    boilingPoint: 9999,
    color: '#F1F5F9',
    secondaryColor: '#CBD5E1',
    descriptionJa: '石灰石、大理石、貝殻、卵の殻、チョークの主成分である白色固体。',
    mextFactJa: '石灰水にCO₂を通すと生じる白濁の正体。塩酸を加えると二酸化炭素（CO₂）を激しく発生する（気体発生実験）。',
    renderRadius: 17,
    kidHintJa: '🐚 アサリの貝殻やチョーク、大理石の主成分！石灰水に息を吹き込むと白く濁ってできるよ。',
    kidHintEn: '🐚 Main mineral in seashell shells, school chalk, and marble! Clouds limewater white.',
    recipe: {
      materials: [{ type: 'compound', id: 'CaOH2', count: 1 }, { type: 'compound', id: 'CO2', count: 1 }],
      methodJa: '✨ 水酸化カルシウム(石灰水)に二酸化炭素(CO2)を触れさせよう！',
      methodEn: '✨ Touch Calcium Hydroxide (limewater) with Carbon Dioxide (CO2)!',
      toolRequired: 'spawn',
      toastGuideJa: '水酸化カルシウムと二酸化炭素を反応させてみよう！',
      toastGuideEn: 'React Calcium Hydroxide and Carbon Dioxide together!'
    }
  },
  CaO: {
    id: 'CaO',
    formula: 'CaO',
    nameJa: '酸化カルシウム (生石灰)',
    nameEn: 'Calcium Oxide',
    elements: { Ca: 1, O: 1 },
    molarMass: 56.077,
    stateAtRoomTemp: 'solid',
    meltingPoint: 2613,
    boilingPoint: 2850,
    color: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    descriptionJa: '白色粉末。水と反応して激しく発熱し消石灰（Ca(OH)₂）になる。食品の加熱剤や乾燥剤に使われる。',
    mextFactJa: '石灰石（CaCO₃）を強熱すると熱分解して生成する。水との水和熱は駅弁等の発熱剤に利用される。',
    renderRadius: 15,
    kidHintJa: '🍱 お海苔やお菓子の袋に入っている白い乾燥剤！水をかけるとアツアツ湯気が出るよ。',
    kidHintEn: '🍱 White drying packet in seaweed snacks! Releases sizzling hot steam when wet.',
    recipe: {
      materials: [{ type: 'element', id: 'Ca', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '🔥 カルシウム(Ca)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Calcium (Ca) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: 'カルシウムと酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Calcium and Oxygen with the burner!'
    }
  },
  CaOH2: {
    id: 'CaOH2',
    formula: 'Ca(OH)₂',
    nameJa: '水酸化カルシウム (消石灰 / 石灰水)',
    nameEn: 'Calcium Hydroxide',
    elements: { Ca: 1, O: 2, H: 2 },
    molarMass: 74.093,
    stateAtRoomTemp: 'solid',
    meltingPoint: 580,
    boilingPoint: 9999,
    color: '#F8FAFC',
    secondaryColor: '#E2E8F0',
    descriptionJa: '白色粉末。その飽和水溶液は「石灰水」と呼ばれ、二酸化炭素の検出試薬として使われる。',
    mextFactJa: '生石灰（CaO）に水を加えると生成。二酸化炭素（CO₂）を通すと炭酸カルシウム（CaCO₃）の白色沈殿を生じて白く濁る。',
    renderRadius: 16,
    kidHintJa: '🧪 水に溶かすと理科の実験で大活躍する「石灰水」になる白い粉だよ！',
    kidHintEn: '🧪 White powder that turns into famous "limewater" when dissolved in water!',
    recipe: {
      materials: [{ type: 'compound', id: 'CaO', count: 1 }, { type: 'compound', id: 'H2O', count: 1 }],
      methodJa: '💧 酸化カルシウム(CaO)に水(H2O)を加えよう！',
      methodEn: '💧 Add Water (H2O) to Calcium Oxide (CaO)!',
      toolRequired: 'spawn',
      toastGuideJa: '生石灰(CaO)と水を反応させてみよう！',
      toastGuideEn: 'React Calcium Oxide and Water together!'
    }
  },
  CaCl2: {
    id: 'CaCl2',
    formula: 'CaCl₂',
    nameJa: '塩化カルシウム',
    nameEn: 'Calcium Chloride',
    elements: { Ca: 1, Cl: 2 },
    molarMass: 110.98,
    stateAtRoomTemp: 'solid',
    meltingPoint: 772,
    boilingPoint: 1935,
    color: '#FFFFFF',
    secondaryColor: '#CBD5E1',
    descriptionJa: '吸湿性の高い白色結晶。除湿剤や冬の道路の融雪剤・凍結防止剤として利用される。',
    mextFactJa: '石灰石に塩酸を加えたときの残液から得られる塩。水に溶けると大きな熱（溶解熱）を出す。',
    renderRadius: 16,
    kidHintJa: '❄️ 雪の日に道路が凍らないようにまく白いツブツブ（融雪剤）や、押し入れの除湿剤！',
    kidHintEn: '❄️ White pellets tossed on icy streets in winter to melt ice and keep paths safe!',
    recipe: {
      materials: [{ type: 'element', id: 'Ca', count: 1 }, { type: 'element', id: 'Cl', count: 2 }],
      methodJa: '✨ カルシウム(Ca)と塩素(Cl)を接触させよう！',
      methodEn: '✨ Combine Calcium (Ca) and Chlorine (Cl)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カルシウムと塩素を近づけてみよう！',
      toastGuideEn: 'Bring Calcium and Chlorine together!'
    }
  },
  CuSO4: {
    id: 'CuSO4',
    formula: 'CuSO₄',
    nameJa: '硫酸銅',
    nameEn: 'Copper(II) Sulfate',
    elements: { Cu: 1, S: 1, O: 4 },
    molarMass: 159.609,
    stateAtRoomTemp: 'solid',
    meltingPoint: 110,
    boilingPoint: 9999,
    color: '#38BDF8',
    secondaryColor: '#0284C7',
    descriptionJa: '美しい青色の結晶（五水和物）。無水物は白色粉末で水分を吸うと青色に変色する。',
    mextFactJa: '無水硫酸銅（白色）は微量の水を検出すると青色に変色するため、水の確認試薬として使われる。',
    renderRadius: 17,
    kidHintJa: '💎 水に溶かすときれいな透き通った青色になる、宝石のような結晶だよ！',
    kidHintEn: '💎 Gem-like azure crystals that dissolve into striking sapphire blue liquid!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 1 }, { type: 'compound', id: 'H2SO4', count: 1 }],
      methodJa: '🔥 銅(Cu)と濃硫酸(H2SO4)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Copper (Cu) and Sulfuric Acid (H2SO4) with burner!',
      toolRequired: 'heat',
      toastGuideJa: '銅と硫酸をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Copper and Sulfuric Acid with the burner!'
    }
  },
  Cl2: {
    id: 'Cl2',
    formula: 'Cl₂',
    nameJa: '塩素分子',
    nameEn: 'Chlorine Gas',
    elements: { Cl: 2 },
    molarMass: 70.90,
    stateAtRoomTemp: 'gas',
    meltingPoint: -101.5,
    boilingPoint: -34.04,
    color: '#A3E635',
    secondaryColor: '#65A30D',
    isToxic: true,
    toxicWarning: '強い刺激臭のある有毒な黄緑色気体。吸い込むと呼吸器に重篤な障害を与えます。',
    descriptionJa: '刺激臭（プールの臭い）をもつ黄緑色の有毒気体。水溶液の電気分解や漂白剤の原料。',
    mextFactJa: '【文科省ポイント】空気（28.8）より重く（約2.5倍）下方に溜まる。強い漂白作用・殺菌作用をもつ。',
    renderRadius: 12,
    kidHintJa: '🏊 学校のプールの消毒のにおいがする、黄緑色で重たい有毒ガスだよ！',
    kidHintEn: '🏊 Distinct pool cleaning scent! Heavy greenish-yellow toxic gas.',
    recipe: {
      materials: [{ type: 'element', id: 'Cl', count: 2 }],
      methodJa: '✨ 塩素(Cl)同士を接触させるか、塩化銅に通電しよう！',
      methodEn: '✨ Bring Chlorine (Cl) atoms together or electrolyze CuCl2!',
      toolRequired: 'spawn',
      toastGuideJa: '塩素(Cl)を近づけてみよう（フラスコに蓋をすると安全！）',
      toastGuideEn: 'Bring Chlorine atoms together (Cap the flask!)'
    }
  },
  CuCl2: {
    id: 'CuCl2',
    formula: 'CuCl₂',
    nameJa: '塩化銅(II)',
    nameEn: 'Copper(II) Chloride',
    elements: { Cu: 1, Cl: 2 },
    molarMass: 134.45,
    stateAtRoomTemp: 'solid',
    meltingPoint: 498,
    boilingPoint: 993,
    color: '#2DD4BF',
    secondaryColor: '#0D9488',
    descriptionJa: '青緑色の水溶性塩。水に溶かすと青緑色の電解質水溶液になる。',
    mextFactJa: '【文科省ポイント】中学3年最重要実験。水溶液に通電すると、陰極に赤褐色の銅Cuが析出し、陽極から刺激臭の塩素Cl₂が発生する。',
    renderRadius: 16,
    kidHintJa: '⚡ 水に溶かすと青緑色になり、電気を通すと銅と塩素に分かれる結晶だよ！',
    kidHintEn: '⚡ Turquoise crystals that split into pure shiny copper and chlorine gas when zapped with electricity!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 1 }, { type: 'element', id: 'Cl', count: 2 }],
      methodJa: '🔥 銅(Cu)と塩素(Cl)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Copper (Cu) and Chlorine (Cl) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '銅と塩素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Copper and Chlorine with the burner!'
    }
  },
  FeCl2: {
    id: 'FeCl2',
    formula: 'FeCl₂',
    nameJa: '塩化鉄(II)',
    nameEn: 'Iron(II) Chloride',
    elements: { Fe: 1, Cl: 2 },
    molarMass: 126.75,
    stateAtRoomTemp: 'solid',
    meltingPoint: 677,
    boilingPoint: 1026,
    color: '#86EFAC',
    secondaryColor: '#16A34A',
    descriptionJa: '硫化鉄や鉄が塩酸と反応したときに生じる淡緑色の塩。',
    mextFactJa: '【文科省ポイント】硫化鉄（FeS）に塩酸（HCl）を加えると、塩化鉄(II)（FeCl₂）とともに腐卵臭の気体である硫化水素（H₂S）が発生する（中学2年実験）。',
    renderRadius: 16,
    kidHintJa: '🧪 鉄に塩酸をかけるとシュワシュワ水素とともにできる、淡い緑色の塩だよ！',
    kidHintEn: '🧪 Pale green salt created when iron fizzes energetically in hydrochloric acid!',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 1 }, { type: 'compound', id: 'HCl', count: 2 }],
      methodJa: '✨ 鉄(Fe)に塩酸(HCl)を触れさせよう！',
      methodEn: '✨ Touch Iron (Fe) with Hydrochloric Acid (HCl)!',
      toolRequired: 'spawn',
      toastGuideJa: '鉄と塩化水素を触れさせてみよう！',
      toastGuideEn: 'React Iron and Hydrogen Chloride together!'
    }
  }
};
