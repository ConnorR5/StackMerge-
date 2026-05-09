import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Theme } from '../theme';

interface Props {
  theme: Theme;
  initial?: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const NameOverlay: React.FC<Props> = ({ theme, initial, onSubmit, onCancel }) => {
  const [value, setValue] = useState(initial || '');
  const trimmed = value.trim().slice(0, 24);
  const valid = trimmed.length > 0;

  return (
    <SafeAreaView style={[styles.host, { backgroundColor: theme.bg }]}>
      <View style={styles.body}>
        <Text style={[styles.mark, { color: theme.inkDim }]} allowFontScaling={false}>
          — DISPLAY NAME —
        </Text>
        <Text style={[styles.title, { color: theme.ink }]} allowFontScaling={false}>
          PICK A HANDLE
        </Text>
        <Text style={[styles.hint, { color: theme.inkDim }]} allowFontScaling={false}>
          shows on the leaderboard. up to 24 characters.
        </Text>

        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          maxLength={24}
          placeholder="e.g. connor"
          placeholderTextColor={theme.inkDim}
          style={[
            styles.input,
            { borderColor: theme.ink, color: theme.ink },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => valid && onSubmit(trimmed)}
          returnKeyType="done"
          allowFontScaling={false}
        />

        <View style={styles.btns}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.btn,
              {
                borderColor: theme.ink,
                backgroundColor: pressed ? theme.ink : 'transparent',
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                style={[styles.btnText, { color: pressed ? theme.bg : theme.ink }]}
                allowFontScaling={false}
              >
                Cancel
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => valid && onSubmit(trimmed)}
            disabled={!valid}
            style={({ pressed }) => [
              styles.btn,
              {
                borderColor: theme.ink,
                backgroundColor: valid ? (pressed ? theme.accent : theme.ink) : theme.inkSoft,
                opacity: valid ? 1 : 0.6,
              },
            ]}
          >
            <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
              Save & submit
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFillObject, zIndex: 130 },
  body: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  mark: { fontSize: 10, letterSpacing: 3, fontWeight: '700' },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 4,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 24,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
});
