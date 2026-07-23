import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function BodyScanBaselineScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={12}
      title="Capture your baseline"
      description="Guided front, side, and back photos. Skippable any time and revisitable later from Progress."
      nextLabel="Skip for now"
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/coaching-style')}
    >
      <AppText color="tertiary">
        Camera capture flow lands in Phase 10 — no camera access in Phase 1.
      </AppText>
    </OnboardingScaffold>
  );
}
