import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const CELEBRATION_STORAGE_KEY = '@murphy-method/celebration-effects/v1';

type FeedbackAction = () => Promise<void>;

let celebrationEffectsEnabled: boolean | null = null;

async function feedbackEnabled(): Promise<boolean> {
  if (celebrationEffectsEnabled !== null) return celebrationEffectsEnabled;
  try {
    celebrationEffectsEnabled = (await AsyncStorage.getItem(CELEBRATION_STORAGE_KEY)) !== 'false';
  } catch {
    celebrationEffectsEnabled = true;
  }
  return celebrationEffectsEnabled;
}

/** Keeps the optional feedback preference available before the next network load. */
export async function setCelebrationEffectsEnabled(enabled: boolean): Promise<void> {
  celebrationEffectsEnabled = enabled;
  try {
    await AsyncStorage.setItem(CELEBRATION_STORAGE_KEY, String(enabled));
  } catch {
    // Preference persistence must never block the underlying settings save.
  }
}

async function safelyPerform(action: FeedbackAction): Promise<void> {
  if (!(await feedbackEnabled())) return;
  try {
    await action();
  } catch {
    // Haptics are optional feedback. Unsupported hardware, user settings or
    // transient native conditions must never block the underlying action.
  }
}

export function selectionFeedback(): Promise<void> {
  if (Platform.OS === 'android') {
    return safelyPerform(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick),
    );
  }
  if (Platform.OS === 'ios') {
    return safelyPerform(() => Haptics.selectionAsync());
  }
  return Promise.resolve();
}

export function actionFeedback(): Promise<void> {
  if (Platform.OS === 'android') {
    return safelyPerform(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End),
    );
  }
  if (Platform.OS === 'ios') {
    return safelyPerform(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }
  return Promise.resolve();
}

export function successFeedback(): Promise<void> {
  if (Platform.OS === 'android') {
    return safelyPerform(() => Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm));
  }
  if (Platform.OS === 'ios') {
    return safelyPerform(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }
  return Promise.resolve();
}

export async function resetCelebrationEffectsForTests(): Promise<void> {
  celebrationEffectsEnabled = null;
  await AsyncStorage.removeItem(CELEBRATION_STORAGE_KEY);
}
