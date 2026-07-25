import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Original, internally-owned exercise illustrations (remediation Part 7):
 * a minimal line-art stick figure per pose category, never a scraped or
 * licensed third-party image. Each `visual_key` seeded on `exercises`
 * (docs/DATABASE_SCHEMA.md §5) maps to one distinct pose here — this is a
 * deliberately small, lightweight v1 set (one pose per movement category,
 * not one drawing per exercise); the architecture allows a richer
 * illustration or short animation per exercise later without changing the
 * data model (the `visual_key` column is exactly that seam).
 */
export type ExercisePoseKey =
  | 'pose_squat'
  | 'pose_lunge'
  | 'pose_bridge'
  | 'pose_pushup'
  | 'pose_pike'
  | 'pose_hinge'
  | 'pose_calf'
  | 'pose_deadbug'
  | 'pose_birddog'
  | 'pose_plank'
  | 'pose_sideplank'
  | 'pose_superman'
  | 'pose_march'
  | 'pose_row';

type Point = [number, number];
type Pose = {
  head: Point;
  limbs: Point[][];
};

const POSES: Record<ExercisePoseKey, Pose> = {
  pose_squat: {
    head: [50, 16],
    limbs: [
      [
        [50, 23],
        [46, 55],
      ],
      [
        [50, 30],
        [30, 40],
        [18, 37],
      ],
      [
        [50, 30],
        [70, 40],
        [82, 37],
      ],
      [
        [46, 55],
        [28, 62],
        [24, 87],
      ],
      [
        [46, 55],
        [64, 62],
        [68, 87],
      ],
    ],
  },
  pose_lunge: {
    head: [52, 16],
    limbs: [
      [
        [52, 23],
        [50, 52],
      ],
      [
        [52, 28],
        [34, 36],
        [28, 30],
      ],
      [
        [52, 28],
        [66, 40],
        [72, 34],
      ],
      [
        [50, 52],
        [33, 62],
        [37, 88],
      ],
      [
        [50, 52],
        [70, 66],
        [88, 90],
      ],
    ],
  },
  pose_bridge: {
    head: [16, 58],
    limbs: [
      [
        [23, 58],
        [52, 52],
      ],
      [
        [23, 58],
        [22, 78],
      ],
      [
        [52, 52],
        [72, 64],
        [72, 84],
      ],
      [
        [72, 84],
        [88, 84],
      ],
    ],
  },
  pose_pushup: {
    head: [16, 66],
    limbs: [
      [
        [23, 66],
        [78, 60],
      ],
      [
        [30, 66],
        [30, 88],
      ],
      [
        [60, 62],
        [58, 88],
      ],
      [
        [78, 60],
        [90, 82],
      ],
    ],
  },
  pose_pike: {
    head: [50, 62],
    limbs: [
      [
        [50, 55],
        [50, 30],
      ],
      [
        [50, 30],
        [26, 82],
      ],
      [
        [50, 30],
        [74, 82],
      ],
      [
        [50, 55],
        [30, 84],
      ],
      [
        [50, 55],
        [70, 84],
      ],
    ],
  },
  pose_hinge: {
    head: [30, 30],
    limbs: [
      [
        [36, 33],
        [56, 52],
      ],
      [
        [36, 33],
        [22, 44],
        [16, 40],
      ],
      [
        [56, 52],
        [50, 72],
        [50, 90],
      ],
      [
        [56, 52],
        [66, 72],
        [66, 90],
      ],
    ],
  },
  pose_calf: {
    head: [50, 14],
    limbs: [
      [
        [50, 21],
        [50, 55],
      ],
      [
        [50, 26],
        [34, 40],
      ],
      [
        [50, 26],
        [66, 40],
      ],
      [
        [50, 55],
        [42, 80],
        [42, 90],
      ],
      [
        [50, 55],
        [58, 80],
        [58, 90],
      ],
    ],
  },
  pose_deadbug: {
    head: [14, 50],
    limbs: [
      [
        [21, 50],
        [50, 50],
      ],
      [
        [30, 50],
        [30, 25],
        [22, 16],
      ],
      [
        [42, 50],
        [46, 66],
        [40, 66],
      ],
      [
        [50, 50],
        [70, 44],
        [82, 44],
      ],
      [
        [50, 50],
        [72, 62],
        [88, 78],
      ],
    ],
  },
  pose_birddog: {
    head: [18, 55],
    limbs: [
      [
        [25, 55],
        [70, 50],
      ],
      [
        [30, 55],
        [30, 84],
      ],
      [
        [62, 52],
        [62, 84],
      ],
      [
        [70, 50],
        [88, 30],
      ],
      [
        [25, 55],
        [10, 78],
      ],
    ],
  },
  pose_plank: {
    head: [14, 62],
    limbs: [
      [
        [21, 62],
        [82, 56],
      ],
      [
        [30, 62],
        [30, 86],
      ],
      [
        [82, 56],
        [90, 84],
      ],
    ],
  },
  pose_sideplank: {
    head: [16, 40],
    limbs: [
      [
        [23, 42],
        [66, 52],
      ],
      [
        [30, 44],
        [30, 70],
      ],
      [
        [66, 52],
        [86, 76],
      ],
      [
        [46, 47],
        [46, 22],
      ],
    ],
  },
  pose_superman: {
    head: [16, 58],
    limbs: [
      [
        [23, 56],
        [64, 60],
      ],
      [
        [23, 56],
        [8, 44],
      ],
      [
        [64, 60],
        [84, 50],
      ],
      [
        [64, 60],
        [90, 66],
      ],
    ],
  },
  pose_march: {
    head: [46, 14],
    limbs: [
      [
        [46, 21],
        [48, 52],
      ],
      [
        [46, 26],
        [30, 20],
      ],
      [
        [46, 26],
        [64, 42],
        [70, 38],
      ],
      [
        [48, 52],
        [30, 60],
        [32, 42],
      ],
      [
        [48, 52],
        [60, 74],
        [60, 90],
      ],
    ],
  },
  pose_row: {
    head: [24, 24],
    limbs: [
      [
        [30, 27],
        [50, 50],
      ],
      [
        [50, 50],
        [46, 74],
        [46, 90],
      ],
      [
        [50, 50],
        [62, 74],
        [62, 90],
      ],
      [
        [30, 30],
        [58, 34],
        [76, 30],
      ],
    ],
  },
};

export type ExerciseVisualProps = {
  poseKey: ExercisePoseKey | string;
  size?: number;
};

/** A small original line-art illustration for one exercise (Part 7). */
export function ExerciseVisual({ poseKey, size = 56 }: ExerciseVisualProps) {
  const { colors, radius } = useTheme();
  const pose = POSES[poseKey as ExercisePoseKey] ?? POSES.pose_squat;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: colors.surface.sunken,
        borderRadius: radius.md,
      }}
    >
      <Circle cx={pose.head[0]} cy={pose.head[1]} r={8} fill={colors.brand.primary} />
      {pose.limbs.map((points, index) => (
        <Polyline
          key={index}
          points={points.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke={colors.brand.primary}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
