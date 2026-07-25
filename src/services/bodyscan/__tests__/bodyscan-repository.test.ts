import {
  imageForAngle,
  type BodyScanRecord,
} from '@/services/bodyscan/bodyscan-repository';

const SCAN: BodyScanRecord = {
  id: 'scan-1',
  capturedOn: '2026-07-25',
  purpose: 'baseline',
  createdAt: '2026-07-25T10:00:00.000Z',
  images: [
    { id: 'front-1', angle: 'front', storagePath: 'user/scan-1/front.jpg' },
    { id: 'side-1', angle: 'side', storagePath: 'user/scan-1/side.jpg' },
  ],
};

describe('BodyScan repository helpers', () => {
  it('returns only the image matching the requested angle', () => {
    expect(imageForAngle(SCAN, 'side')).toEqual({
      id: 'side-1',
      angle: 'side',
      storagePath: 'user/scan-1/side.jpg',
    });
  });

  it('returns null when the selected scan does not contain that angle', () => {
    expect(imageForAngle(SCAN, 'back')).toBeNull();
  });
});
