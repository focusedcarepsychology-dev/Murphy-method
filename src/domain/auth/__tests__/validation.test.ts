import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '@/domain/auth/validation';

describe('validateEmail', () => {
  it('rejects an empty value', () => {
    expect(validateEmail('')).toBeDefined();
  });
  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email')).toBeDefined();
  });
  it('accepts a well-formed email', () => {
    expect(validateEmail('person@example.com')).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('rejects an empty value', () => {
    expect(validatePassword('')).toBeDefined();
  });
  it('rejects a password shorter than the minimum', () => {
    expect(validatePassword('short1')).toBeDefined();
  });
  it('accepts a password meeting the minimum length', () => {
    expect(validatePassword('longenough1')).toBeUndefined();
  });
});

describe('validatePasswordConfirmation', () => {
  it('rejects an empty confirmation', () => {
    expect(validatePasswordConfirmation('longenough1', '')).toBeDefined();
  });
  it('rejects a mismatched confirmation', () => {
    expect(validatePasswordConfirmation('longenough1', 'different1')).toBeDefined();
  });
  it('accepts a matching confirmation', () => {
    expect(validatePasswordConfirmation('longenough1', 'longenough1')).toBeUndefined();
  });
});
