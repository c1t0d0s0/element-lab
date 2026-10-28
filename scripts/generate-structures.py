# PubChem に届かない環境でも使えるよう、SMILES から RDKit で 3D 配座を作って
# src/data/generatedStructures.ts を生成する (PubChem の 3D 配座と同じ形式)。
# 使い方: pip install rdkit && python3 scripts/generate-structures.py
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors

# 化合物ID → (名前, 立体を含む SMILES, 確認用の分子式)
TARGETS = {
    'C2H4': ('ethylene', 'C=C', 'C2H4'),
    'C2H5OH': ('ethanol', 'CCO', 'C2H6O'),
    'CH3COOH': ('acetic acid', 'CC(=O)O', 'C2H4O2'),
    # 酢酸ナトリウムの酢酸イオン (Na⁺ は structures.ts で組み合わせる)
    'Acetate': ('acetate ion', 'CC(=O)[O-]', 'C2H3O2-'),
    # 結晶や教科書でよく見る α-D-グルコース (水の中では β 形・鎖状と行き来している)
    'C6H12O6': ('alpha-D-glucose', 'OC[C@H]1O[C@H](O)[C@H](O)[C@@H](O)[C@@H]1O', 'C6H12O6'),
    'Sucrose': (
        'sucrose',
        'C([C@@H]1[C@H]([C@@H]([C@](O1)(CO)O[C@@H]2[C@@H]([C@H]([C@@H]([C@H](O2)CO)O)O)O)O)O)O',
        'C12H22O11',
    ),
}

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'generatedStructures.ts'


def build(smiles: str, formula: str):
    mol = Chem.AddHs(Chem.MolFromSmiles(smiles))
    assert rdMolDescriptors.CalcMolFormula(mol) == formula, smiles
    params = AllChem.ETKDGv3()
    params.randomSeed = 42
    assert AllChem.EmbedMolecule(mol, params) == 0, smiles
    AllChem.MMFFOptimizeMolecule(mol, maxIters=2000)
    conf = mol.GetConformer()
    atoms = []
    for a in mol.GetAtoms():
        p = conf.GetAtomPosition(a.GetIdx())
        atoms.append((a.GetSymbol(), round(p.x, 3), round(p.y, 3), round(p.z, 3), a.GetFormalCharge()))
    bonds = [(b.GetBeginAtomIdx(), b.GetEndAtomIdx(), int(b.GetBondTypeAsDouble())) for b in mol.GetBonds()]
    return atoms, bonds


def num(v: float) -> str:
    return '0' if v == 0 else repr(v)


lines = [
    '// このファイルは scripts/generate-structures.py が SMILES から RDKit で作った 3D 配座 (MMFF で最適化) を自動生成したもの。手で編集しない',
    '// 座標の単位は Å。atoms の5番目は形式電荷 (0 なら省略)。bonds は [原子番号i, 原子番号j, 結合次数]',
    '',
    'export interface GeneratedStructure {',
    '  smiles: string;',
    '  atoms: [string, number, number, number, number?][];',
    '  bonds: [number, number, number][];',
    '}',
    '',
    'export const GENERATED_STRUCTURES: Record<string, GeneratedStructure> = {',
]
items = []
for cid, (name, smiles, formula) in TARGETS.items():
    atoms, bonds = build(smiles, formula)
    atom_str = ', '.join(f"['{el}', {num(x)}, {num(y)}, {num(z)}{f', {c}' if c else ''}]" for el, x, y, z, c in atoms)
    bond_str = ', '.join(f'[{i}, {j}, {o}]' for i, j, o in bonds)
    items.append('\n'.join([
        f'  // {name}',
        f'  {cid}: {{',
        f"    smiles: '{smiles}',",
        f'    atoms: [{atom_str}],',
        f'    bonds: [{bond_str}]',
        '  }',
    ]))
lines.append(',\n'.join(items))
lines.append('};')
OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'wrote {OUT} ({len(TARGETS)} structures)')
