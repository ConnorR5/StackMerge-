/**
 * PostHog analytics. Single point of truth for product events.
 *
 * Configure with EXPO_PUBLIC_POSTHOG_KEY (required) and optionally
 * EXPO_PUBLIC_POSTHOG_HOST (defaults to https://us.i.posthog.com). If the
 * key is missing every call no-ops so dev/CI never breaks.
 *
 * Event taxonomy (keep names stable — they're load-bearing for funnels):
 *   app_open                  — every cold start
 *   player_identified         — once we have a player_number from Supabase
 *   game_start                — user picks a mode and starts a run
 *   game_end                  — run ends (natural or zen-end), with full stats
 *   score_submit              — leaderboard insert attempt
 *   score_submit_result       — success / failure / skipped
 *   leaderboard_opened        — top-50 view opened
 *   leaderboard_mode_changed  — tab switch within leaderboard
 *   name_set                  — player saved a display name (was_first_time)
 *   theme_changed             — settings → theme tap
 *   theme_unlocked            — biggest tile crossed the threshold
 *   achievement_unlocked      — any achievement awarded
 *   settings_opened
 *   howto_opened
 *   howto_dismissed
 *   reset_progress
 */

import PostHog from 'posthog-react-native';
import type { GameMode } from './constants';
import type { ThemeId } from './theme';

const KEY =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_POSTHOG_KEY) || '';
const HOST =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_POSTHOG_HOST) ||
  'https://us.i.posthog.com';

let client: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

function getClient(): Promise<PostHog | null> {
  if (!KEY) return Promise.resolve(null);
  if (client) return Promise.resolve(client);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const c = new PostHog(KEY, {
        host: HOST,
        flushAt: 10,
        flushInterval: 15_000,
      });
      client = c;
      return c;
    } catch {
      return null;
    }
  })();
  return initPromise;
}

/** Best-effort fire-and-forget capture. */
export function track(event: string, properties?: Record<string, any>): void {
  getClient().then((c) => {
    if (!c) return;
    try {
      c.capture(event, properties);
    } catch {
      // analytics must never crash the game
    }
  });
}

/**
 * Tie all future events to a stable identifier. Call once on boot with the
 * device id; call again with the player_number once Supabase resolves so we
 * can build cross-device-ish cohorts later.
 */
export function identify(
  distinctId: string,
  traits?: Record<string, any>
): void {
  getClient().then((c) => {
    if (!c) return;
    try {
      c.identify(distinctId, traits);
    } catch {}
  });
}

export function setPlayerProps(traits: Record<string, any>): void {
  getClient().then((c) => {
    if (!c) return;
    try {
      // $set merges into person properties on the next event
      c.capture('$set', { $set: traits });
    } catch {}
  });
}

/** Screen-view convenience. */
export function trackScreen(name: string, properties?: Record<string, any>): void {
  track('$screen', { $screen_name: name, ...(properties || {}) });
}

/** Pre-typed helpers keep the call sites self-documenting. */
export const Analytics = {
  appOpen(props: { platform: string; deviceId: string; playerName: string | null }) {
    track('app_open', props);
  },
  playerIdentified(props: {
    deviceId: string;
    playerNumber: number;
    playerName: string | null;
  }) {
    track('player_identified', props);
  },
  gameStart(props: { mode: GameMode; theme: ThemeId }) {
    track('game_start', props);
  },
  gameEnd(props: {
    mode: GameMode;
    score: number;
    moves: number;
    highestTile: number;
    longestChain: number;
    mergeCount: number;
    durationMs: number;
    ended_reason: 'natural' | 'zen_end' | 'race_timeout';
    isNewBest: boolean;
  }) {
    track('game_end', props);
  },
  scoreSubmit(props: { mode: GameMode; score: number }) {
    track('score_submit', props);
  },
  scoreSubmitResult(props: {
    mode: GameMode;
    score: number;
    result: 'success' | 'error' | 'skipped';
    error?: string;
  }) {
    track('score_submit_result', props);
  },
  leaderboardOpened(props: { initial_mode: GameMode; source: 'home' | 'end' }) {
    track('leaderboard_opened', props);
  },
  leaderboardModeChanged(props: { from: GameMode; to: GameMode }) {
    track('leaderboard_mode_changed', props);
  },
  nameSet(props: { length: number; was_first_time: boolean }) {
    track('name_set', props);
  },
  themeChanged(props: { from: ThemeId; to: ThemeId }) {
    track('theme_changed', props);
  },
  themeUnlocked(props: { theme: ThemeId; score: number }) {
    track('theme_unlocked', props);
  },
  achievementUnlocked(props: { id: string }) {
    track('achievement_unlocked', props);
  },
  settingsOpened() {
    track('settings_opened');
  },
  howtoOpened(props: { first_run: boolean }) {
    track('howto_opened', props);
  },
  howtoDismissed() {
    track('howto_dismissed');
  },
  resetProgress() {
    track('reset_progress');
  },
};

/** Test-only: check if analytics is configured. */
export function analyticsEnabled(): boolean {
  return !!KEY;
}
