// 溶解度: 水 100 g に溶ける物質の最大の質量 (g)。[温度 (°C), 溶解度 (g)] を温度の低い順に並べる。
// 中学1年の溶解度曲線で使われる値 (理科年表など)。10℃ごとの値の間は直線でつなぐ。表の範囲の外は、いちばん端の値のままとする
export const SOLUBILITY_TABLES: Record<string, [number, number][]> = {
  NaCl: [[0, 35.7], [10, 35.7], [20, 35.8], [30, 36.1], [40, 36.3], [50, 36.7], [60, 37.1], [70, 37.5], [80, 38.0], [90, 38.5], [100, 39.3]],
  KNO3: [[0, 13.3], [10, 22.0], [20, 31.6], [30, 45.6], [40, 63.9], [50, 85.2], [60, 109.2], [70, 138], [80, 168.8], [90, 202], [100, 245]],
  // ミョウバンは結晶 (AlK(SO₄)₂·12H₂O) の質量で表した値 (教科書の表と同じ)。92.5℃で自分の結晶水に溶けるので 80℃まで
  Alum: [[0, 5.7], [10, 7.6], [20, 11.4], [30, 16.6], [40, 23.8], [50, 36.4], [60, 57.4], [70, 110], [80, 321.6]],
  Sucrose: [[0, 179.2], [10, 190.5], [20, 203.9], [30, 219.5], [40, 238.1], [50, 260.4], [60, 287.3], [70, 320.5], [80, 362.1], [90, 415.7], [100, 487.2]]
};

// 水の粒1つの質量 (u)
export const WATER_PARTICLE_MASS = 18.02;

// 画面の水の粒は少ないので、溶ける量を本当の4倍にして見やすくしている。
// 物質どうしの溶けやすさの比や、温度による変わり方は本当の溶解度のまま
export const SOLUBILITY_GAME_SCALE = 4;

export function isSolute(compoundId: string): boolean {
  return compoundId in SOLUBILITY_TABLES;
}

// その温度での溶解度 (g / 水 100 g)。溶解度の表がない物質は null
export function getSolubility(compoundId: string, temperature: number): number | null {
  const table = SOLUBILITY_TABLES[compoundId];
  if (!table) return null;
  if (temperature <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [t1, s1] = table[i];
    if (temperature <= t1) {
      const [t0, s0] = table[i - 1];
      return s0 + ((s1 - s0) * (temperature - t0)) / (t1 - t0);
    }
  }
  return table[table.length - 1][1];
}

// 水の粒が waterCount 個ある水溶液に、その温度で溶けていられる溶質の粒の数 (小数)
export function soluteCapacity(compoundId: string, soluteMolarMass: number, waterCount: number, temperature: number): number {
  const s = getSolubility(compoundId, temperature);
  if (s === null) return 0;
  return (waterCount * WATER_PARTICLE_MASS * (s / 100) * SOLUBILITY_GAME_SCALE) / soluteMolarMass;
}
