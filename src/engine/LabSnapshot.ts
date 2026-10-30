import { Particle, ParticleKind, MatterState } from './Particle';
import { PhysicsWorld, GlassContainer, MAX_CHEMICAL_PARTICLES, ERLENMEYER, BEAKER, TESTTUBE, chamberBoundsFor } from './PhysicsWorld';
import { ELEMENTS_DATA } from '../data/elements';
import { COMPOUNDS_DATA } from '../data/compounds';
import { isWallTypeId } from '../data/walls';

// 実験室のようす (粒子・ガラス器具・天秤・壁) を記録して、あとで同じ配置に戻す。
// 「元に戻す」と、ブラウザへの保存・URL での共有に使う。
// 位置はチャンバーの床の中央からの距離で記録するので、画面の大きさがちがっても同じ並びになる

const KINDS: ParticleKind[] = ['element', 'compound', 'wall'];
const STATES: MatterState[] = ['solid', 'liquid', 'gas'];
const FLASK_TYPES: GlassContainer['type'][] = ['erlenmeyer', 'beaker', 'testtube'];

// 粒子: [種類, 元素記号・化合物ID・壁の種類, x, y, 温度, 状態, フラグ, サビの進み具合]
type ParticleRecord = [number, string, number, number, number, number, number, number];
// ガラス器具: [種類, x, y, 温度, 蓋, 蓋をしたときの温度, 電極, ダニエル電池の亜鉛板の残り (電池でなければ -1)]
type ContainerRecord = [number, number, number, number, number, number, number, number];
// 天秤: [x, y, 水平に固定しているか]
type BalanceRecord = [number, number, number];

export interface LabSnapshot {
  v: 1;
  w: number; // 記録したときのチャンバーの幅と高さ
  h: number;
  p: ParticleRecord[];
  c: ContainerRecord[];
  b: BalanceRecord[];
}

const FLAG_DISSOLVED = 1;
const FLAG_IONIZED = 2;
const FLAG_CRACKED = 4;

// 共有 URL から読みこむ数の上限 (壁はブロックの数)
const MAX_WALLS = 3000;
const MAX_CONTAINERS = 40;
const MAX_BALANCES = 10;
// 天秤はチャンバーの左右のはしから 130px より内側に置かれる
const BALANCE_HALF = 130;

// 位置と温度は整数にまるめる (共有 URL や QR コードを短くするため。1px・1℃ のちがいは見た目に出ない)
const roundInt = (n: number) => Math.round(n);

export function captureLab(world: PhysicsWorld): LabSnapshot {
  const { minX, maxX, maxY, minY } = world.chamber;
  const ox = (minX + maxX) / 2;
  const p: ParticleRecord[] = [];
  for (const q of world.particles) {
    const kind = KINDS.indexOf(q.kind);
    if (kind < 0 || (q.kind === 'wall' && !isWallTypeId(q.symbolOrId))) continue;
    const flags = (q.dissolved ? FLAG_DISSOLVED : 0) | (q.ionized ? FLAG_IONIZED : 0) | (q.cracked ? FLAG_CRACKED : 0);
    p.push([kind, q.symbolOrId, roundInt(q.x - ox), roundInt(q.y - maxY), roundInt(q.temperature), Math.max(0, STATES.indexOf(q.state)), flags, Math.round(q.rustProgress * 100) / 100]);
  }
  const c: ContainerRecord[] = world.containers.map(k => [
    FLASK_TYPES.indexOf(k.type), roundInt(k.cx - ox), roundInt(k.cy - maxY), roundInt(k.temperature),
    k.hasCap ? 1 : 0, roundInt(k.capTemperature), k.electrodes ? 1 : 0, k.cell ? k.cell.zinc : -1
  ]);
  const b: BalanceRecord[] = world.balances.map(k => [roundInt(k.cx - ox), roundInt(k.cy - maxY), k.isLocked ? 1 : 0]);
  return { v: 1, w: Math.round(maxX - minX), h: Math.round(maxY - minY), p, c, b };
}

function flaskHalf(type: GlassContainer['type']): number {
  return type === 'erlenmeyer' ? ERLENMEYER.baseHalf : type === 'beaker' ? BEAKER.half : TESTTUBE.half;
}

function flaskHeight(type: GlassContainer['type']): number {
  return type === 'erlenmeyer' ? ERLENMEYER.height : type === 'beaker' ? BEAKER.height : TESTTUBE.height;
}

// 粒の半径の目安 (はしに置いた粒がケースの壁にめりこまないように、はばにふくめる)
const PARTICLE_MARGIN = 16;
// 天秤の台から皿までの高さ (restoreLab で天秤を床から上に置くときの余白と同じ)
const BALANCE_HEIGHT = 160;

// 記録した実験がおさまるのに必要なチャンバーの幅と高さ (px)
export function snapshotExtent(snap: LabSnapshot): { width: number; height: number } {
  let left = Infinity;
  let right = -Infinity;
  let height = 0;
  const add = (x: number, half: number, top: number) => {
    left = Math.min(left, x - half);
    right = Math.max(right, x + half);
    height = Math.max(height, top);
  };
  for (const r of snap.p) add(r[2], PARTICLE_MARGIN, -r[3] + PARTICLE_MARGIN);
  for (const r of snap.c) add(r[1], flaskHalf(FLASK_TYPES[r[0]]), -r[2] + flaskHeight(FLASK_TYPES[r[0]]));
  for (const r of snap.b) add(r[0], BALANCE_HALF, -r[1] + BALANCE_HEIGHT);
  return { width: left <= right ? right - left : 0, height };
}

// 実験室をどこまで小さく表示するか (1 = 等倍)。これより大きな実験は、入りきらない分を読みこまない
export const MIN_LAB_ZOOM = 0.3;

// 画面 (幅 viewWidth・高さ viewHeight) に記録した実験が全部おさまる、いちばん大きな表示の倍率 (1 以下)。
// 大きな画面で作った実験をスマートフォンで開いたときは、実験室を広くして小さく表示する
export function fitLabZoom(snap: LabSnapshot, viewWidth: number, viewHeight: number): number {
  const need = snapshotExtent(snap);
  const fits = (zoom: number) => {
    const b = chamberBoundsFor(viewWidth / zoom, viewHeight / zoom);
    return need.width <= b.maxX - b.minX && need.height <= b.maxY - b.minY;
  };
  let zoom = 1;
  while (zoom > MIN_LAB_ZOOM && !fits(zoom)) zoom = Math.max(MIN_LAB_ZOOM, Math.floor(zoom * 95) / 100);
  return zoom;
}

// 記録したようすを実験室に戻す。いまのものはすべて消える。チャンバーに入りきらなかった数を返す
export function restoreLab(world: PhysicsWorld, snap: LabSnapshot, newParticleId: () => string): { dropped: number } {
  world.clear();
  const { minX, maxX, minY, maxY } = world.chamber;
  const ox = (minX + maxX) / 2;
  const lo = minX - ox;
  const hi = maxX - ox;

  // 全体の左右のはばを調べ、いまのチャンバーに入るように横にずらす (入りきらなければ真ん中にそろえる)
  let left = Infinity;
  let right = -Infinity;
  const extend = (x: number, half: number) => { left = Math.min(left, x - half); right = Math.max(right, x + half); };
  for (const r of snap.p) extend(r[2], 0);
  for (const r of snap.c) extend(r[1], flaskHalf(FLASK_TYPES[r[0]]));
  for (const r of snap.b) extend(r[0], BALANCE_HALF);
  let shift = 0;
  if (left <= right) {
    shift = right - left <= hi - lo
      ? Math.min(Math.max(0, lo - left), hi - right)
      : (lo + hi) / 2 - (left + right) / 2;
  }
  let dropped = 0;
  const fitsX = (x: number, half: number) => x - half >= lo - 0.5 && x + half <= hi + 0.5;
  const toY = (y: number, top: number) => Math.min(maxY, Math.max(minY + top, maxY + y));

  for (const r of snap.b) {
    const x = r[0] + shift;
    if (!fitsX(x, BALANCE_HALF)) { dropped++; continue; }
    const bal = world.spawnBalance(ox + x, toY(r[1], BALANCE_HEIGHT));
    bal.isLocked = r[2] === 1;
  }
  for (const r of snap.c) {
    const type = FLASK_TYPES[r[0]];
    const x = r[1] + shift;
    if (!fitsX(x, flaskHalf(type))) { dropped++; continue; }
    const c = world.placeFlask(ox + x, toY(r[2], 150), type);
    c.temperature = r[3];
    if (r[4] === 1) {
      world.setFlaskCap(c, true);
      c.capTemperature = r[5];
    }
    if (type === 'beaker' && r[7] >= 0) {
      world.setCell(c, true);
      if (c.cell) c.cell.zinc = r[7];
    } else if (type === 'beaker' && r[6] === 1) {
      c.electrodes = true;
    }
  }
  for (const r of snap.p) {
    const x = r[2] + shift;
    if (!fitsX(x, 0)) { dropped++; continue; }
    const kind = KINDS[r[0]];
    const p = new Particle(kind === 'wall' ? `wall_${newParticleId()}` : newParticleId(), kind, r[1], ox + x, toY(r[3], 0), r[4]);
    if (kind !== 'wall') {
      p.state = STATES[r[5]];
      p.dissolved = (r[6] & FLAG_DISSOLVED) !== 0;
      p.ionized = (r[6] & FLAG_IONIZED) !== 0;
      p.rustProgress = r[7];
      p.updateStateByTemperature(false);
    } else {
      p.cracked = (r[6] & FLAG_CRACKED) !== 0;
    }
    world.addParticle(p);
  }
  return { dropped };
}

// 共有 URL などから読んだ記録が正しい形か調べ、知らない物質や多すぎる数を取りのぞく (壊れていれば null)
export function sanitizeSnapshot(data: unknown): LabSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.v !== 1 || !Array.isArray(d.p) || !Array.isArray(d.c) || !Array.isArray(d.b)) return null;
  const num = (n: unknown, lo: number, hi: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  const coord = (n: unknown) => num(n, -10000, 10000);
  const temp = (n: unknown) => num(n, -273.15, 10000);
  const intIn = (n: unknown, lo: number, hi: number) => num(n, lo, hi) && Number.isInteger(n);

  const p: ParticleRecord[] = [];
  let chemicals = 0;
  let walls = 0;
  for (const r of d.p) {
    if (!Array.isArray(r) || r.length !== 8) continue;
    const [k, id, x, y, t, st, f, rust] = r;
    if (!intIn(k, 0, 2) || typeof id !== 'string' || !coord(x) || !coord(y) || !temp(t) || !intIn(st, 0, 2) || !intIn(f, 0, 7) || !num(rust, 0, 1)) continue;
    const kind = KINDS[k];
    if (kind === 'element' ? !Object.hasOwn(ELEMENTS_DATA, id) : kind === 'compound' ? !Object.hasOwn(COMPOUNDS_DATA, id) : !isWallTypeId(id)) continue;
    if (kind === 'wall' ? ++walls > MAX_WALLS : ++chemicals > MAX_CHEMICAL_PARTICLES) continue;
    p.push([k, id, x, y, t, st, f, rust]);
  }
  const c: ContainerRecord[] = [];
  for (const r of d.c.slice(0, MAX_CONTAINERS)) {
    if (!Array.isArray(r) || r.length !== 8) continue;
    const [k, x, y, t, cap, capT, el, zinc] = r;
    if (!intIn(k, 0, 2) || !coord(x) || !coord(y) || !temp(t) || !intIn(cap, 0, 1) || !temp(capT) || !intIn(el, 0, 1) || !intIn(zinc, -1, 100)) continue;
    c.push([k, x, y, t, cap, capT, el, zinc]);
  }
  const b: BalanceRecord[] = [];
  for (const r of d.b.slice(0, MAX_BALANCES)) {
    if (!Array.isArray(r) || r.length !== 3) continue;
    const [x, y, locked] = r;
    if (!coord(x) || !coord(y) || !intIn(locked, 0, 1)) continue;
    b.push([x, y, locked]);
  }
  return { v: 1, w: num(d.w, 0, 10000) ? d.w : 0, h: num(d.h, 0, 10000) ? d.h : 0, p, c, b };
}

export function isEmptySnapshot(snap: LabSnapshot): boolean {
  return snap.p.length === 0 && snap.c.length === 0 && snap.b.length === 0;
}

// --- 共有 URL 用の文字列 (JSON を deflate で縮めて、URL に使える base64 にする) ---

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// limit を超えたら途中でやめて null (小さな文字列が大きくふくらむ壊れたデータを読まないように)
async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array | null> {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function encodeSnapshot(snap: LabSnapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(snap));
  return toBase64Url((await pipe(json, new CompressionStream('deflate-raw')))!);
}

// 壊れた文字列や大きすぎる文字列は null
export async function decodeSnapshot(text: string): Promise<LabSnapshot | null> {
  if (!/^[A-Za-z0-9_-]{1,200000}$/.test(text)) return null;
  try {
    const bytes = await pipe(fromBase64Url(text), new DecompressionStream('deflate-raw'), 2_000_000);
    if (!bytes) return null;
    return sanitizeSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

// URL の #lab=... の部分
export const SHARE_HASH_PREFIX = '#lab=';

// --- 元に戻す ---

const UNDO_LIMIT = 30;

export class UndoHistory {
  private stack: LabSnapshot[] = [];

  public push(snap: LabSnapshot) {
    this.stack.push(snap);
    if (this.stack.length > UNDO_LIMIT) this.stack.shift();
  }

  public pop(): LabSnapshot | null {
    return this.stack.pop() ?? null;
  }

  public get size(): number {
    return this.stack.length;
  }
}

// --- このブラウザへの保存 ---

export interface SavedLab {
  name: string;
  savedAt: number;
  snapshot: LabSnapshot;
}

const SAVED_LABS_KEY = 'element_lab_saved_experiments';
export const MAX_SAVED_LABS = 10;

export function loadSavedLabs(): SavedLab[] {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_LABS_KEY) ?? '[]');
    if (!Array.isArray(list)) return [];
    const labs: SavedLab[] = [];
    for (const item of list) {
      const snapshot = sanitizeSnapshot(item?.snapshot);
      if (!snapshot || typeof item.name !== 'string' || typeof item.savedAt !== 'number') continue;
      labs.push({ name: item.name.slice(0, 40), savedAt: item.savedAt, snapshot });
    }
    return labs;
  } catch {
    return [];
  }
}

function writeSavedLabs(labs: SavedLab[]): boolean {
  try {
    localStorage.setItem(SAVED_LABS_KEY, JSON.stringify(labs));
    return true;
  } catch {
    return false;
  }
}

// 新しいものを先頭に保存する。同じ名前があれば上書きし、上限を超えたら古いものから消す。保存できなければ false
export function saveLab(name: string, snapshot: LabSnapshot, now = Date.now()): boolean {
  const trimmed = name.trim().slice(0, 40);
  const labs = loadSavedLabs().filter(l => l.name !== trimmed);
  labs.unshift({ name: trimmed, savedAt: now, snapshot });
  return writeSavedLabs(labs.slice(0, MAX_SAVED_LABS));
}

export function deleteSavedLab(index: number): void {
  const labs = loadSavedLabs();
  labs.splice(index, 1);
  writeSavedLabs(labs);
}
