import { COMPOUNDS_DATA, getIndicatorColor } from './compounds';

// 中和滴定 (高校 化学基礎): 濃度から pH を計算して、滴下量と pH のグラフ (滴定曲線) を描く

export const KW = 1.0e-14;
// 25℃ の電離定数
export const KA_ACETIC = 1.8e-5;
export const KB_AMMONIA = 1.8e-5;

// コニカルビーカーに入れる液 (ホールピペットではかりとる)。酸は水酸化ナトリウム水溶液で、塩基は塩酸で滴定する
export type TitrationAnalyte = 'HCl' | 'CH3COOH' | 'NaOH' | 'NH3';
export const TITRATION_ANALYTES: TitrationAnalyte[] = ['HCl', 'CH3COOH', 'NaOH', 'NH3'];

export interface AnalyteInfo {
  type: 'acid' | 'base';
  // 電離定数 (強酸・強塩基は null = 完全に電離する)
  ka?: number;
  kb?: number;
  // ビュレットに入れる標準溶液
  titrant: 'NaOH' | 'HCl';
}

export const ANALYTES: Record<TitrationAnalyte, AnalyteInfo> = {
  HCl: { type: 'acid', titrant: 'NaOH' },
  CH3COOH: { type: 'acid', ka: KA_ACETIC, titrant: 'NaOH' },
  NaOH: { type: 'base', titrant: 'HCl' },
  NH3: { type: 'base', kb: KB_AMMONIA, titrant: 'HCl' }
};

export type TitrationIndicator = 'MethylOrange' | 'Phenolphthalein' | 'BTB';
export const TITRATION_INDICATORS: TitrationIndicator[] = ['MethylOrange', 'Phenolphthalein', 'BTB'];

// 教科書の変色域 (pH)
export const TRANSITION_RANGES: Record<TitrationIndicator, [number, number]> = {
  MethylOrange: [3.1, 4.4],
  Phenolphthalein: [8.0, 9.8],
  BTB: [6.0, 7.6]
};

// ホールピペットではかりとる量・標準溶液の濃度 (mol/L)・ビュレットの目盛り・1滴の量 (mL)
export const ANALYTE_VOLUME = 10.0;
export const TITRANT_CONCENTRATION = 0.1;
export const BURETTE_CAPACITY = 25.0;
export const DROP_VOLUME = 0.05;
// 終点として認める、中和点とのずれ (mL)
export const ENDPOINT_TOLERANCE = 0.2;
// 濃度をかくす問題で使う濃度 (中和点が 6〜15 mL になる)
export const MYSTERY_CONCENTRATIONS = [0.06, 0.075, 0.08, 0.09, 0.11, 0.12, 0.125, 0.15];

export interface TitrationSetup {
  analyte: TitrationAnalyte;
  concentration: number; // コニカルビーカーの液の濃度 (mol/L)
}

// 中和点の滴下量 (mL)。どれも1価の酸・塩基なので、c × V = c' × V'
export function equivalenceVolume(setup: TitrationSetup): number {
  return (setup.concentration * ANALYTE_VOLUME) / TITRANT_CONCENTRATION;
}

// 滴下量 added (mL) のときの pH。電荷のつり合いの式を [H⁺] について二分法で解く
export function titrationPh(setup: TitrationSetup, added: number): number {
  const info = ANALYTES[setup.analyte];
  const total = ANALYTE_VOLUME + added;
  const analyteC = (setup.concentration * ANALYTE_VOLUME) / total;
  const titrantC = (TITRANT_CONCENTRATION * added) / total;

  // f(h) = 陽イオンの電荷 − 陰イオンの電荷。h について単調に増えるので、0 になる h を探す
  const f = (h: number): number => {
    const oh = KW / h;
    if (info.type === 'acid') {
      // [H⁺] + [Na⁺] = [OH⁻] + [A⁻]
      const anion = info.ka ? (analyteC * info.ka) / (info.ka + h) : analyteC;
      return h + titrantC - oh - anion;
    }
    // [H⁺] + [Na⁺ または NH₄⁺] = [OH⁻] + [Cl⁻]
    const cation = info.kb ? (analyteC * h) / (h + KW / info.kb) : analyteC;
    return h + cation - oh - titrantC;
  };

  let lo = -15;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(Math.pow(10, mid)) > 0) hi = mid;
    else lo = mid;
  }
  return -(lo + hi) / 2;
}

// 中和点の pH
export function equivalencePh(setup: TitrationSetup): number {
  return titrationPh(setup, equivalenceVolume(setup));
}

export function indicatorColor(indicator: TitrationIndicator, ph: number): string {
  return getIndicatorColor(COMPOUNDS_DATA[indicator].indicator!, ph);
}

// 指示薬の色が変わったと見る pH (変色域のまん中)
export function indicatorMidpoint(indicator: TitrationIndicator): number {
  const [a, b] = TRANSITION_RANGES[indicator];
  return (a + b) / 2;
}

// 色が変わったか: 酸に塩基を加えると pH は上がり、塩基に酸を加えると下がる
export function indicatorChanged(setup: TitrationSetup, indicator: TitrationIndicator, ph: number): boolean {
  const mid = indicatorMidpoint(indicator);
  return ANALYTES[setup.analyte].type === 'acid' ? ph >= mid : ph <= mid;
}

// その指示薬で色が変わる滴下量 (mL)。中和点との差が指示薬の向き・不向きを表す
export function endpointVolume(setup: TitrationSetup, indicator: TitrationIndicator): number {
  const veq = equivalenceVolume(setup);
  let lo = 0;
  let hi = veq * 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (indicatorChanged(setup, indicator, titrationPh(setup, mid))) hi = mid;
    else lo = mid;
  }
  return hi;
}

export type EndpointVerdict = 'good' | 'early' | 'late';

export function judgeEndpoint(setup: TitrationSetup, volume: number): EndpointVerdict {
  const diff = volume - equivalenceVolume(setup);
  if (diff < -ENDPOINT_TOLERANCE) return 'early';
  if (diff > ENDPOINT_TOLERANCE) return 'late';
  return 'good';
}

// 中和点で増える物質 (中和でできる塩) と、その液性
export function equivalenceNature(setup: TitrationSetup): 'acidic' | 'neutral' | 'basic' {
  const ph = equivalencePh(setup);
  if (ph < 6.5) return 'acidic';
  if (ph > 7.5) return 'basic';
  return 'neutral';
}

// 結果の記録のキー ('CH3COOH:Phenolphthalein' など)
export function titrationKey(analyte: TitrationAnalyte, indicator: TitrationIndicator): string {
  return `${analyte}:${indicator}`;
}

export const TITRATION_KEYS = TITRATION_ANALYTES.flatMap(a => TITRATION_INDICATORS.map(i => titrationKey(a, i)));
