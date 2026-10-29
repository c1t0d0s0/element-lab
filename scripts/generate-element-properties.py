# 高校化学で使う元素のデータ (電子配置・電気陰性度・第一イオン化エネルギー・密度) を
# mendeleev パッケージから取り出して src/data/elementProperties.ts を生成する。
# 使い方: pip install mendeleev && python3 scripts/generate-element-properties.py
from pathlib import Path

from mendeleev import element

OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'elementProperties.ts'

# 1 eV = 96.485 kJ/mol
EV_TO_KJ_PER_MOL = 96.485
# この原子番号から先は、電子配置が実験で確かめられていない予測値 (Lr の 7p 電子もまだ確かめられていない)
PREDICTED_FROM = 103
# この原子番号から先は、第一イオン化エネルギーが測られていない (計算値しかない)
IE_MEASURED_UNTIL = 103
# 密度が実測されていない (推定値しかない) 元素
DENSITY_ESTIMATED = {'At', 'Fr'}
DENSITY_MEASURED_UNTIL = 99


def fmt(v, digits):
    return 'null' if v is None else f'{round(v, digits):g}'


def main():
    lines = []
    for z in range(1, 119):
        e = element(z)
        shells = list(e.ec.electrons_per_shell().values())
        # パラジウム (4d¹⁰) は第5周期なのに O殻に電子がない。周期と同じ数の電子殻になるよう 0 を足す
        shells += [0] * (e.period - len(shells))
        predicted = z >= PREDICTED_FROM
        en = e.electronegativity('pauling')
        ie = e.ionenergies.get(1)
        ie_kj = None if ie is None or z > IE_MEASURED_UNTIL else ie * EV_TO_KJ_PER_MOL
        density = e.density
        if density is not None and (e.symbol in DENSITY_ESTIMATED or z > DENSITY_MEASURED_UNTIL):
            density = None
        assert sum(shells) == z, e.symbol
        lines.append(
            f"  {e.symbol}: {{ shells: [{', '.join(map(str, shells))}], electronegativity: {fmt(en, 2)}, "
            f"ionizationEnergy: {fmt(ie_kj, 0)}, density: {'null' if density is None else f'{density:.4g}'}"
            + (', predicted: true' if predicted else '') + ' },'
        )
    OUT.write_text(
        '// 自動生成: scripts/generate-element-properties.py (データ: mendeleev パッケージ)。手で編集しない\n'
        '// shells: K殻から順に入っている電子の数、electronegativity: ポーリングの電気陰性度、\n'
        '// ionizationEnergy: 第一イオン化エネルギー (kJ/mol)、density: 25℃・1気圧での密度 (g/cm³。気体も同じ単位)、\n'
        '// predicted: 電子配置が実験で確かめられていない予測値。値がわからないものは null\n'
        'export interface ElementProperties {\n'
        '  shells: number[];\n'
        '  electronegativity: number | null;\n'
        '  ionizationEnergy: number | null;\n'
        '  density: number | null;\n'
        '  predicted?: boolean;\n'
        '}\n\n'
        'export const ELEMENT_PROPERTIES: Record<string, ElementProperties> = {\n'
        + '\n'.join(lines)
        + '\n};\n'
    )


if __name__ == '__main__':
    main()
