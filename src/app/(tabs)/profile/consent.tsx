import { View } from 'react-native';

import { AppText, Caption, Heading } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ScrollScreen } from '@/components/ui/scroll-screen';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuthenticatedData } from '@/hooks/use-authenticated-data';
import { useTheme } from '@/hooks/use-theme';
import { loadConsentHistory } from '@/services/settings/settings-repository';

const LABELS: Record<string, string> = {
  bodyscan_capture: 'BodyScan capture',
  bodyscan_ai_processing: 'BodyScan AI processing',
  data_processing: 'Data processing',
  marketing: 'Marketing',
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

export default function ConsentScreen() {
  const { spacing } = useTheme();
  const { status, data, reload } = useAuthenticatedData((client, userId) =>
    loadConsentHistory(client, userId),
  );

  return (
    <ScrollScreen>
      <View style={{ gap: spacing.one }}>
        <Heading variant="title">Consent history</Heading>
        <AppText color="secondary" style={{ flexShrink: 1 }}>
          Consent records are append-only. Withdrawing consent creates a new record rather than
          rewriting the history.
        </AppText>
      </View>

      {status === 'loading' ? (
        <LoadingState accessibilityLabel="Loading consent history" rows={4} />
      ) : status === 'error' || !data ? (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon="shield"
            title="No consent records yet"
            description="Optional consent choices appear here after you make them."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.two }}>
          {data.map((record) => (
            <Card key={record.id} variant="quiet" elevated={false} style={{ gap: spacing.one }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.two,
                }}
              >
                <AppText variant="bodyEmphasis">
                  {LABELS[record.type] ?? record.type.replaceAll('_', ' ')}
                </AppText>
                <StatusBadge
                  label={record.granted ? 'Granted' : 'Withdrawn'}
                  tone={record.granted ? 'positive' : 'warning'}
                />
              </View>
              <Caption color="tertiary">{formatDate(record.createdAt)}</Caption>
              <Caption color="tertiary">Policy version {record.version}</Caption>
            </Card>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}
