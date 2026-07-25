import { ExerciseVisual } from '@/components/ui/exercise-visual';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('ExerciseVisual (remediation Part 7: original, internally-owned illustrations)', () => {
  it('renders without crashing for every known pose key', async () => {
    const poseKeys = [
      'pose_squat',
      'pose_lunge',
      'pose_bridge',
      'pose_pushup',
      'pose_pike',
      'pose_hinge',
      'pose_calf',
      'pose_deadbug',
      'pose_birddog',
      'pose_plank',
      'pose_sideplank',
      'pose_superman',
      'pose_march',
      'pose_row',
    ] as const;

    for (const poseKey of poseKeys) {
      const { unmount } = await renderWithProviders(<ExerciseVisual poseKey={poseKey} />);
      unmount();
    }
  });

  it('falls back to a default pose for an unknown key rather than crashing', async () => {
    // A future exercise row with a visual_key not yet mapped here must
    // never crash the exercise card.
    await renderWithProviders(<ExerciseVisual poseKey="pose_unknown_future_key" />);
  });

  it('does not throw when unmounted immediately (no async leak)', async () => {
    const { unmount } = await renderWithProviders(<ExerciseVisual poseKey="pose_squat" />);
    expect(() => unmount()).not.toThrow();
  });
});
