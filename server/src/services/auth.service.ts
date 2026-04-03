import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { config } from '../config.js';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { User } from '../types.js';

const {
  jwtSecret: JWT_SECRET,
  jwtRefreshSecret: JWT_REFRESH_SECRET,
  bcryptRounds: BCRYPT_ROUNDS,
} = config;

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows[0]) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await db.query(
    'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, normalizedEmail, passwordHash, name, now, now],
  );

  const tokens = generateTokens(id);
  return { user: { id, email: normalizedEmail, name }, ...tokens };
}

export async function login(email: string, password: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const result = await db.query<User>('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = result.rows[0];
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const now = new Date().toISOString();
  await db.query('UPDATE users SET last_login_at = $1, updated_at = $2 WHERE id = $3', [now, now, user.id]);

  const tokens = generateTokens(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const db = getDb();
    const result = await db.query<Pick<User, 'id' | 'email' | 'name'>>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [payload.userId],
    );
    const user = result.rows[0];

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

export async function getMe(userId: string) {
  const db = getDb();
  const result = await db.query<Pick<User, 'id' | 'email' | 'name' | 'created_at'>>(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [userId],
  );
  const user = result.rows[0];

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return user;
}
