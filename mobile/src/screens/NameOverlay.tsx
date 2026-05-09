import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Theme } from '../theme';
import { validateName } from '../profanity';

export type NameSubmitResult =
  | { ok: true }
  | { ok: false; reason: string };

interface Props {
  theme: Theme;
  initial?: string | null;
  /**
   * Called when the user taps Save. The parent does any server-side checks
   * (uniqueness, etc) and resolves with the result. While the promise is
   * pending we show a spinner.
   */
  onSubmit: (name: string) => Promise<NameSubmitResult>;
  onCancel: () => void;
  /** Optional: the player's auto-assigned number, shown as a hint. */
  playerNumber?: number | null;
}

export const NameOverlay: React.FC<Props> = ({ theme, initial, onSubmit, onCancel, playerNumber }) => {
  const [value, setValue] = useState(initial || '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryNext() {
    if (busy) return;
    const v = validateName(value);
    if (!v.ok) {
      setError(v.reason);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await onSubmit(v.clean);
      if (!r.ok) setError(r.reason);
    } finally {
      setBusy(false);
    }
  }

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
          {playerNumber != null
            ? `currently you're #${playerNumber} · names must be unique · 24 chars max`
            : 'names must be unique · 24 chars max'}
        </Text>

        <TextInput
          autoFocus
          value={value}
          onChangeText={(t) => {
            setValue(t);
            if (error) setError(null);
          }}
          maxLength={24}
          placeholder="e.g. connor"
          placeholderTextColor={theme.inkDim}
          style={[
            styles.input,
            { borderColor: error ? theme.accent : theme.ink, color: theme.ink },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onSubmitEditing={tryNext}
          returnKeyType="done"
          allowFontScaling={false}
        />

        {error && (
          <Text style={[styles.error, { color: theme.accent }]} allowFontScaling={false}>
            ⚠ {error}
          </Text>
        )}

        <View style={styles.btns}>
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={({ pressed }) => [
              styles.btn,
              {
                borderColor: theme.ink,
                backgroundColor: pressed ? theme.ink : 'transparent',
                opacity: busy ? 0.5 : 1,
              },
            ]}
          >
            {({ pressed }) => (
              <Text style={[styles.btnText, { color: pressed ? theme.bg : theme.ink }]} allowFontScaling={false}>
                Cancel
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={tryNext}
            disabled={busy}
            style={({ pressed }) => [
              styles.btn,
              {
                borderColor: theme.ink,
                backgroundColor: pressed ? theme.accent : theme.ink,
                opacity: busy ? 0.7 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Text style={[styles.btnText, { color: theme.bg }]} allowFontScaling={false}>
                Save
              </Text>
            )}
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
    lineHeight: 16,
  },
  input: {
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 16,
  },
  btns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
});
