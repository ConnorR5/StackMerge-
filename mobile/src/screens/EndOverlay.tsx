import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GameState } from '../game';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  state: GameState;
  bestScore: number;
  isNewBest: boolean;
  /** Indicates a submission attempt is in flight or has settled. */
  submitState: 'idle' | 'submitting' | 'submitted' | 'error';
  onPlayAgain: () => void;
  onSubmitLeaderboard: () => void;
  onViewLeaderboard: () => void;
  onHome: () => void;
}

export const EndOverlay: React.FC<Props> = ({
  theme,
  state,
  bestScore,
  isNewBest,
  submitState,
  onPlayAgain,
  onSubmitLeaderboard,
  onViewLeaderboard,
  onHome,
}) => {
  const submitLabel =
    submitState === 'submitting'
      ? 'Submitting…'
      : submitState === 'submitted'
      ? '✓ Submitted'
      : submitState === 'error'
      ? 'Try again'
      : 'Submit to Leaderboard';

  const canSubmit = state.score > 0 && submitState !== 'submitting' && submitState !== 'submitted';

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
          — ROUND COMPLETE —
        </Text>

        <View style={styles.center}>
          <Text style={[styles.score, { color: theme.ink }]} allowFontScaling={false}>
            {state.score}
          </Text>
          <Text style={[styles.best, { color: theme.inkDim }]} allowFontScaling={false}>
            best {bestScore}
          </Text>
          {isNewBest && (
            <Text style={[styles.newBest, { color: theme.accent }]} allowFontScaling={false}>
              ★ NEW PERSONAL BEST
            </Text>
          )}

          <View style={styles.stats}>
            <Stat theme={theme} label="Highest" value={String(state.highestTile)} />
            <Stat theme={theme} label="Moves" value={String(state.moves)} />
            <Stat theme={theme} label="Best chain" value={'×' + state.longestChain} />
          </View>
        </View>

        <View style={styles.btns}>
          <Pressable
            onPress={onPlayAgain}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: pressed ? theme.accent : theme.ink, borderColor: theme.ink },
            ]}
          >
            <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
              Play Again
            </Text>
          </Pressable>

          <Pressable
            onPress={canSubmit ? onSubmitLeaderboard : onViewLeaderboard}
            disabled={submitState === 'submitting'}
            style={({ pressed }) => [
              styles.btn,
              {
                borderColor: theme.ink,
                backgroundColor:
                  submitState === 'submitted'
                    ? theme.accent
                    : pressed
                    ? theme.ink
                    : 'transparent',
                opacity: submitState === 'submitting' ? 0.6 : 1,
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.btnText,
                  {
                    color:
                      submitState === 'submitted'
                        ? theme.bg
                        : pressed
                        ? theme.bg
                        : theme.ink,
                  },
                ]}
                allowFontScaling={false}
              >
                {submitState === 'submitted' ? 'View Leaderboard' : submitLabel}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onHome}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: pressed ? theme.ink : 'transparent',
                borderColor: theme.ink,
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[styles.btnText, { color: pressed ? theme.bg : theme.ink }]}
                allowFontScaling={false}
              >
                Home
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Stat: React.FC<{ theme: Theme; label: string; value: string }> = ({ theme, label, value }) => (
  <View style={styles.stat}>
    <Text style={[styles.statLabel, { color: theme.inkDim }]} allowFontScaling={false}>
      {label}
    </Text>
    <Text style={[styles.statVal, { color: theme.ink }]} allowFontScaling={false}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 110 },
  scroll: { padding: 24, flexGrow: 1 },
  mark: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  center: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  score: {
    fontSize: 80,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 80,
  },
  best: {
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 6,
    fontWeight: '600',
  },
  newBest: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 28,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stat: { alignItems: 'center' },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  btns: { gap: 10, marginTop: 'auto' },
  btn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
});
