import { useCallback, useMemo, useRef } from 'react';
import {
  PanResponder,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MinTouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ValueSliderProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Lightweight draggable slider with full screen-reader increment/decrement support. */
export function ValueSlider({
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
  accessibilityLabel,
  style,
}: ValueSliderProps) {
  const { colors, radius } = useTheme();
  const widthRef = useRef(0);
  const safeRange = Math.max(Number.EPSILON, max - min);
  const clampedValue = clamp(value, min, max);
  const progress = (clampedValue - min) / safeRange;

  const setFromPosition = useCallback(
    (x: number) => {
      if (widthRef.current <= 0) return;
      const raw = min + clamp(x / widthRef.current, 0, 1) * safeRange;
      const stepped = min + Math.round((raw - min) / step) * step;
      onChange(clamp(Number(stepped.toFixed(4)), min, max));
    },
    [max, min, onChange, safeRange, step],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => setFromPosition(event.nativeEvent.locationX),
        onPanResponderMove: (event) => setFromPosition(event.nativeEvent.locationX),
      }),
    [setFromPosition],
  );

  function handleLayout(event: LayoutChangeEvent) {
    widthRef.current = event.nativeEvent.layout.width;
  }

  function handleAccessibilityAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === 'increment') {
      onChange(clamp(Number((clampedValue + step).toFixed(4)), min, max));
    }
    if (event.nativeEvent.actionName === 'decrement') {
      onChange(clamp(Number((clampedValue - step).toFixed(4)), min, max));
    }
  }

  return (
    <View
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: Math.round(min * 100),
        max: Math.round(max * 100),
        now: Math.round(clampedValue * 100),
        text: `${Math.round(clampedValue * 100)} percent`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      onLayout={handleLayout}
      style={[
        {
          minHeight: MinTouchTarget,
          justifyContent: 'center',
          paddingVertical: 12,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: colors.brand.primary,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${progress * 100}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.surface.raised,
          borderWidth: 2,
          borderColor: colors.brand.primary,
        }}
      />
    </View>
  );
}
