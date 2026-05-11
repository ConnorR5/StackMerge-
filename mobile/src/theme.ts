/**
 * Themes — colors only. Keep tile colors consistent across themes; only the
 * surrounding chrome shifts. This way the merge progression always reads.
 */

export type ThemeId = 'dawn' | 'forest' | 'ocean' | 'midnight';

export interface Theme {
  id: ThemeId;
  bg: string;
  ink: string;
  inkSoft: string;
  inkDim: string;
  accent: string;
  cell: string;
  cellBorder: string;
  grain: string;
  swatches: string[];
}

export const THEMES: Record<ThemeId, Theme> = {
  dawn: {
    id: 'dawn',
    bg: '#f4f1ea',
    ink: '#1a1612',
    inkSoft: 'rgba(26, 22, 18, 0.08)',
    inkDim: 'rgba(26, 22, 18, 0.5)',
    accent: '#d94f3a',
    cell: 'rgba(26, 22, 18, 0.04)',
    cellBorder: 'rgba(26, 22, 18, 0.08)',
    grain: 'rgba(26, 22, 18, 0.015)',
    swatches: ['#e8a87c', '#d94f3a', '#1a1612', '#f4f1ea'],
  },
  forest: {
    id: 'forest',
    bg: '#ecefe2',
    ink: '#1f2a1c',
    inkSoft: 'rgba(31, 42, 28, 0.08)',
    inkDim: 'rgba(31, 42, 28, 0.5)',
    accent: '#5a8b3a',
    cell: 'rgba(31, 42, 28, 0.05)',
    cellBorder: 'rgba(31, 42, 28, 0.1)',
    grain: 'rgba(31, 42, 28, 0.02)',
    swatches: ['#c4d1a4', '#5a8b3a', '#1f2a1c', '#ecefe2'],
  },
  ocean: {
    id: 'ocean',
    bg: '#e8eef2',
    ink: '#142838',
    inkSoft: 'rgba(20, 40, 56, 0.08)',
    inkDim: 'rgba(20, 40, 56, 0.5)',
    accent: '#2a8aa8',
    cell: 'rgba(20, 40, 56, 0.05)',
    cellBorder: 'rgba(20, 40, 56, 0.1)',
    grain: 'rgba(20, 40, 56, 0.02)',
    swatches: ['#9bc7d4', '#2a8aa8', '#142838', '#e8eef2'],
  },
  midnight: {
    id: 'midnight',
    bg: '#1a1a22',
    ink: '#e8e6df',
    inkSoft: 'rgba(232, 230, 223, 0.08)',
    inkDim: 'rgba(232, 230, 223, 0.5)',
    accent: '#ff7a5a',
    cell: 'rgba(232, 230, 223, 0.05)',
    cellBorder: 'rgba(232, 230, 223, 0.1)',
    grain: 'rgba(232, 230, 223, 0.02)',
    swatches: ['#ff7a5a', '#f4c542', '#e8e6df', '#1a1a22'],
  },
};

/**
 * Score thresholds (not tile values) — players reach these by playing well,
 * not by building specific tiles. Steps are 4× to make each unlock feel earned:
 * Forest is the first real grind (~10× the median run), Ocean is "no one has
 * done this yet" territory, Midnight effectively requires a 2048 tile.
 */
export const THEME_UNLOCK: Record<Exclude<ThemeId, 'dawn'>, number> = {
  forest: 1024,
  ocean: 4096,
  midnight: 16384,
};
