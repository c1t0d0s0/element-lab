// イオンの見える化 (中学3年「化学変化とイオン」): 電解質が水に溶ける (融ける) と分かれてできるイオン。
// 化学式1つ分の粒が、どのイオンに何個ずつ分かれるかを並べる (電離の式と同じ組み合わせ)

export interface IonSpec {
  label: string; // 画面に出す名前 (Na⁺ など)
  charge: number; // 電荷 (+1, −2 など)
  color: string; // 粒の色 (水溶液での色に近づける。銅(II)イオンは青)
}

const ION: Record<string, IonSpec> = {
  H: { label: 'H⁺', charge: 1, color: '#FCA5A5' },
  Li: { label: 'Li⁺', charge: 1, color: '#FDA4AF' },
  Na: { label: 'Na⁺', charge: 1, color: '#FDBA74' },
  K: { label: 'K⁺', charge: 1, color: '#D8B4FE' },
  Ag: { label: 'Ag⁺', charge: 1, color: '#E2E8F0' },
  Mg: { label: 'Mg²⁺', charge: 2, color: '#F1F5F9' },
  Ca: { label: 'Ca²⁺', charge: 2, color: '#FED7AA' },
  Ba: { label: 'Ba²⁺', charge: 2, color: '#BBF7D0' },
  Cu: { label: 'Cu²⁺', charge: 2, color: '#38BDF8' },
  Zn: { label: 'Zn²⁺', charge: 2, color: '#CBD5E1' },
  Fe2: { label: 'Fe²⁺', charge: 2, color: '#BEF264' },
  Al: { label: 'Al³⁺', charge: 3, color: '#E2E8F0' },
  Cl: { label: 'Cl⁻', charge: -1, color: '#D9F99D' },
  OH: { label: 'OH⁻', charge: -1, color: '#A5F3FC' },
  NO3: { label: 'NO₃⁻', charge: -1, color: '#BFDBFE' },
  HCO3: { label: 'HCO₃⁻', charge: -1, color: '#C7D2FE' },
  H2PO4: { label: 'H₂PO₄⁻', charge: -1, color: '#DDD6FE' },
  CH3COO: { label: 'CH₃COO⁻', charge: -1, color: '#E9D5FF' },
  SO4: { label: 'SO₄²⁻', charge: -2, color: '#FEF08A' },
  CO3: { label: 'CO₃²⁻', charge: -2, color: '#E0E7FF' }
};

export interface IonForm {
  ions: IonSpec[];
  // 分子からなる酸 (塩化水素・硫酸など): 水に溶けたときだけイオンに分かれる (融かしただけの液体では分かれない)
  needsWater?: boolean;
  // 弱い酸: 水に溶けても、イオンに分かれるのはごく一部だけ
  weak?: boolean;
}

const f = (ions: string[], opts: Omit<IonForm, 'ions'> = {}): IonForm => ({ ions: ions.map(k => ION[k]), ...opts });

export const ION_FORMS: Record<string, IonForm> = {
  NaCl: f(['Na', 'Cl']),
  KCl: f(['K', 'Cl']),
  LiCl: f(['Li', 'Cl']),
  CuCl2: f(['Cu', 'Cl', 'Cl']),
  ZnCl2: f(['Zn', 'Cl', 'Cl']),
  CaCl2: f(['Ca', 'Cl', 'Cl']),
  MgCl2: f(['Mg', 'Cl', 'Cl']),
  FeCl2: f(['Fe2', 'Cl', 'Cl']),
  CuSO4: f(['Cu', 'SO4']),
  ZnSO4: f(['Zn', 'SO4']),
  MgSO4: f(['Mg', 'SO4']),
  FeSO4: f(['Fe2', 'SO4']),
  AgNO3: f(['Ag', 'NO3']),
  KNO3: f(['K', 'NO3']),
  NaHCO3: f(['Na', 'HCO3']),
  Na2CO3: f(['Na', 'Na', 'CO3']),
  CH3COONa: f(['Na', 'CH3COO']),
  Alum: f(['K', 'Al', 'SO4', 'SO4']),
  NaOH: f(['Na', 'OH']),
  KOH: f(['K', 'OH']),
  BaOH2: f(['Ba', 'OH', 'OH']),
  HCl: f(['H', 'Cl'], { needsWater: true }),
  HNO3: f(['H', 'NO3'], { needsWater: true }),
  H2SO4: f(['H', 'H', 'SO4'], { needsWater: true }),
  // リン酸と酢酸は弱い酸。リン酸は1段目の電離 (H₃PO₄ ⇄ H⁺ + H₂PO₄⁻) だけを示す
  H3PO4: f(['H', 'H2PO4'], { needsWater: true, weak: true }),
  CH3COOH: f(['H', 'CH3COO'], { needsWater: true, weak: true })
};

// 弱い酸の粒のうち、イオンに分かれて見せる割合 (1/WEAK_ACID_SHARE)。
// 本当の電離度 (0.1 mol/L の酢酸で約1%) より大きくして、分かれた粒が画面で見つかるようにしている
const WEAK_ACID_SHARE = 5;

export function getIonForm(compoundId: string): IonForm | undefined {
  return ION_FORMS[compoundId];
}

// 弱い酸のうち、この粒がイオンに分かれているか (粒のIDで決めるので、毎フレーム入れかわったりしない)
export function isDissociatedWeakAcid(particleId: string): boolean {
  let h = 0;
  for (let i = 0; i < particleId.length; i++) h = (h * 31 + particleId.charCodeAt(i)) | 0;
  return Math.abs(h) % WEAK_ACID_SHARE === 0;
}

// 電離の式 (例: NaCl → Na⁺ + Cl⁻、CuCl₂ → Cu²⁺ + 2Cl⁻)
export function ionEquationProducts(form: IonForm): string {
  const counts = new Map<string, number>();
  for (const ion of form.ions) counts.set(ion.label, (counts.get(ion.label) ?? 0) + 1);
  return [...counts].map(([label, n]) => (n > 1 ? `${n}${label}` : label)).join(' + ');
}
