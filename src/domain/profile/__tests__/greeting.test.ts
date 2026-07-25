import {
  DISPLAY_NAME_MAX_LENGTH,
  greetingWithName,
  validateDisplayName,
} from '@/domain/profile/greeting';

describe('greetingWithName', () => {
  it('greets without a name when display_name is null (INVARIANT D)', () => {
    expect(greetingWithName('Good morning', null)).toBe('Good morning');
  });

  it('greets without a name when display_name is undefined or blank', () => {
    expect(greetingWithName('Good afternoon', undefined)).toBe('Good afternoon');
    expect(greetingWithName('Good evening', '   ')).toBe('Good evening');
  });

  it('leaves no dangling comma for an empty name', () => {
    expect(greetingWithName('Good morning', '')).not.toContain(',');
  });

  it('uses the saved name when there is one', () => {
    expect(greetingWithName('Good morning', 'Sam')).toBe('Good morning, Sam');
  });

  it('trims surrounding whitespace from a saved name', () => {
    expect(greetingWithName('Good morning', '  Sam  ')).toBe('Good morning, Sam');
  });
});

describe('validateDisplayName', () => {
  it('accepts an empty value as a real answer that clears the name', () => {
    expect(validateDisplayName('')).toEqual({ valid: true, value: null });
    expect(validateDisplayName('   ')).toEqual({ valid: true, value: null });
  });

  it('trims and accepts a normal name', () => {
    expect(validateDisplayName('  Sam ')).toEqual({ valid: true, value: 'Sam' });
  });

  it('rejects a name longer than the display limit', () => {
    const tooLong = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    expect(validateDisplayName(tooLong).valid).toBe(false);
  });

  it('accepts a name exactly at the display limit', () => {
    const atLimit = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(validateDisplayName(atLimit)).toEqual({ valid: true, value: atLimit });
  });
});
