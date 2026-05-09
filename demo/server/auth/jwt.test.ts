import '../test-helpers/env.js';
import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './jwt.js';

describe('jwt helpers', () => {
  it('signToken + verifyToken round-trip returns the original payload', () => {
    const token = signToken({ userId: 'user-123' });
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('user-123');
  });

  it('verifyToken returns null for a tampered token', () => {
    const token = signToken({ userId: 'user-abc' });
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'AA' ? 'BB' : 'AA');
    expect(verifyToken(tampered)).toBeNull();
  });

  it('verifyToken returns null for a token signed with a different secret', () => {
    const foreign = jwt.sign({ userId: 'user-xyz' }, 'a-totally-different-secret', {
      expiresIn: '7d',
    });
    expect(verifyToken(foreign)).toBeNull();
  });

  it('verifyToken returns null for an expired token', () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    const expired = jwt.sign({ userId: 'user-exp' }, secret, { expiresIn: -10 });
    expect(verifyToken(expired)).toBeNull();
  });

  it('verifyToken returns null for a string-only payload (e.g. signed without an object)', () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    const token = jwt.sign('just-a-string', secret);
    expect(verifyToken(token)).toBeNull();
  });

  it('verifyToken returns null for garbage input', () => {
    expect(verifyToken('not-a-real-jwt')).toBeNull();
    expect(verifyToken('')).toBeNull();
  });
});
