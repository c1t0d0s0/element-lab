import type { ElementData } from './elements';
import { ELEMENT_PROPERTIES, ElementProperties } from './elementProperties';

// 高校化学の周期表: 電子配置・価電子と、周期表の色分けに使う値 (電気陰性度・イオン化エネルギーなど)

export const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];

export function getElementProperties(symbol: string): ElementProperties | undefined {
  return ELEMENT_PROPERTIES[symbol];
}

// 最外殻電子の数
export function outermostElectrons(symbol: string): number | null {
  const shells = ELEMENT_PROPERTIES[symbol]?.shells;
  return shells && shells.length > 0 ? shells[shells.length - 1] : null;
}

// 遷移元素 (3〜11族・ランタノイド・アクチノイド)。12族は高校の教科書にならって典型元素とする
export function isTransitionElement(el: ElementData): boolean {
  return el.category === 'lanthanide' || el.category === 'actinide' || (el.group >= 3 && el.group <= 11);
}

// 価電子の数: 典型元素では最外殻電子の数 (貴ガスは化学結合にほとんど使われないので 0)。遷移元素は決めにくいので null
export function valenceElectrons(el: ElementData): number | null {
  if (isTransitionElement(el)) return null;
  if (el.group === 18) return 0;
  return outermostElectrons(el.symbol);
}

// 電子配置の書き方 (例: K2 L8 M1)
export function shellNotation(symbol: string): string {
  const shells = ELEMENT_PROPERTIES[symbol]?.shells ?? [];
  return shells.map((n, i) => `${SHELL_NAMES[i]}${n}`).join(' ');
}

export type TrendMode = 'category' | 'electronegativity' | 'ionizationEnergy' | 'atomicRadius' | 'density' | 'valence';
export const TREND_MODES: TrendMode[] = ['category', 'electronegativity', 'ionizationEnergy', 'atomicRadius', 'density', 'valence'];

// 色分けに使う値 (わからない・決められない元素は null)
export function trendValue(el: ElementData, mode: TrendMode): number | null {
  const props = ELEMENT_PROPERTIES[el.symbol];
  switch (mode) {
    case 'electronegativity': return props?.electronegativity ?? null;
    case 'ionizationEnergy': return props?.ionizationEnergy ?? null;
    case 'atomicRadius': return el.atomicRadius > 0 ? el.atomicRadius : null;
    case 'density': return props?.density ?? null;
    case 'valence': return valenceElectrons(el);
    default: return null;
  }
}

// 密度は気体 (約 0.0001 g/cm³) から金属 (約 22 g/cm³) まで大きくちがうので、対数の目盛りで色分けする
export function isLogScale(mode: TrendMode): boolean {
  return mode === 'density';
}

// 色分けの目盛り: 値の小さい方から大きい方へ (暗い青 → 青緑 → 黄)
const SCALE = ['#1E3A8A', '#2563EB', '#0D9488', '#65A30D', '#EAB308', '#FDE047'];

export function trendRange(elements: ElementData[], mode: TrendMode): { min: number; max: number } | null {
  const values = elements.map(el => trendValue(el, mode)).filter((v): v is number => v !== null && (!isLogScale(mode) || v > 0));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

// 0〜1 の位置
export function trendPosition(value: number, range: { min: number; max: number }, mode: TrendMode): number {
  const f = isLogScale(mode)
    ? (Math.log10(value) - Math.log10(range.min)) / (Math.log10(range.max) - Math.log10(range.min))
    : (value - range.min) / (range.max - range.min);
  return Number.isFinite(f) ? Math.max(0, Math.min(1, f)) : 0;
}

export function trendColor(position: number): string {
  const x = position * (SCALE.length - 1);
  const i = Math.min(SCALE.length - 2, Math.floor(x));
  const f = x - i;
  const a = hex(SCALE[i]);
  const b = hex(SCALE[i + 1]);
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * f));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

// 目盛りの色の上で読みやすい文字の色
export function trendTextColor(position: number): string {
  return position > 0.62 ? '#0F172A' : '#F8FAFC';
}

export function trendGradientCss(): string {
  return `linear-gradient(90deg, ${SCALE.join(', ')})`;
}

function hex(c: string): number[] {
  return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
}
