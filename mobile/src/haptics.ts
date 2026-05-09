/**
 * Haptics wrapper. expo-haptics drives Core Haptics on iOS (the "real" feel)
 * and the vibrator on Android. No-op on web.
 *
 * The pattern signatures we use:
 *   place — selection (lightest)
 *   merge(value) — light/medium/heavy depending on tile value
 *   chain(n)   — series of impacts, ramping up
 *   bomb       — rigid + warning notification
 *   victory    — success notification + heavy
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function impact(style: Haptics.ImpactFeedbackStyle) {
  if (!enabled || !isNative) return;
  Haptics.impactAsync(style).catch(() => {});
}

function notify(type: Haptics.NotificationFeedbackType) {
  if (!enabled || !isNative) return;
  Haptics.notificationAsync(type).catch(() => {});
}

export const Feel = {
  place() {
    if (!enabled || !isNative) return;
    Haptics.selectionAsync().catch(() => {});
  },

  merge(value: number) {
    if (value >= 256) impact(Haptics.ImpactFeedbackStyle.Heavy);
    else if (value >= 32) impact(Haptics.ImpactFeedbackStyle.Medium);
    else impact(Haptics.ImpactFeedbackStyle.Light);
  },

  chain(count: number) {
    // Stagger N impacts, ramping intensity
    if (!enabled || !isNative) return;
    for (let i = 0; i < count; i++) {
      const style =
        i >= 3
          ? Haptics.ImpactFeedbackStyle.Heavy
          : i >= 1
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
      setTimeout(() => Haptics.impactAsync(style).catch(() => {}), i * 80);
    }
  },

  bomb() {
    if (!enabled || !isNative) return;
    impact(Haptics.ImpactFeedbackStyle.Rigid);
    setTimeout(() => notify(Haptics.NotificationFeedbackType.Warning), 60);
  },

  victory() {
    notify(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Heavy), 120);
  },

  gameOver() {
    notify(Haptics.NotificationFeedbackType.Error);
  },

  unlock() {
    notify(Haptics.NotificationFeedbackType.Success);
  },

  button() {
    if (!enabled || !isNative) return;
    Haptics.selectionAsync().catch(() => {});
  },

  warning() {
    notify(Haptics.NotificationFeedbackType.Warning);
  },
};
