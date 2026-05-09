/**
 * Cross-platform SFX. On web we synthesize live with the Web Audio API; on
 * native we generate short WAV blobs once at startup and play them with
 * expo-av. Same call sites either way.
 */

import { Platform } from 'react-native';
import { Audio } from 'expo-av';

type Settings = { sound: boolean };
let settings: Settings = { sound: true };

export function setSoundEnabled(on: boolean) {
  settings.sound = on;
}

/* ============================================================
   WEB AUDIO BACKEND (browsers only)
   ============================================================ */
let webCtx: AudioContext | null = null;
let webGain: GainNode | null = null;

function ensureWebCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  if (webCtx) return webCtx;
  try {
    const AC = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!AC) return null;
    const ctx: AudioContext = new AC();
    webCtx = ctx;
    webGain = ctx.createGain();
    webGain.gain.value = 0.22;
    webGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

function webTone(freq: number, dur: number, type: OscillatorType, vol: number, attack = 0.005) {
  const ctx = ensureWebCtx();
  if (!ctx || !webGain) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(webGain);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function webSlide(f1: number, f2: number, dur: number, type: OscillatorType, vol: number) {
  const ctx = ensureWebCtx();
  if (!ctx || !webGain) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(webGain);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/* ============================================================
   NATIVE BACKEND — generate WAV data URIs, play with expo-av
   ============================================================ */
const SAMPLE_RATE = 22050;

type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';

function sample(wave: Wave, phase: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(phase);
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'sawtooth': {
      const x = (phase / (2 * Math.PI)) % 1;
      return 2 * x - 1;
    }
  }
}

function buildWav(samples: Int16Array): string {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  let p = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i));
  };
  writeStr('RIFF');
  view.setUint32(p, 36 + dataSize, true); p += 4;
  writeStr('WAVE');
  writeStr('fmt ');
  view.setUint32(p, 16, true); p += 4;       // PCM chunk size
  view.setUint16(p, 1, true); p += 2;        // PCM format
  view.setUint16(p, 1, true); p += 2;        // mono
  view.setUint32(p, SAMPLE_RATE, true); p += 4;
  view.setUint32(p, SAMPLE_RATE * 2, true); p += 4;
  view.setUint16(p, 2, true); p += 2;        // block align
  view.setUint16(p, 16, true); p += 2;       // bits per sample
  writeStr('data');
  view.setUint32(p, dataSize, true); p += 4;
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(p, samples[i], true);
    p += 2;
  }
  // Convert to base64
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // global.btoa exists on RN Hermes + web
  const b64 = (globalThis as any).btoa ? (globalThis as any).btoa(binary) : nodeBtoa(binary);
  return 'data:audio/wav;base64,' + b64;
}

function nodeBtoa(s: string): string {
  // Fallback for environments without btoa — not expected at runtime, but safe
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i);
    const b = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    const c = i + 2 < s.length ? s.charCodeAt(i + 2) : 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < s.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < s.length ? chars[c & 63] : '=';
  }
  return out;
}

interface ToneSpec {
  freq: number | [number, number]; // [start, end] for slide
  dur: number;
  wave: Wave;
  vol: number;
  attack?: number;
}

function renderTones(tones: ToneSpec[]): Int16Array {
  // Concatenate tones
  let total = 0;
  for (const t of tones) total += Math.floor(t.dur * SAMPLE_RATE);
  const out = new Int16Array(total);
  let offset = 0;
  for (const t of tones) {
    const n = Math.floor(t.dur * SAMPLE_RATE);
    const attack = (t.attack ?? 0.005) * SAMPLE_RATE;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const progress = i / n;
      let freq: number;
      if (Array.isArray(t.freq)) {
        // Exponential slide
        const [a, b] = t.freq;
        freq = a * Math.pow(b / a, progress);
      } else {
        freq = t.freq;
      }
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const env =
        i < attack
          ? i / attack
          : Math.exp(-3 * (i - attack) / (n - attack));
      const s = sample(t.wave, phase) * env * t.vol;
      out[offset + i] = Math.max(-32767, Math.min(32767, s * 32767));
    }
    offset += n;
  }
  return out;
}

const nativeCache: Record<string, Audio.Sound | null> = {};
const nativeReady: Record<string, Promise<Audio.Sound | null>> = {};

async function loadNativeSound(key: string, tones: ToneSpec[]): Promise<Audio.Sound | null> {
  if (Platform.OS === 'web') return null;
  if (nativeCache[key]) return nativeCache[key];
  if (nativeReady[key] !== undefined) return nativeReady[key];

  nativeReady[key] = (async () => {
    try {
      const samples = renderTones(tones);
      const uri = buildWav(samples);
      const { sound } = await Audio.Sound.createAsync({ uri }, { volume: 0.5 });
      nativeCache[key] = sound;
      return sound;
    } catch (e) {
      return null;
    }
  })();
  return nativeReady[key];
}

async function playNative(key: string, tones: ToneSpec[]) {
  const sound = await loadNativeSound(key, tones);
  if (!sound) return;
  try {
    await sound.replayAsync();
  } catch {}
}

/* ============================================================
   PUBLIC API
   ============================================================ */

const TONE_SPECS = {
  place: [{ freq: 220, dur: 0.06, wave: 'square', vol: 0.4 } as ToneSpec],
  bomb: [
    { freq: [800, 60], dur: 0.4, wave: 'square', vol: 0.8 } as ToneSpec,
    { freq: [80, 30], dur: 0.5, wave: 'sawtooth', vol: 0.6 } as ToneSpec,
  ],
  wild: [
    { freq: 880, dur: 0.12, wave: 'triangle', vol: 0.5 } as ToneSpec,
    { freq: 1320, dur: 0.12, wave: 'triangle', vol: 0.4 } as ToneSpec,
  ],
  gameOver: [{ freq: [440, 110], dur: 0.7, wave: 'sawtooth', vol: 0.5 } as ToneSpec],
  victory: [
    { freq: 523, dur: 0.18, wave: 'triangle', vol: 0.6 } as ToneSpec,
    { freq: 659, dur: 0.18, wave: 'triangle', vol: 0.6 } as ToneSpec,
    { freq: 784, dur: 0.18, wave: 'triangle', vol: 0.6 } as ToneSpec,
    { freq: 1046, dur: 0.3, wave: 'triangle', vol: 0.6 } as ToneSpec,
  ],
  unlock: [{ freq: [440, 880], dur: 0.25, wave: 'triangle', vol: 0.5 } as ToneSpec],
  button: [{ freq: 660, dur: 0.04, wave: 'sine', vol: 0.3 } as ToneSpec],
  tick: [{ freq: 880, dur: 0.02, wave: 'square', vol: 0.3 } as ToneSpec],
};

function mergeTones(value: number): ToneSpec[] {
  const idx = Math.log2(Math.max(2, value)) - 1;
  const baseFreq = 220 * Math.pow(1.18, idx);
  return [{ freq: [baseFreq, baseFreq * 1.6], dur: 0.18, wave: 'triangle', vol: 0.6 }];
}

function chainTones(count: number): ToneSpec[] {
  // Sequential rising tones — generate as one concatenated sound
  const out: ToneSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ freq: 330 * Math.pow(1.18, i), dur: 0.08, wave: 'sawtooth', vol: 0.4 });
  }
  return out;
}

export const SFX = {
  ensure() {
    ensureWebCtx();
  },
  resume() {
    if (webCtx && webCtx.state === 'suspended') webCtx.resume();
  },

  place() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') webTone(220, 0.06, 'square', 0.4);
    else playNative('place', TONE_SPECS.place);
  },
  merge(value: number) {
    if (!settings.sound) return;
    if (Platform.OS === 'web') {
      const idx = Math.log2(Math.max(2, value)) - 1;
      const baseFreq = 220 * Math.pow(1.18, idx);
      webSlide(baseFreq, baseFreq * 1.6, 0.18, 'triangle', 0.6);
    } else {
      // Cache one merge variant per tile value
      playNative('merge_' + value, mergeTones(value));
    }
  },
  chain(count: number) {
    if (!settings.sound) return;
    if (Platform.OS === 'web') {
      const base = 330;
      for (let i = 0; i < count; i++) {
        setTimeout(() => webTone(base * Math.pow(1.18, i), 0.08, 'sawtooth', 0.4), i * 50);
      }
    } else {
      playNative('chain_' + count, chainTones(count));
    }
  },
  bomb() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') {
      webSlide(800, 60, 0.4, 'square', 0.8);
      setTimeout(() => webSlide(80, 30, 0.5, 'sawtooth', 0.6), 30);
    } else playNative('bomb', TONE_SPECS.bomb);
  },
  wild() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') {
      webTone(880, 0.12, 'triangle', 0.5);
      setTimeout(() => webTone(1320, 0.12, 'triangle', 0.4), 60);
    } else playNative('wild', TONE_SPECS.wild);
  },
  gameOver() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') webSlide(440, 110, 0.7, 'sawtooth', 0.5);
    else playNative('gameOver', TONE_SPECS.gameOver);
  },
  victory() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') {
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, i) => setTimeout(() => webTone(n, 0.25, 'triangle', 0.6, 0.01), i * 100));
    } else playNative('victory', TONE_SPECS.victory);
  },
  unlock() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') webSlide(440, 880, 0.25, 'triangle', 0.5);
    else playNative('unlock', TONE_SPECS.unlock);
  },
  button() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') webTone(660, 0.04, 'sine', 0.3);
    else playNative('button', TONE_SPECS.button);
  },
  tick() {
    if (!settings.sound) return;
    if (Platform.OS === 'web') webTone(880, 0.02, 'square', 0.3);
    else playNative('tick', TONE_SPECS.tick);
  },
};
