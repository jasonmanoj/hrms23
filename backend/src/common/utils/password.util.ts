import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function isPasswordStrong(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && PASSWORD_POLICY.test(password);
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}
