import { Language } from '../i18n';
import { PUBCHEM_STRUCTURES } from './molecularStructures';
import { GENERATED_STRUCTURES } from './generatedStructures';

// 化合物図鑑の 3D 表示に使う構造 (座標の単位は Å)
// molecule: 分子 / ions: イオンの組み合わせ (組成式1つ分) / crystal: 結晶格子 / network: 網目構造の一部
export type StructureKind = 'molecule' | 'ions' | 'crystal' | 'network';

export interface StructureAtom {
  el: string;
  x: number;
  y: number;
  z: number;
  charge?: number; // イオンの電荷 (形式電荷を含む)
}

// [原子i, 原子j, 結合次数]。結合次数 0 はイオンどうしのとなり合い (点線で描く)
export type StructureBond = [number, number, number];

export interface MolecularStructure {
  kind: StructureKind;
  atoms: StructureAtom[];
  bonds: StructureBond[];
  shapeJa?: string;
  shapeEn?: string;
  noteJa?: string;
  noteEn?: string;
  source?: string;
}

// イオン半径 (Å, 6配位)。結晶の格子間隔や、空間充填モデルのイオンの大きさに使う
export const IONIC_RADII: Record<string, number> = {
  'Li+1': 0.76, 'Na+1': 1.02, 'K+1': 1.38, 'Rb+1': 1.52, 'Cs+1': 1.67, 'Ag+1': 1.15,
  'Mg+2': 0.72, 'Ca+2': 1.0, 'Ba+2': 1.35, 'Cu+2': 0.73, 'Zn+2': 0.74, 'Fe+2': 0.78,
  'Fe+3': 0.645, 'Al+3': 0.535, 'Mn+4': 0.53,
  'F-1': 1.33, 'Cl-1': 1.81, 'Br-1': 1.96, 'I-1': 2.2, 'O-2': 1.4, 'S-2': 1.84
};

export function ionicRadius(el: string, charge: number): number | undefined {
  return IONIC_RADII[`${el}${charge > 0 ? '+' : '-'}${Math.abs(charge)}`];
}

type Vec = [number, number, number];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec): Vec => scale(a, 1 / len(a));
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// a に垂直な2つの単位ベクトル
function perpendiculars(a: Vec): [Vec, Vec] {
  const ref: Vec = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(a, ref));
  return [u, cross(a, u)];
}

const TETRA_DIRS: Vec[] = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => unit(v as Vec));
const TRIGONAL_DIRS: Vec[] = [0, 1, 2].map(k => [Math.cos((k * 2 * Math.PI) / 3), Math.sin((k * 2 * Math.PI) / 3), 0] as Vec);

// 原子と結合のかたまり (分子や多原子イオン)
interface Group {
  atoms: StructureAtom[];
  bonds: StructureBond[];
}

const atom = (el: string, p: Vec, charge?: number): StructureAtom => ({ el, x: p[0], y: p[1], z: p[2], ...(charge ? { charge } : {}) });
const pos = (a: StructureAtom): Vec => [a.x, a.y, a.z];

function diatomic(a: string, b: string, d: number, order: number): Group {
  return { atoms: [atom(a, [-d / 2, 0, 0]), atom(b, [d / 2, 0, 0])], bonds: [[0, 1, order]] };
}

function bent(center: string, outer: string, d: number, angleDeg: number, orders: [number, number]): Group {
  const h = (angleDeg * Math.PI) / 360;
  return {
    atoms: [atom(center, [0, 0, 0]), atom(outer, [d * Math.sin(h), -d * Math.cos(h), 0]), atom(outer, [-d * Math.sin(h), -d * Math.cos(h), 0])],
    bonds: [[0, 1, orders[0]], [0, 2, orders[1]]]
  };
}

// 中心原子のまわりに配位子を置く (正四面体・平面三角形)。charges と orders は配位子ごと
function star(center: string, centerCharge: number, ligand: string, d: number, dirs: Vec[], orders: number[], charges: number[] = []): Group {
  const atoms = [atom(center, [0, 0, 0], centerCharge)];
  const bonds: StructureBond[] = [];
  dirs.forEach((dir, k) => {
    atoms.push(atom(ligand, scale(dir, d), charges[k]));
    bonds.push([0, k + 1, orders[k]]);
  });
  return { atoms, bonds };
}

// 酸素の先に水素を付ける (中心-O-H の角度は約 115°)
function addHydroxylH(g: Group, oIndex: number, centerIndex: number) {
  const o = pos(g.atoms[oIndex]);
  const axis = unit(add(o, scale(pos(g.atoms[centerIndex]), -1)));
  const [u] = perpendiculars(axis);
  const bend = (65 * Math.PI) / 180;
  const h = add(o, scale(unit(add(scale(axis, Math.cos(bend)), scale(u, Math.sin(bend)))), 0.97));
  g.atoms.push(atom('H', h));
  g.bonds.push([oIndex, g.atoms.length - 1, 1]);
}

const ion = (el: string, charge: number): Group => ({ atoms: [atom(el, [0, 0, 0], charge)], bonds: [] });
const hydroxide = (): Group => ({ atoms: [atom('O', [0, 0, 0], -1), atom('H', [0.97, 0, 0])], bonds: [[0, 1, 1]] });
const carbonate = (): Group => star('C', 0, 'O', 1.29, TRIGONAL_DIRS, [2, 1, 1], [0, -1, -1]);
const nitrate = (): Group => star('N', 1, 'O', 1.25, TRIGONAL_DIRS, [2, 1, 1], [0, -1, -1]);
const sulfate = (): Group => star('S', 0, 'O', 1.49, TETRA_DIRS, [2, 2, 1, 1], [0, 0, -1, -1]);
const ammonium = (): Group => star('N', 1, 'H', 1.03, TETRA_DIRS, [1, 1, 1, 1]);
function hydrogenCarbonate(): Group {
  const g = star('C', 0, 'O', 1.3, TRIGONAL_DIRS, [2, 1, 1], [0, -1, 0]);
  addHydroxylH(g, 3, 0);
  return g;
}
function aluminate(): Group {
  const g = star('Al', -1, 'O', 1.79, TETRA_DIRS, [1, 1, 1, 1]);
  for (let k = 1; k <= 4; k++) addHydroxylH(g, k, 0);
  return g;
}
const acetylide = (): Group => ({ atoms: [atom('C', [-0.6, 0, 0], -1), atom('C', [0.6, 0, 0], -1)], bonds: [[0, 1, 3]] });

// 原子の表示上の大きさの目安 (配置の間隔を決めるため)
function layoutRadius(a: StructureAtom): number {
  return (a.charge && ionicRadius(a.el, a.charge)) || 0.75;
}

function groupCenter(g: Group): Vec {
  const c = g.atoms.reduce<Vec>((s, a) => add(s, pos(a)), [0, 0, 0]);
  return scale(c, 1 / g.atoms.length);
}

function groupRadius(g: Group): number {
  const c = groupCenter(g);
  return Math.max(...g.atoms.map(a => len(add(pos(a), scale(c, -1))) + layoutRadius(a)));
}

// イオンのかたまりを並べて1つの構造にする。3個以下は一列、それより多いと輪に並べる。
// となり合うかたまりの一番近い原子どうしを点線 (結合次数 0) で結ぶ
function arrangeGroups(groups: Group[]): { atoms: StructureAtom[]; bonds: StructureBond[] } {
  const radii = groups.map(groupRadius);
  const centers: Vec[] = [];
  if (groups.length <= 3) {
    let x = 0;
    groups.forEach((_, i) => {
      if (i > 0) x += radii[i - 1] + radii[i];
      centers.push([x, 0, 0]);
    });
  } else {
    const n = groups.length;
    let ringR = 0;
    for (let i = 0; i < n; i++) ringR = Math.max(ringR, (radii[i] + radii[(i + 1) % n]) / (2 * Math.sin(Math.PI / n)));
    for (let i = 0; i < n; i++) centers.push([ringR * Math.cos((2 * Math.PI * i) / n), ringR * Math.sin((2 * Math.PI * i) / n), 0]);
  }

  const atoms: StructureAtom[] = [];
  const bonds: StructureBond[] = [];
  const offsets: number[] = [];
  groups.forEach((g, i) => {
    const shift = add(centers[i], scale(groupCenter(g), -1));
    offsets.push(atoms.length);
    g.atoms.forEach(a => atoms.push({ ...a, ...{ x: a.x + shift[0], y: a.y + shift[1], z: a.z + shift[2] } }));
    g.bonds.forEach(([p, q, o]) => bonds.push([p + offsets[i], q + offsets[i], o]));
  });

  const pairs = groups.length <= 3 ? groups.length - 1 : groups.length;
  for (let i = 0; i < pairs; i++) {
    const j = (i + 1) % groups.length;
    let best: [number, number] = [offsets[i], offsets[j]];
    let bestD = Infinity;
    for (let p = 0; p < groups[i].atoms.length; p++) {
      for (let q = 0; q < groups[j].atoms.length; q++) {
        const d = len(add(pos(atoms[offsets[i] + p]), scale(pos(atoms[offsets[j] + q]), -1)));
        if (d < bestD) {
          bestD = d;
          best = [offsets[i] + p, offsets[j] + q];
        }
      }
    }
    bonds.push([best[0], best[1], 0]);
  }
  return { atoms, bonds };
}

// 岩塩型の結晶 (3×3×3 の格子点に陽イオンと陰イオンを交互に置く)。格子間隔はイオン半径の和
export function rockSalt(cation: string, anion: string, charge: number): MolecularStructure {
  const d = (ionicRadius(cation, charge) ?? 1) + (ionicRadius(anion, -charge) ?? 1.8);
  const atoms: StructureAtom[] = [];
  const index = new Map<string, number>();
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        const isCation = (i + j + k) % 2 === 0;
        index.set(`${i},${j},${k}`, atoms.length);
        atoms.push(atom(isCation ? cation : anion, [i * d, j * d, k * d], isCation ? charge : -charge));
      }
    }
  }
  const bonds: StructureBond[] = [];
  for (const [key, a] of index) {
    const [i, j, k] = key.split(',').map(Number);
    for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const b = index.get(`${i + di},${j + dj},${k + dk}`);
      if (b !== undefined) bonds.push([a, b, 0]);
    }
  }
  return {
    kind: 'crystal',
    atoms,
    bonds,
    shapeJa: '岩塩型の結晶',
    shapeEn: 'Rock-salt crystal',
    noteJa: '陽イオンと陰イオンが上下・左右・前後に交互に並んだ結晶。実際はこの並びが何億個もずっと続いている',
    noteEn: 'Positive and negative ions alternate up-down, left-right and front-back. In a real crystal this pattern repeats billions of times.'
  };
}

const IONS_NOTE = {
  noteJa: '固体では、たくさんのイオンが集まった結晶になっている。ここでは組成式1つ分のイオンを表示',
  noteEn: 'As a solid, many ions gather into a crystal. Shown here: the ions of one formula unit.'
};

function ions(...groups: Group[]): MolecularStructure {
  return { kind: 'ions', ...arrangeGroups(groups), ...IONS_NOTE };
}

function molecule(g: Group, shape?: [string, string], note?: [string, string]): MolecularStructure {
  return {
    kind: 'molecule',
    atoms: g.atoms,
    bonds: g.bonds,
    ...(shape ? { shapeJa: shape[0], shapeEn: shape[1] } : {}),
    ...(note ? { noteJa: note[0], noteEn: note[1] } : {})
  };
}

// 十酸化四リン: 正四面体に並んだ P₄ の各辺に橋かけの O、各 P の外側に二重結合の O が付いたかご形
function tetraphosphorusDecaoxide(): Group {
  const s = 0.997; // P-O-P が約 123.5°、P-O(橋かけ) が 1.60 Å になる大きさ
  const t = 1.753;
  const atoms: StructureAtom[] = TETRA_DIRS.map(d => atom('P', scale(d, s * Math.sqrt(3))));
  const bonds: StructureBond[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const mid = scale(add(pos(atoms[i]), pos(atoms[j])), 0.5);
      atoms.push(atom('O', scale(unit(mid), t)));
      bonds.push([i, atoms.length - 1, 1], [j, atoms.length - 1, 1]);
    }
  }
  for (let i = 0; i < 4; i++) {
    atoms.push(atom('O', add(pos(atoms[i]), scale(TETRA_DIRS[i], 1.43))));
    bonds.push([i, atoms.length - 1, 2]);
  }
  return { atoms, bonds };
}

// 二酸化ケイ素: 中心の SiO₄ 四面体と、O を共有してつながる4つの SiO₄ 四面体 (Si-O-Si は約 144°)
function silicaFragment(): MolecularStructure {
  const d = 1.61;
  const atoms: StructureAtom[] = [atom('Si', [0, 0, 0])];
  const bonds: StructureBond[] = [];
  TETRA_DIRS.forEach(dir => {
    atoms.push(atom('O', scale(dir, d)));
    const o = atoms.length - 1;
    bonds.push([0, o, 1]);
    const [u] = perpendiculars(dir);
    const bend = (36 * Math.PI) / 180;
    const siDir = unit(add(scale(dir, Math.cos(bend)), scale(u, Math.sin(bend))));
    atoms.push(atom('Si', add(pos(atoms[o]), scale(siDir, d))));
    const si = atoms.length - 1;
    bonds.push([o, si, 1]);
    // 外側の Si の残り3本の Si-O (共有した O への向きから 109.5° ずつ)
    const back = scale(siDir, -1);
    const [p, q] = perpendiculars(back);
    const tet = (109.47 * Math.PI) / 180;
    for (let k = 0; k < 3; k++) {
      const phi = (k * 2 * Math.PI) / 3 + 0.3;
      const ring = add(scale(p, Math.cos(phi)), scale(q, Math.sin(phi)));
      const dirK = unit(add(scale(back, Math.cos(tet)), scale(ring, Math.sin(tet))));
      atoms.push(atom('O', add(pos(atoms[si]), scale(dirK, d))));
      bonds.push([si, atoms.length - 1, 1]);
    }
  });
  return {
    kind: 'network',
    atoms,
    bonds,
    shapeJa: '網目状の結晶（一部分）',
    shapeEn: 'Network solid (fragment)',
    noteJa: 'Si を中心とした SiO₄ の四面体が、頂点の O を共有して立体的な網目のようにつながっている。ここではその一部分を表示',
    noteEn: 'SiO₄ tetrahedra share their corner O atoms and link into a 3D network. Shown here: a small piece of it.'
  };
}

// PubChem から取得した分子につける形の名前・説明
const PUBCHEM_LABELS: Record<string, { shape?: [string, string]; note?: [string, string] }> = {
  H2O: { shape: ['折れ線形（約104.5°）', 'Bent (about 104.5°)'] },
  H2S: { shape: ['折れ線形（約92°）', 'Bent (about 92°)'] },
  O3: { shape: ['折れ線形（約117°）', 'Bent (about 117°)'] },
  SO2: { shape: ['折れ線形（約119°）', 'Bent (about 119°)'] },
  CO2: { shape: ['直線形（180°）', 'Linear (180°)'] },
  C2H2: { shape: ['直線形（180°）', 'Linear (180°)'] },
  CH4: { shape: ['正四面体形（109.5°）', 'Tetrahedral (109.5°)'] },
  NH3: { shape: ['三角錐形（約107°）', 'Trigonal pyramidal (about 107°)'] },
  SO3: { shape: ['平面三角形（120°）', 'Trigonal planar (120°)'] },
  H2O2: { shape: ['ねじれた形', 'Twisted (non-planar)'] },
  O2: { shape: ['二原子分子', 'Diatomic molecule'] },
  N2: { shape: ['二原子分子', 'Diatomic molecule'] },
  Cl2: { shape: ['二原子分子', 'Diatomic molecule'] },
  Br2: { shape: ['二原子分子', 'Diatomic molecule'] },
  I2: { shape: ['二原子分子', 'Diatomic molecule'] },
  CO: { shape: ['二原子分子', 'Diatomic molecule'] },
  HCl: { shape: ['二原子分子', 'Diatomic molecule'] },
  HF: { shape: ['二原子分子', 'Diatomic molecule'] },
  HBr: { shape: ['二原子分子', 'Diatomic molecule'] },
  HI: { shape: ['二原子分子', 'Diatomic molecule'] },
  BTB: { note: ['BTB（ブロモチモールブルー）の分子。液の性質によって形の一部が変わり、色が変わる', 'The bromothymol blue molecule. Part of its shape changes with the solution, which changes its color.'] },
  Phenolphthalein: { note: ['フェノールフタレインの分子（無色のときの形）。アルカリ性では形が変わって赤むらさき色になる', 'Phenolphthalein in its colorless form. In alkali its shape changes and it turns pinkish-red.'] },
  CabbageJuice: { note: ['ムラサキキャベツの色素アントシアニンの一種「シアニジン」（酸性のときの形）', 'Cyanidin, one of the anthocyanin pigments of red cabbage (its acidic form).'] }
};

function fromPubChem(id: string): MolecularStructure | null {
  const s = PUBCHEM_STRUCTURES[id];
  if (!s) return null;
  const labels = PUBCHEM_LABELS[id] ?? {};
  return {
    ...molecule({ atoms: s.atoms.map(([el, x, y, z]) => ({ el, x, y, z })), bonds: s.bonds }, labels.shape, labels.note),
    source: `PubChem CID ${s.cid}`
  };
}

// RDKit で作った配座 (PubChem から取得できなかった分子)
const GENERATED_LABELS: Record<string, { shape?: [string, string]; note?: [string, string] }> = {
  Sucrose: { note: ['ブドウ糖（グルコース）と果糖（フルクトース）の2つの環が、酸素原子1つでつながっている', 'A glucose ring and a fructose ring joined through one oxygen atom'] },
  C2H4: { shape: ['平面形（約120°）', 'Planar (about 120°)'], note: ['C=C 二重結合のまわりの6つの原子が、すべて同じ平面に並ぶ', 'All six atoms around the C=C double bond lie in one plane'] },
  C2H5OH: { note: ['エタン（C₂H₆）の水素原子1つがヒドロキシ基（-OH）に置きかわった形', 'Ethane (C₂H₆) with one hydrogen atom replaced by a hydroxy group (-OH)'] },
  CH3COOH: { note: ['メチル基（CH₃-）にカルボキシ基（-COOH）がついた形', 'A methyl group (CH₃-) attached to a carboxy group (-COOH)'] },
  C6H12O6: { note: ['5つの炭素原子と1つの酸素原子が六角形の環をつくる（α-グルコース）', 'Five carbon atoms and one oxygen atom form a six-membered ring (α-glucose)'] }
};

// 生成した配座を、イオンを組み合わせるためのかたまりとして使う
function generatedGroup(id: string): Group {
  const s = GENERATED_STRUCTURES[id];
  return {
    atoms: s.atoms.map(([el, x, y, z, charge]) => atom(el, [x, y, z], charge)),
    bonds: s.bonds
  };
}

function fromGenerated(id: string): MolecularStructure | null {
  const s = GENERATED_STRUCTURES[id];
  if (!s) return null;
  const labels = GENERATED_LABELS[id] ?? {};
  return {
    ...molecule({ atoms: s.atoms.map(([el, x, y, z, charge]) => atom(el, [x, y, z], charge)), bonds: s.bonds }, labels.shape, labels.note),
    source: 'RDKit (MMFF)'
  };
}

const ROCK_SALT: Record<string, [string, string, number]> = {
  NaCl: ['Na', 'Cl', 1], KCl: ['K', 'Cl', 1], LiCl: ['Li', 'Cl', 1],
  NaF: ['Na', 'F', 1], NaBr: ['Na', 'Br', 1], NaI: ['Na', 'I', 1],
  KF: ['K', 'F', 1], KBr: ['K', 'Br', 1], KI: ['K', 'I', 1],
  AgCl: ['Ag', 'Cl', 1], MgO: ['Mg', 'O', 2], CaO: ['Ca', 'O', 2]
};

const BUILDERS: Record<string, () => MolecularStructure> = {
  H2: () => molecule(diatomic('H', 'H', 0.74, 1), ['二原子分子', 'Diatomic molecule']),
  F2: () => molecule(diatomic('F', 'F', 1.42, 1), ['二原子分子', 'Diatomic molecule']),
  NO: () => molecule(diatomic('N', 'O', 1.15, 2), ['二原子分子', 'Diatomic molecule']),
  NO2: () => molecule(bent('N', 'O', 1.2, 134, [2, 1]), ['折れ線形（約134°）', 'Bent (about 134°)']),
  AlCl3: () => molecule(star('Al', 0, 'Cl', 2.06, TRIGONAL_DIRS, [1, 1, 1]), ['平面三角形（120°）', 'Trigonal planar (120°)'], ['気体のときの1分子の形', 'The shape of one molecule in the gas']),
  P4O10: () => molecule(tetraphosphorusDecaoxide(), ['かご形', 'Cage'], ['4つの P が正四面体の頂点に並び、その間を O が橋のようにつないでいる', 'Four P atoms sit at the corners of a tetrahedron, bridged by O atoms.']),
  SiO2: silicaFragment,

  NaOH: () => ions(ion('Na', 1), hydroxide()),
  KOH: () => ions(ion('K', 1), hydroxide()),
  LiOH: () => ions(ion('Li', 1), hydroxide()),
  RbOH: () => ions(ion('Rb', 1), hydroxide()),
  CsOH: () => ions(ion('Cs', 1), hydroxide()),
  CaOH2: () => ions(hydroxide(), ion('Ca', 2), hydroxide()),
  NH4Cl: () => ions(ammonium(), ion('Cl', -1)),
  CaCO3: () => ions(ion('Ca', 2), carbonate()),
  Na2CO3: () => ions(ion('Na', 1), carbonate(), ion('Na', 1)),
  NaHCO3: () => ions(ion('Na', 1), hydrogenCarbonate()),
  CuSO4: () => ions(ion('Cu', 2), sulfate()),
  ZnSO4: () => ions(ion('Zn', 2), sulfate()),
  MgSO4: () => ions(ion('Mg', 2), sulfate()),
  FeSO4: () => ions(ion('Fe', 2), sulfate()),
  BaSO4: () => ions(ion('Ba', 2), sulfate()),
  AgNO3: () => ions(ion('Ag', 1), nitrate()),
  KNO3: () => ions(ion('K', 1), nitrate()),
  CH3COONa: () => ions(ion('Na', 1), generatedGroup('Acetate')),
  CuNO32: () => ions(nitrate(), ion('Cu', 2), nitrate()),
  NaAlOH4: () => ions(ion('Na', 1), aluminate()),
  CaC2: () => ions(ion('Ca', 2), acetylide()),
  CaCl2: () => ions(ion('Cl', -1), ion('Ca', 2), ion('Cl', -1)),
  ZnCl2: () => ions(ion('Cl', -1), ion('Zn', 2), ion('Cl', -1)),
  CuCl2: () => ions(ion('Cl', -1), ion('Cu', 2), ion('Cl', -1)),
  FeCl2: () => ions(ion('Cl', -1), ion('Fe', 2), ion('Cl', -1)),
  MnO2: () => ions(ion('O', -2), ion('Mn', 4), ion('O', -2)),
  CuO: () => ions(ion('Cu', 2), ion('O', -2)),
  FeS: () => ions(ion('Fe', 2), ion('S', -2)),
  CuS: () => ions(ion('Cu', 2), ion('S', -2)),
  Ag2O: () => ions(ion('Ag', 1), ion('O', -2), ion('Ag', 1)),
  MgCl2: () => ions(ion('Cl', -1), ion('Mg', 2), ion('Cl', -1)),
  BaOH2: () => ions(hydroxide(), ion('Ba', 2), hydroxide()),
  Fe2O3: () => ions(ion('O', -2), ion('Fe', 3), ion('O', -2), ion('Fe', 3), ion('O', -2)),
  Al2O3: () => ions(ion('O', -2), ion('Al', 3), ion('O', -2), ion('Al', 3), ion('O', -2)),
  Fe3O4: () => ions(ion('O', -2), ion('Fe', 2), ion('O', -2), ion('Fe', 3), ion('O', -2), ion('Fe', 3), ion('O', -2))
};

// 対称行列の固有ベクトル (ヤコビ法)。列ベクトルが固有ベクトル、values が固有値
function symmetricEigen(m: number[][]): { values: number[]; vectors: number[][] } {
  const a = m.map(r => [...r]);
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let p = 0, q = 1;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) if (Math.abs(a[i][j]) > Math.abs(a[p][q])) [p, q] = [i, j];
    if (Math.abs(a[p][q]) < 1e-12) break;
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const tt = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(tt * tt + 1), sn = tt * c;
    for (let k = 0; k < 3; k++) {
      const akp = a[k][p], akq = a[k][q];
      a[k][p] = c * akp - sn * akq;
      a[k][q] = sn * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[p][k], aqk = a[q][k];
      a[p][k] = c * apk - sn * aqk;
      a[q][k] = sn * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = v[k][p], vkq = v[k][q];
      v[k][p] = c * vkp - sn * vkq;
      v[k][q] = sn * vkp + c * vkq;
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
}

// 原子の広がりが大きい向きを画面の横 (x)・縦 (y) に、いちばん薄い向きを奥行き (z) に合わせる。
// 水のような平らな分子も、最初から曲がった形が正面に見える
export function alignPrincipalAxes(atoms: StructureAtom[]): StructureAtom[] {
  const n = atoms.length;
  const c: Vec = [0, 0, 0];
  atoms.forEach(a => { c[0] += a.x / n; c[1] += a.y / n; c[2] += a.z / n; });
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const a of atoms) {
    const d = [a.x - c[0], a.y - c[1], a.z - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j];
  }
  const { values, vectors } = symmetricEigen(cov);
  const order = [0, 1, 2].sort((i, j) => values[j] - values[i]);
  const axes = order.map(k => [vectors[0][k], vectors[1][k], vectors[2][k]] as Vec);
  // 鏡写しにならないよう右手系にそろえる
  const z = cross(axes[0], axes[1]);
  axes[2] = z;
  return atoms.map(a => {
    const d: Vec = [a.x - c[0], a.y - c[1], a.z - c[2]];
    const [x, y, zz] = axes.map(ax => d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]);
    return { ...a, x, y, z: zz };
  });
}

// 決まった分子の形がない物質 (リトマスは地衣類からとれる色素の混ぜもの、ミョウバンは結晶水をふくむイオンの結晶)
export const NO_STRUCTURE_COMPOUNDS = ['RedLitmus', 'BlueLitmus', 'Alum'];

const cache = new Map<string, MolecularStructure | null>();

export function getStructure(compoundId: string): MolecularStructure | null {
  if (!cache.has(compoundId)) {
    let s: MolecularStructure | null = null;
    if (PUBCHEM_STRUCTURES[compoundId]) s = fromPubChem(compoundId);
    else if (GENERATED_STRUCTURES[compoundId]) s = fromGenerated(compoundId);
    else if (ROCK_SALT[compoundId]) s = rockSalt(...ROCK_SALT[compoundId]);
    else if (BUILDERS[compoundId]) s = BUILDERS[compoundId]();
    // 結晶は立方体の向きのまま、それ以外は形がいちばんよく見える向きにそろえる
    if (s && s.kind !== 'crystal' && s.atoms.length > 1) s = { ...s, atoms: alignPrincipalAxes(s.atoms) };
    cache.set(compoundId, s);
  }
  return cache.get(compoundId) ?? null;
}

export function getStructureShape(s: MolecularStructure, lang: Language): string | undefined {
  return lang === 'en' ? s.shapeEn : s.shapeJa;
}

export function getStructureNote(s: MolecularStructure, lang: Language): string | undefined {
  return lang === 'en' ? s.noteEn : s.noteJa;
}
