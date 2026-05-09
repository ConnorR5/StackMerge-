import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MODES, type GameMode } from '../constants';
import type { Theme } from '../theme';
import { fetchTopScores, type ScoreRow } from '../leaderboard';

interface Props {
  theme: Theme;
  initialMode?: GameMode;
  /** Highlight rows from this device. */
  myDeviceId: string | null;
  onClose: () => void;
}

const PAGE_SIZE = 50;

export const LeaderboardOverlay: React.FC<Props> = ({
  theme,
  initialMode = 'classic',
  myDeviceId,
  onClose,
}) => {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [rows, setRows] = useState<ScoreRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(m: GameMode) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTopScores(m, PAGE_SIZE);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leaderboard');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(mode);
  }, [mode]);

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
            — LEADERBOARD —
          </Text>
          <Text style={[styles.title, { color: theme.ink }]} allowFontScaling={false}>
            TOP {PAGE_SIZE}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.iconBtn,
            { borderColor: theme.ink, backgroundColor: pressed ? theme.ink : 'transparent' },
          ]}
        >
          {({ pressed }) => (
            <Text style={{ color: pressed ? theme.bg : theme.ink, fontSize: 18, fontWeight: '700' }}>
              ×
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={({ pressed }) => [
                styles.tab,
                {
                  borderColor: theme.ink,
                  backgroundColor: active ? theme.ink : pressed ? theme.inkSoft : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? theme.bg : theme.ink },
                ]}
                allowFontScaling={false}
              >
                {m.name.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadWrap}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.inkDim, marginTop: 12, fontSize: 11, letterSpacing: 1 }} allowFontScaling={false}>
            Loading scores…
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.loadWrap}>
          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }} allowFontScaling={false}>
            ⚠ {error}
          </Text>
          <Pressable
            onPress={() => load(mode)}
            style={({ pressed }) => [
              styles.retry,
              { borderColor: theme.ink, backgroundColor: pressed ? theme.ink : 'transparent' },
            ]}
          >
            {({ pressed }) => (
              <Text style={{ color: pressed ? theme.bg : theme.ink, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }} allowFontScaling={false}>
                RETRY
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {!loading && !error && rows && rows.length === 0 && (
        <View style={styles.loadWrap}>
          <Text style={[styles.empty, { color: theme.inkDim }]} allowFontScaling={false}>
            no scores yet —
          </Text>
          <Text style={[styles.emptyBig, { color: theme.ink }]} allowFontScaling={false}>
            be the first
          </Text>
        </View>
      )}

      {!loading && !error && rows && rows.length > 0 && (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((row, i) => {
            const isMe = !!myDeviceId && row.device_id === myDeviceId;
            const rank = i + 1;
            return (
              <View
                key={row.id}
                style={[
                  styles.row,
                  {
                    borderBottomColor: theme.inkSoft,
                    backgroundColor: isMe ? theme.inkSoft : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    {
                      color:
                        rank === 1
                          ? theme.accent
                          : rank <= 3
                          ? theme.ink
                          : theme.inkDim,
                      fontWeight: rank <= 3 ? '800' : '600',
                    },
                  ]}
                  allowFontScaling={false}
                >
                  {String(rank).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.name,
                      { color: isMe ? theme.accent : theme.ink },
                    ]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {row.name}
                    {isMe ? '  ← you' : ''}
                  </Text>
                  <Text style={[styles.meta, { color: theme.inkDim }]} numberOfLines={1} allowFontScaling={false}>
                    highest {row.highest_tile} · {row.moves} moves · ×{row.longest_chain}
                  </Text>
                </View>
                <Text style={[styles.score, { color: theme.ink }]} allowFontScaling={false}>
                  {row.score}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: { fontSize: 11, letterSpacing: 1.5, fontWeight: '600' },
  emptyBig: { fontSize: 28, fontWeight: '800', letterSpacing: -1, marginTop: 8 },
  retry: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  rank: {
    fontFamily: 'monospace',
    fontSize: 14,
    width: 28,
    textAlign: 'right',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  score: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    minWidth: 70,
    textAlign: 'right',
  },
});
