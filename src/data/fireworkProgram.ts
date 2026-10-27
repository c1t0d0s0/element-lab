import { FIREWORK_ELEMENTS, MAX_FIREWORK_COLORS } from '../engine/Fireworks';
import type { FireworkShape } from '../engine/Fireworks';

// 花火の発射プログラム (花火工房の「カスタム」)。JSON で保存・読み込みできる

export const FIREWORK_PROGRAM_FORMAT = 'element-lab-fireworks';
export const FIREWORK_PROGRAM_VERSION = 1;
export const MAX_PROGRAM_SHOTS = 100;
export const FIREWORK_PROGRAM_STORAGE_KEY = 'element_lab_firework_program';
export const FIREWORK_SHAPES: FireworkShape[] = ['chrysanthemum', 'peony', 'willow', 'double'];

export interface FireworkShot {
  time: number; // 打ち上げタイミング: 開始から何秒後か
  colors: string[]; // 色の元素 (1〜3個)
  shape: FireworkShape;
  size: number; // サイズ % (100 が標準)
  x: number; // 左右の位置 % (0 = 左端, 100 = 右端)
  height: number; // 開く高さ % (床からの高さ)
}

export interface FireworkProgram {
  format: typeof FIREWORK_PROGRAM_FORMAT;
  version: number;
  title: string;
  shots: FireworkShot[];
}

// 数値の項目ごとの範囲と刻み
export const SHOT_LIMITS = {
  time: { min: 0, max: 120, step: 0.1 },
  size: { min: 50, max: 150, step: 1 },
  x: { min: 0, max: 100, step: 1 },
  height: { min: 10, max: 95, step: 1 }
} as const;

export type ShotNumberField = keyof typeof SHOT_LIMITS;

// 読み込み時の注意 (画面の文言は UI 側で作る)。shot は 1 始まりの発の番号
export type ProgramWarning =
  | { code: 'clamped'; shot: number; field: ShotNumberField; value: number }
  | { code: 'unknownColor'; shot: number; value: string }
  | { code: 'tooManyColors'; shot: number }
  | { code: 'noColors'; shot: number }
  | { code: 'unknownShape'; shot: number; value: string }
  | { code: 'tooManyShots'; count: number };

export type ProgramParseError = 'invalidJson' | 'wrongFormat';

export type ProgramParseResult =
  | { program: FireworkProgram; warnings: ProgramWarning[] }
  | { error: ProgramParseError };

export function createShot(partial: Partial<FireworkShot> = {}): FireworkShot {
  return { time: 0, colors: ['Sr'], shape: 'chrysanthemum', size: 100, x: 50, height: 70, ...partial, ...(partial.colors ? { colors: [...partial.colors] } : {}) };
}

export function createProgram(title: string, shots: FireworkShot[] = []): FireworkProgram {
  return { format: FIREWORK_PROGRAM_FORMAT, version: FIREWORK_PROGRAM_VERSION, title, shots };
}

// 最初に入っているサンプル: 左右から順に上がり、最後に真ん中で大きな柳
export function sampleProgram(title: string): FireworkProgram {
  return createProgram(title, [
    createShot({ time: 0, colors: ['Sr'], shape: 'chrysanthemum', x: 20, height: 60 }),
    createShot({ time: 0.8, colors: ['Ba'], shape: 'peony', x: 80, height: 60 }),
    createShot({ time: 1.6, colors: ['Cu', 'Na'], shape: 'double', x: 35, height: 75, size: 90 }),
    createShot({ time: 2.4, colors: ['Ca', 'Sr'], shape: 'chrysanthemum', x: 65, height: 75, size: 90 }),
    createShot({ time: 3.6, colors: ['Mg', 'Sr', 'Ba'], shape: 'willow', x: 50, height: 85, size: 130 })
  ]);
}

// プログラム全体の長さ (最後の発の打ち上げ時刻, 秒)
export function programDuration(p: FireworkProgram): number {
  return p.shots.reduce((m, s) => Math.max(m, s.time), 0);
}

export function maxColorsInProgram(p: FireworkProgram): number {
  return p.shots.reduce((m, s) => Math.max(m, s.colors.length), 0);
}

export function sortShotsByTime(p: FireworkProgram): FireworkProgram {
  return { ...p, shots: [...p.shots].sort((a, b) => a.time - b.time) };
}

export function serializeFireworkProgram(p: FireworkProgram): string {
  return JSON.stringify(p, null, 2);
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// 数値を範囲内に収める。範囲外・数値でない時は警告を出す
function clampField(raw: unknown, field: ShotNumberField, fallback: number, shot: number, warnings: ProgramWarning[]): number {
  const { min, max, step } = SHOT_LIMITS[field];
  const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : NaN;
  if (Number.isNaN(n)) {
    warnings.push({ code: 'clamped', shot, field, value: fallback });
    return fallback;
  }
  const clamped = Math.min(max, Math.max(min, n));
  if (clamped !== n) warnings.push({ code: 'clamped', shot, field, value: clamped });
  // 0.1 秒刻みなどにそろえる (浮動小数点の誤差を消す)
  return Number(roundToStep(clamped, step).toFixed(step < 1 ? 1 : 0));
}

function sanitizeShot(raw: unknown, shot: number, warnings: ProgramWarning[]): FireworkShot {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const defaults = createShot();

  const colors: string[] = [];
  const rawColors = Array.isArray(r.colors) ? r.colors : [];
  for (const c of rawColors) {
    if (typeof c === 'string' && FIREWORK_ELEMENTS.includes(c)) {
      if (!colors.includes(c)) colors.push(c);
    } else {
      warnings.push({ code: 'unknownColor', shot, value: String(c) });
    }
  }
  if (colors.length > MAX_FIREWORK_COLORS) {
    colors.length = MAX_FIREWORK_COLORS;
    warnings.push({ code: 'tooManyColors', shot });
  }
  if (colors.length === 0) {
    colors.push(defaults.colors[0]);
    warnings.push({ code: 'noColors', shot });
  }

  let shape = defaults.shape;
  if (typeof r.shape === 'string' && (FIREWORK_SHAPES as string[]).includes(r.shape)) {
    shape = r.shape as FireworkShape;
  } else {
    warnings.push({ code: 'unknownShape', shot, value: String(r.shape) });
  }

  return {
    time: clampField(r.time, 'time', defaults.time, shot, warnings),
    colors,
    shape,
    size: clampField(r.size, 'size', defaults.size, shot, warnings),
    x: clampField(r.x, 'x', defaults.x, shot, warnings),
    height: clampField(r.height, 'height', defaults.height, shot, warnings)
  };
}

export function parseFireworkProgram(text: string): ProgramParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'invalidJson' };
  }
  if (!data || typeof data !== 'object' || (data as Record<string, unknown>).format !== FIREWORK_PROGRAM_FORMAT || !Array.isArray((data as Record<string, unknown>).shots)) {
    return { error: 'wrongFormat' };
  }
  const d = data as Record<string, unknown>;
  const warnings: ProgramWarning[] = [];
  let rawShots = d.shots as unknown[];
  if (rawShots.length > MAX_PROGRAM_SHOTS) {
    warnings.push({ code: 'tooManyShots', count: rawShots.length });
    rawShots = rawShots.slice(0, MAX_PROGRAM_SHOTS);
  }
  const title = typeof d.title === 'string' ? d.title.slice(0, 60) : '';
  const shots = rawShots.map((s, i) => sanitizeShot(s, i + 1, warnings));
  return { program: createProgram(title, shots), warnings };
}
