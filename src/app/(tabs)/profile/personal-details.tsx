import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { TextField } from '@/components/ui/text-field';
import {
  cmToFeetInches,
  displayWeight,
  feetInchesToCm,
  toCanonicalWeightKg,
} from '@/domain/onboarding/units';
import {
  isPlausibleHeightCm,
  isPlausibleWeightKg,
  validateDateOfBirth,
} from '@/domain/onboarding/validation';
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from '@/domain/profile/greeting';
import { useAuthenticatedClient } from '@/hooks/use-authenticated-client';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import {
  loadLatestWeightKg,
  loadProfile,
  updateProfile,
  upsertTodayWeightMeasurement,
} from '@/services/onboarding/onboarding-repository';

type PersonalDetailsData = {
  profile: Awaited<ReturnType<typeof loadProfile>>;
  weightKg: Awaited<ReturnType<typeof loadLatestWeightKg>>;
};

type PersonalDetailsDraft = {
  name: string;
  dateOfBirth: string;
  heightMain: string;
  heightInches: string;
  weight: string;
};

function initialDraft(data: PersonalDetailsData): PersonalDetailsDraft {
  const unit = data.profile.unitPreference;
  let heightMain = '';
  let heightInches = '';
  if (data.profile.heightCm) {
    if (unit === 'metric') {
      heightMain = String(data.profile.heightCm);
    } else {
      const value = cmToFeetInches(data.profile.heightCm);
      heightMain = String(value.feet);
      heightInches = String(value.inches);
    }
  }
  return {
    name: data.profile.displayName ?? '',
    dateOfBirth: data.profile.dateOfBirth ?? '',
    heightMain,
    heightInches,
    weight: data.weightKg ? String(displayWeight(data.weightKg, unit)) : '',
  };
}

export default function PersonalDetailsScreen() {
  const { spacing } = useTheme();
  const { client, userId } = useAuthenticatedClient();
  const { status, data, reload } = useAuthenticatedData(async (c, id) => {
    const [profile, weightKg] = await Promise.all([loadProfile(c, id), loadLatestWeightKg(c, id)]);
    return { profile, weightKg };
  });
  const [draft, setDraft] = useState<PersonalDetailsDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = data ? (draft ?? initialDraft(data)) : null;

  async function save() {
    if (!data || !values || !userId || saving) return;
    const nameResult = validateDisplayName(values.name);
    if (!nameResult.valid) {
      setError(nameResult.error);
      return;
    }
    const dobResult = validateDateOfBirth(values.dateOfBirth);
    if (!dobResult.valid) {
      setError(
        dobResult.reason === 'under_18'
          ? 'Murphy Method is currently for adults aged 18 or over.'
          : 'Enter a valid date of birth in YYYY-MM-DD format.',
      );
      return;
    }

    const unit = data.profile.unitPreference;
    const heightCm =
      unit === 'metric'
        ? Number(values.heightMain)
        : feetInchesToCm(Number(values.heightMain), Number(values.heightInches));
    const weightKg = toCanonicalWeightKg(Number(values.weight), unit);
    if (!isPlausibleHeightCm(heightCm)) {
      setError('Enter a plausible height.');
      return;
    }
    if (!isPlausibleWeightKg(weightKg)) {
      setError('Enter a plausible weight.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await Promise.all([
        updateProfile(client, userId, {
          displayName: nameResult.value,
          dateOfBirth: values.dateOfBirth,
          heightCm,
        }),
        upsertTodayWeightMeasurement(client, userId, weightKg),
      ]);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <ScrollScreen>
        <LoadingState accessibilityLabel="Loading your details" rows={4} />
      </ScrollScreen>
    );
  }
  if (status === 'error' || !data || !values) {
    return (
      <ScrollScreen>
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      </ScrollScreen>
    );
  }

  const metric = data.profile.unitPreference === 'metric';

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Personal details</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          These details help keep unit conversion, eligibility and programme inputs accurate.
        </AppText>
      </View>

      <Card style={{ gap: spacing.three }}>
        <TextField
          label="Name (optional)"
          value={values.name}
          onChangeText={(value) => {
            setDraft({ ...values, name: value });
            setSaved(false);
          }}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Your name"
        />
        <TextField
          label="Date of birth (YYYY-MM-DD)"
          value={values.dateOfBirth}
          onChangeText={(value) => {
            setDraft({ ...values, dateOfBirth: value });
            setSaved(false);
          }}
          keyboardType="numbers-and-punctuation"
          autoCorrect={false}
          maxLength={10}
        />
        {metric ? (
          <TextField
            label="Height (cm)"
            value={values.heightMain}
            onChangeText={(value) => setDraft({ ...values, heightMain: value })}
            keyboardType="decimal-pad"
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.two }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Height (ft)"
                value={values.heightMain}
                onChangeText={(value) => setDraft({ ...values, heightMain: value })}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Height (in)"
                value={values.heightInches}
                onChangeText={(value) => setDraft({ ...values, heightInches: value })}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}
        <TextField
          label={metric ? 'Weight (kg)' : 'Weight (lb)'}
          value={values.weight}
          onChangeText={(value) => setDraft({ ...values, weight: value })}
          keyboardType="decimal-pad"
        />
      </Card>

      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        Weight updates are dated today so Progress can show a real measurement history. They are
        never used in public Momentum rankings.
      </Caption>
      {error ? <AppText color="critical">{error}</AppText> : null}
      {saved ? <Caption color="positive">Personal details saved.</Caption> : null}
      <PrimaryButton label="Save personal details" loading={saving} onPress={save} />
    </ScrollScreen>
  );
}
