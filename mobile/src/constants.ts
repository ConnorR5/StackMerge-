/**
 * Game constants. Pure values — no platform deps.
 */

export const SIZE = 4;

export const SPECIAL_WILD = -1;
export const SPECIAL_BOMB = -2;

export type TileValue = number; // power of 2 (2, 4, 8, ...) or SPECIAL_*

export const TILE_COLORS: Record<number, string> = {
  2: '#e8a87c',
  4: '#d97a4d',
  8: '#c3552c',
  16: '#a73e1f',
  32: '#7d6098',
  64: '#5a4378',
  128: '#3a8c7a',
  256: '#2a6f5e',
  512: '#d4b94e',
  1024: '#b89a2a',
  2048: '#1a1612',
  4096: '#0a0608',
};

export function colorFor(v: TileValue): string {
  if (v === SPECIAL_WILD) return '#f4c542';
  if (v === SPECIAL_BOMB) return '#1a1612';
  return TILE_COLORS[v] || '#0a0608';
}

export function tileText(v: TileValue): string {
  if (v === SPECIAL_WILD) return '★';
  if (v === SPECIAL_BOMB) return '✦';
  return String(v);
}

/** Tiles whose face needs dark text instead of white. */
export function isLightTile(v: TileValue): boolean {
  return v === 512 || v === 1024 || v === SPECIAL_WILD;
}

export type GameMode = 'classic' | 'zen' | 'race' | 'daily';

export const MODES: Array<{
  id: GameMode;
  name: string;
  desc: string;
}> = [
  { id: 'classic', name: 'Classic', desc: 'Reach 2048 · special tiles' },
  { id: 'zen', name: 'Zen', desc: 'No game over · drift forever' },
  { id: 'race', name: 'Race', desc: '60 seconds · max score' },
  { id: 'daily', name: 'Daily', desc: 'Same puzzle for everyone' },
];

export const RACE_DURATION_SEC = 60;

export const COMBO_LABELS = ['', '', 'DOUBLE!', 'TRIPLE!', 'QUAD!', 'INSANE!', 'GODLIKE!', 'UNREAL!', 'LEGENDARY!'];

export function comboLabel(chainCount: number): string {
  if (chainCount < 2) return '';
  return COMBO_LABELS[Math.min(chainCount, COMBO_LABELS.length - 1)] || 'GODLIKE!';
}
