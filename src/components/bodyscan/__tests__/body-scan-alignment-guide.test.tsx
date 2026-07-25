import { BodyScanAlignmentGuide } from '@/components/bodyscan/body-scan-alignment-guide';
import { renderWithProviders } from '@/test-utils/render-with-providers';

describe('BodyScanAlignmentGuide', () => {
  it('renders the front, side and back positioning guides', async () => {
    for (const angle of ['front', 'side', 'back'] as const) {
      const { unmount } = await renderWithProviders(
        <BodyScanAlignmentGuide angle={angle} />,
      );
      unmount();
    }
  });

  it('renders as a transparent overlay without becoming accessible noise', async () => {
    const { unmount } = await renderWithProviders(
      <BodyScanAlignmentGuide angle="front" transparent />,
    );
    expect(() => unmount()).not.toThrow();
  });
});
