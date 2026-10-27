// PubChem の 3D 配座 (SDF) から、化合物図鑑の 3D 表示に使う分子の座標を取得して
// src/data/molecularStructures.ts を生成する。
// 使い方: node scripts/fetch-structures.mjs
import { writeFileSync } from 'node:fs';

// 化合物ID → PubChem での名前
const TARGETS = {
  O2: 'oxygen',
  O3: 'ozone',
  H2O: 'water',
  CO: 'carbon monoxide',
  CO2: 'carbon dioxide',
  CH4: 'methane',
  HCl: 'hydrogen chloride',
  HF: 'hydrogen fluoride',
  HBr: 'hydrogen bromide',
  HI: 'hydrogen iodide',
  H2O2: 'hydrogen peroxide',
  SO2: 'sulfur dioxide',
  SO3: 'sulfur trioxide',
  H2SO4: 'sulfuric acid',
  NH3: 'ammonia',
  HNO3: 'nitric acid',
  H2S: 'hydrogen sulfide',
  Cl2: 'chlorine',
  N2: 'nitrogen',
  Br2: 'bromine',
  I2: 'iodine',
  H3PO4: 'phosphoric acid',
  C2H2: 'acetylene',
  BTB: 'bromothymol blue',
  Phenolphthalein: 'phenolphthalein',
  CabbageJuice: 'cyanidin'
};

function parseSdf(text) {
  const lines = text.split('\n');
  const counts = lines[3];
  const atomCount = parseInt(counts.slice(0, 3), 10);
  const bondCount = parseInt(counts.slice(3, 6), 10);
  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const l = lines[4 + i];
    const x = parseFloat(l.slice(0, 10));
    const y = parseFloat(l.slice(10, 20));
    const z = parseFloat(l.slice(20, 30));
    const el = l.slice(31, 34).trim();
    atoms.push([el, +x.toFixed(3), +y.toFixed(3), +z.toFixed(3)]);
  }
  const bonds = [];
  for (let i = 0; i < bondCount; i++) {
    const l = lines[4 + atomCount + i];
    bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1, parseInt(l.slice(6, 9), 10)]);
  }
  const cid = parseInt(lines[0].trim(), 10);
  return { cid, atoms, bonds };
}

const result = {};
for (const [id, name] of Object.entries(TARGETS)) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/SDF?record_type=3d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${id} (${name}): HTTP ${res.status}`);
  result[id] = parseSdf(await res.text());
  console.log(`${id}: CID ${result[id].cid}, ${result[id].atoms.length} atoms`);
  await new Promise(r => setTimeout(r, 250)); // PubChem の利用制限 (1秒あたり5回まで) を守る
}

const body = Object.entries(result).map(([id, s]) => {
  const atoms = s.atoms.map(a => `['${a[0]}', ${a[1]}, ${a[2]}, ${a[3]}]`).join(', ');
  const bonds = s.bonds.map(b => `[${b.join(', ')}]`).join(', ');
  return `  ${id}: {\n    cid: ${s.cid},\n    atoms: [${atoms}],\n    bonds: [${bonds}]\n  }`;
}).join(',\n');

writeFileSync(new URL('../src/data/molecularStructures.ts', import.meta.url), `// このファイルは scripts/fetch-structures.mjs が PubChem の 3D 配座から自動生成したもの。手で編集しない
// 座標の単位は Å。bonds は [原子番号i, 原子番号j, 結合次数]

export interface PubChemStructure {
  cid: number;
  atoms: [string, number, number, number][];
  bonds: [number, number, number][];
}

export const PUBCHEM_STRUCTURES: Record<string, PubChemStructure> = {
${body}
};
`);
console.log('wrote src/data/molecularStructures.ts');
