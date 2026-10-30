// 端末の「視差効果を減らす」「アニメーションを減らす」設定 (prefers-reduced-motion)。
// 設定があるときは、画面の揺れをなくし、爆発・閃光・花火の強い光と点滅を弱める (光に敏感な子どものため)

// 設定があるときの、閃光・爆発の光の強さ (ふつうを 1 として)
export const REDUCED_FLASH_ALPHA = 0.35;

let query: MediaQueryList | null | undefined;

// 設定は開いている間にも変えられるので、そのつど調べる
export function prefersReducedMotion(): boolean {
  if (query === undefined) query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  return query?.matches ?? false;
}

// 閃光・爆発の光の強さにかける割合
export function flashScale(): number {
  return prefersReducedMotion() ? REDUCED_FLASH_ALPHA : 1;
}
