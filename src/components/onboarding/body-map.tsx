import { Pressable, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import {
  BODY_VIEWBOX_HEIGHT,
  BODY_VIEWBOX_WIDTH,
  BodySilhouette,
} from '@/components/onboarding/body-silhouette';
import { Icon } from '@/components/ui/icon';
import { BODY_AREA_OPTIONS, type BodyAreaKey } from '@/domain/onboarding/body-areas';
import { useTheme } from '@/hooks/use-theme';

type RegionBox = { id: BodyAreaKey; x: number; y: number; width: number; height: number };

/**
 * Approximate region hit-boxes in the same coordinate space as
 * `BODY_VIEWBOX_WIDTH`/`BODY_VIEWBOX_HEIGHT`, so they can be drawn as SVG
 * overlays (scaling exactly with the silhouette) and, at the same
 * fractional position, as accessible `Pressable` hit-areas on top of it.
 * These are deliberately approximate soft zones, not anatomical outlines —
 * matching the "approximate regions" contract in
 * docs/SCREEN_SPECIFICATIONS.md rather than implying precise targeting.
 * Ids are the canonical `BodyAreaKey`s (`src/domain/onboarding/body-areas.ts`)
 * — the exact set the database check constraint accepts, no aggregation.
 */
const regionsByView: Record<'front' | 'back', RegionBox[]> = {
  front: [
    { id: 'shoulders', x: 40, y: 58, width: 120, height: 28 },
    { id: 'chest', x: 56, y: 90, width: 88, height: 46 },
    { id: 'biceps', x: 14, y: 70, width: 28, height: 55 },
    { id: 'biceps', x: 158, y: 70, width: 28, height: 55 },
    { id: 'forearms', x: 12, y: 130, width: 24, height: 80 },
    { id: 'forearms', x: 164, y: 130, width: 24, height: 80 },
    { id: 'core', x: 58, y: 140, width: 84, height: 40 },
    { id: 'waist_appearance', x: 58, y: 178, width: 84, height: 24 },
    { id: 'quadriceps', x: 54, y: 198, width: 38, height: 82 },
    { id: 'quadriceps', x: 108, y: 198, width: 38, height: 82 },
  ],
  back: [
    { id: 'upper_back', x: 44, y: 60, width: 112, height: 56 },
    { id: 'lats', x: 44, y: 112, width: 112, height: 44 },
    { id: 'triceps', x: 14, y: 70, width: 28, height: 65 },
    { id: 'triceps', x: 158, y: 70, width: 28, height: 65 },
    { id: 'glutes', x: 54, y: 196, width: 92, height: 40 },
    { id: 'hamstrings', x: 54, y: 238, width: 38, height: 48 },
    { id: 'hamstrings', x: 108, y: 238, width: 38, height: 48 },
    { id: 'calves', x: 56, y: 284, width: 32, height: 76 },
    { id: 'calves', x: 112, y: 284, width: 32, height: 76 },
  ],
};

export type BodyMapProps = {
  view: 'front' | 'back';
  selectedKeys: BodyAreaKey[];
  onToggle: (key: BodyAreaKey) => void;
};

export function BodyMap({ view, selectedKeys, onToggle }: BodyMapProps) {
  const { colors, spacing, radius } = useTheme();
  const labelFor = (id: BodyAreaKey) =>
    BODY_AREA_OPTIONS.find((option) => option.key === id)?.label ?? id;
  const regions = regionsByView[view];

  return (
    <View style={{ alignItems: 'center', gap: spacing.two }}>
      <View
        style={{
          width: '100%',
          maxWidth: 260,
          aspectRatio: BODY_VIEWBOX_WIDTH / BODY_VIEWBOX_HEIGHT,
        }}
      >
        <BodySilhouette fill={colors.text.disabled} />
        {/* Selection fill/outline — sits over the silhouette, scales with it via the shared viewBox. */}
        <Svg
          viewBox={`0 0 ${BODY_VIEWBOX_WIDTH} ${BODY_VIEWBOX_HEIGHT}`}
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {regions.map((region, index) => {
            const selected = selectedKeys.includes(region.id);
            return (
              <Rect
                key={`${region.id}-${index}`}
                x={region.x}
                y={region.y}
                width={region.width}
                height={region.height}
                rx={Math.min(region.width, region.height) / 2}
                fill={selected ? colors.brand.primarySubtle : 'transparent'}
                fillOpacity={selected ? 0.9 : 0}
                stroke={selected ? colors.brand.primary : 'transparent'}
                strokeWidth={selected ? 2.5 : 0}
              />
            );
          })}
        </Svg>
        {/* Accessible tap targets, positioned as percentages of the same viewBox as the overlay above. */}
        {regions.map((region, index) => {
          const selected = selectedKeys.includes(region.id);
          return (
            <Pressable
              key={`${region.id}-${index}-hit`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={labelFor(region.id)}
              onPress={() => onToggle(region.id)}
              style={{
                position: 'absolute',
                left: `${(region.x / BODY_VIEWBOX_WIDTH) * 100}%`,
                top: `${(region.y / BODY_VIEWBOX_HEIGHT) * 100}%`,
                width: `${(region.width / BODY_VIEWBOX_WIDTH) * 100}%`,
                height: `${(region.height / BODY_VIEWBOX_HEIGHT) * 100}%`,
              }}
            >
              {selected ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 18,
                    height: 18,
                    borderRadius: radius.pill,
                    backgroundColor: colors.brand.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="check" color={colors.brand.onPrimary} size={11} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
