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
  formulaEn?: string; // 化学式の代わりに日本語の略称を表示するもの (リトマス紙) の英語版
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
  // 指示薬 (BTB液など): 周りの水溶液の pH に応じて色が変わる
  indicator?: IndicatorInfo;
}

export type PhClass = 'acid' | 'neutral' | 'alkaline';

export interface IndicatorInfo {
  // pH の小さい順に並べた色の目盛り。間の pH は補間する
  stops: { ph: number; color: string }[];
}

export function getCompoundName(comp: CompoundData, lang: Language): string {
  return lang === 'en' ? comp.nameEn : comp.nameJa;
}

export function getCompoundFormula(comp: CompoundData, lang: Language): string {
  return lang === 'en' && comp.formulaEn ? comp.formulaEn : comp.formula;
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

export type CompoundCategory = 'basic' | 'gas' | 'acid_base' | 'salt' | 'indicator';

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
    compoundIds: ['H2O', 'CO2', 'H2O2', 'NaCl', 'HCl', 'NaOH', 'NaHCO3', 'CH4', 'O2', 'H2', 'N2', 'Cl2', 'F2', 'Br2', 'I2', 'CuO', 'Fe2O3', 'Al2O3', 'SiO2']
  },
  {
    id: 'gas',
    nameJa: '気体',
    nameEn: 'Gases',
    compoundIds: ['H2', 'O2', 'N2', 'CO', 'CO2', 'CH4', 'HCl', 'SO2', 'NH3', 'NO2', 'H2S', 'Cl2', 'O3', 'F2', 'HF', 'HBr', 'HI', 'C2H2', 'NO']
  },
  {
    id: 'acid_base',
    nameJa: '酸・塩基',
    nameEn: 'Acids/Bases',
    compoundIds: ['HCl', 'H2SO4', 'HNO3', 'H3PO4', 'H2O2', 'HF', 'HBr', 'HI', 'NaOH', 'KOH', 'LiOH', 'RbOH', 'CsOH', 'CaOH2', 'NH3', 'CaO', 'MgO', 'P4O10', 'H2S']
  },
  {
    id: 'salt',
    nameJa: '塩',
    nameEn: 'Salts',
    compoundIds: ['NaCl', 'NaHCO3', 'Na2CO3', 'KCl', 'LiCl', 'NaF', 'NaBr', 'NaI', 'KF', 'KBr', 'KI', 'AlCl3', 'NaAlOH4', 'CaC2', 'CuNO32', 'AgNO3', 'AgCl', 'BaSO4', 'CuCl2', 'ZnCl2', 'CaCl2', 'FeCl2', 'NH4Cl', 'CaCO3', 'CuSO4', 'FeS', 'CuO', 'Fe2O3', 'Fe3O4', 'Al2O3', 'SiO2', 'MnO2', 'SO3']
  },
  {
    id: 'indicator',
    nameJa: '指示薬',
    nameEn: 'Indicators',
    compoundIds: ['BTB', 'Phenolphthalein', 'CabbageJuice', 'RedLitmus', 'BlueLitmus', 'CaOH2']
  }
];

// 水溶液のおおよその pH (指示薬の色の判定に使う)。載っていない物質は pH に影響しない
export const COMPOUND_PH: Record<string, number> = {
  HCl: 1, H2SO4: 1, HNO3: 1, HBr: 1, HI: 1,
  H3PO4: 2,
  HF: 3, SO2: 3, SO3: 2, NO2: 3,
  CO2: 5, NH4Cl: 5, H2S: 5,
  NaHCO3: 8.5,
  Na2CO3: 11, NH3: 11,
  CaOH2: 12, NaAlOH4: 12, CaO: 12,
  NaOH: 13, KOH: 13, LiOH: 13, RbOH: 13, CsOH: 13
};

export function classifyPh(ph: number): PhClass {
  if (ph < 6) return 'acid';
  if (ph > 8) return 'alkaline';
  return 'neutral';
}

// 指示薬の色の判定に使う、液性ごとの代表的な pH
export const REPRESENTATIVE_PH: Record<PhClass, number> = { acid: 3, neutral: 7, alkaline: 11 };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function getIndicatorColor(info: IndicatorInfo, ph: number): string {
  const stops = info.stops;
  if (ph <= stops[0].ph) return stops[0].color;
  for (let i = 1; i < stops.length; i++) {
    if (ph <= stops[i].ph) {
      const a = stops[i - 1];
      const b = stops[i];
      const t = (ph - a.ph) / (b.ph - a.ph);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      const mix = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return '#' + mix.map(v => v.toString(16).padStart(2, '0')).join('');
    }
  }
  return stops[stops.length - 1].color;
}


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
    descriptionEn: 'The lightest gas molecule. It is about 1/14 as heavy as air and rises quickly.',
    mextFactJa: '無色・無臭。可燃性で、空気と1:2で混合して点火すると爆発的に燃えて水ができる。',
    mextFactEn: 'Colorless and odorless. It is flammable: mixed with air (1:2) and lit, it burns explosively and makes water.',
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
    descriptionEn: 'The oxygen molecule, essential for breathing and burning. It is slightly heavier than air (28.8).',
    mextFactJa: '助燃性があり、物質の燃焼を支える。水に難溶。',
    mextFactEn: 'It supports burning (it helps other substances burn). It barely dissolves in water.',
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
  O3: {
    id: 'O3',
    formula: 'O₃',
    nameJa: 'オゾン',
    nameEn: 'Ozone',
    elements: { O: 3 },
    molarMass: 47.997,
    stateAtRoomTemp: 'gas',
    meltingPoint: -192.2,
    boilingPoint: -111.9,
    color: '#93C5FD',
    secondaryColor: '#3B82F6',
    isToxic: true,
    toxicWarning: '特有の生臭い刺激臭をもつ淡青色の有毒気体。高濃度で吸い込むと呼吸器を傷めます。',
    toxicWarningEn: 'Pale blue toxic gas with a sharp odor. Harmful to the respiratory system at high concentrations.',
    descriptionJa: '酸素の同素体で、特有の臭いをもつ淡青色の気体。強い酸化力をもち、殺菌・脱臭に利用される。',
    descriptionEn: 'An allotrope of oxygen: a pale blue gas with a distinctive smell. It is a strong oxidizer used to kill germs and remove odors.',
    mextFactJa: '【学習ポイント】酸素中で無声放電を行うと生成する（3O₂ → 2O₃）。酸素の同素体で、強い酸化作用をもつ。成層圏のオゾン層は太陽からの有害な紫外線を吸収する。',
    mextFactEn: '[Key Point] It forms when a silent electric discharge passes through oxygen (3O₂ → 2O₃). It is an allotrope of oxygen with a strong oxidizing action. The ozone layer in the stratosphere absorbs harmful ultraviolet light from the Sun.',
    renderRadius: 12,
    kidHintJa: '🌏 空の高いところで「オゾン層」をつくって、太陽の強い紫外線から地球を守っている気体だよ！',
    kidHintEn: '🌏 Forms the ozone layer high in the sky, shielding Earth from the Sun\'s harmful UV rays!',
    recipe: {
      materials: [{ type: 'compound', id: 'O2', count: 3 }],
      methodJa: '⚡ 酸素分子(O2)に電気ツールで放電しよう！',
      methodEn: '⚡ Discharge electricity into Oxygen Gas (O2)!',
      toolRequired: 'electric',
      toastGuideJa: '酸素(O2)を集めて電気ツールで放電してみよう！',
      toastGuideEn: 'Gather Oxygen Gas (O2) and zap it with the electric tool!'
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
    descriptionEn: 'The source of life, formed when hydrogen and oxygen combine. It freezes into ice at 0°C and turns into steam at 100°C.',
    mextFactJa: '極性分子であり比熱が大きい。氷になると密度が小さくなり水に浮くという特異な性質をもつ。',
    mextFactEn: 'A polar molecule with a large specific heat. Unusually, ice is less dense than water, so it floats.',
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
    toxicWarningEn: '[Toxic Warning] Colorless and odorless, so it is hard to notice. It binds tightly to hemoglobin and causes severe oxygen starvation (carbon monoxide poisoning)!',
    descriptionJa: '炭素が酸素不足（不完全燃焼）で燃えたときにできる無色・無臭の猛毒気体。',
    descriptionEn: 'A colorless, odorless, highly toxic gas formed when carbon burns without enough oxygen (incomplete combustion).',
    mextFactJa: '空気とほぼ同じ密度（28.0 g/mol）。点火すると青い炎を上げて燃えCO2になる。',
    mextFactEn: 'About as dense as air (28.0 g/mol). When lit, it burns with a blue flame and becomes CO₂.',
    renderRadius: 12,
    kidHintJa: '⚠️ 木や炭が酸素不足で燃えたときに出る、無色無臭でとても危険な有毒ガス！',
    kidHintEn: '⚠️ Deadly colorless odorless gas formed when fuel burns without enough oxygen!',
    recipe: {
      materials: [{ type: 'element', id: 'C', count: 2 }, { type: 'compound', id: 'O2', count: 1 }],
      methodJa: '🔥 炭素(C)2個に、少なめの酸素(O2)1個でバーナー加熱！（酸素が足りないと一酸化炭素になる）',
      methodEn: '🔥 Heat 2 Carbon (C) with only 1 Oxygen (O2)! (Too little oxygen makes carbon monoxide)',
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
    descriptionEn: 'The gas formed when carbon burns completely. It is heavier than air (28.8) and sinks.',
    mextFactJa: '石灰水（水酸化カルシウム水溶液）を通すと炭酸カルシウム（CaCO3）の沈殿が生じて白く濁る。',
    mextFactEn: 'Bubbled through limewater (calcium hydroxide solution), it forms a precipitate of calcium carbonate (CaCO₃) and turns the water milky.',
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
    formula: 'Fe₂O₃',
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
    descriptionEn: 'Crumbly reddish-brown rust that slowly forms when iron touches water and oxygen at room temperature.',
    mextFactJa: '水と酸素の両方が存在することで鉄が酸化されて生成する。多孔質で内部まで腐食が進行する。本物の赤サビは水を含んでいて、Fe₂O₃·nH₂O（含水酸化鉄）と書くこともある。',
    mextFactEn: 'Forms when iron is oxidized in the presence of both water and oxygen. It is porous, so corrosion spreads inside. Real red rust contains water and is sometimes written Fe₂O₃·nH₂O (hydrated iron oxide).',
    renderRadius: 18,
    kidHintJa: '🌧️ 雨ざらしの鉄が水と空気でボロボロの赤茶色になったサビ！公園の遊具にもあるよ。',
    kidHintEn: '🌧️ Flaky reddish-brown rust on iron left out in the rain! Seen on old playground swings.',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 4 }, { type: 'compound', id: 'O2', count: 3 }, { type: 'compound', id: 'H2O', count: 1 }],
      methodJa: '💧 鉄(Fe)4個に水滴と酸素(O2)を触れさせてしばらく待とう！（食塩水があると一瞬で進む）',
      methodEn: '💧 Keep 4 Iron (Fe) touching Water and Oxygen (O2) for a while! (Salt water makes it instant)',
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
    descriptionJa: '鉄を酸素の中で強く熱したり、赤熱した鉄に水蒸気を当てたりするとできる緻密な黒サビ。磁石に引きつけられる。',
    descriptionEn: 'A dense black rust that forms when iron is strongly heated in oxygen or when steam hits red-hot iron. It is attracted to magnets.',
    mextFactJa: '中華鍋の空焼きや南部鉄器の釜焼きでできる黒い膜で、内部を赤サビから守る。天然には磁鉄鉱として産出し、砂鉄の主成分でもある。',
    mextFactEn: 'The black film made when seasoning an iron wok or firing Nambu ironware; it protects the iron from red rust. In nature it is the mineral magnetite, the main part of iron sand.',
    renderRadius: 20,
    kidHintJa: '🧲 砂場で磁石にくっつく黒い砂「砂鉄」の正体！中華鍋の黒い膜も同じ黒サビだよ。',
    kidHintEn: '🧲 The real identity of the black "iron sand" that sticks to magnets in a sandbox! The black coating on iron woks is the same black rust.',
    recipe: {
      materials: [{ type: 'element', id: 'Fe', count: 3 }, { type: 'compound', id: 'O2', count: 2 }],
      methodJa: '🔥 鉄(Fe)3個と酸素(O2)2個をバーナーで真っ赤になるまで（400℃以上）強熱しよう！（赤熱した鉄に水蒸気を当ててもできる）',
      methodEn: '🔥 Heat 3 Iron (Fe) and 2 Oxygen (O2) red-hot (400°C+) with the burner! (Steam on red-hot iron also works)',
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
    descriptionEn: 'A black powder that forms on the surface of copper heated in air.',
    mextFactJa: '炭素粉末と一緒に加熱すると還元されて赤褐色の単体銅（Cu）と二酸化炭素（CO2）が生じる（中学重要実験）。',
    mextFactEn: 'Heated with carbon powder, it is reduced to reddish-brown copper (Cu) and carbon dioxide (CO₂), a key junior-high experiment.',
    renderRadius: 15,
    kidHintJa: '🪙 10円玉（銅）をバーナーで真っ黒に焼くと表面にできる、黒い酸化銅の粉だよ！',
    kidHintEn: '🪙 The black powdery crust that forms when a shiny copper coin is roasted in flame!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 2 }, { type: 'compound', id: 'O2', count: 1 }],
      methodJa: '🔥 銅(Cu)2個と酸素(O2)1個をバーナーで加熱しよう！',
      methodEn: '🔥 Heat 2 Copper (Cu) and 1 Oxygen (O2) with the burner!',
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
    descriptionEn: 'The main component of city gas. It is lighter than air (28.8) and burns to form water and carbon dioxide.',
    mextFactJa: '最も構造が単純なアルカン（炭化水素）。温室効果ガスとしても知られる。',
    mextFactEn: 'The simplest alkane (hydrocarbon). It is also known as a greenhouse gas.',
    renderRadius: 13,
    kidHintJa: '🏠 おうちのガスコンロで使う都市ガスの主成分！牛のゲップからもたくさん出るよ。',
    kidHintEn: '🏠 Main flammable fuel in natural gas stoves! Cows also burp this out into the air.',
    recipe: {
      materials: [{ type: 'element', id: 'C', count: 1 }, { type: 'element', id: 'H', count: 4 }],
      methodJa: '✨ 炭素(C)のすぐそばに水素(H)を4個置こう！（炭素から離れた水素どうしは H2 になってしまう）',
      methodEn: '✨ Place 4 Hydrogen (H) right next to Carbon (C)! (Hydrogen far from carbon pairs up into H2)',
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
    descriptionEn: 'Colorless or white crystals of sodium ions and chloride ions held by ionic bonds. The main component of table salt.',
    mextFactJa: '水によく溶け、電離してナトリウムイオン(Na+)と塩化物イオン(Cl-)になり電気を通す（電解質）。',
    mextFactEn: 'It dissolves well in water and separates into sodium ions (Na⁺) and chloride ions (Cl⁻), so the solution conducts electricity (an electrolyte).',
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
    toxicWarningEn: 'A toxic acidic gas with a sharp smell. It dissolves well in water to form hydrochloric acid, a strong acid.',
    descriptionJa: '刺激臭のある無色気体。水に非常に溶けやすく、水溶液は強酸性の塩酸となる。',
    descriptionEn: 'A colorless gas with a sharp smell. It dissolves very easily in water, and the solution is hydrochloric acid, a strong acid.',
    mextFactJa: 'アンモニア気体（NH3）と接触させると白煙（塩化アンモニウム NH4Cl）を生じる。',
    mextFactEn: 'When it meets ammonia gas (NH₃), it forms white smoke (ammonium chloride, NH₄Cl).',
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
    toxicWarningEn: 'Strongly alkaline and dissolves proteins aggressively. Dangerous if it gets on skin or in eyes.',
    descriptionJa: '白色の固体で強アルカリ性。空気中の水分を吸って溶ける潮解性をもつ。',
    descriptionEn: 'A white, strongly alkaline solid. It absorbs moisture from the air and dissolves in it (deliquescence).',
    mextFactJa: '塩酸（HCl）と反応させると中和して食塩（NaCl）と水（H2O）が生じる。',
    mextFactEn: 'Reacting it with hydrochloric acid (HCl) neutralizes both and forms table salt (NaCl) and water (H₂O).',
    renderRadius: 15,
    kidHintJa: '🧼 油汚れを強力に溶かす強アルカリ！固形せっけんを作るときのたいせつな材料だよ。',
    kidHintEn: '🧼 Strong alkaline substance that dissolves grease! Key ingredient for making soap.',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 2 }, { type: 'compound', id: 'H2O', count: 2 }],
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
    descriptionEn: 'A white salt formed together with hydrogen when zinc reacts with hydrochloric acid.',
    mextFactJa: '中学理科で「金属にうすい塩酸を加える実験」の残液から得られる塩。',
    mextFactEn: 'The salt left in the solution after the junior-high experiment of adding dilute hydrochloric acid to a metal.',
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
    descriptionEn: 'The white ash or powder left after magnesium burns with a dazzling flash. It is used in firebricks and antacids.',
    mextFactJa: 'マグネシウムリボンに点火すると、強烈な白色の光と熱を出して激しく燃え、質量の増加した白色の酸化マグネシウム（2Mg + O₂ → 2MgO）になる（中学2年最重要実験）。',
    mextFactEn: 'Lit magnesium ribbon burns fiercely with intense white light and heat, becoming white magnesium oxide, which weighs more than the ribbon (2Mg + O₂ → 2MgO). A key 8th-grade experiment.',
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
    descriptionEn: 'A clear, colorless liquid used as a disinfectant (oxydol) and bleach. It is unstable and easily releases oxygen and becomes water.',
    mextFactJa: '二酸化マンガン（MnO₂）などの触媒を加えるか加熱すると、激しく泡（酸素 O₂）を出して水に分解する（中学理科の気体発生実験）。',
    mextFactEn: 'With a catalyst such as manganese dioxide (MnO₂), or when heated, it fizzes strongly (oxygen, O₂) and breaks down into water (a junior-high gas experiment).',
    renderRadius: 13,
    kidHintJa: '🩹 すり傷を消毒するときにつけるシュワシュワ泡立つ「オキシドール」の成分！',
    kidHintEn: '🩹 The bubbly "hydrogen peroxide" used for cleaning scrapes and cuts!',
    recipe: {
      materials: [{ type: 'compound', id: 'H2O', count: 1 }, { type: 'element', id: 'O', count: 1 }],
      methodJa: '💧 水(H2O)と酸素(O)を触れさせよう！（元素ラボだけの近道で、実際にはこの方法では作れないよ）',
      methodEn: '💧 Combine Water (H2O) and Oxygen (O)! (an Element Lab shortcut; it does not work this way in reality)',
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
    descriptionEn: 'A black powder and the classic inorganic catalyst that speeds up the breakdown of hydrogen peroxide. Also used in the positive electrode of dry cells.',
    mextFactJa: '過酸化水素水から酸素を発生させる際の触媒として働き、自身は反応の前後で質量や性質が変化しない。',
    mextFactEn: 'It acts as a catalyst when making oxygen from hydrogen peroxide, and its own mass and properties are the same before and after the reaction.',
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
    toxicWarningEn: 'A toxic gas with a sharp smell. It dissolves in water and causes acid rain.',
    descriptionJa: '硫黄が燃焼したときに生じる強い刺激臭をもつ気体。硫酸の製造原料や漂白剤として利用。',
    descriptionEn: 'A gas with a strong, sharp smell formed when sulfur burns. It is a raw material for sulfuric acid and is used as a bleach.',
    mextFactJa: '火山ガスに含まれ、空気中の水分と反応して亜硫酸を生じ酸性雨を引き起こす。還元剤としても働く。',
    mextFactEn: 'Found in volcanic gas. It reacts with moisture in the air to form sulfurous acid and causes acid rain. It also acts as a reducing agent.',
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
    toxicWarningEn: 'Extremely corrosive and irritating. In contact with water it heats up explosively and forms a mist of concentrated sulfuric acid.',
    descriptionJa: '二酸化硫黄を酸化して得られる無色液体。水と激しく化合して硫酸を生じる。',
    descriptionEn: 'A colorless liquid made by oxidizing sulfur dioxide. It combines violently with water to form sulfuric acid.',
    mextFactJa: '接触法（硫酸製造）の中間体。水との反応熱が非常に大きいため、工業的には濃硫酸に吸収させて発煙硫酸にする。',
    mextFactEn: 'An intermediate in the contact process for making sulfuric acid. Its reaction with water releases so much heat that factories absorb it into concentrated sulfuric acid to make fuming sulfuric acid.',
    renderRadius: 14,
    kidHintJa: '⚡ 二酸化硫黄がさらに酸素と結びついたもの。水と混ざると濃硫酸になるよ！',
    kidHintEn: '⚡ Super-reactive sulfur gas that turns into sulfuric acid when mixed with water!',
    recipe: {
      materials: [{ type: 'compound', id: 'SO2', count: 2 }, { type: 'compound', id: 'O2', count: 1 }],
      methodJa: '🔥 二酸化硫黄(SO2)2個と酸素(O2)1個をさらに加熱しよう！',
      methodEn: '🔥 Heat 2 Sulfur Dioxide (SO2) with 1 Oxygen (O2)!',
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
    toxicWarningEn: '[Danger] A strong acid that is highly corrosive and removes water violently. It chars skin and paper!',
    descriptionJa: '工業的に最も重要な無色油状の強酸。不揮発性、吸湿性、脱水作用をもつ。',
    descriptionEn: 'The most important industrial acid: a colorless, oily strong acid. It is nonvolatile, absorbs moisture, and removes water from other substances.',
    mextFactJa: '三大強酸の一つ。希硫酸は金属（ZnやFe）を溶かして水素を発生。熱濃硫酸は銅（Cu）をも酸化して溶かす。',
    mextFactEn: 'One of the three major strong acids. Dilute sulfuric acid dissolves metals such as Zn and Fe, giving off hydrogen. Hot concentrated sulfuric acid can even oxidize and dissolve copper (Cu).',
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
    toxicWarningEn: 'A toxic alkaline gas with a very strong, sharp smell. It irritates the eyes and mucous membranes.',
    descriptionJa: '空気より軽く刺激臭のある気体。水に非常によく溶けて弱アルカリ性を示す。肥料の原料。',
    descriptionEn: 'A gas lighter than air with a sharp smell. It dissolves very well in water and is weakly alkaline. A raw material for fertilizers.',
    mextFactJa: 'ハーバー・ボッシュ法で合成。塩化水素（HCl）と接触させると塩化アンモニウム（NH₄Cl）の白煙を生じる。',
    mextFactEn: 'Made by the Haber-Bosch process. When it meets hydrogen chloride (HCl), it forms white smoke of ammonium chloride (NH₄Cl).',
    renderRadius: 11,
    kidHintJa: '👃 鼻にツンとくる強烈なにおい！畑のおいしい野菜を育てる肥料のたいせつな原料だよ。',
    kidHintEn: '👃 Sharp pungent smell! Vital ingredient for plant fertilizer that feeds crops worldwide.',
    recipe: {
      materials: [{ type: 'compound', id: 'N2', count: 1 }, { type: 'compound', id: 'H2', count: 3 }, { type: 'element', id: 'Fe', count: 1 }],
      methodJa: '🔥 窒素(N2)1個と水素(H2)3個に、触媒の鉄(Fe)を入れて400℃以上に加熱しよう！（ハーバー・ボッシュ法。鉄は反応後も残る）',
      methodEn: '🔥 Heat 1 Nitrogen (N2) and 3 Hydrogen (H2) with an Iron (Fe) catalyst above 400°C! (Haber–Bosch process; the iron remains)',
      toolRequired: 'heat',
      toastGuideJa: '窒素と水素を鉄といっしょに加熱してみよう！',
      toastGuideEn: 'Heat Nitrogen and Hydrogen together with Iron!'
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
    descriptionEn: 'Tiny white solid particles formed when ammonia gas and hydrogen chloride gas react (this is what the white smoke is).',
    mextFactJa: '気体同士の中和反応（NH₃ + HCl → NH₄Cl）で生成。加熱するとアンモニアと塩化水素に熱分解（昇華）する。',
    mextFactEn: 'Formed by a neutralization between two gases (NH₃ + HCl → NH₄Cl). When heated, it breaks down into ammonia and hydrogen chloride (it appears to sublime).',
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
    toxicWarningEn: 'A strong acid and hazardous substance with strong oxidizing power. It oxidizes and dissolves even copper and silver.',
    descriptionJa: '強い酸化作用をもつ代表的な強酸。オストワルト法で製造され、火薬や染料の原料になる。',
    descriptionEn: 'A typical strong acid with strong oxidizing power. It is made by the Ostwald process and used to make explosives and dyes.',
    mextFactJa: '光や熱で分解してNO₂（赤褐色）を生じるため褐色ビンに保存する。銅（Cu）を溶かすことができる。',
    mextFactEn: 'Light and heat break it down into NO₂ (reddish brown), so it is stored in brown bottles. It can dissolve copper (Cu).',
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
    toxicWarningEn: 'A highly toxic reddish-brown gas with a sharp smell. It is a cause of photochemical smog.',
    descriptionJa: '赤褐色の有毒気体。水に溶けると硝酸になる。冷却すると無色の四酸化二窒素（N₂O₄）になる。',
    descriptionEn: 'A toxic reddish-brown gas. It dissolves in water to form nitric acid. When cooled, it becomes colorless dinitrogen tetroxide (N₂O₄).',
    mextFactJa: '銅と濃硝酸の反応で激しく発生する。空気より重く水に溶けやすい。',
    mextFactEn: 'Given off vigorously when copper reacts with concentrated nitric acid. It is heavier than air and dissolves easily in water.',
    renderRadius: 13,
    kidHintJa: '🚗 車の排気ガスなどにも含まれる、赤茶色でツンとする有毒な気体だよ！',
    kidHintEn: '🚗 Red-brown toxic smog gas with a sharp bite, seen in vehicle exhaust fumes!',
    recipe: {
      materials: [{ type: 'compound', id: 'NO', count: 2 }, { type: 'compound', id: 'O2', count: 1 }],
      methodJa: '💨 一酸化窒素(NO)2個と酸素(O2)1個を近づけよう！常温ですぐ赤褐色になる（NOは窒素(N2)と酸素(O2)を1500℃以上に強熱するとできる）',
      methodEn: '💨 Bring 2 Nitric Oxide (NO) and 1 Oxygen (O2) together! It turns reddish-brown at room temperature (NO forms when N2 and O2 are heated above 1500°C)',
      toolRequired: 'spawn',
      toastGuideJa: '一酸化窒素と酸素を混ぜてみよう（有毒なのでフラスコに蓋を！）',
      toastGuideEn: 'Mix Nitric Oxide and Oxygen (toxic, so cap the flask!)'
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
    descriptionEn: 'A black solid formed when a mixture of iron powder and sulfur powder is heated: it glows red and combines vigorously.',
    mextFactJa: '中学2年「化合」の最重要実験。元の鉄と異なり磁石につかず、塩酸を加えると腐卵臭の硫化水素（H₂S）が発生する。',
    mextFactEn: 'A key 8th-grade experiment on combining elements. Unlike the original iron, it is not attracted to magnets, and adding hydrochloric acid gives off hydrogen sulfide (H₂S), which smells like rotten eggs.',
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
    toxicWarningEn: '[Highly Toxic] A gas that smells like rotten eggs (hot springs). At high concentrations it numbs the sense of smell and can be deadly!',
    descriptionJa: '腐卵臭のある無色有毒気体。火山ガスや温泉に含まれ、還元剤として働く。',
    descriptionEn: 'A colorless, toxic gas that smells like rotten eggs. It is found in volcanic gas and hot springs and acts as a reducing agent.',
    mextFactJa: '硫化鉄（FeS）に酸を加えると発生。金属イオンと反応して様々な色の硫化物沈殿を作る（高校化学系統分析）。',
    mextFactEn: 'Given off when acid is added to iron sulfide (FeS). It reacts with metal ions to form sulfide precipitates of many colors (used in high-school qualitative analysis).',
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
    descriptionEn: 'A white solid that is the main component of limestone, marble, shells, eggshells, and chalk.',
    mextFactJa: '石灰水にCO₂を通すと生じる白濁の正体。塩酸を加えると二酸化炭素（CO₂）を激しく発生する（気体発生実験）。',
    mextFactEn: 'It is what makes limewater turn milky when CO₂ is bubbled through. Adding hydrochloric acid gives off carbon dioxide (CO₂) vigorously (a gas experiment).',
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
    descriptionEn: 'A white powder that reacts with water, giving off a lot of heat, to form slaked lime (Ca(OH)₂). Used as a heating agent for food and as a drying agent.',
    mextFactJa: '石灰石（CaCO₃）を強熱すると熱分解して生成する。水との水和熱は駅弁等の発熱剤に利用される。',
    mextFactEn: 'Formed when limestone (CaCO₃) is strongly heated and breaks down. The heat of its reaction with water warms self-heating lunch boxes.',
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
    descriptionEn: 'A white powder. Its saturated solution is called limewater and is used to test for carbon dioxide.',
    mextFactJa: '生石灰（CaO）に水を加えると生成。二酸化炭素（CO₂）を通すと炭酸カルシウム（CaCO₃）の白色沈殿を生じて白く濁る。',
    mextFactEn: 'Formed when water is added to quicklime (CaO). When carbon dioxide (CO₂) is bubbled through, a white precipitate of calcium carbonate (CaCO₃) makes it milky.',
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
    descriptionEn: 'White crystals that absorb moisture strongly. Used as a dehumidifier and to melt snow and prevent ice on winter roads.',
    mextFactJa: '石灰石に塩酸を加えたときの残液から得られる塩。水に溶けると大きな熱（溶解熱）を出す。',
    mextFactEn: 'The salt left in the solution after adding hydrochloric acid to limestone. It releases a lot of heat when it dissolves in water (heat of solution).',
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
    // 110℃ は五水和物が水和水を失い始める温度。無水物は融けずに約 560℃ 以上で分解するので、それまで固体のままにする
    meltingPoint: 560,
    boilingPoint: 9999,
    color: '#38BDF8',
    secondaryColor: '#0284C7',
    descriptionJa: '美しい青色の結晶（五水和物）。無水物は白色粉末で水分を吸うと青色に変色する。',
    descriptionEn: 'Beautiful blue crystals (the pentahydrate). The anhydrous form is a white powder that turns blue when it absorbs water.',
    mextFactJa: '無水硫酸銅（白色）は微量の水を検出すると青色に変色するため、水の確認試薬として使われる。',
    mextFactEn: 'Anhydrous copper sulfate (white) turns blue when it detects even a little water, so it is used to test for water.',
    renderRadius: 17,
    kidHintJa: '💎 水に溶かすときれいな透き通った青色になる、宝石のような結晶だよ！',
    kidHintEn: '💎 Gem-like azure crystals that dissolve into striking sapphire blue liquid!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 1 }, { type: 'compound', id: 'H2SO4', count: 2 }],
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
    toxicWarningEn: 'A toxic yellow-green gas with a strong, sharp smell. Breathing it in seriously harms the lungs and airways.',
    descriptionJa: '刺激臭（プールの臭い）をもつ黄緑色の有毒気体。水溶液の電気分解や漂白剤の原料。',
    descriptionEn: 'A toxic yellow-green gas with a sharp smell (the smell of swimming pools). Made by electrolysis of salt solutions and used to make bleach.',
    mextFactJa: '【学習ポイント】空気（28.8）より重く（約2.5倍）下方に溜まる。強い漂白作用・殺菌作用をもつ。',
    mextFactEn: '[Key Point] It is heavier than air (about 2.5 times as heavy as air, 28.8) and collects low down. It strongly bleaches and kills germs.',
    renderRadius: 12,
    kidHintJa: '🏊 学校のプールの消毒のにおいがする、黄緑色で重たい有毒ガスだよ！',
    kidHintEn: '🏊 Distinct pool cleaning scent! Heavy greenish-yellow toxic gas.',
    recipe: {
      materials: [{ type: 'element', id: 'Cl', count: 2 }],
      methodJa: '✨ 塩素(Cl)同士を接触させるか、塩化銅水溶液（塩化銅＋水）に通電しよう！',
      methodEn: '✨ Bring Chlorine (Cl) atoms together or electrolyze CuCl2 solution (CuCl2 + water)!',
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
    descriptionEn: 'A blue-green salt that dissolves in water to form a blue-green electrolyte solution.',
    mextFactJa: '【学習ポイント】中学3年最重要実験。水溶液に通電すると、陰極に赤褐色の銅Cuが析出し、陽極から刺激臭の塩素Cl₂が発生する。',
    mextFactEn: '[Key Point] A key 9th-grade experiment. When electricity passes through its solution, reddish-brown copper (Cu) forms on the cathode and chlorine (Cl₂), with its sharp smell, bubbles up at the anode.',
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
    descriptionEn: 'A pale green salt formed when iron sulfide or iron reacts with hydrochloric acid.',
    mextFactJa: '【学習ポイント】硫化鉄（FeS）に塩酸（HCl）を加えると、塩化鉄(II)（FeCl₂）とともに腐卵臭の気体である硫化水素（H₂S）が発生する（中学2年実験）。',
    mextFactEn: '[Key Point] Adding hydrochloric acid (HCl) to iron sulfide (FeS) forms iron(II) chloride (FeCl₂) and hydrogen sulfide (H₂S), a gas that smells like rotten eggs (an 8th-grade experiment).',
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
  },
  N2: {
    id: 'N2',
    formula: 'N₂',
    nameJa: '窒素分子',
    nameEn: 'Nitrogen Gas',
    elements: { N: 2 },
    molarMass: 28.014,
    stateAtRoomTemp: 'gas',
    meltingPoint: -210.0,
    boilingPoint: -195.8,
    color: '#93C5FD',
    secondaryColor: '#2563EB',
    descriptionJa: '空気の約78%を占める無色・無臭の極めて安定な気体。スナック菓子の封入ガスや液体窒素に使われる。',
    descriptionEn: 'A colorless, odorless, very stable gas that makes up about 78% of air. It fills bags of snacks and is used as liquid nitrogen.',
    mextFactJa: '【学習ポイント】窒素原子同士が強固な三重結合（N≡N）で結ばれているため常温ではほとんど反応しない。高温・高圧・触媒下で水素と反応してアンモニアになる。',
    mextFactEn: '[Key Point] The nitrogen atoms are joined by a strong triple bond (N≡N), so it hardly reacts at room temperature. At high temperature and pressure with a catalyst, it reacts with hydrogen to form ammonia.',
    renderRadius: 11,
    kidHintJa: '🌬️ 私たちが吸っている空気の約80%を占める気体！ポテチの袋をパンパンに膨らませているのもこれだよ。',
    kidHintEn: '🌬️ Makes up nearly 80% of the air we breathe! Also used to puff up potato chip bags.',
    recipe: {
      materials: [{ type: 'element', id: 'N', count: 2 }],
      methodJa: '✨ 窒素(N)同士を近づけてみよう！',
      methodEn: '✨ Bring Nitrogen (N) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: '窒素(N)を近づけてみよう！',
      toastGuideEn: 'Bring Nitrogen atoms together!'
    }
  },
  P4O10: {
    id: 'P4O10',
    formula: 'P₄O₁₀',
    nameJa: '十酸化四リン (五酸化二リン)',
    nameEn: 'Phosphorus Pentoxide',
    elements: { P: 4, O: 10 },
    molarMass: 283.89,
    stateAtRoomTemp: 'solid',
    meltingPoint: 340,
    boilingPoint: 360,
    color: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    descriptionJa: 'リンが空気中で淡い青い炎と激しい白煙を上げて燃焼したときに生じる白色粉末。極めて強い吸湿性をもつ。',
    descriptionEn: 'A white powder formed when phosphorus burns in air with a pale blue flame and thick white smoke. It absorbs moisture extremely strongly.',
    mextFactJa: '【学習ポイント】化学式は分子式の P₄O₁₀（または組成式の P₂O₅）。全物質中で最強クラスの強力な乾燥剤として気体の乾燥に使われ、水と反応するとリン酸（H₃PO₄）になる。',
    mextFactEn: '[Key Point] Its molecular formula is P₄O₁₀ (empirical formula P₂O₅). One of the strongest drying agents of all, it is used to dry gases, and it reacts with water to form phosphoric acid (H₃PO₄).',
    renderRadius: 17,
    kidHintJa: '💨 マッチの成分「リン」を燃やしたときにモクモク出る白い煙の正体！水分をグングン吸い取るよ。',
    kidHintEn: '💨 Thick white smoke formed when phosphorus burns! One of the strongest moisture-absorbing powders.',
    recipe: {
      materials: [{ type: 'element', id: 'P', count: 4 }, { type: 'compound', id: 'O2', count: 5 }],
      methodJa: '🔥 リン(P)4個と酸素(O2)5個をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Phosphorus (P) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: 'リンと酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Phosphorus and Oxygen with the burner!'
    }
  },
  H3PO4: {
    id: 'H3PO4',
    formula: 'H₃PO₄',
    nameJa: 'リン酸',
    nameEn: 'Phosphoric Acid',
    elements: { H: 3, P: 1, O: 4 },
    molarMass: 97.995,
    // 純粋なリン酸は融点 42℃ の結晶。液体として売られているのは濃い水溶液 (約85%)
    stateAtRoomTemp: 'solid',
    meltingPoint: 42.35,
    boilingPoint: 158,
    color: '#E0F2FE',
    secondaryColor: '#0284C7',
    descriptionJa: '十酸化四リン（P₄O₁₀）が水と反応して生じる3価の中程度の酸。純粋なものは融点42℃の無色の結晶で、ふつうは濃い水溶液として使われる。肥料やコーラなどの酸味料、DNAの骨格成分。',
    descriptionEn: 'A moderately strong acid with three acidic hydrogens, formed when tetraphosphorus decoxide (P₄O₁₀) reacts with water. Pure phosphoric acid is colorless crystals that melt at 42°C; it is usually used as a concentrated solution. It is used in fertilizers and as the tart flavor in cola, and forms the backbone of DNA.',
    mextFactJa: '【学習ポイント】P₄O₁₀ + 6H₂O → 4H₃PO₄。不揮発性の3価の酸であり、生体内ではATP（アデノシン三リン酸）や核酸（DNA・RNA）の構成成分として不可欠。',
    mextFactEn: '[Key Point] P₄O₁₀ + 6H₂O → 4H₃PO₄. A nonvolatile acid with three acidic hydrogens. In living things it is an essential part of ATP (adenosine triphosphate) and nucleic acids (DNA and RNA).',
    renderRadius: 15,
    kidHintJa: '🥤 コーラの爽やかな酸味料や、植物を育てる肥料、私たちのDNAにも入っているたいせつな酸！',
    kidHintEn: '🥤 Gives cola drinks their tangy bite and forms the backbone of our DNA!',
    recipe: {
      materials: [{ type: 'compound', id: 'P4O10', count: 1 }, { type: 'compound', id: 'H2O', count: 6 }],
      methodJa: '💧 十酸化四リン(P4O10)に水(H2O)を加えよう！',
      methodEn: '💧 Add Water (H2O) to Phosphorus Pentoxide (P4O10)!',
      toolRequired: 'spawn',
      toastGuideJa: '十酸化四リンと水を反応させてみよう！',
      toastGuideEn: 'React Phosphorus Pentoxide and Water together!'
    }
  },
  NaHCO3: {
    id: 'NaHCO3',
    formula: 'NaHCO₃',
    nameJa: '炭酸水素ナトリウム (重曹)',
    nameEn: 'Sodium Bicarbonate (Baking Soda)',
    elements: { Na: 1, H: 1, C: 1, O: 3 },
    molarMass: 84.007,
    stateAtRoomTemp: 'solid',
    meltingPoint: 270,
    boilingPoint: 9999,
    color: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    descriptionJa: '「重曹」として料理のふくらし粉（ベーキングパウダー）や掃除、胃薬、入浴剤に広く使われる白色粉末。弱アルカリ性。',
    descriptionEn: 'A white powder known as baking soda, widely used to make dough rise, for cleaning, in antacids, and in bath salts. Weakly alkaline.',
    mextFactJa: '【学習ポイント】中学2年「熱分解」の最重要実験および高校化学「アンモニア・ソーダ法（ソルベー法）」の中間生成物。加熱すると炭酸ナトリウム（Na₂CO₃）、水（H₂O）、二酸化炭素（CO₂）に分解する。',
    mextFactEn: '[Key Point] The key 8th-grade thermal decomposition experiment, and an intermediate of the ammonia-soda (Solvay) process in high-school chemistry. When heated, it breaks down into sodium carbonate (Na₂CO₃), water (H₂O), and carbon dioxide (CO₂).',
    renderRadius: 16,
    kidHintJa: '🥞 ホットケーキをふわふわに膨らませる「重曹（ベーキングパウダー）」やお掃除パウダーの正体！',
    kidHintEn: '🥞 Kitchen baking soda that makes pancakes fluffy and fizzes when heated!',
    recipe: {
      materials: [{ type: 'compound', id: 'NaOH', count: 1 }, { type: 'compound', id: 'CO2', count: 1 }],
      methodJa: '✨ 水酸化ナトリウム(NaOH)と二酸化炭素(CO2)を触れさせよう！',
      methodEn: '✨ Combine Sodium Hydroxide (NaOH) and Carbon Dioxide (CO2)!',
      toolRequired: 'spawn',
      toastGuideJa: '水酸化ナトリウムと二酸化炭素を反応させてみよう！',
      toastGuideEn: 'React Sodium Hydroxide and Carbon Dioxide together!'
    }
  },
  Na2CO3: {
    id: 'Na2CO3',
    formula: 'Na₂CO₃',
    nameJa: '炭酸ナトリウム (炭酸ソーダ)',
    nameEn: 'Sodium Carbonate (Soda Ash)',
    elements: { Na: 2, C: 1, O: 3 },
    molarMass: 105.988,
    stateAtRoomTemp: 'solid',
    meltingPoint: 851,
    boilingPoint: 1600,
    color: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    descriptionJa: '炭酸水素ナトリウム（重曹）を加熱分解すると残る白色固体。ガラスの主原料や中華麺のかん水、洗剤に使われる。水に溶けて強いアルカリ性を示す。',
    descriptionEn: 'The white solid left after baking soda (sodium bicarbonate) is heated and breaks down. Used to make glass, in the alkaline water for Chinese noodles, and in detergents. It dissolves in water to give a strongly alkaline solution.',
    mextFactJa: '【学習ポイント】2NaHCO₃ → Na₂CO₃ + H₂O + CO₂。元の重曹（弱アルカリ性）よりも水に溶けやすく、水溶液は強いアルカリ性を示す（フェノールフタレイン溶液が濃い赤色になる）。',
    mextFactEn: '[Key Point] 2NaHCO₃ → Na₂CO₃ + H₂O + CO₂. It dissolves in water more easily than the original baking soda (weakly alkaline), and its solution is strongly alkaline (phenolphthalein turns deep red).',
    renderRadius: 17,
    kidHintJa: '🍜 重曹を熱するとできる白い粉！ガラスの原料やラーメンの麺をシコシコにする「かん水」に使われるよ。',
    kidHintEn: '🍜 Formed by heating baking soda! Used to make glass and chewy ramen noodles.',
    recipe: {
      materials: [{ type: 'compound', id: 'NaHCO3', count: 2 }],
      methodJa: '🔥 炭酸水素ナトリウム(NaHCO3)をバーナーで加熱して熱分解しよう！',
      methodEn: '🔥 Heat Sodium Bicarbonate (NaHCO3) with burner to decompose it!',
      toolRequired: 'heat',
      toastGuideJa: '重曹(NaHCO3)をバーナーで加熱して熱分解してみよう！',
      toastGuideEn: 'Heat Sodium Bicarbonate (NaHCO3) with the burner!'
    }
  },
  Al2O3: {
    id: 'Al2O3',
    formula: 'Al₂O₃',
    nameJa: '酸化アルミニウム (アルミナ)',
    nameEn: 'Aluminium Oxide (Alumina)',
    elements: { Al: 2, O: 3 },
    molarMass: 101.96,
    stateAtRoomTemp: 'solid',
    meltingPoint: 2072,
    boilingPoint: 2977,
    color: '#F1F5F9',
    secondaryColor: '#94A3B8',
    descriptionJa: 'アルミニウムの酸化物。極めて硬く耐熱性に優れ、宝石のルビーやサファイアの主成分（コランダム）でもある両性酸化物。',
    descriptionEn: 'The oxide of aluminium: an amphoteric oxide that is extremely hard and heat-resistant. It is the main component of ruby and sapphire (corundum).',
    mextFactJa: '【学習ポイント】両性酸化物であり酸にも強塩基にも溶ける。またアルミニウム粉末と酸化鉄(III)に点火する「テルミット反応（2Al + Fe₂O₃ → Al₂O₃ + 2Fe）」では凄まじい反応熱でレールの溶接などに使われる。',
    mextFactEn: '[Key Point] As an amphoteric oxide, it dissolves in both acids and strong bases. In the thermite reaction (2Al + Fe₂O₃ → Al₂O₃ + 2Fe), lighting aluminium powder with iron(III) oxide releases enormous heat, used for welding rails.',
    renderRadius: 17,
    kidHintJa: '💎 アルミニウムを守る硬い膜であり、宝石の「ルビー」や「サファイア」の正体でもあるよ！',
    kidHintEn: '💎 Super-hard mineral that forms precious rubies and sapphires!',
    recipe: {
      materials: [{ type: 'element', id: 'Al', count: 4 }, { type: 'compound', id: 'O2', count: 3 }],
      methodJa: '🔥 アルミニウム(Al)4個と酸素(O2)3個をバーナーで加熱するか、赤サビ(Fe2O3)とテルミット反応させよう！',
      methodEn: '🔥 Heat Aluminium (Al) with Oxygen (O) or trigger a Thermite reaction with Fe2O3!',
      toolRequired: 'heat',
      toastGuideJa: 'アルミニウムと酸素（またはFe2O3）を加熱してみよう！',
      toastGuideEn: 'Heat Aluminium with Oxygen or Fe2O3!'
    }
  },
  AgNO3: {
    id: 'AgNO3',
    formula: 'AgNO₃',
    nameJa: '硝酸銀',
    nameEn: 'Silver Nitrate',
    elements: { Ag: 1, N: 1, O: 3 },
    molarMass: 169.87,
    stateAtRoomTemp: 'solid',
    meltingPoint: 212,
    boilingPoint: 440,
    color: '#E2E8F0',
    secondaryColor: '#64748B',
    descriptionJa: '水によく溶ける無色透明な銀の塩。塩化物イオン（Cl⁻）を検出するための最重要試薬。光で分解するため褐色ビンに保存。',
    descriptionEn: 'A colorless, very soluble silver salt and the most important reagent for detecting chloride ions (Cl⁻). Light breaks it down, so it is stored in brown bottles.',
    mextFactJa: '【学習ポイント】銀（Ag）を硝酸（HNO₃）に溶かすと生成。水溶液に塩酸や食塩水を加えると、瞬時に塩化銀（AgCl）の白色沈殿を生じる。',
    mextFactEn: '[Key Point] Formed by dissolving silver (Ag) in nitric acid (HNO₃). Adding hydrochloric acid or salt water to its solution instantly forms a white precipitate of silver chloride (AgCl).',
    renderRadius: 16,
    kidHintJa: '🔍 水道水や塩水の中に「塩素イオン」が隠れていないか見つけ出す、科学捜査のような検査薬！',
    kidHintEn: '🔍 Detective reagent that instantly turns white when it touches chloride ions!',
    recipe: {
      materials: [{ type: 'element', id: 'Ag', count: 1 }, { type: 'compound', id: 'HNO3', count: 2 }],
      methodJa: '🔥 銀(Ag)と硝酸(HNO3)を加熱して反応させよう！',
      methodEn: '🔥 React Silver (Ag) with Nitric Acid (HNO3)!',
      toolRequired: 'heat',
      toastGuideJa: '銀と硝酸を加熱して反応させてみよう！',
      toastGuideEn: 'Heat Silver and Nitric Acid together!'
    }
  },
  AgCl: {
    id: 'AgCl',
    formula: 'AgCl',
    nameJa: '塩化銀 (白色沈殿)',
    nameEn: 'Silver Chloride',
    elements: { Ag: 1, Cl: 1 },
    molarMass: 143.32,
    stateAtRoomTemp: 'solid',
    meltingPoint: 455,
    boilingPoint: 1547,
    color: '#FFFFFF',
    secondaryColor: '#CBD5E1',
    descriptionJa: '水に極めて溶けにくい白色の沈殿（固体）。光（紫外線）が当たると感光して黒っぽい銀（Ag）が析出するため写真フィルムに使われた。',
    descriptionEn: 'A white precipitate (solid) that hardly dissolves in water. Light (ultraviolet) makes it release dark silver (Ag), so it was used in photographic film.',
    mextFactJa: '【学習ポイント】高校化学「無機イオンの沈殿反応」の代表格（Ag⁺ + Cl⁻ → AgCl↓）。水や希硝酸には溶けないが、アンモニア水には錯イオン（[Ag(NH₃)₂]⁺）を作って溶ける。',
    mextFactEn: '[Key Point] The classic precipitation reaction of inorganic ions in high-school chemistry (Ag⁺ + Cl⁻ → AgCl↓). It does not dissolve in water or dilute nitric acid, but it dissolves in ammonia water by forming a complex ion ([Ag(NH₃)₂]⁺).',
    renderRadius: 16,
    kidHintJa: '📷 硝酸銀と塩酸が出会うとパッと現れる白い沈殿！光が当たると黒くなるので昔の写真フィルムに使われたよ。',
    kidHintEn: '📷 Classic white precipitate in chemistry class! Darkens in sunlight, once used in photographic film.',
    recipe: {
      materials: [{ type: 'compound', id: 'AgNO3', count: 1 }, { type: 'compound', id: 'HCl', count: 1 }],
      methodJa: '✨ 硝酸銀(AgNO3)に塩酸(HCl)または食塩(NaCl)を触れさせよう！',
      methodEn: '✨ Touch Silver Nitrate (AgNO3) with HCl or NaCl!',
      toolRequired: 'spawn',
      toastGuideJa: '硝酸銀と塩化水素（または銀と塩素）を触れさせてみよう！',
      toastGuideEn: 'Touch Silver Nitrate with HCl (or Silver with Chlorine)!'
    }
  },
  KCl: {
    id: 'KCl',
    formula: 'KCl',
    nameJa: '塩化カリウム',
    nameEn: 'Potassium Chloride',
    elements: { K: 1, Cl: 1 },
    molarMass: 74.55,
    stateAtRoomTemp: 'solid',
    meltingPoint: 770,
    boilingPoint: 1420,
    color: '#F3E8FF',
    secondaryColor: '#A855F7',
    descriptionJa: 'カリウムと塩素からなる白色結晶の塩。植物の必須肥料（カリ肥料）や減塩しお、点滴薬などに利用される。',
    descriptionEn: 'A salt of white crystals made of potassium and chlorine. Used as an essential plant fertilizer (potash), in low-sodium salt, and in IV drips.',
    mextFactJa: '【学習ポイント】カリウム（K）の化合物であるため、加熱するとカリウム特有の「淡赤紫色（赤紫）」の炎色反応を示す。',
    mextFactEn: '[Key Point] Because it is a potassium (K) compound, heating it shows potassium\'s lilac (pale violet) flame test color.',
    renderRadius: 16,
    kidHintJa: '🌱 減塩ソルトや植物を元気に育てる肥料に使われる塩！燃やすときれいな紫色の炎が出るよ。',
    kidHintEn: '🌱 Essential plant fertilizer and low-sodium salt! Burns with a lovely lilac-violet flame.',
    recipe: {
      materials: [{ type: 'element', id: 'K', count: 1 }, { type: 'element', id: 'Cl', count: 1 }],
      methodJa: '✨ カリウム(K)と塩素(Cl)を近づけよう！',
      methodEn: '✨ Combine Potassium (K) and Chlorine (Cl)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カリウムと塩素を近づけてみよう！',
      toastGuideEn: 'Bring Potassium and Chlorine together!'
    }
  },
  KOH: {
    id: 'KOH',
    formula: 'KOH',
    nameJa: '水酸化カリウム (苛性カリ)',
    nameEn: 'Potassium Hydroxide',
    elements: { K: 1, O: 1, H: 1 },
    molarMass: 56.11,
    stateAtRoomTemp: 'solid',
    meltingPoint: 360,
    boilingPoint: 1327,
    color: '#EDE9FE',
    secondaryColor: '#7C3AED',
    isToxic: true,
    toxicWarning: '強アルカリ性で皮膚や粘膜を激しく腐食します。',
    toxicWarningEn: 'Strongly alkaline and severely corrodes skin and mucous membranes.',
    descriptionJa: 'カリウムと水が激しく反応して生じる白色固体。水酸化ナトリウムと同様に潮解性をもつ代表的な強塩基。アルカリ乾電池の電解液に使われる。',
    descriptionEn: 'A white solid formed when potassium reacts violently with water. Like sodium hydroxide, it is a strong base that absorbs moisture and dissolves in it. Used as the electrolyte in alkaline batteries.',
    mextFactJa: '【学習ポイント】2K + 2H₂O → 2KOH + H₂。カリウムはナトリウム以上に水と激しく反応し、発生する水素が自然発火するほど発熱する。',
    mextFactEn: '[Key Point] 2K + 2H₂O → 2KOH + H₂. Potassium reacts with water even more violently than sodium, giving off so much heat that the hydrogen can catch fire.',
    renderRadius: 15,
    kidHintJa: '🔋 アルカリ乾電池の中に入っている強力なアルカリ液！液体せっけんの材料にもなるよ。',
    kidHintEn: '🔋 Powerful alkaline electrolyte inside alkaline batteries! Forms when potassium hits water.',
    recipe: {
      materials: [{ type: 'element', id: 'K', count: 2 }, { type: 'compound', id: 'H2O', count: 2 }],
      methodJa: '💧 カリウム(K)を水(H2O)に投入しよう！',
      methodEn: '💧 Drop Potassium (K) into Water (H2O)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カリウムを水に触れさせてみよう！',
      toastGuideEn: 'Drop Potassium into Water!'
    }
  },
  LiCl: {
    id: 'LiCl',
    formula: 'LiCl',
    nameJa: '塩化リチウム',
    nameEn: 'Lithium Chloride',
    elements: { Li: 1, Cl: 1 },
    molarMass: 42.39,
    stateAtRoomTemp: 'solid',
    meltingPoint: 605,
    boilingPoint: 1382,
    color: '#FCE7F3',
    secondaryColor: '#EC4899',
    descriptionJa: 'リチウムと塩素が結合した白色結晶。非常に高い吸湿性・潮解性をもち、湿度計や工業用除湿剤、金属リチウムの融解塩電解原料に使われる。',
    descriptionEn: 'White crystals of lithium and chlorine. They absorb moisture very strongly and are used in hygrometers, industrial dehumidifiers, and as the raw material for making lithium metal by molten-salt electrolysis.',
    mextFactJa: '【学習ポイント】リチウム（Li）を含む塩であるため、バーナーで加熱すると鮮やかな「深赤色（深紅）」の炎色反応を示す。',
    mextFactEn: '[Key Point] Because it contains lithium (Li), heating it in a burner flame shows lithium\'s vivid crimson flame test color.',
    renderRadius: 15,
    kidHintJa: '🎆 リチウムと塩素からできた塩！火に入れると真っ赤な花火のように深紅の炎が上がるよ。',
    kidHintEn: '🎆 Lithium salt that glows vivid crimson-red in a flame test!',
    recipe: {
      materials: [{ type: 'element', id: 'Li', count: 1 }, { type: 'element', id: 'Cl', count: 1 }],
      methodJa: '✨ リチウム(Li)と塩素(Cl)を近づけよう！',
      methodEn: '✨ Combine Lithium (Li) and Chlorine (Cl)!',
      toolRequired: 'spawn',
      toastGuideJa: 'リチウムと塩素を近づけてみよう！',
      toastGuideEn: 'Bring Lithium and Chlorine together!'
    }
  },
  SiO2: {
    id: 'SiO2',
    formula: 'SiO₂',
    nameJa: '二酸化ケイ素 (石英・シリカ)',
    nameEn: 'Silicon Dioxide (Silica / Quartz)',
    elements: { Si: 1, O: 2 },
    molarMass: 60.08,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1713,
    boilingPoint: 2950,
    color: '#E0F2FE',
    secondaryColor: '#64748B',
    descriptionJa: '地殻の岩石や砂、水晶（石英）、ガラス、光ファイバーの主成分。共有結合の結晶をつくり、極めて硬く融点が高い。',
    descriptionEn: 'The main component of crustal rocks, sand, quartz crystal, glass, and optical fibers. It forms a covalent network crystal that is extremely hard and has a high melting point.',
    mextFactJa: '【学習ポイント】高校化学「共有結合の結晶」の代表例（組成式 SiO₂）。ダイヤモンドと同様に正四面体構造が網目状に連なる巨大分子をつくるため、非常に硬く融点が高い。',
    mextFactEn: '[Key Point] The classic covalent network crystal in high-school chemistry (empirical formula SiO₂). Like diamond, its tetrahedral units link into a giant network, so it is very hard and melts at a high temperature.',
    renderRadius: 16,
    kidHintJa: '🔮 キラキラ輝く「水晶（クォーツ）」や、砂浜の砂、窓ガラス、光ファイバーの主成分だよ！',
    kidHintEn: '🔮 Sparkling quartz crystals, beach sand, window glass, and fiber-optic cables!',
    recipe: {
      materials: [{ type: 'element', id: 'Si', count: 1 }, { type: 'element', id: 'O', count: 2 }],
      methodJa: '🔥 ケイ素(Si)と酸素(O)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Silicon (Si) and Oxygen (O) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: 'ケイ素と酸素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Silicon and Oxygen with the burner!'
    }
  },
  BaSO4: {
    id: 'BaSO4',
    formula: 'BaSO₄',
    nameJa: '硫酸バリウム',
    nameEn: 'Barium Sulfate',
    elements: { Ba: 1, S: 1, O: 4 },
    molarMass: 233.39,
    stateAtRoomTemp: 'solid',
    meltingPoint: 1580,
    boilingPoint: 1600,
    color: '#FFFFFF',
    secondaryColor: '#94A3B8',
    descriptionJa: '水や酸に全く溶けない白色の結晶粉末。X線をよく遮蔽し体内で吸収されないため、健康診断の胃のX線（レントゲン）造影剤として使われる。',
    descriptionEn: 'A white crystalline powder that does not dissolve in water or acid at all. It blocks X-rays well and is not absorbed by the body, so it is used as the contrast agent for stomach X-rays in health checkups.',
    mextFactJa: '【学習ポイント】高校化学「硫酸イオンの検出反応（Ba²⁺ + SO₄²⁻ → BaSO₄↓）」で生じる代表的な白色沈殿。バリウム（Ba）を含むため黄緑色の炎色反応を示す。',
    mextFactEn: '[Key Point] The classic white precipitate in the high-school test for sulfate ions (Ba²⁺ + SO₄²⁻ → BaSO₄↓). Because it contains barium (Ba), it shows a yellow-green flame test color.',
    renderRadius: 17,
    kidHintJa: '🏥 健康診断のレントゲン検査で飲む、あの白い「バリウム」の正体！水にも胃酸にも溶けないよ。',
    kidHintEn: '🏥 The famous white "barium meal" swallowed for stomach X-ray checkups!',
    recipe: {
      materials: [{ type: 'element', id: 'Ba', count: 1 }, { type: 'compound', id: 'H2SO4', count: 1 }],
      methodJa: '✨ バリウム(Ba)に硫酸(H2SO4)を触れさせよう！',
      methodEn: '✨ Touch Barium (Ba) with Sulfuric Acid (H2SO4)!',
      toolRequired: 'spawn',
      toastGuideJa: 'バリウムと硫酸を反応させてみよう！',
      toastGuideEn: 'React Barium and Sulfuric Acid together!'
    }
  },
  F2: {
    id: 'F2',
    formula: 'F₂',
    nameJa: 'フッ素分子',
    nameEn: 'Fluorine Gas',
    elements: { F: 2 },
    molarMass: 38.0,
    stateAtRoomTemp: 'gas',
    meltingPoint: -219.6,
    boilingPoint: -188.1,
    color: '#FEF9C3',
    secondaryColor: '#EAB308',
    isToxic: true,
    toxicWarning: '極めて反応性の高い猛毒気体。皮膚・粘膜・呼吸器を激しく侵します。',
    toxicWarningEn: 'An extremely reactive and highly toxic gas. It severely attacks skin, mucous membranes, and the lungs.',
    descriptionJa: '淡黄色の猛毒気体。あらゆる元素の中で最も反応性が高く、ガラスや水とも反応する。',
    descriptionEn: 'A pale yellow, highly toxic gas. It is the most reactive of all elements and even reacts with glass and water.',
    mextFactJa: '【学習ポイント】ハロゲンの酸化力は F₂ > Cl₂ > Br₂ > I₂。フッ素は最も強い酸化剤で、アルカリ金属とは爆発的に反応する。',
    mextFactEn: '[Key Point] The oxidizing power of the halogens is F₂ > Cl₂ > Br₂ > I₂. Fluorine is the strongest oxidizer and reacts explosively with alkali metals.',
    renderRadius: 11,
    kidHintJa: '⚡ ハロゲン最強の暴れんぼう！ほとんど何とでもはげしく反応する、うす黄色の毒ガスだよ。',
    kidHintEn: '⚡ The wildest halogen! Pale yellow toxic gas that reacts violently with almost anything.',
    recipe: {
      materials: [{ type: 'element', id: 'F', count: 2 }],
      methodJa: '✨ フッ素(F)同士を接触させよう！',
      methodEn: '✨ Bring Fluorine (F) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: 'フッ素(F)を近づけてみよう（フラスコに蓋をすると安全！）',
      toastGuideEn: 'Bring Fluorine atoms together (Cap the flask!)'
    }
  },
  Br2: {
    id: 'Br2',
    formula: 'Br₂',
    nameJa: '臭素',
    nameEn: 'Bromine',
    elements: { Br: 2 },
    molarMass: 159.81,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -7.2,
    boilingPoint: 58.8,
    color: '#B91C1C',
    secondaryColor: '#7F1D1D',
    isToxic: true,
    toxicWarning: '赤褐色の有毒液体。揮発した蒸気は刺激臭が強く呼吸器を侵します。',
    toxicWarningEn: 'A toxic reddish-brown liquid. Its vapor has a strong, sharp smell and harms the lungs and airways.',
    descriptionJa: '常温で液体の唯一の非金属元素の単体。赤褐色で揮発しやすく、刺激臭のある有毒な蒸気を出す。',
    descriptionEn: 'The only nonmetal element that is liquid at room temperature. Reddish brown and volatile, it gives off a toxic vapor with a sharp smell.',
    mextFactJa: '【学習ポイント】常温で液体のハロゲン（赤褐色）。酸化力は Cl₂ より弱く I₂ より強い。アルカリ金属とは発火しながら反応する。',
    mextFactEn: '[Key Point] The halogen that is liquid at room temperature (reddish brown). Its oxidizing power is weaker than Cl₂ and stronger than I₂. It reacts with alkali metals, catching fire.',
    renderRadius: 13,
    kidHintJa: '🧪 常温で液体になっているめずらしいハロゲン！赤茶色でツンとしたにおいの毒があるよ。',
    kidHintEn: '🧪 A rare halogen that is liquid at room temperature! Reddish-brown with a sharp toxic smell.',
    recipe: {
      materials: [{ type: 'element', id: 'Br', count: 2 }],
      methodJa: '✨ 臭素(Br)同士を接触させよう！',
      methodEn: '✨ Bring Bromine (Br) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: '臭素(Br)を近づけてみよう！',
      toastGuideEn: 'Bring Bromine atoms together!'
    }
  },
  I2: {
    id: 'I2',
    formula: 'I₂',
    nameJa: 'ヨウ素',
    nameEn: 'Iodine',
    elements: { I: 2 },
    molarMass: 253.81,
    stateAtRoomTemp: 'solid',
    meltingPoint: 113.7,
    boilingPoint: 184.3,
    color: '#4C1D95',
    secondaryColor: '#1E1B4B',
    descriptionJa: '黒紫色の光沢をもつ固体。加熱すると液体を経ずに紫色の気体になる（昇華）。デンプンと反応して青紫色を示す。',
    descriptionEn: 'A shiny black-purple solid. When heated, it turns directly into a violet gas without becoming liquid (sublimation). It turns blue-violet with starch.',
    mextFactJa: '【学習ポイント】昇華性をもつ黒紫色の固体。ヨウ素デンプン反応（青紫色）で検出される。ハロゲンの中で酸化力は最も弱い。',
    mextFactEn: '[Key Point] A black-purple solid that sublimes. It is detected by the iodine-starch reaction (blue-violet). It is the weakest oxidizer of the halogens.',
    renderRadius: 15,
    kidHintJa: '🍠 うがい薬に入っている黒むらさき色の結晶！でんぷんにつけると青むらさき色に変わるよ。',
    kidHintEn: '🍠 Dark purple crystals found in antiseptic gargle! Turns starch blue-violet.',
    recipe: {
      materials: [{ type: 'element', id: 'I', count: 2 }],
      methodJa: '✨ ヨウ素(I)同士を接触させよう！',
      methodEn: '✨ Bring Iodine (I) atoms together!',
      toolRequired: 'spawn',
      toastGuideJa: 'ヨウ素(I)を近づけてみよう！',
      toastGuideEn: 'Bring Iodine atoms together!'
    }
  },
  LiOH: {
    id: 'LiOH',
    formula: 'LiOH',
    nameJa: '水酸化リチウム',
    nameEn: 'Lithium Hydroxide',
    elements: { Li: 1, O: 1, H: 1 },
    molarMass: 23.95,
    stateAtRoomTemp: 'solid',
    meltingPoint: 462,
    boilingPoint: 924,
    color: '#FFE4E6',
    secondaryColor: '#E11D48',
    isToxic: true,
    toxicWarning: '強アルカリ性で皮膚や粘膜を腐食します。',
    toxicWarningEn: 'Strongly alkaline and corrodes skin and mucous membranes.',
    descriptionJa: 'リチウムと水が穏やかに反応して生じる白色固体の強塩基。宇宙船や潜水艦の二酸化炭素吸収剤、リチウムイオン電池の材料に使われる。',
    descriptionEn: 'A white solid strong base formed when lithium reacts gently with water. Used to absorb carbon dioxide in spacecraft and submarines, and in lithium-ion batteries.',
    mextFactJa: '【学習ポイント】2Li + 2H₂O → 2LiOH + H₂。アルカリ金属の水との反応性は Li < Na < K < Rb < Cs の順に激しくなる。リチウムは発熱しながら穏やかに泡を出す。',
    mextFactEn: '[Key Point] 2Li + 2H₂O → 2LiOH + H₂. The reactions of alkali metals with water get more violent in the order Li < Na < K < Rb < Cs. Lithium gives off bubbles gently while warming up.',
    renderRadius: 14,
    kidHintJa: '🚀 宇宙船の中で人がはいた二酸化炭素をすいとってくれるアルカリ！電池の材料にもなるよ。',
    kidHintEn: '🚀 Scrubs exhaled CO₂ inside spacecraft! Also a key battery material.',
    recipe: {
      materials: [{ type: 'element', id: 'Li', count: 2 }, { type: 'compound', id: 'H2O', count: 2 }],
      methodJa: '💧 リチウム(Li)を水(H2O)に入れよう！',
      methodEn: '💧 Drop Lithium (Li) into Water (H2O)!',
      toolRequired: 'spawn',
      toastGuideJa: 'リチウムを水に触れさせてみよう！',
      toastGuideEn: 'Drop Lithium into Water!'
    }
  },
  RbOH: {
    id: 'RbOH',
    formula: 'RbOH',
    nameJa: '水酸化ルビジウム',
    nameEn: 'Rubidium Hydroxide',
    elements: { Rb: 1, O: 1, H: 1 },
    molarMass: 102.48,
    stateAtRoomTemp: 'solid',
    meltingPoint: 301,
    boilingPoint: 1390,
    color: '#FCE7F3',
    secondaryColor: '#BE185D',
    isToxic: true,
    toxicWarning: '強アルカリ性で皮膚や粘膜を激しく腐食します。',
    toxicWarningEn: 'Strongly alkaline and severely corrodes skin and mucous membranes.',
    descriptionJa: 'ルビジウムと水が爆発的に反応して生じる強塩基。',
    descriptionEn: 'A strong base formed when rubidium reacts explosively with water.',
    mextFactJa: '【学習ポイント】ルビジウムはカリウムよりもさらに反応性が高く、水に触れると爆発的に反応して水素を発生する。',
    mextFactEn: '[Key Point] Rubidium is even more reactive than potassium: on contact with water it reacts explosively and gives off hydrogen.',
    renderRadius: 16,
    kidHintJa: '💥 ルビジウムが水と大爆発してできる強いアルカリ！',
    kidHintEn: '💥 Strong alkali formed when rubidium explodes in water!',
    recipe: {
      materials: [{ type: 'element', id: 'Rb', count: 2 }, { type: 'compound', id: 'H2O', count: 2 }],
      methodJa: '💧 ルビジウム(Rb)を水(H2O)に入れよう！（蓋をしたフラスコは破裂注意）',
      methodEn: '💧 Drop Rubidium (Rb) into Water (H2O)! (Capped flasks may burst)',
      toolRequired: 'spawn',
      toastGuideJa: 'ルビジウムを水に触れさせてみよう！',
      toastGuideEn: 'Drop Rubidium into Water!'
    }
  },
  CsOH: {
    id: 'CsOH',
    formula: 'CsOH',
    nameJa: '水酸化セシウム',
    nameEn: 'Cesium Hydroxide',
    elements: { Cs: 1, O: 1, H: 1 },
    molarMass: 149.91,
    stateAtRoomTemp: 'solid',
    meltingPoint: 272,
    boilingPoint: 990,
    color: '#E0F2FE',
    secondaryColor: '#0284C7',
    isToxic: true,
    toxicWarning: '強アルカリ性で皮膚や粘膜を激しく腐食します。',
    toxicWarningEn: 'Strongly alkaline and severely corrodes skin and mucous membranes.',
    descriptionJa: 'セシウムと水が最も激しく爆発的に反応して生じる、最強クラスの強塩基。',
    descriptionEn: 'One of the strongest bases, formed when caesium reacts with water most violently of all, explosively.',
    mextFactJa: '【学習ポイント】アルカリ金属の中で最も陽性が強いセシウムは、水と触れた瞬間に爆発的に反応する（Li < Na < K < Rb < Cs）。',
    mextFactEn: '[Key Point] Caesium, the most electropositive alkali metal, reacts explosively the moment it touches water (Li < Na < K < Rb < Cs).',
    renderRadius: 17,
    kidHintJa: '💥 アルカリ金属で一番はげしいセシウムが水と大爆発してできるよ！',
    kidHintEn: '💥 Forms when cesium, the most violent alkali metal, explodes in water!',
    recipe: {
      materials: [{ type: 'element', id: 'Cs', count: 2 }, { type: 'compound', id: 'H2O', count: 2 }],
      methodJa: '💧 セシウム(Cs)を水(H2O)に入れよう！（蓋をしたフラスコは破裂注意）',
      methodEn: '💧 Drop Cesium (Cs) into Water (H2O)! (Capped flasks may burst)',
      toolRequired: 'spawn',
      toastGuideJa: 'セシウムを水に触れさせてみよう！',
      toastGuideEn: 'Drop Cesium into Water!'
    }
  },
  NaF: {
    id: 'NaF',
    formula: 'NaF',
    nameJa: 'フッ化ナトリウム',
    nameEn: 'Sodium Fluoride',
    elements: { Na: 1, F: 1 },
    molarMass: 41.99,
    stateAtRoomTemp: 'solid',
    meltingPoint: 993,
    boilingPoint: 1704,
    color: '#FEFCE8',
    secondaryColor: '#CA8A04',
    descriptionJa: 'ナトリウムとフッ素が爆発的に化合して生じる白色結晶。歯みがき粉に配合され、むし歯予防に使われる。',
    descriptionEn: 'White crystals formed when sodium and fluorine combine explosively. Added to toothpaste to prevent cavities.',
    mextFactJa: '【学習ポイント】アルカリ金属とハロゲンはイオン結合の塩をつくる。Na⁺ と F⁻ からなり、ナトリウムを含むので黄色の炎色反応を示す。',
    mextFactEn: '[Key Point] Alkali metals and halogens form ionic salts. It is made of Na⁺ and F⁻, and because it contains sodium, it shows a yellow flame test color.',
    renderRadius: 14,
    kidHintJa: '🦷 歯みがき粉に入っていて、むし歯から歯を守ってくれるフッ素の塩だよ！',
    kidHintEn: '🦷 The fluoride in toothpaste that protects teeth from cavities!',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 1 }, { type: 'element', id: 'F', count: 1 }],
      methodJa: '💥 ナトリウム(Na)とフッ素(F)を近づけよう！',
      methodEn: '💥 Combine Sodium (Na) and Fluorine (F)!',
      toolRequired: 'spawn',
      toastGuideJa: 'ナトリウムとフッ素を近づけてみよう（爆発注意！）',
      toastGuideEn: 'Bring Sodium and Fluorine together (Explosive!)'
    }
  },
  NaBr: {
    id: 'NaBr',
    formula: 'NaBr',
    nameJa: '臭化ナトリウム',
    nameEn: 'Sodium Bromide',
    elements: { Na: 1, Br: 1 },
    molarMass: 102.89,
    stateAtRoomTemp: 'solid',
    meltingPoint: 747,
    boilingPoint: 1390,
    color: '#FEF3C7',
    secondaryColor: '#D97706',
    descriptionJa: 'ナトリウムと臭素が発火しながら化合して生じる白色結晶。写真の感光材料の原料や鎮静剤に使われた。',
    descriptionEn: 'White crystals formed when sodium and bromine combine, catching fire. Once used in photographic materials and as a sedative.',
    mextFactJa: '【学習ポイント】Na⁺ と Br⁻ からなるイオン結晶。ナトリウムを含むので黄色の炎色反応を示す。',
    mextFactEn: '[Key Point] An ionic crystal of Na⁺ and Br⁻. Because it contains sodium, it shows a yellow flame test color.',
    renderRadius: 15,
    kidHintJa: '📷 むかしの写真フィルムづくりに使われた塩！ナトリウムと臭素からできるよ。',
    kidHintEn: '📷 A salt once used to make photographic film! Made of sodium and bromine.',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 1 }, { type: 'element', id: 'Br', count: 1 }],
      methodJa: '🔥 ナトリウム(Na)と臭素(Br)を近づけよう！',
      methodEn: '🔥 Combine Sodium (Na) and Bromine (Br)!',
      toolRequired: 'spawn',
      toastGuideJa: 'ナトリウムと臭素を近づけてみよう！',
      toastGuideEn: 'Bring Sodium and Bromine together!'
    }
  },
  NaI: {
    id: 'NaI',
    formula: 'NaI',
    nameJa: 'ヨウ化ナトリウム',
    nameEn: 'Sodium Iodide',
    elements: { Na: 1, I: 1 },
    molarMass: 149.89,
    stateAtRoomTemp: 'solid',
    meltingPoint: 661,
    boilingPoint: 1304,
    color: '#FEF9C3',
    secondaryColor: '#A16207',
    descriptionJa: 'ナトリウムとヨウ素が発熱しながら化合して生じる白色結晶。放射線の検出器（シンチレーター）やヨウ素の補給に使われる。',
    descriptionEn: 'White crystals formed when sodium and iodine combine, giving off heat. Used in radiation detectors (scintillators) and as an iodine supplement.',
    mextFactJa: '【学習ポイント】Na⁺ と I⁻ からなるイオン結晶。ヨウ素は酸化力が弱いため、ナトリウムとの反応はハロゲンの中で最も穏やか。',
    mextFactEn: '[Key Point] An ionic crystal of Na⁺ and I⁻. Iodine is a weak oxidizer, so its reaction with sodium is the gentlest of the halogens.',
    renderRadius: 16,
    kidHintJa: '☢️ 放射線を光に変えて見つける検出器に使われる塩だよ！',
    kidHintEn: '☢️ Used in detectors that turn radiation into flashes of light!',
    recipe: {
      materials: [{ type: 'element', id: 'Na', count: 1 }, { type: 'element', id: 'I', count: 1 }],
      methodJa: '♨️ ナトリウム(Na)とヨウ素(I)を近づけよう！',
      methodEn: '♨️ Combine Sodium (Na) and Iodine (I)!',
      toolRequired: 'spawn',
      toastGuideJa: 'ナトリウムとヨウ素を近づけてみよう！',
      toastGuideEn: 'Bring Sodium and Iodine together!'
    }
  },
  KF: {
    id: 'KF',
    formula: 'KF',
    nameJa: 'フッ化カリウム',
    nameEn: 'Potassium Fluoride',
    elements: { K: 1, F: 1 },
    molarMass: 58.1,
    stateAtRoomTemp: 'solid',
    meltingPoint: 858,
    boilingPoint: 1502,
    color: '#F5F3FF',
    secondaryColor: '#8B5CF6',
    descriptionJa: 'カリウムとフッ素が爆発的に化合して生じる白色結晶。有機化学でフッ素を導入する試薬に使われる。',
    descriptionEn: 'White crystals formed when potassium and fluorine combine explosively. Used in organic chemistry to add fluorine to molecules.',
    mextFactJa: '【学習ポイント】K⁺ と F⁻ からなるイオン結晶。カリウムを含むので赤紫色の炎色反応を示す。',
    mextFactEn: '[Key Point] An ionic crystal of K⁺ and F⁻. Because it contains potassium, it shows a lilac (red-violet) flame test color.',
    renderRadius: 15,
    kidHintJa: '💥 カリウムとフッ素が大爆発してできる塩！燃やすと紫色の炎が出るよ。',
    kidHintEn: '💥 Born from an explosive potassium–fluorine reaction! Burns with a lilac flame.',
    recipe: {
      materials: [{ type: 'element', id: 'K', count: 1 }, { type: 'element', id: 'F', count: 1 }],
      methodJa: '💥 カリウム(K)とフッ素(F)を近づけよう！',
      methodEn: '💥 Combine Potassium (K) and Fluorine (F)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カリウムとフッ素を近づけてみよう（爆発注意！）',
      toastGuideEn: 'Bring Potassium and Fluorine together (Explosive!)'
    }
  },
  KBr: {
    id: 'KBr',
    formula: 'KBr',
    nameJa: '臭化カリウム',
    nameEn: 'Potassium Bromide',
    elements: { K: 1, Br: 1 },
    molarMass: 119.0,
    stateAtRoomTemp: 'solid',
    meltingPoint: 734,
    boilingPoint: 1435,
    color: '#EDE9FE',
    secondaryColor: '#7C3AED',
    descriptionJa: 'カリウムと臭素が激しく化合して生じる白色結晶。赤外分光測定の試料板や、かつては鎮静剤に使われた。',
    descriptionEn: 'White crystals formed when potassium and bromine combine vigorously. Used for sample plates in infrared spectroscopy and once as a sedative.',
    mextFactJa: '【学習ポイント】K⁺ と Br⁻ からなるイオン結晶。カリウムはナトリウムより反応性が高く、臭素とも爆発的に反応する。',
    mextFactEn: '[Key Point] An ionic crystal of K⁺ and Br⁻. Potassium is more reactive than sodium and reacts explosively even with bromine.',
    renderRadius: 16,
    kidHintJa: '🔬 光の分析の実験で、試料をはさむ透明な板に使われる塩だよ！',
    kidHintEn: '🔬 Used to make clear sample discs for infrared light analysis!',
    recipe: {
      materials: [{ type: 'element', id: 'K', count: 1 }, { type: 'element', id: 'Br', count: 1 }],
      methodJa: '💥 カリウム(K)と臭素(Br)を近づけよう！',
      methodEn: '💥 Combine Potassium (K) and Bromine (Br)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カリウムと臭素を近づけてみよう！',
      toastGuideEn: 'Bring Potassium and Bromine together!'
    }
  },
  KI: {
    id: 'KI',
    formula: 'KI',
    nameJa: 'ヨウ化カリウム',
    nameEn: 'Potassium Iodide',
    elements: { K: 1, I: 1 },
    molarMass: 166.0,
    stateAtRoomTemp: 'solid',
    meltingPoint: 681,
    boilingPoint: 1330,
    color: '#EDE9FE',
    secondaryColor: '#6D28D9',
    descriptionJa: 'カリウムとヨウ素が化合して生じる白色結晶。ヨウ素を水に溶かす助剤（ヨウ素液）や、甲状腺を放射性ヨウ素から守る薬に使われる。',
    descriptionEn: 'White crystals formed when potassium and iodine combine. Used to help iodine dissolve in water (iodine solution) and as a medicine that protects the thyroid from radioactive iodine.',
    mextFactJa: '【学習ポイント】K⁺ と I⁻ からなるイオン結晶。ヨウ素デンプン反応に使うヨウ素液は、ヨウ素をヨウ化カリウム水溶液に溶かして作る。',
    mextFactEn: '[Key Point] An ionic crystal of K⁺ and I⁻. The iodine solution for the iodine-starch reaction is made by dissolving iodine in potassium iodide solution.',
    renderRadius: 16,
    kidHintJa: '💊 ヨウ素液をつくるときや、放射線から体を守る薬に使われる塩だよ！',
    kidHintEn: '💊 Used to make iodine solution and as a radiation-protection medicine!',
    recipe: {
      materials: [{ type: 'element', id: 'K', count: 1 }, { type: 'element', id: 'I', count: 1 }],
      methodJa: '🔥 カリウム(K)とヨウ素(I)を近づけよう！',
      methodEn: '🔥 Combine Potassium (K) and Iodine (I)!',
      toolRequired: 'spawn',
      toastGuideJa: 'カリウムとヨウ素を近づけてみよう！',
      toastGuideEn: 'Bring Potassium and Iodine together!'
    }
  },
  HF: {
    id: 'HF',
    formula: 'HF',
    nameJa: 'フッ化水素',
    nameEn: 'Hydrogen Fluoride',
    elements: { H: 1, F: 1 },
    molarMass: 20.01,
    stateAtRoomTemp: 'gas',
    meltingPoint: -83.6,
    boilingPoint: 19.5,
    color: '#FEF9C3',
    secondaryColor: '#CA8A04',
    isToxic: true,
    toxicWarning: '猛毒で皮膚から浸透し骨を侵します。ガラスも溶かします。',
    toxicWarningEn: 'Highly toxic: it soaks through the skin and attacks the bones. It also dissolves glass.',
    descriptionJa: '水素とフッ素が暗所でも爆発的に化合して生じる気体。水溶液（フッ化水素酸）はガラスを溶かすため、ガラスの目盛りやすりガラスの加工に使われる。',
    descriptionEn: 'A gas formed when hydrogen and fluorine combine explosively, even in the dark. Its solution (hydrofluoric acid) dissolves glass, so it is used to etch scales and frosted glass.',
    mextFactJa: '【学習ポイント】ハロゲン化水素のうち HF だけは分子間に水素結合をもつため沸点が高く、水溶液は弱酸。ガラス（SiO₂）を溶かすのでポリエチレン容器に保存する。',
    mextFactEn: '[Key Point] Among the hydrogen halides, only HF has hydrogen bonds between molecules, so its boiling point is high and its solution is a weak acid. It dissolves glass (SiO₂), so it is stored in polyethylene containers.',
    renderRadius: 11,
    kidHintJa: '🪟 ガラスを溶かしてしまうふしぎな酸！ガラスに模様をほるのに使われるよ。',
    kidHintEn: '🪟 A strange acid that dissolves glass! Used to etch patterns into glassware.',
    recipe: {
      materials: [{ type: 'compound', id: 'H2', count: 1 }, { type: 'compound', id: 'F2', count: 1 }],
      methodJa: '💥 水素(H2)とフッ素(F2)を近づけよう！（暗いところでも爆発）',
      methodEn: '💥 Bring Hydrogen (H2) and Fluorine (F2) together! (Explodes even in the dark)',
      toolRequired: 'spawn',
      toastGuideJa: '水素とフッ素を近づけてみよう（爆発注意！）',
      toastGuideEn: 'Bring Hydrogen and Fluorine together (Explosive!)'
    }
  },
  HBr: {
    id: 'HBr',
    formula: 'HBr',
    nameJa: '臭化水素',
    nameEn: 'Hydrogen Bromide',
    elements: { H: 1, Br: 1 },
    molarMass: 80.91,
    stateAtRoomTemp: 'gas',
    meltingPoint: -86.9,
    boilingPoint: -66.8,
    color: '#FEE2E2',
    secondaryColor: '#B91C1C',
    isToxic: true,
    toxicWarning: '刺激臭の強い有毒気体。呼吸器や目を侵します。',
    toxicWarningEn: 'A toxic gas with a strong, sharp smell. It harms the lungs, airways, and eyes.',
    descriptionJa: '水素と臭素を加熱すると生じる無色・刺激臭の気体。水溶液（臭化水素酸）は塩酸より強い酸。',
    descriptionEn: 'A colorless gas with a sharp smell formed when hydrogen and bromine are heated. Its solution (hydrobromic acid) is a stronger acid than hydrochloric acid.',
    mextFactJa: '【学習ポイント】ハロゲン化水素の酸の強さは HF ≪ HCl < HBr < HI。水素との反応性は F₂ > Cl₂ > Br₂ > I₂ で、臭素は加熱が必要。',
    mextFactEn: '[Key Point] The acid strength of the hydrogen halides is HF ≪ HCl < HBr < HI. Their reactivity with hydrogen is F₂ > Cl₂ > Br₂ > I₂, and bromine needs heating.',
    renderRadius: 12,
    kidHintJa: '🔥 水素と臭素を熱すると燃えるようにできる、ツンとしたにおいの気体だよ！',
    kidHintEn: '🔥 Forms when hydrogen burns in hot bromine vapor! Sharp-smelling gas.',
    recipe: {
      materials: [{ type: 'compound', id: 'H2', count: 1 }, { type: 'compound', id: 'Br2', count: 1 }],
      methodJa: '🔥 水素(H2)と臭素(Br2)をバーナーで加熱しよう！',
      methodEn: '🔥 Heat Hydrogen (H2) and Bromine (Br2) with the burner!',
      toolRequired: 'heat',
      toastGuideJa: '水素と臭素をバーナーで加熱してみよう！',
      toastGuideEn: 'Heat Hydrogen and Bromine with the burner!'
    }
  },
  HI: {
    id: 'HI',
    formula: 'HI',
    nameJa: 'ヨウ化水素',
    nameEn: 'Hydrogen Iodide',
    elements: { H: 1, I: 1 },
    molarMass: 127.91,
    stateAtRoomTemp: 'gas',
    meltingPoint: -50.8,
    boilingPoint: -35.4,
    color: '#EDE9FE',
    secondaryColor: '#6D28D9',
    isToxic: true,
    toxicWarning: '刺激臭のある有毒気体。呼吸器や目を侵します。',
    toxicWarningEn: 'A toxic gas with a sharp smell. It harms the lungs, airways, and eyes.',
    descriptionJa: '水素とヨウ素を高温に加熱すると一部だけ生じる気体。逆向きの分解も起こるため、化学平衡の代表例として扱われる。',
    descriptionEn: 'A gas that forms only partly when hydrogen and iodine are heated to high temperature. Because it also breaks down in reverse, it is the classic example of chemical equilibrium.',
    mextFactJa: '【学習ポイント】H₂ + I₂ ⇄ 2HI は高校化学「化学平衡」の代表例。ヨウ素は水素との反応性が最も弱く、高温でもすべては反応しない。',
    mextFactEn: '[Key Point] H₂ + I₂ ⇄ 2HI is the classic example of chemical equilibrium in high-school chemistry. Iodine is the least reactive halogen with hydrogen, and even at high temperature not all of it reacts.',
    renderRadius: 13,
    kidHintJa: '⚖️ 行ったり来たりする反応（化学平衡）のお手本になる気体だよ！',
    kidHintEn: '⚖️ The textbook example of a reaction that goes both ways (chemical equilibrium)!',
    recipe: {
      materials: [{ type: 'compound', id: 'H2', count: 1 }, { type: 'compound', id: 'I2', count: 1 }],
      methodJa: '🔥 水素(H2)とヨウ素(I2)を強く加熱しよう！',
      methodEn: '🔥 Strongly heat Hydrogen (H2) and Iodine (I2)!',
      toolRequired: 'heat',
      toastGuideJa: '水素とヨウ素を強く加熱してみよう！',
      toastGuideEn: 'Strongly heat Hydrogen and Iodine!'
    }
  },
  AlCl3: {
    id: 'AlCl3',
    formula: 'AlCl₃',
    nameJa: '塩化アルミニウム',
    nameEn: 'Aluminium Chloride',
    elements: { Al: 1, Cl: 3 },
    molarMass: 133.34,
    stateAtRoomTemp: 'solid',
    meltingPoint: 192.4,
    boilingPoint: 180,
    color: '#F1F5F9',
    secondaryColor: '#64748B',
    descriptionJa: 'アルミニウムを塩酸に溶かすと、水素を発生しながら生じる白色の塩。',
    descriptionEn: 'A white salt formed, along with hydrogen gas, when aluminium dissolves in hydrochloric acid.',
    mextFactJa: '【学習ポイント】アルミニウムは酸にも強塩基にも溶けて水素を発生する「両性金属」（Al・Zn・Sn・Pb）。2Al + 6HCl → 2AlCl₃ + 3H₂。',
    mextFactEn: '[Key Point] Aluminium is an amphoteric metal (Al, Zn, Sn, Pb) that dissolves in both acids and strong bases, giving off hydrogen. 2Al + 6HCl → 2AlCl₃ + 3H₂.',
    renderRadius: 15,
    kidHintJa: '🫧 アルミニウムが塩酸にとけて、あわを出しながらできる塩だよ！',
    kidHintEn: '🫧 Forms when aluminium fizzes away in hydrochloric acid!',
    recipe: {
      materials: [{ type: 'element', id: 'Al', count: 2 }, { type: 'compound', id: 'HCl', count: 6 }],
      methodJa: '🫧 アルミニウム(Al)に塩酸(HCl)をかけよう！',
      methodEn: '🫧 Pour Hydrochloric Acid (HCl) onto Aluminium (Al)!',
      toolRequired: 'spawn',
      toastGuideJa: 'アルミニウムと塩酸を反応させてみよう！',
      toastGuideEn: 'React Aluminium with Hydrochloric Acid!'
    }
  },
  NaAlOH4: {
    id: 'NaAlOH4',
    formula: 'Na[Al(OH)₄]',
    nameJa: 'テトラヒドロキシドアルミン酸ナトリウム',
    nameEn: 'Sodium Tetrahydroxidoaluminate',
    elements: { Na: 1, Al: 1, O: 4, H: 4 },
    molarMass: 118.0,
    stateAtRoomTemp: 'solid',
    meltingPoint: 650,
    boilingPoint: 1000,
    color: '#F8FAFC',
    secondaryColor: '#94A3B8',
    isToxic: true,
    toxicWarning: '強アルカリ性で皮膚や粘膜を腐食します。',
    toxicWarningEn: 'Strongly alkaline and corrodes skin and mucous membranes.',
    descriptionJa: 'アルミニウムが水酸化ナトリウム水溶液に溶けて生じる錯塩。アルミニウムが強塩基にも溶ける両性金属であることを示す。',
    descriptionEn: 'A complex salt formed when aluminium dissolves in sodium hydroxide solution. It shows that aluminium is an amphoteric metal that also dissolves in strong bases.',
    mextFactJa: '【学習ポイント】2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂。両性金属は塩基の水溶液にも水素を出して溶ける。',
    mextFactEn: '[Key Point] 2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂. Amphoteric metals also dissolve in basic solutions, giving off hydrogen.',
    renderRadius: 16,
    kidHintJa: '🧪 アルミニウムは酸だけでなくアルカリにもとける！そのときにできる物質だよ。',
    kidHintEn: '🧪 Aluminium dissolves in alkali too! This is what forms when it does.',
    recipe: {
      materials: [{ type: 'element', id: 'Al', count: 2 }, { type: 'compound', id: 'NaOH', count: 2 }, { type: 'compound', id: 'H2O', count: 6 }],
      methodJa: '🫧 アルミニウム(Al)を水酸化ナトリウム(NaOH)と水(H2O)に入れよう！',
      methodEn: '🫧 Drop Aluminium (Al) into Sodium Hydroxide (NaOH) and Water (H2O)!',
      toolRequired: 'spawn',
      toastGuideJa: 'アルミニウムを水酸化ナトリウム水溶液に入れてみよう！',
      toastGuideEn: 'Drop Aluminium into Sodium Hydroxide solution!'
    }
  },
  CaC2: {
    id: 'CaC2',
    formula: 'CaC₂',
    nameJa: '炭化カルシウム (カーバイド)',
    nameEn: 'Calcium Carbide',
    elements: { Ca: 1, C: 2 },
    molarMass: 64.1,
    stateAtRoomTemp: 'solid',
    meltingPoint: 2160,
    boilingPoint: 2300,
    color: '#6B7280',
    secondaryColor: '#374151',
    descriptionJa: '生石灰とコークス（炭素）を電気炉で強く加熱して作る灰色の固体。水と激しく反応してアセチレンを発生する。',
    descriptionEn: 'A gray solid made by strongly heating quicklime and coke (carbon) in an electric furnace. It reacts vigorously with water and gives off acetylene.',
    mextFactJa: '【学習ポイント】CaC₂ + 2H₂O → C₂H₂ + Ca(OH)₂。アセチレンの実験室での製法として高校化学で扱う。',
    mextFactEn: '[Key Point] CaC₂ + 2H₂O → C₂H₂ + Ca(OH)₂. High-school chemistry covers it as the lab method for making acetylene.',
    renderRadius: 15,
    kidHintJa: '🔦 水をかけると燃えるガスを出す石！むかしはカーバイドランプの燃料だったよ。',
    kidHintEn: '🔦 A rock that releases a flammable gas when wet! Once fueled carbide lamps.',
    recipe: {
      materials: [{ type: 'compound', id: 'CaO', count: 1 }, { type: 'element', id: 'C', count: 3 }],
      methodJa: '🔥 生石灰(CaO)と炭素(C)を超高温（1500℃以上）に加熱しよう！',
      methodEn: '🔥 Heat Quicklime (CaO) and Carbon (C) above 1500°C!',
      toolRequired: 'heat',
      toastGuideJa: '生石灰と炭素をバーナーで長く加熱してみよう！',
      toastGuideEn: 'Heat Quicklime and Carbon for a long time!'
    }
  },
  C2H2: {
    id: 'C2H2',
    formula: 'C₂H₂',
    nameJa: 'アセチレン',
    nameEn: 'Acetylene',
    elements: { C: 2, H: 2 },
    molarMass: 26.04,
    stateAtRoomTemp: 'gas',
    meltingPoint: -80.8,
    boilingPoint: -84,
    color: '#F8FAFC',
    secondaryColor: '#FBBF24',
    descriptionJa: '炭化カルシウムに水を加えると発生する、三重結合をもつ可燃性の気体。酸素とともに燃やすと 3000℃ 以上の高温の炎になり、金属の溶接・切断に使われる。',
    descriptionEn: 'A flammable gas with a triple bond, given off when water is added to calcium carbide. Burned with oxygen, it makes a flame hotter than 3000°C, used to weld and cut metal.',
    mextFactJa: '【学習ポイント】C≡C 三重結合をもつアルキン。空気中ではすすを出して明るく燃え、酸素との混合気体は爆発的に燃焼する（酸素アセチレン炎）。',
    mextFactEn: '[Key Point] An alkyne with a C≡C triple bond. In air it burns brightly with soot, and its mixture with oxygen burns explosively (the oxyacetylene flame).',
    renderRadius: 12,
    kidHintJa: '🔧 鉄も切れるほどの熱い炎を出すガス！工場の溶接に使われているよ。',
    kidHintEn: '🔧 A gas whose flame is hot enough to cut steel! Used for welding.',
    recipe: {
      materials: [{ type: 'compound', id: 'CaC2', count: 1 }, { type: 'compound', id: 'H2O', count: 2 }],
      methodJa: '💧 炭化カルシウム(CaC2)に水(H2O)をかけよう！',
      methodEn: '💧 Pour Water (H2O) onto Calcium Carbide (CaC2)!',
      toolRequired: 'spawn',
      toastGuideJa: '炭化カルシウムに水をかけてみよう！',
      toastGuideEn: 'Pour Water onto Calcium Carbide!'
    }
  },
  NO: {
    id: 'NO',
    formula: 'NO',
    nameJa: '一酸化窒素',
    nameEn: 'Nitric Oxide',
    elements: { N: 1, O: 1 },
    molarMass: 30.01,
    stateAtRoomTemp: 'gas',
    meltingPoint: -163.6,
    boilingPoint: -151.8,
    color: '#F1F5F9',
    secondaryColor: '#94A3B8',
    isToxic: true,
    toxicWarning: '吸い込むと有害な気体。空気中で有毒な二酸化窒素に変わります。',
    toxicWarningEn: 'A gas that is harmful to breathe in. In air it turns into toxic nitrogen dioxide.',
    descriptionJa: '無色の気体。空気中の酸素とすぐに反応して赤褐色の二酸化窒素になる。雷の放電や自動車エンジンの高温で窒素と酸素から生じる。',
    descriptionEn: 'A colorless gas that quickly reacts with oxygen in the air to form reddish-brown nitrogen dioxide. It forms from nitrogen and oxygen in lightning and in hot car engines.',
    mextFactJa: '【学習ポイント】N₂ + O₂ → 2NO（高温・放電）、2NO + O₂ → 2NO₂（常温ですぐ進む）。銅と希硝酸の反応や、二酸化窒素と水の反応でも生じる。',
    mextFactEn: '[Key Point] N₂ + O₂ → 2NO (high temperature or electric discharge), 2NO + O₂ → 2NO₂ (happens quickly at room temperature). It also forms when copper reacts with dilute nitric acid, and when nitrogen dioxide reacts with water.',
    renderRadius: 11,
    kidHintJa: '⚡ 雷の高温で空気からできる透明なガス！空気にふれると茶色の二酸化窒素に変わるよ。',
    kidHintEn: '⚡ Made from air by the heat of lightning! Turns brown NO₂ as soon as it meets air.',
    recipe: {
      materials: [{ type: 'compound', id: 'N2', count: 1 }, { type: 'compound', id: 'O2', count: 1 }],
      methodJa: '🔥 窒素(N2)と酸素(O2)を超高温（1500℃以上）に加熱しよう！',
      methodEn: '🔥 Heat Nitrogen (N2) and Oxygen (O2) above 1500°C!',
      toolRequired: 'heat',
      toastGuideJa: '窒素と酸素を長く強く加熱してみよう！',
      toastGuideEn: 'Heat Nitrogen and Oxygen strongly for a long time!'
    }
  },
  CuNO32: {
    id: 'CuNO32',
    formula: 'Cu(NO₃)₂',
    nameJa: '硝酸銅(II)',
    nameEn: 'Copper(II) Nitrate',
    elements: { Cu: 1, N: 2, O: 6 },
    molarMass: 187.56,
    stateAtRoomTemp: 'solid',
    meltingPoint: 114,
    boilingPoint: 170,
    color: '#3B82F6',
    secondaryColor: '#1D4ED8',
    descriptionJa: '銅を硝酸に溶かすと生じる青色の塩。水溶液は銅(II)イオンの青色を示す。',
    descriptionEn: 'A blue salt formed when copper dissolves in nitric acid. Its solution shows the blue color of copper(II) ions.',
    mextFactJa: '【学習ポイント】銅は塩酸や希硫酸には溶けないが、酸化力の強い硝酸には溶ける。Cu + 4HNO₃(濃) → Cu(NO₃)₂ + 2NO₂ + 2H₂O。',
    mextFactEn: '[Key Point] Copper does not dissolve in hydrochloric acid or dilute sulfuric acid, but it does dissolve in nitric acid, a strong oxidizer. Cu + 4HNO₃ (conc.) → Cu(NO₃)₂ + 2NO₂ + 2H₂O.',
    renderRadius: 15,
    kidHintJa: '💙 銅が硝酸にとけてできる、きれいな青色の物質だよ！',
    kidHintEn: '💙 The beautiful blue salt formed when copper dissolves in nitric acid!',
    recipe: {
      materials: [{ type: 'element', id: 'Cu', count: 1 }, { type: 'compound', id: 'HNO3', count: 4 }],
      methodJa: '🧪 銅(Cu)に硝酸(HNO3)をかけよう！',
      methodEn: '🧪 Pour Nitric Acid (HNO3) onto Copper (Cu)!',
      toolRequired: 'spawn',
      toastGuideJa: '銅と硝酸を反応させてみよう！',
      toastGuideEn: 'React Copper with Nitric Acid!'
    }
  },
  BTB: {
    id: 'BTB',
    formula: 'BTB',
    nameJa: 'BTB液 (ブロモチモールブルー)',
    nameEn: 'BTB Solution (Bromothymol Blue)',
    elements: { C: 27, H: 28, Br: 2, O: 5, S: 1 },
    molarMass: 624.38,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -5,
    boilingPoint: 100,
    color: '#22C55E',
    secondaryColor: '#15803D',
    descriptionJa: '水溶液の性質を色で教えてくれる指示薬。酸性で黄色、中性で緑色、アルカリ性で青色になる。',
    descriptionEn: 'An indicator that shows the nature of a solution by color: yellow in acid, green when neutral, blue in alkali.',
    mextFactJa: '【小6 水溶液の性質】BTB液は酸性で黄、中性で緑、アルカリ性で青。息(二酸化炭素)を吹きこむと黄色に変わる。',
    mextFactEn: '[Key Point] BTB is yellow in acid, green when neutral and blue in alkali. Blowing in breath (CO₂) turns it yellow.',
    renderRadius: 14,
    kidHintJa: '🟡🟢🔵 酸性・中性・アルカリ性で3色に変わる魔法の液！塩酸や水酸化ナトリウムのそばに置いてみよう。',
    kidHintEn: '🟡🟢🔵 A magic liquid with three colors for acid, neutral and alkali! Put it next to hydrochloric acid or sodium hydroxide.',
    indicator: {
      stops: [
        { ph: 5.9, color: '#FACC15' },
        { ph: 7, color: '#22C55E' },
        { ph: 8.1, color: '#2563EB' }
      ]
    }
  },
  Phenolphthalein: {
    id: 'Phenolphthalein',
    formula: 'PP',
    nameJa: 'フェノールフタレイン液',
    nameEn: 'Phenolphthalein Solution',
    elements: { C: 20, H: 14, O: 4 },
    molarMass: 318.32,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -5,
    boilingPoint: 100,
    color: '#F1F5F9',
    secondaryColor: '#CBD5E1',
    descriptionJa: 'アルカリ性のときだけ赤むらさき色になる指示薬。酸性や中性では無色のまま。',
    descriptionEn: 'An indicator that turns pinkish-red only in alkali and stays colorless in acid or neutral solutions.',
    mextFactJa: '【中学 理科】フェノールフタレイン液はアルカリ性で赤色になる。中和の実験で、赤色が消えるところで中性になったと分かる。',
    mextFactEn: '[Key Point] Phenolphthalein turns red in alkali. In neutralization, the moment the red disappears tells you the solution became neutral.',
    renderRadius: 14,
    kidHintJa: '🩷 ふだんは透明なのに、アルカリ性に出会うとパッと赤むらさきに変身！',
    kidHintEn: '🩷 Usually clear, but it flashes pinkish-red when it meets an alkali!',
    indicator: {
      stops: [
        { ph: 8, color: '#F1F5F9' },
        { ph: 9.8, color: '#DB2777' }
      ]
    }
  },
  CabbageJuice: {
    id: 'CabbageJuice',
    formula: 'Cab',
    nameJa: 'ムラサキキャベツ液',
    nameEn: 'Red Cabbage Juice',
    elements: { C: 15, H: 11, O: 6 },
    molarMass: 287.24,
    stateAtRoomTemp: 'liquid',
    meltingPoint: -2,
    boilingPoint: 100,
    color: '#7C3AED',
    secondaryColor: '#5B21B6',
    descriptionJa: 'ムラサキキャベツの色素(アントシアニン)の液。酸性の強さ・アルカリ性の強さで赤・ピンク・むらさき・青・緑・黄と虹のように色が変わる。',
    descriptionEn: 'Juice of red cabbage pigment (anthocyanin). Its color changes like a rainbow—red, pink, purple, blue, green, yellow—depending on how acidic or alkaline it is.',
    mextFactJa: '【小6 水溶液の性質】家庭でも作れる指示薬。強い酸性で赤、弱い酸性でピンク、中性でむらさき、弱いアルカリ性で青〜緑、強いアルカリ性で黄色になる。',
    mextFactEn: '[Key Point] A homemade indicator: red in strong acid, pink in weak acid, purple when neutral, blue–green in weak alkali, yellow in strong alkali.',
    renderRadius: 14,
    kidHintJa: '🌈 台所の野菜から作れる虹色の液！酸やアルカリの「強さ」まで色で分かるよ。',
    kidHintEn: '🌈 A rainbow liquid made from a kitchen vegetable! Its color even shows how strong an acid or alkali is.',
    indicator: {
      stops: [
        { ph: 1, color: '#DC2626' },
        { ph: 4, color: '#F472B6' },
        { ph: 7, color: '#7C3AED' },
        { ph: 9, color: '#2563EB' },
        { ph: 11, color: '#10B981' },
        { ph: 13, color: '#FACC15' }
      ]
    }
  },
  RedLitmus: {
    id: 'RedLitmus',
    formula: '赤リ',
    formulaEn: 'RL',
    nameJa: '赤色リトマス紙',
    nameEn: 'Red Litmus Paper',
    elements: { C: 9, H: 10, N: 1, O: 5 },
    molarMass: 212.18,
    stateAtRoomTemp: 'solid',
    meltingPoint: 9999,
    boilingPoint: 9999,
    color: '#F87171',
    secondaryColor: '#B91C1C',
    descriptionJa: 'アルカリ性の液にふれると青色に変わる紙。酸性・中性では赤色のまま。',
    descriptionEn: 'Paper that turns blue when it touches an alkaline solution. It stays red in acid or neutral solutions.',
    mextFactJa: '【小6 水溶液の性質】赤色リトマス紙が青くなればアルカリ性。青色リトマス紙と組み合わせて、酸性・中性・アルカリ性を見分ける。',
    mextFactEn: '[Key Point] If red litmus turns blue, the solution is alkaline. Use it with blue litmus to tell acid, neutral and alkaline apart.',
    renderRadius: 13,
    kidHintJa: '📄 アルカリ性にさわると青くなる赤い紙！アンモニアや石灰水のそばに置いてみよう。',
    kidHintEn: '📄 A red paper that turns blue in alkali! Try placing it near ammonia or limewater.',
    indicator: {
      stops: [
        { ph: 7.9, color: '#F87171' },
        { ph: 8.1, color: '#3B82F6' }
      ]
    }
  },
  BlueLitmus: {
    id: 'BlueLitmus',
    formula: '青リ',
    formulaEn: 'BL',
    nameJa: '青色リトマス紙',
    nameEn: 'Blue Litmus Paper',
    elements: { C: 9, H: 10, N: 1, O: 5 },
    molarMass: 212.18,
    stateAtRoomTemp: 'solid',
    meltingPoint: 9999,
    boilingPoint: 9999,
    color: '#60A5FA',
    secondaryColor: '#1D4ED8',
    descriptionJa: '酸性の液にふれると赤色に変わる紙。中性・アルカリ性では青色のまま。',
    descriptionEn: 'Paper that turns red when it touches an acidic solution. It stays blue in neutral or alkaline solutions.',
    mextFactJa: '【小6 水溶液の性質】青色リトマス紙が赤くなれば酸性。どちらのリトマス紙も変わらなければ中性。',
    mextFactEn: '[Key Point] If blue litmus turns red, the solution is acidic. If neither litmus paper changes, it is neutral.',
    renderRadius: 13,
    kidHintJa: '📄 酸性にさわると赤くなる青い紙！塩酸や炭酸水(CO₂)のそばに置いてみよう。',
    kidHintEn: '📄 A blue paper that turns red in acid! Try placing it near hydrochloric acid or CO₂.',
    indicator: {
      stops: [
        { ph: 5.9, color: '#F87171' },
        { ph: 6.1, color: '#60A5FA' }
      ]
    }
  }
};
