import { useRouter } from 'expo-router';

import { OnboardingScaffold } from '@/components/onboarding/onboarding-scaffold';
import { AppText } from '@/components/ui/app-text';

export default function ProgrammePreviewScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      stepIndex={14}
      title="Your programme is ready"
      description="A preview of your generated plan, with a plain-language explanation of why it's built this way."
      nextLabel="Start Training"
      onBack={() => router.back()}
      onNext={() => router.push('/(onboarding)/complete')}
    >
      <AppText color="tertiary">
        Real programme generation (deterministic, zero-LLM) lands in Phase 5.
      </AppText>
    </OnboardingScaffold>
  );
}
