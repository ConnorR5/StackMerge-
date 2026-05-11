/**
 * Supabase-backed leaderboard.
 *
 * Project: SideProjects (vigbcnztxhgwduxexkwb).
 * Tables:
 *   public.stack_merge_players  — device → player_number/name (identity)
 *   public.stack_merge_scores   — one row per completed game
 *
 * Display name resolution happens at read time:
 *   player.name ?? '#' + player_number
 * which means renaming retroactively updates every old leaderboard row.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameMode } from './constants';

// Config via EXPO_PUBLIC_* env vars (baked at build time), with safe fallbacks
// to the live SideProjects publishable values so the app keeps working when
// the .env file isn't set (e.g. fresh checkouts, preview deploys).
// IMPORTANT: these are PUBLISHABLE keys — they're meant to live in the client
// bundle. Security comes from RLS on the database, not from hiding the key.
const SUPABASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  'https://vigbcnztxhgwduxexkwb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_KEY) ||
  'sb_publishable_Xi5dxHbQleYkxwGUOBfaEg_ZqJy0VPg';

let client: SupabaseClient | null = null;

function ensure(): SupabaseClient {
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: AsyncStorage as any,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export interface Player {
  id: string;
  player_number: number;
  device_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreRow {
  id: string;
  score: number;
  mode: GameMode;
  highest_tile: number;
  moves: number;
  longest_chain: number;
  device_id: string;
  created_at: string;
  /** Joined from stack_merge_players. */
  player: { player_number: number; name: string | null } | null;
}

export interface SubmitInput {
  score: number;
  mode: GameMode;
  highestTile: number;
  moves: number;
  longestChain: number;
  deviceId: string;
}

/** Resolve the display label for a row: name if set, else "#<player_number>". */
export function displayLabel(p: { name: string | null; player_number: number } | null | undefined): string {
  if (!p) return '#?';
  if (p.name && p.name.length > 0) return p.name;
  return '#' + p.player_number;
}

export async function submitScore(input: SubmitInput): Promise<void> {
  const sb = ensure();
  // All inserts go through the submit-score Edge Function — anon-key clients
  // cannot insert into stack_merge_scores directly (RLS denies it). The
  // function validates ranges, plausibility (score/move + score/tile ratios),
  // and rate-limits per device before using service_role to write the row.
  const { data, error } = await sb.functions.invoke('submit-score', {
    body: {
      score: Math.max(0, Math.floor(input.score)),
      mode: input.mode,
      highest_tile: Math.max(2, Math.floor(input.highestTile)),
      moves: Math.max(1, Math.floor(input.moves)),
      longest_chain: Math.max(1, Math.floor(input.longestChain)),
      device_id: input.deviceId,
    },
  });
  if (error) {
    // supabase-js wraps non-2xx responses in FunctionsHttpError; surface the
    // body so the caller can show a useful message ("rate limit exceeded", etc).
    const msg =
      (data as { error?: string } | null)?.error ??
      (error as Error & { context?: { error?: string } }).context?.error ??
      error.message;
    throw new Error(msg);
  }
}

export async function fetchTopScores(mode: GameMode, limit = 50): Promise<ScoreRow[]> {
  const sb = ensure();
  const { data, error } = await sb
    .from('stack_merge_scores')
    .select(
      'id, score, mode, highest_tile, moves, longest_chain, device_id, created_at, player:stack_merge_players!stack_merge_scores_player_fk(player_number, name)'
    )
    .eq('mode', mode)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Supabase returns the join as an object (single FK target).
  return (data || []) as unknown as ScoreRow[];
}

export async function getPlayer(deviceId: string): Promise<Player | null> {
  const sb = ensure();
  const { data, error } = await sb
    .from('stack_merge_players')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error) throw error;
  return (data as Player) || null;
}

/**
 * Insert (if missing) the player row for this device. Useful at boot so we
 * can show "you're #42" before they've even played a game.
 */
export async function ensurePlayer(deviceId: string): Promise<Player> {
  const sb = ensure();
  const existing = await getPlayer(deviceId);
  if (existing) return existing;
  const { data, error } = await sb
    .from('stack_merge_players')
    .insert({ device_id: deviceId })
    .select()
    .single();
  if (error) {
    // Race: another insert may have just landed; re-fetch
    const again = await getPlayer(deviceId);
    if (again) return again;
    throw error;
  }
  return data as Player;
}

export type SetNameError =
  | { kind: 'taken' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'network' };

export async function setPlayerName(
  deviceId: string,
  name: string
): Promise<{ ok: true; player: Player } | { ok: false; error: SetNameError }> {
  const sb = ensure();
  // Make sure a row exists first
  try {
    await ensurePlayer(deviceId);
  } catch {
    return { ok: false, error: { kind: 'network' } };
  }

  const { data, error } = await sb
    .from('stack_merge_players')
    .update({ name })
    .eq('device_id', deviceId)
    .select()
    .single();

  if (error) {
    // Postgres error code 23505 = unique_violation
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
      return { ok: false, error: { kind: 'taken' } };
    }
    if (error.code === '23514' || /check/i.test(error.message)) {
      return { ok: false, error: { kind: 'invalid', reason: 'name not allowed' } };
    }
    return { ok: false, error: { kind: 'network' } };
  }
  return { ok: true, player: data as Player };
}
