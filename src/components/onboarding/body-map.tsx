import { Pressable, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import {
  BODY_VIEWBOX_HEIGHT,
  BODY_VIEWBOX_WIDTH,
  BodySilhouette,
} from '@/components/onboarding/body-silhouette';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import type { PreviewBodyArea } from '@/dev/previewData';

type RegionBox = { id: string; x: number; y: number; width: number; height: number };

/**
 * Approximate region hit-boxes in the same coordinate space as
 * `BODY_VIEWBOX_WIDTH`/`BODY_VIEWBOX_HEIGHT`, so they can be drawn as SVG
 * overlays (scaling exactly with the silhouette) and, at the same
 * fractional position, as accessible `Pressable` hit-areas on top of it.
 * These are deliberately approximate soft zones, not anatomical outlines —
 * matching the "approximate regions" contract in
 * docs/SCREEN_SPECIFICATIONS.md rather than implying precise targeting.
 */
const regionsByView: Record<'front' | 'back', RegionBox[]> = {
  front: [
    { id: 'shoulders', x: 40, y: 60, width: 120, height: 34 },
    { id: 'chest', x: 50, y: 94, width: 100, height: 60 },
    { id: 'arms', x: 14, y: 68, width: 30, height: 150 },
    { id: 'arms', x: 156, y: 68, width: 30, height: 150 },
    { id: 'core', x: 52, y: 154, width: 96, height: 46 },
    { id: 'thighs', x: 52, y: 196, width: 40, height: 94 },
    { id: 'thighs', x: 108, y: 196, width: 40, height: 94 },
  ],
  back: [
    { id: 'upper_back', x: 44, y: 64, width: 112, height: 90 },
    { id: 'glutes', x: 54, y: 190, width: 92, height: 44 },
    { id: 'calves', x: 56, y: 284, width: 32, height: 80 },
    { id: 'calves', x: 112, y: 284, width: 32, height: 80 },
  ],
};

export type BodyMapProps = {
  view: 'front' | 'back';
  areas: PreviewBodyArea[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function BodyMap({ view, areas, selectedIds, onToggle }: BodyMapProps) {
  const { colors, spacing, radius } = useTheme();
  const labelFor = (id: string) => areas.find((area) => area.id === id)?.label ?? id;
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
            const selected = selectedIds.includes(region.id);
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
          const selected = selectedIds.includes(region.id);
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
