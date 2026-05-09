/**
 * Stack / Merge — main app orchestration.
 *
 * Boot loads persistent state, then renders the GameScreen with whichever
 * overlay is active. The core gameplay loop replays the event sequence from
 * game.ts to drive staggered animations + sound + haptics.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { THEMES, type ThemeId } from './src/theme';
import {
  SIZE,
  SPECIAL_BOMB,
  SPECIAL_WILD,
  colorFor,
  comboLabel,
  isLightTile,
  tileText,
  type GameMode,
  type TileValue,
} from './src/constants';
import {
  newGame,
  place,
  tickRace,
  todayString,
  undo as undoState,
  type GameState,
} from './src/game';
import {
  loadPersistent,
  resetPersistent,
  savePersistent,
  type Persistent,
} from './src/storage';
import { SFX, setSoundEnabled } from './src/sfx';
import { Feel, setHapticsEnabled } from './src/haptics';
import { ACHIEVEMENTS } from './src/achievements';

import { Board } from './src/components/Board';
import { ComboCallout } from './src/components/ComboCallout';
import { FloatScore } from './src/components/FloatScore';
import { ParticleLayer, emitBurst } from './src/components/Particles';
import { ToastLayer, showToast } from './src/components/Toast';

import { HomeOverlay } from './src/screens/HomeOverlay';
import { HowToOverlay } from './src/screens/HowToOverlay';
import { EndOverlay } from './src/screens/EndOverlay';
import { SettingsOverlay } from './src/screens/SettingsOverlay';
import { ShareOverlay } from './src/screens/ShareOverlay';

type Overlay = 'home' | 'howto' | 'end' | 'settings' | 'share' | null;

const BOARD_GAP = 8;

function makeMatrix(): number[][] {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function wait(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const [persistent, setPersistent] = useState<Persistent | null>(null);
  const [state, setState] = useState<GameState>(() => newGame('classic'));
  const [overlay, setOverlay] = useState<Overlay>('home');

  // Per-cell counters that drive Tile animations. We bump these when a tile
  // spawns or merges so the Tile component can animate purely from prop change.
  const [spawnKeys, setSpawnKeys] = useState<number[][]>(() => makeMatrix());
  const [mergePulses, setMergePulses] = useState<number[][]>(() => makeMatrix());

  // Display-only state that lags state.score during chain replay so the
  // header counts up smoothly with each merge.
  const [displayedScore, setDisplayedScore] = useState(0);

  // Floating UI elements
  const [floats, setFloats] = useState<
    Array<{ id: number; x: number; y: number; text: string; big?: boolean }>
  >([]);
  const [combo, setCombo] = useState<{ id: number; big: string; small: string } | null>(null);

  // Layout of the board (within boardWrap) so we can position particles + floats
  const [boardLayout, setBoardLayout] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  // Race timer
  const raceRef = useRef<{ last: number; interval: ReturnType<typeof setInterval> | null }>({
    last: 0,
    interval: null,
  });

  // Animated screen shake on root
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  // Lock to prevent overlapping turn replay
  const placingRef = useRef(false);
  const stateRef = useRef(state);
  const persistentRef = useRef(persistent);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    persistentRef.current = persistent;
  }, [persistent]);

  // Boot: load persistent
  useEffect(() => {
    (async () => {
      const p = await loadPersistent();
      setPersistent(p);
      setSoundEnabled(p.settings.sound);
      setHapticsEnabled(p.settings.haptics);
      if (!p.seenHowTo) {
        setOverlay('howto');
      } else {
        setOverlay('home');
      }
    })();
  }, []);

  // Sync settings → modules
  useEffect(() => {
    if (!persistent) return;
    setSoundEnabled(persistent.settings.sound);
    setHapticsEnabled(persistent.settings.haptics);
  }, [persistent?.settings.sound, persistent?.settings.haptics, persistent]);

  // Save persistent whenever it changes
  useEffect(() => {
    if (!persistent) return;
    savePersistent(persistent);
  }, [persistent]);

  const theme = useMemo(
    () => (persistent ? THEMES[persistent.settings.theme] : THEMES.dawn),
    [persistent?.settings.theme]
  );

  const cellW = boardLayout.w > 0 ? (boardLayout.w - (SIZE - 1) * BOARD_GAP) / SIZE : 0;

  function cellCenter(r: number, c: number): { x: number; y: number } {
    return {
      x: boardLayout.x + c * (cellW + BOARD_GAP) + cellW / 2,
      y: boardLayout.y + r * (cellW + BOARD_GAP) + cellW / 2,
    };
  }

  function shake(level: 1 | 2 | 3 | 'big') {
    const intensity = level === 'big' ? 12 : level === 3 ? 7 : level === 2 ? 4 : 2;
    const dur = level === 'big' ? 80 : 60;
    shakeX.value = withSequence(
      withTiming(-intensity, { duration: dur, easing: Easing.out(Easing.quad) }),
      withTiming(intensity, { duration: dur }),
      withTiming(-intensity * 0.5, { duration: dur }),
      withTiming(0, { duration: dur * 1.2 })
    );
    shakeY.value = withSequence(
      withTiming(intensity * 0.5, { duration: dur }),
      withTiming(-intensity * 0.4, { duration: dur }),
      withTiming(0, { duration: dur * 1.2 })
    );
  }

  function bumpKey(matrix: number[][], setter: React.Dispatch<React.SetStateAction<number[][]>>, r: number, c: number) {
    setter((prev) => {
      const copy = prev.map((row) => row.slice());
      copy[r][c] = (copy[r][c] || 0) + 1;
      return copy;
    });
  }

  function pushFloat(r: number, c: number, text: string, big = false) {
    const center = cellCenter(r, c);
    const id = Math.random();
    setFloats((p) => [...p, { id, x: center.x, y: center.y, text, big }]);
  }

  function removeFloat(id: number) {
    setFloats((p) => p.filter((f) => f.id !== id));
  }

  function showCombo(chainCount: number, total: number) {
    setCombo({
      id: Math.random(),
      big: comboLabel(chainCount),
      small: '+' + total + '  ×' + chainCount,
    });
  }

  // Achievement helpers
  function unlockAchievement(p: Persistent, id: string): Persistent {
    if (p.achievements.unlocked.includes(id)) return p;
    const next = {
      ...p,
      achievements: { unlocked: [...p.achievements.unlocked, id] },
    };
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) {
      showToast(ach.mark, 'Achievement unlocked', ach.name);
      SFX.unlock();
      Feel.unlock();
    }
    return next;
  }

  function checkThemeUnlocks(p: Persistent): Persistent {
    const big = p.stats.biggestTile;
    let next = p;
    const unlocks: Array<{ id: ThemeId; need: number }> = [
      { id: 'forest', need: 256 },
      { id: 'ocean', need: 512 },
      { id: 'midnight', need: 1024 },
    ];
    for (const u of unlocks) {
      if (big >= u.need && !next.unlockedThemes.includes(u.id)) {
        next = { ...next, unlockedThemes: [...next.unlockedThemes, u.id] };
        showToast('◆', 'Theme unlocked', u.id.toUpperCase());
        SFX.unlock();
        Feel.unlock();
      }
    }
    return next;
  }

  function bestForMode(p: Persistent, mode: GameMode): number {
    if (mode === 'daily') return p.daily[todayString()]?.score || 0;
    return p.bests[mode as Exclude<GameMode, 'daily'>] || 0;
  }

  /* ============================================================
     CORE: handle a tap by replaying events with delays
     ============================================================ */
  const handleTap = useCallback(
    async (r: number, c: number) => {
      const cur = stateRef.current;
      const p = persistentRef.current;
      if (!p) return;
      if (placingRef.current || cur.ended || overlay !== null) return;
      if (cur.grid[r][c] !== 0) return;
      placingRef.current = true;

      SFX.resume();

      const result = place(cur, r, c);
      if (!result) {
        placingRef.current = false;
        return;
      }

      // Local replay grid — we mutate this and push intermediate snapshots
      // through setState so the UI stays in sync per merge step.
      let grid = cur.grid.map((row) => row.slice());
      let runningScore = cur.score;
      let runningHighest = cur.highestTile;
      let runningChain = cur.longestChain;
      let runningMerges = cur.mergeCount;

      // Start of turn — clear undo display lock
      let livePersistent = p;

      for (const ev of result.events) {
        if (ev.type === 'place') {
          grid[ev.r][ev.c] = ev.value;
          setState((s) => ({ ...s, grid: grid.map((row) => row.slice()) }));
          bumpKey(spawnKeys, setSpawnKeys, ev.r, ev.c);
          SFX.place();
          Feel.place();
          await wait(80);
        } else if (ev.type === 'wild') {
          grid[ev.r][ev.c] = ev.becomes;
          setState((s) => ({ ...s, grid: grid.map((row) => row.slice()) }));
          SFX.wild();
          Feel.warning();
          const center = cellCenter(ev.r, ev.c);
          emitBurst(center.x, center.y, '#f4c542', 14, 5, 0.7);
          await wait(140);
        } else if (ev.type === 'bomb') {
          grid[ev.r][ev.c] = 0;
          ev.destroyed.forEach((d) => (grid[d.r][d.c] = 0));
          runningScore += ev.gain;
          setDisplayedScore(runningScore);
          setState((s) => ({ ...s, grid: grid.map((row) => row.slice()) }));
          SFX.bomb();
          Feel.bomb();
          shake('big');
          const center = cellCenter(ev.r, ev.c);
          emitBurst(center.x, center.y, '#d94f3a', 30, 7, 0.9);
          emitBurst(center.x, center.y, '#1a1612', 24, 9, 1.0);
          ev.destroyed.forEach((d) => {
            const cc = cellCenter(d.r, d.c);
            emitBurst(cc.x, cc.y, colorFor(d.v), 10, 5, 0.7);
          });
          if (ev.gain > 0) pushFloat(ev.r, ev.c, '+' + ev.gain);
          await wait(220);
        } else if (ev.type === 'merge') {
          grid[ev.from.r][ev.from.c] = 0;
          grid[ev.r][ev.c] = ev.newValue;
          runningScore += ev.newValue;
          runningMerges += 1;
          if (ev.newValue > runningHighest) runningHighest = ev.newValue;
          if (ev.chainIndex > runningChain) runningChain = ev.chainIndex;

          setDisplayedScore(runningScore);
          setState((s) => ({ ...s, grid: grid.map((row) => row.slice()) }));
          bumpKey(mergePulses, setMergePulses, ev.r, ev.c);

          SFX.merge(ev.newValue);
          Feel.merge(ev.newValue);
          if (ev.chainIndex === 1) shake(1);
          else if (ev.chainIndex === 2) shake(2);
          else shake(3);

          const center = cellCenter(ev.r, ev.c);
          const burstCount = Math.min(8 + ev.chainIndex * 4, 32);
          emitBurst(center.x, center.y, colorFor(ev.newValue), burstCount, 4 + ev.chainIndex, 0.7);

          // Achievement triggers
          if (runningMerges === 1) livePersistent = unlockAchievement(livePersistent, 'first');
          if (ev.chainIndex >= 2) livePersistent = unlockAchievement(livePersistent, 'combo');
          if (ev.chainIndex >= 4) livePersistent = unlockAchievement(livePersistent, 'cascade');
          if (ev.newValue === 128) livePersistent = unlockAchievement(livePersistent, 'reach128');
          if (ev.newValue === 256) livePersistent = unlockAchievement(livePersistent, 'reach256');
          if (ev.newValue === 512) livePersistent = unlockAchievement(livePersistent, 'reach512');
          if (ev.newValue === 1024) livePersistent = unlockAchievement(livePersistent, 'reach1024');
          if (ev.newValue === 2048) livePersistent = unlockAchievement(livePersistent, 'reach2048');

          if (ev.chainIndex === 1) pushFloat(ev.r, ev.c, '+' + ev.newValue);

          await wait(140);
        } else if (ev.type === 'chainComplete') {
          if (ev.chainCount >= 2) {
            showCombo(ev.chainCount, ev.total);
            SFX.chain(ev.chainCount);
            Feel.chain(ev.chainCount);
          }
        } else if (ev.type === 'victory') {
          shake('big');
          SFX.victory();
          Feel.victory();
          const center = cellCenter(ev.r, ev.c);
          emitBurst(center.x, center.y, colorFor(2048), 40, 10, 1.2);
          setCombo({ id: Math.random(), big: '2048!', small: 'STACK MASTER' });
        } else if (ev.type === 'zenOverflow') {
          grid[ev.r][ev.c] = 0;
          setState((s) => ({ ...s, grid: grid.map((row) => row.slice()) }));
          const center = cellCenter(ev.r, ev.c);
          emitBurst(center.x, center.y, colorFor(ev.v), 10, 4, 0.6);
          pushFloat(ev.r, ev.c, '-' + ev.v);
          SFX.tick();
          await wait(140);
        } else if (ev.type === 'gameOver') {
          // handled after the loop
        }
      }

      // Update the canonical state to the final result
      setState(result.state);
      setDisplayedScore(result.state.score);

      // Update persistent: stats + bests + achievements + theme unlocks
      let nextP: Persistent = livePersistent;
      const newStats = {
        ...nextP.stats,
        totalMerges: nextP.stats.totalMerges + (result.state.mergeCount - cur.mergeCount),
        biggestTile: Math.max(nextP.stats.biggestTile, result.state.highestTile),
        longestChain: Math.max(nextP.stats.longestChain, result.state.longestChain),
      };
      nextP = { ...nextP, stats: newStats };
      nextP = checkThemeUnlocks(nextP);

      // Update best score (per mode)
      if (result.state.mode === 'daily') {
        const today = todayString();
        const prev = nextP.daily[today]?.score || 0;
        if (result.state.score > prev) {
          nextP = {
            ...nextP,
            daily: {
              ...nextP.daily,
              [today]: {
                score: result.state.score,
                highest: result.state.highestTile,
                moves: result.state.moves,
              },
            },
          };
        }
      } else {
        const m = result.state.mode as Exclude<GameMode, 'daily'>;
        if (result.state.score > (nextP.bests[m] || 0)) {
          nextP = { ...nextP, bests: { ...nextP.bests, [m]: result.state.score } };
        }
      }

      // Game over: bump games + total score, mode-specific achievements
      const ended = result.events.some((e) => e.type === 'gameOver');
      if (ended) {
        nextP = {
          ...nextP,
          stats: {
            ...nextP.stats,
            gamesPlayed: nextP.stats.gamesPlayed + 1,
            totalScore: nextP.stats.totalScore + result.state.score,
          },
        };
        if (nextP.stats.gamesPlayed >= 10) nextP = unlockAchievement(nextP, 'veteran');
        if (result.state.mode === 'daily') nextP = unlockAchievement(nextP, 'daily');
        if (result.state.mode === 'zen' && result.state.score >= 5000) nextP = unlockAchievement(nextP, 'zen');
        if (result.state.mode === 'race' && result.state.score >= 1500) nextP = unlockAchievement(nextP, 'race');
      }

      setPersistent(nextP);

      if (ended) {
        SFX.gameOver();
        Feel.gameOver();
        setTimeout(() => setOverlay('end'), 350);
      }

      placingRef.current = false;
    },
    [overlay, spawnKeys, mergePulses]
  );

  /* ============================================================
     RACE TIMER
     ============================================================ */
  useEffect(() => {
    if (state.mode !== 'race' || state.ended || overlay !== null) {
      if (raceRef.current.interval) {
        clearInterval(raceRef.current.interval);
        raceRef.current.interval = null;
      }
      return;
    }
    raceRef.current.last = Date.now();
    raceRef.current.interval = setInterval(() => {
      const now = Date.now();
      const dt = (now - raceRef.current.last) / 1000;
      raceRef.current.last = now;
      setState((s) => {
        const next = tickRace(s, dt);
        if (next.ended && !s.ended) {
          // Trigger end overlay outside reducer
          setTimeout(() => {
            SFX.gameOver();
            Feel.gameOver();
            // Update persistent for race game over
            if (persistentRef.current) {
              let pp = persistentRef.current;
              const newStats = {
                ...pp.stats,
                gamesPlayed: pp.stats.gamesPlayed + 1,
                totalScore: pp.stats.totalScore + next.score,
              };
              pp = { ...pp, stats: newStats };
              if (next.score > (pp.bests.race || 0)) {
                pp = { ...pp, bests: { ...pp.bests, race: next.score } };
              }
              if (next.score >= 1500) pp = unlockAchievement(pp, 'race');
              if (pp.stats.gamesPlayed >= 10) pp = unlockAchievement(pp, 'veteran');
              setPersistent(pp);
            }
            setOverlay('end');
          }, 200);
        }
        return next;
      });
    }, 100);
    return () => {
      if (raceRef.current.interval) clearInterval(raceRef.current.interval);
      raceRef.current.interval = null;
    };
  }, [state.mode, state.ended, overlay]);

  /* ============================================================
     MODE START / NAV
     ============================================================ */
  function startMode(mode: GameMode) {
    const fresh = newGame(mode);
    setState(fresh);
    setDisplayedScore(0);
    setSpawnKeys(makeMatrix());
    setMergePulses(makeMatrix());
    setFloats([]);
    setCombo(null);
    setOverlay(null);
    SFX.button();
    Feel.button();
  }

  function goHome() {
    SFX.button();
    Feel.button();
    setOverlay('home');
  }

  function onUndo() {
    if (state.mode === 'race') return;
    const undone = undoState(state);
    if (!undone) return;
    setState(undone);
    setDisplayedScore(undone.score);
    SFX.button();
    Feel.button();
  }

  function onToggleSetting(key: 'sound' | 'haptics' | 'hints') {
    if (!persistent) return;
    setPersistent({
      ...persistent,
      settings: { ...persistent.settings, [key]: !persistent.settings[key] },
    });
    if (key === 'sound' && !persistent.settings.sound) SFX.button();
    if (key === 'haptics' && !persistent.settings.haptics) Feel.button();
  }

  function onPickTheme(id: ThemeId) {
    if (!persistent) return;
    if (!persistent.unlockedThemes.includes(id)) return;
    setPersistent({ ...persistent, settings: { ...persistent.settings, theme: id } });
    SFX.button();
    Feel.button();
  }

  async function onResetProgress() {
    await resetPersistent();
    const p = await loadPersistent();
    setPersistent(p);
    setOverlay('home');
  }

  function buildShareText(): string {
    if (!persistent) return '';
    const today = todayString();
    const d = persistent.daily[today];
    if (!d) return 'STACK/MERGE Daily ' + today + '\nNo result yet';
    let viz = '';
    if (state.mode === 'daily') {
      viz = '\n' + state.grid
        .map((row) =>
          row
            .map((v) => {
              if (v === 0) return '⬜';
              if (v === SPECIAL_WILD) return '⭐';
              if (v === SPECIAL_BOMB) return '⬛';
              if (v >= 1024) return '🟥';
              if (v >= 256) return '🟧';
              if (v >= 32) return '🟨';
              return '🟫';
            })
            .join('')
        )
        .join('\n') + '\n';
    }
    return (
      'STACK/MERGE Daily ' +
      today +
      '\n' +
      'Score ' +
      d.score +
      ' · highest ' +
      d.highest +
      ' · ' +
      d.moves +
      ' moves' +
      viz
    );
  }

  const colorScheme = useColorScheme();

  if (!persistent) {
    return (
      <SafeAreaView style={[styles.boot, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.ink, fontSize: 18, fontWeight: '700' }}>STACK / MERGE</Text>
      </SafeAreaView>
    );
  }

  const bestForCurrent = bestForMode(persistent, state.mode);
  const isNewBest = state.score >= bestForCurrent && state.score > 0;

  return (
    <View style={[styles.body, { backgroundColor: theme.bg }]}>
      <StatusBar style={persistent.settings.theme === 'midnight' ? 'light' : 'dark'} />

      {/* Game UI — wrapped in shake transform */}
      <Animated.View style={[styles.app, { backgroundColor: theme.bg }, shakeStyle]}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          {/* HEADER */}
          <View style={[styles.header, { borderBottomColor: theme.ink }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: theme.ink }]} allowFontScaling={false}>
                STACK<Text style={{ color: theme.accent }}>/</Text>MERGE
              </Text>
              <Text style={[styles.brandSub, { color: theme.inkDim }]} allowFontScaling={false}>
                tap · combine · grow
              </Text>
              <View style={[styles.modeBadge, { borderColor: theme.ink }]}>
                <Text style={[styles.modeBadgeText, { color: theme.ink }]} allowFontScaling={false}>
                  {state.mode.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.statsArea}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.statRow, { color: theme.inkDim }]} allowFontScaling={false}>
                  SCORE
                </Text>
                <Text style={[styles.statVal, { color: theme.ink }]} allowFontScaling={false}>
                  {displayedScore}
                </Text>
                <Text style={[styles.bestText, { color: theme.inkDim }]} allowFontScaling={false}>
                  best {Math.max(bestForCurrent, displayedScore)}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  SFX.button();
                  Feel.button();
                  setOverlay('settings');
                }}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { borderColor: theme.ink, backgroundColor: pressed ? theme.ink : 'transparent' },
                ]}
              >
                {({ pressed }) => (
                  <Text style={{ color: pressed ? theme.bg : theme.ink, fontSize: 14, fontWeight: '700' }}>
                    ⚙
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* NEXT AREA */}
          <View style={[styles.nextArea, { borderBottomColor: theme.inkSoft }]}>
            <Text style={[styles.nextLabel, { color: theme.inkDim }]} allowFontScaling={false}>
              NEXT →
            </Text>
            <View
              style={[
                styles.nextTile,
                {
                  backgroundColor: colorFor(state.next),
                },
              ]}
            >
              <Text
                style={[
                  styles.nextTileText,
                  { color: isLightTile(state.next) ? theme.ink : '#fff' },
                ]}
                allowFontScaling={false}
              >
                {tileText(state.next)}
              </Text>
            </View>
            {state.mode === 'race' && state.timeLeft != null ? (
              <View style={[styles.timerBar, { backgroundColor: theme.inkSoft }]}>
                <View
                  style={[
                    styles.timerFill,
                    {
                      backgroundColor: state.timeLeft <= 10 ? '#d94f3a' : theme.accent,
                      width: (((Math.max(0, state.timeLeft) / 60) * 100) + '%') as `${number}%`,
                    },
                  ]}
                />
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Text style={[styles.movesInfo, { color: theme.inkDim }]} allowFontScaling={false}>
              {state.mode === 'race' && state.timeLeft != null
                ? Math.ceil(state.timeLeft) + 's'
                : 'moves: ' + state.moves}
            </Text>
          </View>

          {/* BOARD WRAP */}
          <View style={styles.boardWrap}>
            <View
              style={styles.boardInner}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setBoardLayout({ x, y, w: width, h: height });
              }}
            >
              <Board
                grid={state.grid}
                theme={theme}
                onTap={handleTap}
                mergePulses={mergePulses}
                spawnKeys={spawnKeys}
              />
              {/* Particle layer covers the same coordinates as boardInner */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <ParticleLayer />
                {floats.map((f) => (
                  <FloatScore
                    key={f.id}
                    text={f.text}
                    x={f.x}
                    y={f.y}
                    color={theme.accent}
                    bg={theme.bg}
                    big={f.big}
                    onDone={() => removeFloat(f.id)}
                  />
                ))}
                {combo && (
                  <ComboCallout
                    key={combo.id}
                    big={combo.big}
                    small={combo.small}
                    color={theme.accent}
                    onDone={() => setCombo(null)}
                  />
                )}
              </View>
            </View>
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, { borderTopColor: theme.ink }]}>
            <Pressable
              onPress={onUndo}
              disabled={!state.prev || state.mode === 'race'}
              style={({ pressed }) => [
                styles.btn,
                {
                  borderColor: theme.ink,
                  opacity: !state.prev || state.mode === 'race' ? 0.3 : 1,
                  backgroundColor: pressed ? theme.ink : 'transparent',
                },
              ]}
            >
              {({ pressed }) => (
                <Text style={[styles.btnText, { color: pressed ? theme.bg : theme.ink }]} allowFontScaling={false}>
                  UNDO
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={goHome}
              style={({ pressed }) => [
                styles.btn,
                {
                  borderColor: theme.ink,
                  backgroundColor: pressed ? theme.accent : theme.ink,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
                HOME
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* OVERLAYS */}
      {overlay === 'home' && (
        <HomeOverlay
          theme={theme}
          persistent={persistent}
          onPickMode={startMode}
          onOpenHowTo={() => setOverlay('howto')}
          onOpenSettings={() => setOverlay('settings')}
        />
      )}
      {overlay === 'howto' && (
        <HowToOverlay
          theme={theme}
          onClose={() => {
            setPersistent({ ...persistent, seenHowTo: true });
            setOverlay(persistent.seenHowTo ? null : 'home');
          }}
        />
      )}
      {overlay === 'end' && (
        <EndOverlay
          theme={theme}
          state={state}
          bestScore={bestForCurrent}
          isNewBest={isNewBest}
          onPlayAgain={() => startMode(state.mode)}
          onShare={() => setOverlay('share')}
          onHome={goHome}
        />
      )}
      {overlay === 'settings' && (
        <SettingsOverlay
          theme={theme}
          persistent={persistent}
          onClose={() => setOverlay(state.ended || state.moves === 0 ? 'home' : null)}
          onToggle={onToggleSetting}
          onPickTheme={onPickTheme}
          onReset={onResetProgress}
        />
      )}
      {overlay === 'share' && (
        <ShareOverlay
          theme={theme}
          date={todayString()}
          shareText={buildShareText()}
          onClose={() => setOverlay('end')}
        />
      )}

      {/* Toasts always on top */}
      <ToastLayer theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center' },
  app: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    gap: 12,
  },
  brand: {
    fontWeight: '800',
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  brandSub: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginTop: 4,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  statsArea: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  statRow: { fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  statVal: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 2, lineHeight: 30 },
  bestText: { fontSize: 11, marginTop: 6, fontWeight: '600' },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextArea: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  nextLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  nextTile: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTileText: { fontSize: 22, fontWeight: '800' },
  timerBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: { height: '100%' },
  movesInfo: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  boardWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardInner: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 2,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
});
