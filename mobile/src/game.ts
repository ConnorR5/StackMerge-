/**
 * Pure game model. No React, no platform APIs — just rules.
 *
 * 4x4 grid of power-of-two tiles. Each turn the player taps an empty cell;
 * the "next" tile lands there and merges with any equal neighbor, resolving
 * chain merges from the placed cell outward.
 */

import {
  SIZE,
  SPECIAL_BOMB,
  SPECIAL_WILD,
  type GameMode,
  type TileValue,
  RACE_DURATION_SEC,
} from './constants';

export type Grid = TileValue[][];

export interface GameState {
  mode: GameMode;
  grid: Grid;
  score: number;
  moves: number;
  next: TileValue;
  prev: GameSnapshot | null;
  highestTile: number;
  longestChain: number;
  mergeCount: number;
  ended: boolean;
  timeLeft: number | null; // race only
  tileSeq: number;
}

export interface GameSnapshot {
  grid: Grid;
  score: number;
  moves: number;
  next: TileValue;
  highestTile: number;
  longestChain: number;
  mergeCount: number;
}

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function newGame(mode: GameMode): GameState {
  const state: GameState = {
    mode,
    grid: emptyGrid(),
    score: 0,
    moves: 0,
    next: 0,
    prev: null,
    highestTile: 2,
    longestChain: 1,
    mergeCount: 0,
    ended: false,
    timeLeft: mode === 'race' ? RACE_DURATION_SEC : null,
    tileSeq: 0,
  };
  state.next = rollNext(state);
  return state;
}

export function rollNext(state: GameState): TileValue {
  const r = Math.random();
  const score = state.score;
  state.tileSeq += 1;

  // Specials: classic + zen only, score-gated
  if (state.mode === 'classic' || state.mode === 'zen') {
    if (score > 250 && r < 0.04) return SPECIAL_WILD;
    if (score > 600 && r >= 0.04 && r < 0.07) return SPECIAL_BOMB;
  }

  const r2 = Math.random();
  if (score > 200 && r2 < 0.08) return 8;
  if (r2 < 0.25) return 4;
  return 2;
}

export function snapshot(state: GameState): GameSnapshot {
  return {
    grid: state.grid.map((row) => row.slice()),
    score: state.score,
    moves: state.moves,
    next: state.next,
    highestTile: state.highestTile,
    longestChain: state.longestChain,
    mergeCount: state.mergeCount,
  };
}

export function applySnapshot(state: GameState, snap: GameSnapshot): void {
  state.grid = snap.grid.map((row) => row.slice());
  state.score = snap.score;
  state.moves = snap.moves;
  state.next = snap.next;
  state.highestTile = snap.highestTile;
  state.longestChain = snap.longestChain;
  state.mergeCount = snap.mergeCount;
}

export function neighbors(r: number, c: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < SIZE - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < SIZE - 1) out.push([r, c + 1]);
  return out;
}

export function findMergePartner(
  grid: Grid,
  r: number,
  c: number
): { r: number; c: number; wild: boolean } | null {
  const v = grid[r][c];
  if (v <= 0) return null;
  for (const [nr, nc] of neighbors(r, c)) {
    const nv = grid[nr][nc];
    if (nv === v) return { r: nr, c: nc, wild: false };
    if (nv === SPECIAL_WILD) return { r: nr, c: nc, wild: true };
  }
  return null;
}

export function isFull(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) return false;
  return true;
}

export function hasAnyMerge(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] > 0 && findMergePartner(grid, r, c)) return true;
    }
  }
  return false;
}

export function smallestTilePos(
  grid: Grid
): { r: number; c: number; v: number } | null {
  let bestR = -1;
  let bestC = -1;
  let bestV = Infinity;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (v > 0 && v < bestV) {
        bestV = v;
        bestR = r;
        bestC = c;
      }
    }
  }
  return bestR === -1 ? null : { r: bestR, c: bestC, v: bestV };
}

/* ============================================================
   Place + resolve. Returns a sequence of "events" the UI uses to
   drive animations + sounds + haptics.
   ============================================================ */

export type PlaceEvent =
  | { type: 'place'; r: number; c: number; value: TileValue }
  | { type: 'bomb'; r: number; c: number; destroyed: Array<{ r: number; c: number; v: number }>; gain: number }
  | { type: 'wild'; r: number; c: number; becomes: number }
  | { type: 'merge'; r: number; c: number; newValue: number; chainIndex: number; from: { r: number; c: number } }
  | { type: 'chainComplete'; r: number; c: number; chainCount: number; total: number }
  | { type: 'victory'; r: number; c: number }
  | { type: 'zenOverflow'; r: number; c: number; v: number }
  | { type: 'gameOver' };

export interface PlaceResult {
  state: GameState;
  events: PlaceEvent[];
}

export function place(prev: GameState, r: number, c: number): PlaceResult | null {
  if (prev.ended) return null;
  if (prev.grid[r][c] !== 0) return null;

  const events: PlaceEvent[] = [];
  const state: GameState = {
    ...prev,
    grid: prev.grid.map((row) => row.slice()),
    prev: snapshot(prev),
  };

  const placedKind = state.next;
  state.grid[r][c] = placedKind;
  state.moves += 1;
  events.push({ type: 'place', r, c, value: placedKind });

  if (placedKind === SPECIAL_BOMB) {
    let gain = 0;
    const destroyed: Array<{ r: number; c: number; v: number }> = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (nr === r && nc === c) continue;
        const v = state.grid[nr][nc];
        if (v > 0) {
          gain += v;
          destroyed.push({ r: nr, c: nc, v });
        }
      }
    }
    state.grid[r][c] = 0;
    destroyed.forEach((d) => (state.grid[d.r][d.c] = 0));
    state.score += gain;
    events.push({ type: 'bomb', r, c, destroyed, gain });
    finishTurn(state, events);
    return { state, events };
  }

  if (placedKind === SPECIAL_WILD) {
    let copy = 0;
    for (const [nr, nc] of neighbors(r, c)) {
      const nv = state.grid[nr][nc];
      if (nv > 0) {
        copy = nv;
        break;
      }
    }
    const becomes = copy === 0 ? 2 : copy;
    state.grid[r][c] = becomes;
    events.push({ type: 'wild', r, c, becomes });
  }

  let totalGained = 0;
  let chainCount = 0;

  while (true) {
    const partner = findMergePartner(state.grid, r, c);
    if (!partner) break;

    const placedVal = state.grid[r][c];
    const newVal = placedVal * 2;
    state.score += newVal;
    totalGained += newVal;
    chainCount += 1;
    state.mergeCount += 1;

    state.grid[partner.r][partner.c] = 0;
    state.grid[r][c] = newVal;

    if (newVal > state.highestTile) state.highestTile = newVal;
    if (chainCount > state.longestChain) state.longestChain = chainCount;

    events.push({
      type: 'merge',
      r,
      c,
      newValue: newVal,
      chainIndex: chainCount,
      from: { r: partner.r, c: partner.c },
    });

    if (newVal === 2048) events.push({ type: 'victory', r, c });
  }

  if (chainCount > 0) {
    events.push({ type: 'chainComplete', r, c, chainCount, total: totalGained });
  }

  finishTurn(state, events);
  return { state, events };
}

function finishTurn(state: GameState, events: PlaceEvent[]): void {
  state.next = rollNext(state);

  if (isFull(state.grid) && !hasAnyMerge(state.grid)) {
    if (state.mode === 'zen' || state.mode === 'race') {
      // Race can deadlock if the board fills with no possible merges
      // before the timer hits 0. Use the same overflow valve as zen so
      // the player can keep racing instead of waiting it out.
      const small = smallestTilePos(state.grid);
      if (small) {
        state.grid[small.r][small.c] = 0;
        events.push({ type: 'zenOverflow', r: small.r, c: small.c, v: small.v });
      }
    } else {
      state.ended = true;
      events.push({ type: 'gameOver' });
    }
  }
}

export function tickRace(state: GameState, dtSec: number): GameState {
  if (state.mode !== 'race' || state.ended || state.timeLeft == null) return state;
  const left = Math.max(0, state.timeLeft - dtSec);
  const next = { ...state, timeLeft: left };
  if (left <= 0) {
    next.ended = true;
  }
  return next;
}

export function undo(state: GameState): GameState | null {
  if (!state.prev || state.mode === 'race') return null;
  const next = { ...state };
  applySnapshot(next, state.prev);
  next.prev = null;
  next.ended = false;
  return next;
}
