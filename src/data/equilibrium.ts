// 反応速度と化学平衡 (高校 化学): H₂ + I₂ ⇄ 2HI を、速度式とアレニウスの式で時間を追って計算する。
// 正反応 v₁ = k₁[H₂][I₂]、逆反応 v₂ = k₂[HI]²。k = A·exp(−Ea/RT)

export const R = 8.314; // J/(K·mol)
// 正反応・逆反応の活性化エネルギー (J/mol) と頻度因子 (L/(mol·s))。
// 425℃ (698 K) で k₁ ≈ 0.06、平衡定数 K ≈ 54 になるように合わせている。反応熱は Ea₁ − Ea₂ = −9.4 kJ (発熱)
export const EA_FORWARD = 165_000;
export const EA_REVERSE = 174_400;
export const A_FORWARD = 1.3e11;
export const A_REVERSE = 1.24e10;

export const toKelvin = (c: number) => c + 273.15;

export function forwardRateConstant(tempC: number): number {
  return A_FORWARD * Math.exp(-EA_FORWARD / (R * toKelvin(tempC)));
}

export function reverseRateConstant(tempC: number): number {
  return A_REVERSE * Math.exp(-EA_REVERSE / (R * toKelvin(tempC)));
}

// 平衡定数 K = k₁ / k₂ = [HI]² / ([H₂][I₂])
export function equilibriumConstant(tempC: number): number {
  return forwardRateConstant(tempC) / reverseRateConstant(tempC);
}

// 濃度 (mol/L)
export interface EquilibriumState {
  h2: number;
  i2: number;
  hi: number;
}

export function forwardRate(s: EquilibriumState, tempC: number): number {
  return forwardRateConstant(tempC) * s.h2 * s.i2;
}

export function reverseRate(s: EquilibriumState, tempC: number): number {
  return reverseRateConstant(tempC) * s.hi * s.hi;
}

// dt 秒だけ進める (4次のルンゲ・クッタ法)。x は正反応が進んだ量 (mol/L): H₂ と I₂ が x 減り、HI が 2x 増える。
// v₁ は H₂ が減る速さ、v₂ は H₂ ができる速さなので、x の増える速さは v₁ − v₂
export function stepEquilibrium(s: EquilibriumState, tempC: number, dt: number): EquilibriumState {
  const rate = (x: number) => {
    const at = { h2: s.h2 - x, i2: s.i2 - x, hi: s.hi + 2 * x };
    return forwardRate(at, tempC) - reverseRate(at, tempC);
  };
  const k1 = rate(0);
  const k2 = rate((dt / 2) * k1);
  const k3 = rate((dt / 2) * k2);
  const k4 = rate(dt * k3);
  const x = (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  return { h2: Math.max(0, s.h2 - x), i2: Math.max(0, s.i2 - x), hi: Math.max(0, s.hi + 2 * x) };
}

// 平衡状態の濃度 (解析解)。H₂ と I₂ が同じ量のときは 2x / (a − x) = √K から求める
export function equilibriumState(start: EquilibriumState, tempC: number): EquilibriumState {
  const K = equilibriumConstant(tempC);
  // [HI]² = K [H₂][I₂] を、H₂・I₂ が x 減る (x < 0 なら HI が分解する) として二分法で解く
  const f = (x: number) => (start.hi + 2 * x) ** 2 - K * (start.h2 - x) * (start.i2 - x);
  let lo = -start.hi / 2;
  let hi = Math.min(start.h2, start.i2);
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const x = (lo + hi) / 2;
  return { h2: start.h2 - x, i2: start.i2 - x, hi: start.hi + 2 * x };
}

// 反応式の係数が両辺で同じ (1 + 1 = 2) なので、反応が進んでも気体の物質量は変わらない。圧力 P = (Σc)RT (kPa)
export function totalPressure(s: EquilibriumState, tempC: number): number {
  return (s.h2 + s.i2 + s.hi) * R * toKelvin(tempC);
}

// 平衡に達したとみなす: 正反応と逆反応の速さの差が、正反応の速さの 1% 以下
export function isAtEquilibrium(s: EquilibriumState, tempC: number): boolean {
  const v1 = forwardRate(s, tempC);
  const v2 = reverseRate(s, tempC);
  const big = Math.max(v1, v2);
  return big > 0 && Math.abs(v1 - v2) <= big * 0.01;
}

export const EQUILIBRIUM_TEMPS = [400, 425, 450, 500];
export const EQUILIBRIUM_CONCENTRATIONS = [0.02, 0.05, 0.1];
export type EquilibriumStart = 'reactants' | 'product';

export function initialState(start: EquilibriumStart, concentration: number): EquilibriumState {
  return start === 'reactants' ? { h2: concentration, i2: concentration, hi: 0 } : { h2: 0, i2: 0, hi: 2 * concentration };
}
