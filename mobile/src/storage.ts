/**
 * Persistence layer. AsyncStorage on native, localStorage on web (the
 * AsyncStorage shim wraps both).
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

export interface Persistent {
  settings: Settings;
  bests: Record<GameMode, number>;
  stats: Stats;
  achievements: { unlocked: string[] };
  unlockedThemes: ThemeId[];
  seenHowTo: boolean;
  /** Display name used when submitting to the global leaderboard. */
  playerName: string | null;
  /** Stable per-device identifier for leaderboard rate-limiting + tie-breaks. */
  deviceId: string | null;
}

const KEY = 'sm_persistent_v1';

const DEFAULT: Persistent = {
  settings: { sound: true, haptics: true, hints: true, theme: 'dawn' },
  bests: { classic: 0, zen: 0, race: 0 },
  stats: { gamesPlayed: 0, totalMerges: 0, biggestTile: 2, longestChain: 1, totalScore: 0 },
  achievements: { unlocked: [] },
  unlockedThemes: ['dawn'],
  seenHowTo: false,
  playerName: null,
  deviceId: null,
};

function makeDeviceId(): string {
  // Random 16-char id, web-safe. Used for tie-breaks and basic per-device
  // rate limiting on the leaderboard.
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

export async function loadPersistent(): Promise<Persistent> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      const fresh = { ...DEFAULT, deviceId: makeDeviceId() };
      await AsyncStorage.setItem(KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const merged: Persistent = {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
      bests: { ...DEFAULT.bests, ...(parsed.bests || {}) },
      stats: { ...DEFAULT.stats, ...(parsed.stats || {}) },
      achievements: { ...DEFAULT.achievements, ...(parsed.achievements || {}) },
    };
    if (!merged.deviceId) {
      merged.deviceId = makeDeviceId();
      await AsyncStorage.setItem(KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return { ...DEFAULT, deviceId: makeDeviceId() };
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
