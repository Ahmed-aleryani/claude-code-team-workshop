// Sets process.env values that backend modules read at import time.
// MUST be imported FIRST in every server test file (before any module that
// reads JWT_SECRET, e.g. server/auth/jwt.ts).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-do-not-use-outside-tests';
