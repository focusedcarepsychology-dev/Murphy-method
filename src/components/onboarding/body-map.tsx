import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { PreviewBodyArea } from '@/dev/previewData';

type LayoutBlock = { id: string; flex: number };

/**
 * Deliberately abstract geometric layout, not photorealistic anatomy —
 * satisfies "no medically precise anatomy, no unlicensed imagery"
 * (docs/SCREEN_SPECIFICATIONS.md §2) while still reading as a body outline.
 * Later phases can extend this block list without changing the component
 * contract.
 */
const layoutByView: Record<'front' | 'back', LayoutBlock[][]> = {
  front: [
    [{ id: 'shoulders', flex: 1 }],
    [
      { id: 'arms', flex: 1 },
      { id: 'chest', flex: 2 },
      { id: 'arms', flex: 1 },
    ],
    [{ id: 'core', flex: 1 }],
    [
      { id: 'thighs', flex: 1 },
      { id: 'thighs', flex: 1 },
    ],
  ],
  back: [
    [{ id: 'upper_back', flex: 1 }],
    [{ id: 'glutes', flex: 1 }],
    [
      { id: 'calves', flex: 1 },
      { id: 'calves', flex: 1 },
    ],
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
  const rows = layoutByView[view];

  return (
    <View style={{ alignItems: 'center', gap: spacing.two }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.pill,
          backgroundColor: colors.surface.sunken,
        }}
      />
      <View style={{ width: '100%', gap: spacing.one }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', gap: spacing.one }}>
            {row.map((block, blockIndex) => {
              const selected = selectedIds.includes(block.id);
              return (
                <Pressable
                  key={`${block.id}-${blockIndex}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={labelFor(block.id)}
                  onPress={() => onToggle(block.id)}
                  style={{
                    flex: block.flex,
                    height: 56,
                    borderRadius: radius.md,
                    backgroundColor: selected ? colors.brand.primarySubtle : colors.surface.sunken,
                    borderWidth: selected ? 2 : 0,
                    borderColor: colors.brand.primary,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
