import {
  parseGamificationDashboard,
  parseGamificationLeaderboard,
  validateTournamentAlias,
} from '@/services/gamification/gamification-repository';

describe('gamification response parsing', () => {
  it('parses a truthful private dashboard', () => {
    expect(
      parseGamificationDashboard({
        leaderboardOptIn: false,
        publicAlias: null,
        celebrationEffects: true,
        lifetimePoints: 175,
        scoredDays: 2,
        season: {
          id: 'season-1',
          name: 'July Momentum Cup',
          startsOn: '2026-07-01',
          endsOn: '2026-08-01',
          points: 175,
          rank: null,
          participants: null,
        },
        achievements: [
          {
            key: 'first_session',
            label: 'First step',
            description: 'Complete your first session.',
            iconKey: 'flag',
            achievedAt: '2026-07-01T10:00:00Z',
          },
        ],
      }),
    ).toMatchObject({
      lifetimePoints: 175,
      scoredDays: 2,
      leaderboardOptIn: false,
      achievements: [{ key: 'first_session' }],
    });
  });

  it('drops malformed public leaderboard rows instead of inventing identities', () => {
    const result = parseGamificationLeaderboard({
      season: { id: 'season-1', name: 'Momentum Cup' },
      entries: [
        { rank: 1, alias: 'Runner One', points: 300, scoredDays: 3, isCurrentUser: false },
        { rank: 2, alias: '', points: 200 },
      ],
      currentUser: null,
      rules: {},
    });

    expect(result.entries).toEqual([
      { rank: 1, alias: 'Runner One', points: 300, scoredDays: 3, isCurrentUser: false },
    ]);
  });

  it('accepts readable aliases and rejects contact-like punctuation', () => {
    expect(validateTournamentAlias('Waterford-Mover_7')).toBeNull();
    expect(validateTournamentAlias('a@b.com')).toMatch(/letters, numbers/i);
    expect(validateTournamentAlias('ab')).toMatch(/3 to 24/i);
  });
});
