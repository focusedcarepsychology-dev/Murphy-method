import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import {
  actionFeedback,
  resetCelebrationEffectsForTests,
  selectionFeedback,
  setCelebrationEffectsEnabled,
  successFeedback,
} from '@/services/feedback/haptics';

jest.mock('expo-haptics', () => ({
  AndroidHaptics: {
    Segment_Tick: 'segment-tick',
    Gesture_End: 'gesture-end',
    Confirm: 'confirm',
  },
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
  performAndroidHapticsAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

const originalOS = Platform.OS;

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

describe('haptic feedback service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await resetCelebrationEffectsForTests();
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
  });

  it('uses a native selection tick on Android', async () => {
    setPlatform('android');

    await selectionFeedback();

    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledWith(
      Haptics.AndroidHaptics.Segment_Tick,
    );
  });

  it('uses a light impact for an ordinary completed action on iOS', async () => {
    setPlatform('ios');

    await actionFeedback();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('uses distinct success feedback for workout completion', async () => {
    setPlatform('ios');

    await successFeedback();

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('respects the persisted celebration-effects preference', async () => {
    setPlatform('ios');
    await setCelebrationEffectsEnabled(false);

    await successFeedback();

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('never rejects when the native haptics engine is unavailable', async () => {
    setPlatform('ios');
    jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error('Unavailable'));

    await expect(selectionFeedback()).resolves.toBeUndefined();
  });
});
