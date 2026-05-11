import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  MODES,
  colorFor,
  isLightTile,
  tileText,
  type GameMode,
} from '../constants';
import type { Theme } from '../theme';
import type { Persistent } from '../storage';
import { ACHIEVEMENTS } from '../achievements';

const VERSION = '0.1.0';

const DEMO_TILE = 60;
const DEMO_GAP = 10;

interface Props {
  theme: Theme;
  persistent: Persistent;
  /** Auto-assigned player number for this device, when known. */
  myPlayerNumber: number | null;
  onPickMode: (mode: GameMode) => void;
  onOpenHowTo: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onOpenName: () => void;
}

/* =====================================================================
   MergeLoop — self-playing demo: two equal tiles slide together, merge
   into a doubled tile, the right slot refills, repeat. Reaching 2048
   triggers a longer celebration pulse before resetting to 2.
   ===================================================================== */
function MergeLoop({ theme }: { theme: Theme }) {
  const [leftValue, setLeftValue] = useState<number>(2);
  const [rightValue, setRightValue] = useState<number | null>(2);

  const rightTx = useSharedValue(0);
  const leftScale = useSharedValue(1);
  const rightScale = useSharedValue(1);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ringColor = useSharedValue<string>(colorFor(4));
  const trackOpacity = useSharedValue(1);

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    async function run() {
      let v = 2;
      setLeftValue(2);
      setRightValue(2);
      rightTx.value = 0;
      rightScale.value = 1;
      leftScale.value = 1;

      while (alive) {
        // brief idle — let the eye settle on the two equal tiles
        await sleep(650);
        if (!alive) return;

        // slide right tile into left
        rightTx.value = withTiming(-(DEMO_TILE + DEMO_GAP), {
          duration: 320,
          easing: Easing.in(Easing.cubic),
        });
        await sleep(320);
        if (!alive) return;

        // merge moment: hide right, double left, pop + ring burst
        const newVal = v * 2;
        setRightValue(null);
        setLeftValue(newVal);
        rightTx.value = 0;
        rightScale.value = 0;
        leftScale.value = withSequence(
          withTiming(1.22, { duration: 90, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 12, stiffness: 260 })
        );
        ringColor.value = colorFor(newVal);
        ringScale.value = 0.55;
        ringOpacity.value = 0.85;
        ringScale.value = withTiming(2.4, {
          duration: 480,
          easing: Easing.out(Easing.cubic),
        });
        ringOpacity.value = withTiming(0, {
          duration: 480,
          easing: Easing.in(Easing.quad),
        });

        await sleep(540);
        if (!alive) return;

        if (newVal >= 2048) {
          // 2048 reached — bigger pop, longer dwell, then reset
          leftScale.value = withSequence(
            withTiming(1.38, {
              duration: 240,
              easing: Easing.out(Easing.cubic),
            }),
            withSpring(1, { damping: 10, stiffness: 200 })
          );
          await sleep(1100);
          if (!alive) return;
          // fade the strip, swap values, fade back
          trackOpacity.value = withTiming(0, { duration: 220 });
          await sleep(240);
          if (!alive) return;
          v = 2;
          setLeftValue(2);
          setRightValue(2);
          rightScale.value = 1;
          leftScale.value = 1;
          trackOpacity.value = withTiming(1, { duration: 260 });
        } else {
          // refill right slot with matching value so we can merge again
          v = newVal;
          setRightValue(newVal);
          rightScale.value = withSequence(
            withTiming(0, { duration: 1 }),
            withSpring(1, { damping: 11, stiffness: 240 })
          );
        }
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [rightTx, leftScale, rightScale, ringScale, ringOpacity, ringColor, trackOpacity]);

  const leftAnim = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale.value }],
  }));
  const rightAnim = useAnimatedStyle(() => ({
    transform: [
      { translateX: rightTx.value },
      { scale: rightScale.value },
    ],
  }));
  const ringAnim = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
    borderColor: ringColor.value,
  }));
  const trackAnim = useAnimatedStyle(() => ({ opacity: trackOpacity.value }));

  const leftFg = isLightTile(leftValue) ? theme.ink : '#fff';
  const rightFg =
    rightValue != null && isLightTile(rightValue) ? theme.ink : '#fff';

  return (
    <View style={styles.demoWrap}>
      <View style={[styles.demoFrame, { borderColor: theme.inkSoft }]}>
        <View style={[styles.demoCorner, styles.demoCornerTL, { borderColor: theme.ink }]} />
        <View style={[styles.demoCorner, styles.demoCornerTR, { borderColor: theme.ink }]} />
        <View style={[styles.demoCorner, styles.demoCornerBL, { borderColor: theme.ink }]} />
        <View style={[styles.demoCorner, styles.demoCornerBR, { borderColor: theme.ink }]} />

        <Animated.View
          style={[
            styles.demoStage,
            { width: DEMO_TILE * 2 + DEMO_GAP, height: DEMO_TILE },
            trackAnim,
          ]}
        >
          {/* Burst ring centered on left tile (the merge target) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: DEMO_TILE,
                height: DEMO_TILE,
                left: 0,
                top: 0,
              },
              ringAnim,
            ]}
          />
          <Animated.View
            style={[
              styles.demoTile,
              {
                width: DEMO_TILE,
                height: DEMO_TILE,
                backgroundColor: colorFor(leftValue),
              },
              leftAnim,
            ]}
          >
            <Text
              style={[
                styles.demoTileText,
                { color: leftFg, fontSize: demoFont(leftValue) },
              ]}
              allowFontScaling={false}
            >
              {tileText(leftValue)}
            </Text>
          </Animated.View>
          <View style={{ width: DEMO_GAP }} />
          <Animated.View
            style={[
              styles.demoTile,
              {
                width: DEMO_TILE,
                height: DEMO_TILE,
                backgroundColor:
                  rightValue != null ? colorFor(rightValue) : 'transparent',
              },
              rightAnim,
            ]}
          >
            {rightValue != null && (
              <Text
                style={[
                  styles.demoTileText,
                  { color: rightFg, fontSize: demoFont(rightValue) },
                ]}
                allowFontScaling={false}
              >
                {tileText(rightValue)}
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </View>
      <Text
        style={[styles.demoCaption, { color: theme.inkDim }]}
        allowFontScaling={false}
      >
        equal tiles touch · merge · double up
      </Text>
    </View>
  );
}

function demoFont(v: number): number {
  if (v < 100) return 26;
  if (v < 1000) return 22;
  return 17;
}

export const HomeOverlay: React.FC<Props> = ({
  theme,
  persistent,
  myPlayerNumber,
  onPickMode,
  onOpenHowTo,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenName,
}) => {
  function bestFor(mode: GameMode): number {
    return persistent.bests[mode] || 0;
  }

  const hasName = !!persistent.playerName;
  const hasStats = persistent.stats.gamesPlayed > 0;
  const achUnlocked = persistent.achievements.unlocked.length;

  // Slow pulse on the title accent character
  const ampScale = useSharedValue(1);
  useEffect(() => {
    ampScale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [ampScale]);
  const ampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ampScale.value }],
  }));

  // Subtle pulsing dot beside the eyebrow
  const dot = useSharedValue(0.4);
  useEffect(() => {
    dot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [dot]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  return (
    <SafeAreaView
      style={[styles.host, { backgroundColor: theme.bg }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.eyebrowRow}>
          <Animated.View
            style={[
              styles.eyebrowDot,
              { backgroundColor: theme.accent },
              dotStyle,
            ]}
          />
          <Text
            style={[styles.mark, { color: theme.inkDim }]}
            allowFontScaling={false}
          >
            A QUICK PUZZLE
          </Text>
        </View>

        <Text
          style={[styles.title, { color: theme.ink }]}
          allowFontScaling={false}
        >
          STACK
          <Animated.Text style={[{ color: theme.accent }, ampStyle]}>
            &
          </Animated.Text>
          MERGE
        </Text>
        <Text
          style={[styles.tag, { color: theme.inkDim }]}
          allowFontScaling={false}
        >
          tap · combine · grow
        </Text>

        {/* HERO ANIMATION */}
        <MergeLoop theme={theme} />

        {hasStats && (
          <View
            style={[styles.statsStrip, { borderColor: theme.inkSoft }]}
          >
            <Text
              style={[styles.statsText, { color: theme.inkDim }]}
              allowFontScaling={false}
            >
              <Text style={{ color: theme.ink, fontWeight: '700' }}>
                {persistent.stats.gamesPlayed}
              </Text>
              {' games · biggest '}
              <Text style={{ color: theme.ink, fontWeight: '700' }}>
                {persistent.stats.biggestTile}
              </Text>
              {' · '}
              <Text style={{ color: theme.ink, fontWeight: '700' }}>
                {achUnlocked}/{ACHIEVEMENTS.length}
              </Text>
              {' ★'}
            </Text>
          </View>
        )}

        <Text
          style={[styles.sectionLabel, { color: theme.inkDim }]}
          allowFontScaling={false}
        >
          PICK A MODE
        </Text>

        <View style={styles.modes}>
          {MODES.map((m, i) => {
            const best = bestFor(m.id);
            const isPrimary = i === 0;
            return (
              <Pressable
                key={m.id}
                onPress={() => onPickMode(m.id)}
                style={({ pressed }) => [
                  styles.modeCard,
                  {
                    borderColor: theme.ink,
                    backgroundColor: isPrimary
                      ? pressed
                        ? theme.accent
                        : theme.ink
                      : pressed
                        ? theme.ink
                        : 'transparent',
                  },
                ]}
              >
                {({ pressed }) => {
                  const onDark = isPrimary || pressed;
                  const fg = onDark ? theme.bg : theme.ink;
                  const fgDim = onDark
                    ? 'rgba(255,255,255,0.65)'
                    : theme.inkDim;
                  return (
                    <>
                      <View style={{ flex: 1 }}>
                        <View style={styles.modeNameRow}>
                          <Text
                            style={[styles.modeName, { color: fg }]}
                            allowFontScaling={false}
                          >
                            {m.name}
                          </Text>
                          {isPrimary && (
                            <View
                              style={[
                                styles.startPill,
                                { borderColor: theme.accent, backgroundColor: theme.accent },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.startPillText,
                                  { color: theme.bg },
                                ]}
                                allowFontScaling={false}
                              >
                                ▶ START
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.modeDesc, { color: fgDim }]}
                          allowFontScaling={false}
                        >
                          {m.desc}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[styles.bestLabel, { color: fgDim }]}
                          allowFontScaling={false}
                        >
                          best
                        </Text>
                        <Text
                          style={[styles.bestNum, { color: fg }]}
                          allowFontScaling={false}
                        >
                          {best}
                        </Text>
                      </View>
                    </>
                  );
                }}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.leaderboardBtn,
            {
              borderColor: theme.ink,
              backgroundColor: pressed ? theme.accent : 'transparent',
            },
          ]}
          onPress={onOpenLeaderboard}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.leaderboardText,
                { color: pressed ? theme.bg : theme.ink },
              ]}
              allowFontScaling={false}
            >
              ◆  LEADERBOARD
            </Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.identityRow,
            {
              borderColor: hasName ? theme.inkSoft : theme.accent,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
          onPress={onOpenName}
        >
          <Text
            style={[styles.identityLabel, { color: theme.inkDim }]}
            allowFontScaling={false}
          >
            you
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.identityName, { color: theme.ink }]}
              allowFontScaling={false}
            >
              {persistent.playerName ||
                (myPlayerNumber != null
                  ? '#' + myPlayerNumber
                  : 'connecting…')}
            </Text>
            {!hasName && myPlayerNumber != null && (
              <Text
                style={[styles.identitySubtitle, { color: theme.inkDim }]}
                allowFontScaling={false}
              >
                claim a handle to show on the board
              </Text>
            )}
          </View>
          <Text
            style={[styles.identityHint, { color: theme.accent }]}
            allowFontScaling={false}
          >
            {hasName ? 'change' : 'set name →'}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [
              styles.smallBtn,
              {
                borderColor: theme.inkSoft,
                backgroundColor: pressed ? theme.ink : 'transparent',
              },
            ]}
            onPress={onOpenHowTo}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.smallBtnText,
                  { color: pressed ? theme.bg : theme.ink },
                ]}
                allowFontScaling={false}
              >
                How to play
              </Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.smallBtn,
              {
                borderColor: theme.inkSoft,
                backgroundColor: pressed ? theme.ink : 'transparent',
              },
            ]}
            onPress={onOpenSettings}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.smallBtnText,
                  { color: pressed ? theme.bg : theme.ink },
                ]}
                allowFontScaling={false}
              >
                Settings
              </Text>
            )}
          </Pressable>
        </View>

        <Text
          style={[styles.versionMark, { color: theme.inkDim }]}
          allowFontScaling={false}
        >
          v{VERSION} · STACK&MERGE
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  // Eyebrow
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mark: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
  },

  // Title
  title: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2.5,
    lineHeight: 52,
  },
  tag: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 18,
    fontWeight: '600',
  },

  // Demo strip
  demoWrap: {
    alignItems: 'center',
    marginBottom: 22,
  },
  demoFrame: {
    width: '100%',
    paddingVertical: 26,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  demoCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: 'transparent',
  },
  demoCornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  demoCornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  demoCornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  demoCornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  demoStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  demoTile: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 0,
    elevation: 2,
  },
  demoTileText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 10,
  },
  demoCaption: {
    marginTop: 14,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
  },

  // Stats strip
  statsStrip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  statsText: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
  },

  // Section label
  sectionLabel: {
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: '700',
    marginBottom: 10,
  },

  // Modes
  modes: {
    gap: 10,
    marginBottom: 18,
  },
  modeCard: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeName: {
    fontWeight: '800',
    fontSize: 19,
    letterSpacing: -0.5,
  },
  startPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  startPillText: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  modeDesc: {
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 4,
    fontWeight: '600',
  },
  bestLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
  },
  bestNum: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Buttons / rows
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  leaderboardBtn: {
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  leaderboardText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  identityLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  identityName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  identitySubtitle: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: 3,
  },
  identityHint: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  smallBtn: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  smallBtnText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  versionMark: {
    marginTop: 28,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
});
