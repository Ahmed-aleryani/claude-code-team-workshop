import '../test-helpers/env.js';
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password helpers', () => {
  it('hashPassword + verifyPassword round-trip returns true for the same password', async () => {
    const plain = 'correct-horse-battery-staple';
    const hash = await hashPassword(plain);
    expect(await verifyPassword(plain, hash)).toBe(true);
  });

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('hashPassword output does not equal the plaintext', async () => {
    const plain = 'plaintext-password-123';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.includes(plain)).toBe(false);
  });

  it('hashPassword produces distinct hashes for the same input (salted)', async () => {
    const plain = 'same-input';
    const a = await hashPassword(plain);
    const b = await hashPassword(plain);
    expect(a).not.toBe(b);
    expect(await verifyPassword(plain, a)).toBe(true);
    expect(await verifyPassword(plain, b)).toBe(true);
  });
});
