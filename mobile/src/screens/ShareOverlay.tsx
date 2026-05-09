import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  date: string;
  shareText: string;
  onClose: () => void;
}

export const ShareOverlay: React.FC<Props> = ({ theme, date, shareText, onClose }) => {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await Clipboard.setStringAsync(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
            — SHARE DAILY —
          </Text>
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

        <Text style={[styles.title, { color: theme.ink }]} allowFontScaling={false}>
          DAILY
        </Text>
        <Text style={[styles.date, { color: theme.inkDim }]} allowFontScaling={false}>
          {date}
        </Text>

        <View style={[styles.block, { backgroundColor: theme.inkSoft, borderColor: theme.inkSoft }]}>
          <Text style={[styles.blockText, { color: theme.ink }]} allowFontScaling={false}>
            {shareText}
          </Text>
        </View>

        <Pressable
          onPress={copy}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: pressed ? theme.accent : theme.ink, borderColor: theme.ink },
          ]}
        >
          <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
            {copied ? 'Copied!' : 'Copy result'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 120 },
  scroll: { padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  mark: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  iconBtn: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1.5 },
  date: { fontSize: 11, letterSpacing: 1, marginTop: 4, marginBottom: 32, fontWeight: '600' },
  block: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 16,
  },
  blockText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 20,
  },
  btn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
  },
  btnText: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
});
