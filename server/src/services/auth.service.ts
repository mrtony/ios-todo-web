import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { User } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const BCRYPT_ROUNDS = 12;

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, passwordHash, name, now, now);

  const tokens = generateTokens(id);
  return { user: { id, email: normalizedEmail, name }, ...tokens };
}

export async function login(email: string, password: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as User | undefined;
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

  const tokens = generateTokens(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.userId) as
      | Pick<User, 'id' | 'email' | 'name'>
      | undefined;

    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'User not found');
    }

    const tokens = generateTokens(user.id);
    return { user, ...tokens };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }
}

export function getMe(userId: string) {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(userId) as
    | Pick<User, 'id' | 'email' | 'name' | 'created_at'>
    | undefined;

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return user;
}
