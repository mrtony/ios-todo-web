import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import { getDb } from '../src/db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

export async function createTestUser(
  overrides: Partial<{ email: string; name: string; password: string }> = {},
) {
  const db = getDb();
  const id = uuid();
  const email = overrides.email || `test-${id.slice(0, 8)}@example.com`;
  const name = overrides.name || 'Test User';
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 4);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `).run(id, email.toLowerCase(), passwordHash, name);

  return { id, email: email.toLowerCase(), name, password };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}

export function authRequest(
  method: 'get' | 'post' | 'patch' | 'delete',
  url: string,
  token: string,
) {
  return (request(app) as any)[method](url).set('Authorization', `Bearer ${token}`);
}
