import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// 비밀번호 해시 형식: scrypt:<salt hex>:<hash hex> (prisma/seed.mjs 와 같음)
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export function randomToken(): string {
  return randomBytes(32).toString('hex');
}
