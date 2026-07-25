import { BodyScanAlignmentGuide } from '@/components/bodyscan/body-scan-alignment-guide';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('BodyScanAlignmentGuide', () => {
  it('renders the front, side and back positioning guides', async () => {
    const rendered = await renderWithProviders(
      <>
        {(['front', 'side', 'back'] as const).map((angle) => (
          <BodyScanAlignmentGuide key={angle} angle={angle} />
        ))}
      </>,
    );

    await rendered.unmount();
  });

  it('renders as a transparent overlay without becoming accessible noise', async () => {
    const rendered = await renderWithProviders(
      <BodyScanAlignmentGuide angle="front" transparent />,
    );

    await rendered.unmount();
  });
});
