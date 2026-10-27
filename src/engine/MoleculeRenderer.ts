import { ELEMENTS_DATA } from '../data/elements';
import { MolecularStructure, StructureAtom, ionicRadius } from '../data/structures';

// 分子構造の 3D 表示で使う原子の大きさ・色・ラベル (three.js の描画は MoleculeScene.ts)

export type MoleculeDisplayMode = 'ballStick' | 'spaceFill';

// 共有結合半径 (Å)。球棒モデルの球の大きさに使う
const COVALENT_RADII: Record<string, number> = {
  H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Cl: 1.02, Br: 1.2, I: 1.39, S: 1.05, P: 1.07,
  Si: 1.11, Al: 1.21, Na: 1.66, K: 2.03, Li: 1.28, Rb: 2.2, Cs: 2.44, Ca: 1.76, Mg: 1.41,
  Ba: 2.15, Cu: 1.32, Zn: 1.22, Fe: 1.32, Mn: 1.39, Ag: 1.45
};

// ファンデルワールス半径 (Å)。空間充填モデルの球の大きさに使う
const VDW_RADII: Record<string, number> = {
  H: 1.2, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Cl: 1.75, Br: 1.85, I: 1.98, S: 1.8, P: 1.8, Si: 2.1, Al: 1.84
};

export function atomRadius(a: StructureAtom, mode: MoleculeDisplayMode): number {
  // イオンはイオン半径で描く (球棒モデルでも Na⁺ より Cl⁻ が大きく見える)
  const ionic = a.charge ? ionicRadius(a.el, a.charge) : undefined;
  if (mode === 'spaceFill') return ionic ?? VDW_RADII[a.el] ?? 1.8;
  // 球棒モデルの球は結合の棒 (半径 0.12 Å) より十分大きく見えるようにする
  return ionic !== undefined ? ionic * 0.45 : Math.max(0.24, (COVALENT_RADII[a.el] ?? 1.0) * 0.5);
}

export function structureCentroid(s: MolecularStructure): [number, number, number] {
  const n = s.atoms.length;
  return [
    s.atoms.reduce((t, a) => t + a.x, 0) / n,
    s.atoms.reduce((t, a) => t + a.y, 0) / n,
    s.atoms.reduce((t, a) => t + a.z, 0) / n
  ];
}

// 重心から最も遠い原子の外側までの距離 (Å)。カメラの距離を決めるのに使う
export function structureExtent(s: MolecularStructure, mode: MoleculeDisplayMode): number {
  const c = structureCentroid(s);
  return Math.max(...s.atoms.map(a => Math.hypot(a.x - c[0], a.y - c[1], a.z - c[2]) + atomRadius(a, mode)));
}

export function elementColor(el: string): string {
  const c = ELEMENTS_DATA[el]?.color;
  return c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#94A3B8';
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

// 電荷を上付き文字で表す (例: 2 → ²⁺, -1 → ⁻)
export function chargeLabel(charge?: number): string {
  if (!charge) return '';
  const sign = charge > 0 ? '⁺' : '⁻';
  const n = Math.abs(charge);
  return n === 1 ? sign : `${SUPERSCRIPT_DIGITS[n] ?? n}${sign}`;
}
