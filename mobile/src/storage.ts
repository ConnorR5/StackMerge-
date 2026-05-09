/**
 * Persistence layer. AsyncStorage on native, localStorage on web (Expo's
 * AsyncStorage shim wraps both). Everything is JSON.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeId } from './theme';
import type { GameMode } from './constants';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  hints: boolean;
  theme: ThemeId;
}

export interface Stats {
  gamesPlayed: number;
  totalMerges: number;
  biggestTile: number;
  longestChain: number;
  totalScore: number;
}

export interface DailyResult {
  score: number;
  highest: number;
  moves: number;
}

export interface Persistent {
  settings: Settings;
  bests: Record<Exclude<GameMode, 'daily'>, number>;
  daily: Record<string, DailyResult>;
  stats: Stats;
  achievements: { unlocked: string[] };
  unlockedThemes: ThemeId[];
  seenHowTo: boolean;
}

const KEY = 'sm_persistent_v1';

const DEFAULT: Persistent = {
  settings: { sound: true, haptics: true, hints: true, theme: 'dawn' },
  bests: { classic: 0, zen: 0, race: 0 },
  daily: {},
  stats: { gamesPlayed: 0, totalMerges: 0, biggestTile: 2, longestChain: 1, totalScore: 0 },
  achievements: { unlocked: [] },
  unlockedThemes: ['dawn'],
  seenHowTo: false,
};

export async function loadPersistent(): Promise<Persistent> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    // Shallow-merge with defaults so new fields appear after upgrades
    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
      bests: { ...DEFAULT.bests, ...(parsed.bests || {}) },
      stats: { ...DEFAULT.stats, ...(parsed.stats || {}) },
      achievements: { ...DEFAULT.achievements, ...(parsed.achievements || {}) },
    };
  } catch {
    return { ...DEFAULT };
  }
}

export async function savePersistent(p: Persistent): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // best-effort
  }
}

export async function resetPersistent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
