import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Theme, ThemeId } from '../theme';
import { THEMES, THEME_UNLOCK } from '../theme';
import type { Persistent } from '../storage';
import { ACHIEVEMENTS } from '../achievements';

interface Props {
  theme: Theme;
  persistent: Persistent;
  onClose: () => void;
  onToggle: (key: 'sound' | 'haptics' | 'hints') => void;
  onPickTheme: (id: ThemeId) => void;
  onReset: () => void;
}

export const SettingsOverlay: React.FC<Props> = ({
  theme,
  persistent,
  onClose,
  onToggle,
  onPickTheme,
  onReset,
}) => {
  const stats = persistent.stats;
  const unlockedThemes = persistent.unlockedThemes;
  const settings = persistent.settings;
  const unlockedCount = persistent.achievements.unlocked.length;

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
              — SETTINGS —
            </Text>
            <Text style={[styles.title, { color: theme.ink }]} allowFontScaling={false}>
              SETTINGS
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: theme.ink,
                backgroundColor: pressed ? theme.ink : 'transparent',
              },
            ]}
          >
            {({ pressed }) => (
              <Text style={{ color: pressed ? theme.bg : theme.ink, fontSize: 18, fontWeight: '700' }}>
                ×
              </Text>
            )}
          </Pressable>
        </View>

        {/* Audio · Haptics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.inkDim, borderBottomColor: theme.inkSoft }]} allowFontScaling={false}>
            AUDIO · HAPTICS
          </Text>
          <ToggleRow theme={theme} label="Sound effects" on={settings.sound} onPress={() => onToggle('sound')} />
          <ToggleRow theme={theme} label="Haptics (vibration)" on={settings.haptics} onPress={() => onToggle('haptics')} />
          <ToggleRow theme={theme} label="Hint cells on tap" on={settings.hints} onPress={() => onToggle('hints')} />
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.inkDim, borderBottomColor: theme.inkSoft }]} allowFontScaling={false}>
            THEME
          </Text>
          <View style={styles.themeGrid}>
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const t = THEMES[id];
              const locked = !unlockedThemes.includes(id);
              const isActive = settings.theme === id;
              const lockHint =
                id !== 'dawn' ? THEME_UNLOCK[id as keyof typeof THEME_UNLOCK] : null;
              return (
                <Pressable
                  key={id}
                  disabled={locked}
                  onPress={() => onPickTheme(id)}
                  style={({ pressed }) => [
                    styles.themeCard,
                    {
                      borderColor: theme.ink,
                      opacity: locked ? 0.4 : 1,
                      backgroundColor: isActive ? theme.ink : pressed ? theme.ink : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeName,
                      { color: isActive ? theme.bg : theme.ink },
                    ]}
                    allowFontScaling={false}
                  >
                    {t.id.toUpperCase()}
                  </Text>
                  <View style={styles.swatches}>
                    {t.swatches.map((s, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: s }]} />
                    ))}
                  </View>
                  {locked && lockHint != null && (
                    <Text
                      style={[styles.themeLock, { color: isActive ? theme.bg : theme.inkDim }]}
                      allowFontScaling={false}
                    >
                      unlock at {lockHint}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.inkDim, borderBottomColor: theme.inkSoft }]} allowFontScaling={false}>
            STATS
          </Text>
          <View style={styles.statGrid}>
            <StatCard theme={theme} label="Games" value={String(stats.gamesPlayed)} />
            <StatCard theme={theme} label="Total merges" value={String(stats.totalMerges)} />
            <StatCard theme={theme} label="Biggest tile" value={String(stats.biggestTile)} />
            <StatCard theme={theme} label="Longest chain" value={'×' + stats.longestChain} />
            <StatCard theme={theme} label="Best classic" value={String(persistent.bests.classic)} />
            <StatCard theme={theme} label="Best zen" value={String(persistent.bests.zen)} />
            <StatCard theme={theme} label="Best race" value={String(persistent.bests.race)} />
            <StatCard theme={theme} label="Total score" value={String(stats.totalScore)} />
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={[styles.sectionTitleRow, { borderBottomColor: theme.inkSoft }]}>
            <Text style={[styles.sectionTitle, { color: theme.inkDim, borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]} allowFontScaling={false}>
              ACHIEVEMENTS
            </Text>
            <Text style={[styles.sectionCount, { color: theme.inkDim }]} allowFontScaling={false}>
              {unlockedCount}/{ACHIEVEMENTS.length}
            </Text>
          </View>
          <View style={styles.achGrid}>
            {ACHIEVEMENTS.map((a) => {
              const u = persistent.achievements.unlocked.includes(a.id);
              return (
                <View
                  key={a.id}
                  style={[
                    styles.achCard,
                    {
                      borderColor: u ? theme.ink : theme.inkSoft,
                      backgroundColor: u ? theme.inkSoft : 'transparent',
                      opacity: u ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text style={[styles.achMark, { color: theme.ink, opacity: u ? 1 : 0.4 }]} allowFontScaling={false}>
                    {a.mark}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.achName,
                        { color: theme.ink, opacity: u ? 1 : 0.45 },
                      ]}
                      allowFontScaling={false}
                    >
                      {a.name}
                    </Text>
                    <Text
                      style={[
                        styles.achDesc,
                        { color: theme.inkDim, opacity: u ? 1 : 0.5 },
                      ]}
                      allowFontScaling={false}
                    >
                      {u ? a.desc : '???'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.dangerBtn,
            {
              borderColor: pressed ? '#d94f3a' : theme.inkSoft,
              backgroundColor: pressed ? '#d94f3a' : 'transparent',
            },
          ]}
        >
          {({ pressed }) => (
            <Text style={[styles.dangerText, { color: pressed ? '#fff' : theme.inkDim }]} allowFontScaling={false}>
              RESET ALL PROGRESS
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const ToggleRow: React.FC<{ theme: Theme; label: string; on: boolean; onPress: () => void }> = ({ theme, label, on, onPress }) => (
  <Pressable style={styles.toggleRow} onPress={onPress}>
    <Text style={{ color: theme.ink, fontSize: 15 }} allowFontScaling={false}>
      {label}
    </Text>
    <View
      style={[
        styles.toggle,
        {
          backgroundColor: on ? theme.accent : theme.inkSoft,
          borderColor: on ? theme.accent : theme.ink,
        },
      ]}
    >
      <View
        style={[
          styles.toggleKnob,
          {
            backgroundColor: theme.bg,
            transform: [{ translateX: on ? 20 : 0 }],
          },
        ]}
      />
    </View>
  </Pressable>
);

const StatCard: React.FC<{ theme: Theme; label: string; value: string }> = ({ theme, label, value }) => (
  <View style={[styles.statCard, { borderColor: theme.inkSoft }]}>
    <Text style={[styles.statCardLabel, { color: theme.inkDim }]} allowFontScaling={false}>
      {label}
    </Text>
    <Text style={[styles.statCardVal, { color: theme.ink }]} allowFontScaling={false}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 110 },
  scroll: { padding: 24, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  mark: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  sectionCount: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderWidth: 1.5,
    padding: 2,
  },
  toggleKnob: {
    width: 16,
    height: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '48%',
    borderWidth: 2,
    padding: 12,
  },
  themeName: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.5,
  },
  swatches: { flexDirection: 'row', gap: 4, marginTop: 8 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  themeLock: { fontSize: 8, letterSpacing: 1, marginTop: 6, fontWeight: '600' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderWidth: 1.5,
    padding: 12,
  },
  statCardLabel: { fontSize: 9, letterSpacing: 1.5, fontWeight: '600' },
  statCardVal: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 },
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achCard: {
    width: '48%',
    borderWidth: 1.5,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  achMark: { fontSize: 22, lineHeight: 22 },
  achName: { fontWeight: '700', fontSize: 13, letterSpacing: -0.3, lineHeight: 16 },
  achDesc: { fontSize: 9, letterSpacing: 1, marginTop: 4, lineHeight: 13 },
  dangerBtn: {
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerText: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
});
