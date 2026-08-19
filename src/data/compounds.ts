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
  descriptionJa: string;
  mextFactJa: string;
  renderRadius: number; // ピクセル半径
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
    mextFactJa: '無色・無臭。可燃性で、空気と1:2で混合して点火すると爆発的に燃えて水ができる。',
    renderRadius: 10
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
    renderRadius: 11
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
    renderRadius: 13
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
    renderRadius: 12
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
    renderRadius: 14
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
    renderRadius: 18
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
    renderRadius: 20
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
    renderRadius: 15
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
    renderRadius: 13
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
    renderRadius: 16
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
    renderRadius: 12
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
    renderRadius: 15
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
    renderRadius: 16
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
    renderRadius: 15
  }
};
