/**
 * Profanity check for player display names.
 *
 * Uses the `bad-words` package's English wordlist. Casual filter — not
 * meant to be unbeatable. Catches obvious slurs and English profanity.
 */

import { Filter } from 'bad-words';

const filter = new Filter();

// A few extra terms beyond the default bad-words list. Keep this short.
filter.addWords('nazi', 'admin', 'mod', 'system');

export function isProfane(name: string): boolean {
  if (!name) return false;
  try {
    return filter.isProfane(name);
  } catch {
    return false;
  }
}

export function validateName(raw: string): { ok: true; clean: string } | { ok: false; reason: string } {
  const trimmed = (raw || '').trim();
  if (trimmed.length === 0) return { ok: false, reason: 'name cannot be empty' };
  if (trimmed.length > 24) return { ok: false, reason: 'max 24 characters' };
  if (!/^[a-zA-Z0-9 _\-.]+$/.test(trimmed)) {
    return { ok: false, reason: 'letters, numbers, spaces, _ - . only' };
  }
  if (isProfane(trimmed)) return { ok: false, reason: 'pick something cleaner' };
  return { ok: true, clean: trimmed };
}
