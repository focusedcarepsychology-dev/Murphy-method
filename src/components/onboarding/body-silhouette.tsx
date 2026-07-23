import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { ColorValue } from 'react-native';

export const BODY_VIEWBOX_WIDTH = 200;
export const BODY_VIEWBOX_HEIGHT = 400;

export type BodySilhouetteProps = {
  fill: ColorValue;
};

/**
 * Neutral, faceless human-body silhouette — an original flat-vector shape,
 * not a photo or a licensed asset. Deliberately abstract (no skin tone, no
 * facial features, no gendered markers) so it reads as an inclusive,
 * non-photorealistic stand-in for "a body" rather than a specific person
 * (docs/SCREEN_SPECIFICATIONS.md §2). Every piece shares one flat fill and
 * has no stroke, so overlapping limb/torso shapes merge into a single
 * silhouette with no visible seams. Front and back use the same shape —
 * the two views only differ in which region overlays are shown on top of
 * it (`body-map.tsx`).
 */
export function BodySilhouette({ fill }: BodySilhouetteProps) {
  return (
    <Svg
      viewBox={`0 0 ${BODY_VIEWBOX_WIDTH} ${BODY_VIEWBOX_HEIGHT}`}
      width="100%"
      height="100%"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Head */}
      <Circle cx={100} cy={34} r={26} fill={fill} />
      {/* Neck */}
      <Rect x={88} y={54} width={24} height={20} rx={10} fill={fill} />
      {/* Torso: shoulders taper to waist, then flare slightly at the hip */}
      <Path
        d="M 42 64
           C 30 74, 34 90, 48 100
           C 40 120, 44 148, 60 170
           C 46 182, 42 190, 50 200
           L 150 200
           C 158 190, 154 182, 140 170
           C 156 148, 160 120, 152 100
           C 166 90, 170 74, 158 64
           C 140 56, 120 52, 100 52
           C 80 52, 60 56, 42 64
           Z"
        fill={fill}
      />
      {/* Left arm (upper + forearm, slightly overlapping at the elbow) */}
      <Rect x={16} y={70} width={26} height={70} rx={13} fill={fill} />
      <Rect x={14} y={132} width={22} height={90} rx={11} fill={fill} />
      {/* Right arm */}
      <Rect x={158} y={70} width={26} height={70} rx={13} fill={fill} />
      <Rect x={164} y={132} width={22} height={90} rx={11} fill={fill} />
      {/* Left leg (thigh + calf) and foot */}
      <Rect x={54} y={196} width={36} height={90} rx={18} fill={fill} />
      <Rect x={58} y={270} width={28} height={90} rx={14} fill={fill} />
      <Rect x={54} y={352} width={36} height={16} rx={8} fill={fill} />
      {/* Right leg and foot */}
      <Rect x={110} y={196} width={36} height={90} rx={18} fill={fill} />
      <Rect x={114} y={270} width={28} height={90} rx={14} fill={fill} />
      <Rect x={110} y={352} width={36} height={16} rx={8} fill={fill} />
    </Svg>
  );
}
