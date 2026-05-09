import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  onClose: () => void;
}

const RULES = [
  { num: '01', body: 'Tap any empty cell to place the next tile' },
  { num: '02', body: 'Two equal tiles touching merge into a bigger one — chains keep going' },
  { num: '03', body: 'Game ends when the board fills with no merges left. Reach 2048!' },
  { num: '★', body: 'Wild tiles match any neighbor — golden, glowing' },
  { num: '✦', body: 'Bombs destroy all tiles in a 3×3 area when placed' },
];

export const HowToOverlay: React.FC<Props> = ({ theme, onClose }) => {
  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
            — HOW TO PLAY —
          </Text>
        </View>
        <View style={styles.rules}>
          {RULES.map((r) => (
            <View key={r.num} style={styles.rule}>
              <Text style={[styles.num, { color: theme.accent }]} allowFontScaling={false}>
                {r.num}
              </Text>
              <Text style={[styles.body, { color: theme.ink }]} allowFontScaling={false}>
                {r.body}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: pressed ? theme.accent : theme.ink, borderColor: theme.ink },
          ]}
          onPress={onClose}
        >
          <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
            Got it
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 110 },
  scroll: { padding: 24 },
  header: { marginBottom: 28 },
  mark: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  rules: { gap: 14, marginBottom: 32 },
  rule: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  num: {
    fontSize: 13,
    fontWeight: '800',
    width: 24,
    marginTop: 2,
  },
  body: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  btn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    marginTop: 12,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
});
