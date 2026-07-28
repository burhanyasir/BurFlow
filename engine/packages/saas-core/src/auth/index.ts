import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuid } from 'uuid';

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';
const API_KEY_LENGTH = 48;
const API_KEY_PREFIX_LENGTH = 8;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenantId?: string;
  role?: string;
}

export function generateToken(payload: JwtPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

export function generateApiKey(): { raw: string; prefix: string; hash: string; salt: string } {
  const raw = `sk_${randomBytes(API_KEY_LENGTH).toString('base64url')}`;
  const prefix = raw.slice(0, API_KEY_PREFIX_LENGTH + 3);
  const salt = randomBytes(16).toString('hex');
  const hash = bcrypt.hashSync(raw, SALT_ROUNDS);
  return { raw, prefix, hash, salt };
}

export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  return bcrypt.compareSync(rawKey, storedHash);
}

export function generateId(): string {
  return uuid();
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function generateVerificationToken(): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return { token, expiresAt };
}

export function generateResetToken(): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return { token, expiresAt };
}

export function isExpired(expiry: string): boolean {
  return new Date(expiry).getTime() < Date.now();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
