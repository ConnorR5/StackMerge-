/**
 * Supabase-backed global leaderboard.
 *
 * Project: SideProjects (vigbcnztxhgwduxexkwb).
 * Table:   public.stack_merge_scores
 *
 * Anon insert is allowed (the table has CHECK constraints to keep values
 * sane). For a casual game this is fine — if cheating becomes a problem
 * we'll route inserts through an edge function with a server signature.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GameMode } from './constants';

const SUPABASE_URL = 'https://vigbcnztxhgwduxexkwb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Xi5dxHbQleYkxwGUOBfaEg_ZqJy0VPg';

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

export interface ScoreRow {
  id: string;
  name: string;
  score: number;
  mode: GameMode;
  highest_tile: number;
  moves: number;
  longest_chain: number;
  device_id: string;
  created_at: string;
}

export interface SubmitInput {
  name: string;
  score: number;
  mode: GameMode;
  highestTile: number;
  moves: number;
  longestChain: number;
  deviceId: string;
}

export async function submitScore(input: SubmitInput): Promise<ScoreRow> {
  const sb = ensure();
  const { data, error } = await sb
    .from('stack_merge_scores')
    .insert({
      name: input.name.slice(0, 24),
      score: Math.max(0, Math.floor(input.score)),
      mode: input.mode,
      highest_tile: Math.max(2, Math.floor(input.highestTile)),
      moves: Math.max(0, Math.floor(input.moves)),
      longest_chain: Math.max(1, Math.floor(input.longestChain)),
      device_id: input.deviceId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScoreRow;
}

export async function fetchTopScores(mode: GameMode, limit = 50): Promise<ScoreRow[]> {
  const sb = ensure();
  const { data, error } = await sb
    .from('stack_merge_scores')
    .select('*')
    .eq('mode', mode)
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ScoreRow[];
}

export async function fetchDeviceBest(
  mode: GameMode,
  deviceId: string
): Promise<ScoreRow | null> {
  const sb = ensure();
  const { data, error } = await sb
    .from('stack_merge_scores')
    .select('*')
    .eq('mode', mode)
    .eq('device_id', deviceId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ScoreRow) || null;
}
