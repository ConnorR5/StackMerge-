import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MODES, type GameMode } from '../constants';
import type { Theme } from '../theme';
import type { Persistent } from '../storage';

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

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
          — A QUICK PUZZLE —
        </Text>
        <Text style={[styles.title, { color: theme.ink }]} allowFontScaling={false}>
          STACK
          <Text style={{ color: theme.accent }}>&</Text>
          MERGE
        </Text>
        <Text style={[styles.tag, { color: theme.inkDim }]} allowFontScaling={false}>
          tap · combine · grow
        </Text>

        <View style={styles.modes}>
          {MODES.map((m) => {
            const best = bestFor(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => onPickMode(m.id)}
                style={({ pressed }) => [
                  styles.modeCard,
                  { borderColor: theme.ink, backgroundColor: pressed ? theme.ink : 'transparent' },
                ]}
              >
                {({ pressed }) => (
                  <>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modeName,
                          { color: pressed ? theme.bg : theme.ink },
                        ]}
                        allowFontScaling={false}
                      >
                        {m.name}
                      </Text>
                      <Text
                        style={[
                          styles.modeDesc,
                          { color: pressed ? theme.bg : theme.inkDim },
                        ]}
                        allowFontScaling={false}
                      >
                        {m.desc}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.bestLabel,
                          { color: pressed ? theme.bg : theme.inkDim },
                        ]}
                        allowFontScaling={false}
                      >
                        best
                      </Text>
                      <Text
                        style={[
                          styles.bestNum,
                          { color: pressed ? theme.bg : theme.ink },
                        ]}
                        allowFontScaling={false}
                      >
                        {best}
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.leaderboardBtn,
            {
              borderColor: theme.ink,
              backgroundColor: pressed ? theme.accent : theme.ink,
            },
          ]}
          onPress={onOpenLeaderboard}
        >
          <Text style={[styles.leaderboardText, { color: theme.bg }]} allowFontScaling={false}>
            ◆ LEADERBOARD
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.identityRow,
            { borderColor: theme.inkSoft, opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={onOpenName}
        >
          <Text style={[styles.identityLabel, { color: theme.inkDim }]} allowFontScaling={false}>
            you
          </Text>
          <Text style={[styles.identityName, { color: theme.ink }]} allowFontScaling={false}>
            {persistent.playerName ||
              (myPlayerNumber != null ? '#' + myPlayerNumber : 'connecting…')}
          </Text>
          <Text style={[styles.identityHint, { color: theme.accent }]} allowFontScaling={false}>
            {persistent.playerName ? 'change' : 'set name'}
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
                style={[styles.smallBtnText, { color: pressed ? theme.bg : theme.ink }]}
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
                style={[styles.smallBtnText, { color: pressed ? theme.bg : theme.ink }]}
                allowFontScaling={false}
              >
                Settings
              </Text>
            )}
          </Pressable>
        </View>
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
    paddingVertical: 32,
  },
  mark: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 48,
  },
  tag: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 32,
    fontWeight: '600',
  },
  modes: {
    gap: 10,
    marginBottom: 24,
  },
  modeCard: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeName: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.5,
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
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
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
});
