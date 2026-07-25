import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import type { BodyScanImageAngle } from '@/services/bodyscan/bodyscan-repository';
import { useTheme } from '@/hooks/use-theme';

export type BodyScanAlignmentGuideProps = {
  angle: Extract<BodyScanImageAngle, 'front' | 'side' | 'back'>;
  style?: StyleProp<ViewStyle>;
  transparent?: boolean;
};

/**
 * Neutral alignment overlay for repeatable progress photos. It is a camera
 * positioning aid only and does not estimate body composition or diagnose
 * physical changes.
 */
export function BodyScanAlignmentGuide({
  angle,
  style,
  transparent = false,
}: BodyScanAlignmentGuideProps) {
  const { colors, radius } = useTheme();
  const stroke = colors.brand.primary;
  const side = angle === 'side';

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          aspectRatio: 3 / 4,
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: transparent ? 'transparent' : colors.surface.sunken,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 400">
        <Rect x="1" y="1" width="298" height="398" rx="18" fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth="2" />
        <Line x1="150" y1="18" x2="150" y2="370" stroke={stroke} strokeOpacity={0.45} strokeWidth="2" strokeDasharray="8 8" />
        <Line x1="55" y1="125" x2="245" y2="125" stroke={stroke} strokeOpacity={0.35} strokeWidth="2" strokeDasharray="7 7" />
        <Line x1="70" y1="220" x2="230" y2="220" stroke={stroke} strokeOpacity={0.35} strokeWidth="2" strokeDasharray="7 7" />
        <Ellipse cx="150" cy="70" rx={side ? 24 : 34} ry="42" fill="none" stroke={stroke} strokeOpacity={0.75} strokeWidth="4" />
        {side ? (
          <Path
            d="M150 112 C175 126 177 172 165 208 C158 230 163 258 170 292 L171 355 M150 112 C135 145 136 185 145 215 C151 239 146 268 142 292 L140 355 M150 142 L202 196 M150 142 L105 194"
            fill="none"
            stroke={stroke}
            strokeOpacity={0.75}
            strokeWidth="5"
            strokeLinecap="round"
          />
        ) : (
          <Path
            d="M150 112 C118 122 105 162 112 205 C117 232 121 251 118 286 L105 355 M150 112 C182 122 195 162 188 205 C183 232 179 251 182 286 L195 355 M118 145 L62 214 M182 145 L238 214"
            fill="none"
            stroke={stroke}
            strokeOpacity={0.75}
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
        <Circle cx={side ? 140 : 105} cy="365" r="14" fill="none" stroke={stroke} strokeOpacity={0.75} strokeWidth="3" />
        <Circle cx={side ? 171 : 195} cy="365" r="14" fill="none" stroke={stroke} strokeOpacity={0.75} strokeWidth="3" />
      </Svg>
    </View>
  );
}
