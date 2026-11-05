// 加速器で原子核どうしをぶつけて、核融合で超重元素をつくる実験のデータ
//
// 確率の目安は、理化学研究所のニホニウム合成実験の記録にそろえる:
//   約9年間で亜鉛の原子核を約400兆回ビスマスにぶつけ、ニホニウムの原子は3個だけできた。
//   → 1回の衝突でできる確率は 3 / (4×10^14) ≈ 7.5×10^-15。
// ほかの反応の確率は、反応断面積 (ぶつかったときの「当たりやすさ」) の比で概算する
// (Zn + Bi → Nh を約22フェムトバーンとする)。断面積は文献値のおおよその大きさで、
// 実際の実験ではビームの強さや期間がそれぞれ違うため、ここでは同じ衝突回数のペースにそろえている。

export interface Nuclide {
  symbol: string;
  mass: number; // 質量数
}

export type DecayMode = 'alpha' | 'SF' | 'end';

export interface DecayStep extends Nuclide {
  // この原子核の壊れ方 ('alpha': α崩壊で次の段へ、'SF': 自発核分裂で連鎖が終わる、'end': 表示はここまで)
  mode: DecayMode;
  halfLifeSec?: number; // 半減期 (おおよその値)
}

export interface FusionReaction {
  id: string;
  beam: Nuclide;
  target: Nuclide;
  product: Nuclide;
  neutrons: number; // 複合核から飛び出す中性子の数
  crossSectionFb: number; // 反応断面積 (フェムトバーン、おおよその値)
  labJa: string;
  labEn: string;
  year: number;
  noteJa: string;
  noteEn: string;
  decayChain: DecayStep[]; // 先頭は生成した原子核 (product と同じ)
}

// 9年間の秒数
export const NINE_YEARS_SEC = 9 * 365.25 * 24 * 3600;
// 理研のニホニウム実験: 約400兆回の衝突で3個
export const RIKEN_COLLISIONS = 4e14;
export const RIKEN_ATOMS = 3;
// シミュレーションでの衝突のペース (1秒あたりの衝突回数)。Zn + Bi なら9年で期待値がちょうど3個になる
export const COLLISIONS_PER_SIM_SECOND = RIKEN_COLLISIONS / NINE_YEARS_SEC;

const NIHONIUM_CROSS_SECTION_FB = 22;
const NIHONIUM_PROBABILITY = RIKEN_ATOMS / RIKEN_COLLISIONS;

// 衝突1回あたりに目的の原子ができる確率 (最適なビームエネルギーのとき)
export function reactionProbability(r: FusionReaction): number {
  return NIHONIUM_PROBABILITY * (r.crossSectionFb / NIHONIUM_CROSS_SECTION_FB);
}

// ビームのエネルギー。低いと原子核どうしの電気的な反発 (クーロン障壁) を越えられずくっつかない。
// 高すぎると、くっついた原子核 (複合核) が熱くなりすぎて、ほとんどがすぐに核分裂してしまう
export type BeamEnergy = 'low' | 'optimal' | 'high';
export const BEAM_ENERGIES: BeamEnergy[] = ['low', 'optimal', 'high'];
export const BEAM_ENERGY_FACTOR: Record<BeamEnergy, number> = {
  low: 0,
  optimal: 1,
  high: 0.1
};

// 選べるビーム (加速する原子核) と標的
export const BEAM_NUCLIDES: Nuclide[] = [
  { symbol: 'Ca', mass: 48 },
  { symbol: 'Ti', mass: 50 },
  { symbol: 'Cr', mass: 54 },
  { symbol: 'Fe', mass: 58 },
  { symbol: 'Ni', mass: 62 },
  { symbol: 'Ni', mass: 64 },
  { symbol: 'Zn', mass: 70 }
];

export const TARGET_NUCLIDES: Nuclide[] = [
  { symbol: 'Pb', mass: 208 },
  { symbol: 'Bi', mass: 209 },
  { symbol: 'U', mass: 238 },
  { symbol: 'Pu', mass: 244 },
  { symbol: 'Am', mass: 243 },
  { symbol: 'Cm', mass: 248 },
  { symbol: 'Bk', mass: 249 },
  { symbol: 'Cf', mass: 249 }
];

export function nuclideKey(n: Nuclide): string {
  return `${n.symbol}-${n.mass}`;
}

const MS = 1e-3;
const HOUR = 3600;

// 新元素の発見に使われた主な反応 (半減期はおおよその値)
export const FUSION_REACTIONS: FusionReaction[] = [
  {
    id: 'nihonium',
    beam: { symbol: 'Zn', mass: 70 },
    target: { symbol: 'Bi', mass: 209 },
    product: { symbol: 'Nh', mass: 278 },
    neutrons: 1,
    crossSectionFb: 22,
    labJa: '理化学研究所（日本）',
    labEn: 'RIKEN (Japan)',
    year: 2004,
    noteJa: '2016年に日本にちなんで「ニホニウム」と命名された、アジアで初めて発見・命名された新元素。',
    noteEn: 'Named "nihonium" after Japan in 2016 — the first new element discovered and named in Asia.',
    decayChain: [
      { symbol: 'Nh', mass: 278, mode: 'alpha', halfLifeSec: 1.4 * MS },
      { symbol: 'Rg', mass: 274, mode: 'alpha', halfLifeSec: 9.7 * MS },
      { symbol: 'Mt', mass: 270, mode: 'alpha', halfLifeSec: 0.44 },
      { symbol: 'Bh', mass: 266, mode: 'alpha', halfLifeSec: 2.5 },
      { symbol: 'Db', mass: 262, mode: 'alpha', halfLifeSec: 34 },
      { symbol: 'Lr', mass: 258, mode: 'alpha', halfLifeSec: 3.9 },
      { symbol: 'Md', mass: 254, mode: 'end' }
    ]
  },
  {
    id: 'hassium',
    beam: { symbol: 'Fe', mass: 58 },
    target: { symbol: 'Pb', mass: 208 },
    product: { symbol: 'Hs', mass: 265 },
    neutrons: 1,
    crossSectionFb: 20000,
    labJa: 'GSI重イオン研究所（ドイツ）',
    labEn: 'GSI (Germany)',
    year: 1984,
    noteJa: 'ドイツのヘッセン州（ラテン語でハッシア）にちなんで命名。',
    noteEn: 'Named after the German state of Hesse (Hassia in Latin).',
    decayChain: [
      { symbol: 'Hs', mass: 265, mode: 'alpha', halfLifeSec: 2 * MS },
      { symbol: 'Sg', mass: 261, mode: 'alpha', halfLifeSec: 0.2 },
      { symbol: 'Rf', mass: 257, mode: 'alpha', halfLifeSec: 4.7 },
      { symbol: 'No', mass: 253, mode: 'end' }
    ]
  },
  {
    id: 'darmstadtium',
    beam: { symbol: 'Ni', mass: 62 },
    target: { symbol: 'Pb', mass: 208 },
    product: { symbol: 'Ds', mass: 269 },
    neutrons: 1,
    crossSectionFb: 3500,
    labJa: 'GSI重イオン研究所（ドイツ）',
    labEn: 'GSI (Germany)',
    year: 1994,
    noteJa: '研究所のあるダルムシュタット市にちなんで命名。',
    noteEn: 'Named after the city of Darmstadt, home of the institute.',
    decayChain: [
      { symbol: 'Ds', mass: 269, mode: 'alpha', halfLifeSec: 0.2 * MS },
      { symbol: 'Hs', mass: 265, mode: 'alpha', halfLifeSec: 2 * MS },
      { symbol: 'Sg', mass: 261, mode: 'alpha', halfLifeSec: 0.2 },
      { symbol: 'Rf', mass: 257, mode: 'end' }
    ]
  },
  {
    id: 'roentgenium',
    beam: { symbol: 'Ni', mass: 64 },
    target: { symbol: 'Bi', mass: 209 },
    product: { symbol: 'Rg', mass: 272 },
    neutrons: 1,
    crossSectionFb: 3500,
    labJa: 'GSI重イオン研究所（ドイツ）',
    labEn: 'GSI (Germany)',
    year: 1994,
    noteJa: 'X線を発見したレントゲンにちなんで命名。',
    noteEn: 'Named after Wilhelm Röntgen, who discovered X-rays.',
    decayChain: [
      { symbol: 'Rg', mass: 272, mode: 'alpha', halfLifeSec: 4 * MS },
      { symbol: 'Mt', mass: 268, mode: 'alpha', halfLifeSec: 23 * MS },
      { symbol: 'Bh', mass: 264, mode: 'alpha', halfLifeSec: 0.44 },
      { symbol: 'Db', mass: 260, mode: 'alpha', halfLifeSec: 1.5 },
      { symbol: 'Lr', mass: 256, mode: 'end' }
    ]
  },
  {
    id: 'copernicium',
    beam: { symbol: 'Zn', mass: 70 },
    target: { symbol: 'Pb', mass: 208 },
    product: { symbol: 'Cn', mass: 277 },
    neutrons: 1,
    crossSectionFb: 500,
    labJa: 'GSI重イオン研究所（ドイツ）',
    labEn: 'GSI (Germany)',
    year: 1996,
    noteJa: '地動説のコペルニクスにちなんで命名。ニホニウムと同じ亜鉛ビームで、標的を鉛にした反応。',
    noteEn: 'Named after Copernicus. The same zinc beam as nihonium, but with a lead target.',
    decayChain: [
      { symbol: 'Cn', mass: 277, mode: 'alpha', halfLifeSec: 0.7 * MS },
      { symbol: 'Ds', mass: 273, mode: 'alpha', halfLifeSec: 0.2 * MS },
      { symbol: 'Hs', mass: 269, mode: 'alpha', halfLifeSec: 10 },
      { symbol: 'Sg', mass: 265, mode: 'alpha', halfLifeSec: 9 },
      { symbol: 'Rf', mass: 261, mode: 'end' }
    ]
  },
  {
    id: 'flerovium',
    beam: { symbol: 'Ca', mass: 48 },
    target: { symbol: 'Pu', mass: 244 },
    product: { symbol: 'Fl', mass: 289 },
    neutrons: 3,
    crossSectionFb: 1000,
    labJa: 'ドブナ合同原子核研究所（ロシア）',
    labEn: 'JINR Dubna (Russia)',
    year: 1999,
    noteJa: '研究所の創設者フリョロフにちなんで命名。カルシウム48ビームと、原子炉でつくった重い標的を使う方法（ホットフュージョン）。',
    noteEn: 'Named after Georgy Flyorov, founder of the laboratory. Uses a calcium-48 beam on a heavy reactor-made target ("hot fusion").',
    decayChain: [
      { symbol: 'Fl', mass: 289, mode: 'alpha', halfLifeSec: 2 },
      { symbol: 'Cn', mass: 285, mode: 'alpha', halfLifeSec: 30 },
      { symbol: 'Ds', mass: 281, mode: 'SF', halfLifeSec: 13 }
    ]
  },
  {
    id: 'moscovium',
    beam: { symbol: 'Ca', mass: 48 },
    target: { symbol: 'Am', mass: 243 },
    product: { symbol: 'Mc', mass: 288 },
    neutrons: 3,
    crossSectionFb: 3000,
    labJa: 'ドブナ合同原子核研究所（ロシア）',
    labEn: 'JINR Dubna (Russia)',
    year: 2003,
    noteJa: '研究所のあるモスクワ州にちなんで命名。壊れていく途中で、ニホニウム284もできる。',
    noteEn: 'Named after the Moscow region. Its decay chain passes through nihonium-284.',
    decayChain: [
      { symbol: 'Mc', mass: 288, mode: 'alpha', halfLifeSec: 0.17 },
      { symbol: 'Nh', mass: 284, mode: 'alpha', halfLifeSec: 0.9 },
      { symbol: 'Rg', mass: 280, mode: 'alpha', halfLifeSec: 4.6 },
      { symbol: 'Mt', mass: 276, mode: 'alpha', halfLifeSec: 0.7 },
      { symbol: 'Bh', mass: 272, mode: 'alpha', halfLifeSec: 10 },
      { symbol: 'Db', mass: 268, mode: 'SF', halfLifeSec: 29 * HOUR }
    ]
  },
  {
    id: 'livermorium',
    beam: { symbol: 'Ca', mass: 48 },
    target: { symbol: 'Cm', mass: 248 },
    product: { symbol: 'Lv', mass: 292 },
    neutrons: 4,
    crossSectionFb: 1000,
    labJa: 'ドブナ合同原子核研究所（ロシア）とローレンス・リバモア国立研究所（アメリカ）',
    labEn: 'JINR Dubna (Russia) & Lawrence Livermore (USA)',
    year: 2000,
    noteJa: 'アメリカのローレンス・リバモア国立研究所にちなんで命名。',
    noteEn: 'Named after Lawrence Livermore National Laboratory in the USA.',
    decayChain: [
      { symbol: 'Lv', mass: 292, mode: 'alpha', halfLifeSec: 18 * MS },
      { symbol: 'Fl', mass: 288, mode: 'alpha', halfLifeSec: 0.7 },
      { symbol: 'Cn', mass: 284, mode: 'SF', halfLifeSec: 0.1 }
    ]
  },
  {
    id: 'tennessine',
    beam: { symbol: 'Ca', mass: 48 },
    target: { symbol: 'Bk', mass: 249 },
    product: { symbol: 'Ts', mass: 294 },
    neutrons: 3,
    crossSectionFb: 500,
    labJa: 'ドブナ合同原子核研究所（ロシア）とアメリカの研究所',
    labEn: 'JINR Dubna (Russia) & US laboratories',
    year: 2010,
    noteJa: '標的のバークリウムをつくったオークリッジ国立研究所のあるテネシー州にちなんで命名。',
    noteEn: 'Named after Tennessee, home of Oak Ridge National Laboratory, which made the berkelium target.',
    decayChain: [
      { symbol: 'Ts', mass: 294, mode: 'alpha', halfLifeSec: 51 * MS },
      { symbol: 'Mc', mass: 290, mode: 'alpha', halfLifeSec: 0.65 },
      { symbol: 'Nh', mass: 286, mode: 'alpha', halfLifeSec: 9.5 },
      { symbol: 'Rg', mass: 282, mode: 'alpha', halfLifeSec: 100 },
      { symbol: 'Mt', mass: 278, mode: 'alpha', halfLifeSec: 7.6 },
      { symbol: 'Bh', mass: 274, mode: 'alpha', halfLifeSec: 54 },
      { symbol: 'Db', mass: 270, mode: 'SF', halfLifeSec: 1 * HOUR }
    ]
  },
  {
    id: 'oganesson',
    beam: { symbol: 'Ca', mass: 48 },
    target: { symbol: 'Cf', mass: 249 },
    product: { symbol: 'Og', mass: 294 },
    neutrons: 3,
    crossSectionFb: 500,
    labJa: 'ドブナ合同原子核研究所（ロシア）',
    labEn: 'JINR Dubna (Russia)',
    year: 2002,
    noteJa: '超重元素の研究を率いたオガネシアンにちなんで命名。いま知られている中でいちばん重い元素（118番）。',
    noteEn: 'Named after Yuri Oganessian, a leader of superheavy-element research. The heaviest known element (118).',
    decayChain: [
      { symbol: 'Og', mass: 294, mode: 'alpha', halfLifeSec: 0.7 * MS },
      { symbol: 'Lv', mass: 290, mode: 'alpha', halfLifeSec: 8 * MS },
      { symbol: 'Fl', mass: 286, mode: 'SF', halfLifeSec: 0.1 }
    ]
  }
];

export function findFusionReaction(beam: Nuclide, target: Nuclide): FusionReaction | null {
  return FUSION_REACTIONS.find(r =>
    r.beam.symbol === beam.symbol && r.beam.mass === beam.mass &&
    r.target.symbol === target.symbol && r.target.mass === target.mass
  ) ?? null;
}
