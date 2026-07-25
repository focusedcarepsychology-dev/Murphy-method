import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { SettingRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { useTheme } from '@/hooks/use-theme';

export default function PrivacyScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Privacy & data</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Review consent, export your information or permanently delete selected data.
        </AppText>
      </View>

      <Card variant="quiet" elevated={false} style={{ gap: 0, paddingVertical: spacing.one }}>
        <SettingRow
          title="BodyScan privacy"
          subtitle="Private photos, consent and permanent photo deletion"
          icon="camera"
          onPress={() => router.push('/(tabs)/profile/bodyscan-privacy')}
        />
        <SettingRow
          title="Consent history"
          subtitle="Append-only record of granted and withdrawn choices"
          icon="shield"
          onPress={() => router.push('/(tabs)/profile/consent')}
        />
        <SettingRow
          title="Export my data"
          subtitle="Prepare an owner-scoped JSON copy"
          icon="share"
          onPress={() => router.push('/(tabs)/profile/data-export')}
        />
        <SettingRow
          title="Delete selected data"
          subtitle="BodyScan or workout history without deleting the account"
          icon="trash"
          onPress={() => router.push('/(tabs)/profile/delete-data')}
        />
        <SettingRow
          title="Delete account"
          subtitle="Permanently remove your identity and associated app data"
          icon="trash"
          onPress={() => router.push('/(tabs)/profile/delete-account')}
        />
      </Card>

      <Caption color="tertiary" style={{ flexShrink: 1 }}>
        Tournament participation is private by default and shows only an alias after explicit
        opt-in.
      </Caption>
    </ScrollScreen>
  );
}
