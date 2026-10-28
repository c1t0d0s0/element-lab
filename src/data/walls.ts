// 壁の種類 (強度)。弱い壁は大きな爆発で壊れ、耐熱壁はどんな爆発でも壊れない

export type WallTypeId = 'wall_wood' | 'wall_brick' | 'wall_concrete' | 'wall';
export type WallPattern = 'wood' | 'brick' | 'concrete' | 'heatproof';

export interface WallType {
  id: WallTypeId;
  nameJa: string;
  nameEn: string;
  descJa: string;
  descEn: string;
  stars: number; // 強さの星 (1〜4)
  breakImpact: number; // この衝撃以上の爆発を受けると壊れる (Infinity は壊れない)
  color: string; // 地の色
  edgeColor: string; // 縁・模様の色
  pattern: WallPattern;
}

// 並び順は弱い順 (壁パレットの表示順)
export const WALL_TYPE_IDS: WallTypeId[] = ['wall_wood', 'wall_brick', 'wall_concrete', 'wall'];

export const WALL_TYPES: Record<WallTypeId, WallType> = {
  wall_wood: {
    id: 'wall_wood',
    nameJa: '木の壁',
    nameEn: 'Wooden Wall',
    descJa: '小さな爆発でもこわれてしまう、いちばん弱い壁です。',
    descEn: 'The weakest wall. Even a small explosion breaks it.',
    stars: 1,
    breakImpact: 1.5,
    color: '#B45309',
    edgeColor: '#78350F',
    pattern: 'wood'
  },
  wall_brick: {
    id: 'wall_brick',
    nameJa: 'れんがの壁',
    nameEn: 'Brick Wall',
    descJa: '小さな爆発ではこわれない（ひびが入るだけ）けれど、大きな爆発ではこわれます。',
    descEn: 'A small explosion only cracks it, but a big explosion breaks it.',
    stars: 2,
    breakImpact: 4,
    color: '#B91C1C',
    edgeColor: '#E7D3C0',
    pattern: 'brick'
  },
  wall_concrete: {
    id: 'wall_concrete',
    nameJa: 'コンクリートの壁',
    nameEn: 'Concrete Wall',
    descJa: 'とてもじょうぶな壁です。テルミット反応のような、とても大きな爆発でないとこわれません。',
    descEn: 'A very strong wall. Only a huge explosion, like the thermite reaction, can break it.',
    stars: 3,
    breakImpact: 7,
    color: '#9CA3AF',
    edgeColor: '#6B7280',
    pattern: 'concrete'
  },
  wall: {
    id: 'wall',
    nameJa: '耐熱壁',
    nameEn: 'Thermal Wall',
    descJa: '熱と粒子を遮断する耐熱壁です。どんな爆発でもこわれません。',
    descEn: 'Heat-resistant insulating barrier wall. No explosion can break it.',
    stars: 4,
    breakImpact: Infinity,
    color: '#475569',
    edgeColor: '#64748B',
    pattern: 'heatproof'
  }
};

// 壁ブロック1個の大きさ (px)。壁はこの格子にそろえて置く
export const WALL_BLOCK = 24;
// 一度に置ける壁の幅・高さ (ブロック数) の上限
export const MAX_WALL_SIZE = 6;
// 強度のこの割合以上の衝撃でひびが入り、ひびの入った壁はこの割合の衝撃で壊れる
export const WALL_CRACK_RATIO = 0.6;

export function isWallTypeId(id: string): id is WallTypeId {
  return (WALL_TYPE_IDS as string[]).includes(id);
}

export function getWallType(id: string): WallType {
  return isWallTypeId(id) ? WALL_TYPES[id] : WALL_TYPES.wall;
}

// 爆発の強さ (反応熱 ÷ 40) と中心からの距離から、壁が受ける衝撃を求める。遠いほど弱く、届かなければ 0
export function wallImpact(power: number, dist: number): number {
  const reach = 40 + power * 10;
  return Math.max(0, power * (1 - dist / reach));
}
