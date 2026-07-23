import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function EquipmentScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={6}
      title="What equipment do you have?"
      description="A multi-select checklist grouped by category — full gym, home equipment, or bodyweight only."
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/availability')}
    >
      <AppText color="tertiary">Equipment checklist lands in Phase 3.</AppText>
    </OnboardingScaffold>
  );
}
