// 気体の法則 (高校 化学): 栓をした容器の中の圧力の目安を、気体の状態方程式 PV = nRT から求める。
// ふたをしたときに閉じこめた空気 (画面には描かない) と、容器の中の気体の粒の分を足す (分圧の法則)

export const ATMOSPHERIC_PRESSURE = 101.3; // kPa
export const GAS_CONSTANT = 8.314; // J/(K·mol) = kPa·L/(K·mol)
// 気体の粒1つを 1 mmol とした目安 (250 mL の容器・25℃ で 1 粒あたり約 10 kPa)
export const PARTICLE_MMOL = 1;
// 容器の容積 (mL)。液体や固体が入っていても、気体の体積は容器の容積のままとみなす (目安)
export const CONTAINER_VOLUME_ML: Record<'erlenmeyer' | 'beaker' | 'testtube', number> = {
  erlenmeyer: 300,
  beaker: 250,
  testtube: 50
};

export const toKelvin = (c: number) => c + 273.15;

// 閉じこめた空気の分圧: 体積が一定なので、絶対温度に比例する (シャルルの法則・ボイル・シャルルの法則)
export function airPressure(tempC: number, capTempC: number): number {
  return ATMOSPHERIC_PRESSURE * Math.max(0, toKelvin(tempC)) / toKelvin(capTempC);
}

// 気体の粒の分圧: P = nRT / V (n: mmol, V: mL なので kPa になる)
export function particlePressure(gasTempsC: number[], volumeMl: number): number {
  return gasTempsC.reduce((sum, t) => sum + PARTICLE_MMOL * GAS_CONSTANT * Math.max(0, toKelvin(t)), 0) / volumeMl;
}

export function sealedPressure(airTempC: number, capTempC: number, gasTempsC: number[], volumeMl: number): number {
  return airPressure(airTempC, capTempC) + particlePressure(gasTempsC, volumeMl);
}
