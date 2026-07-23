import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/card';
import { SettingRow } from '@/components/ui/list-row';
import { ScrollScreen } from '@/components/ui/scroll-screen';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollScreen>
      <Card style={{ gap: 0 }}>
        <SettingRow
          title="BodyScan privacy"
          icon="camera"
          onPress={() => router.push('/(tabs)/profile/bodyscan-privacy')}
        />
        <SettingRow
          title="Consent"
          icon="shield"
          onPress={() => router.push('/(tabs)/profile/consent')}
        />
        <SettingRow
          title="Export my data"
          icon="share"
          onPress={() => router.push('/(tabs)/profile/data-export')}
        />
        <SettingRow
          title="Delete data"
          icon="trash"
          onPress={() => router.push('/(tabs)/profile/delete-data')}
        />
        <SettingRow
          title="Delete account"
          icon="trash"
          onPress={() => router.push('/(tabs)/profile/delete-account')}
        />
      </Card>
    </ScrollScreen>
  );
}
