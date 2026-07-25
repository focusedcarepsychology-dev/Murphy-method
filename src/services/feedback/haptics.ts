import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type FeedbackAction = () => Promise<void>;

async function safelyPerform(action: FeedbackAction): Promise<void> {
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
    return safelyPerform(() =>
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm),
    );
  }
  if (Platform.OS === 'ios') {
    return safelyPerform(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  }
  return Promise.resolve();
}
