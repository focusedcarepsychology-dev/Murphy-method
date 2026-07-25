import { buildWeeklyObservation } from '@/domain/coach/weekly-observation';

describe('weekly coach observation', () => {
  it('changes tone without changing the underlying facts', () => {
    const direct = buildWeeklyObservation('direct', 1, 3);
    const analytical = buildWeeklyObservation('analytical', 1, 3);

    expect(direct.body).toMatch(/1 of 3/);
    expect(analytical.body).toMatch(/Completed sessions: 1/);
  });

  it('does not reward unsafe extra volume in competitive mode', () => {
    expect(buildWeeklyObservation('competitive', 4, 3).body).toMatch(/sustainable/i);
  });
});
