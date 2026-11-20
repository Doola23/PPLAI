import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from './validators';

describe('signupSchema', () => {
  const valid = { name: 'Jo', email: 'jo@example.com', password: 'Password1' };

  it('accepts a valid signup', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['short password', { password: 'Pass1' }],
    ['no uppercase', { password: 'password1' }],
    ['no number', { password: 'Password' }],
    ['bad email', { email: 'jo@' }],
    ['short name', { name: 'J' }],
  ])('rejects %s', (_label, override) => {
    expect(signupSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires email and password', () => {
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'jo@example.com', password: 'secret1' }).success).toBe(true);
  });
});
