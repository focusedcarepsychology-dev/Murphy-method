import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Caption, Heading } from '@/components/ui/app-text';
import { TertiaryButton } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useTheme } from '@/hooks/use-theme';

export type RestTimerProps = {
  totalSeconds: number;
  onComplete: () => void;
};

/** Auto-starting rest timer — visually signals completion, skippable, extendable. */
export function RestTimer({ totalSeconds, onComplete }: RestTimerProps) {
  const { spacing } = useTheme();
  const [remaining, setRemaining] = useState(totalSeconds);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((current) => (current > 0 ? current - 1 : current));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View style={{ gap: spacing.two, alignItems: 'center' }}>
      <Caption>RESTING</Caption>
      <Heading variant="hero" accessibilityLabel={`${remaining} seconds remaining`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Heading>
      <View style={{ width: '100%' }}>
        <ProgressBar
          value={1 - remaining / totalSeconds}
          tone="brand"
          accessibilityLabel="Rest timer progress"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.three }}>
        <TertiaryButton label="+15s" onPress={() => setRemaining((current) => current + 15)} />
        <TertiaryButton label="Skip rest" onPress={() => setRemaining(0)} />
      </View>
    </View>
  );
}
