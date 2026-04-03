import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;
let userId: string;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
  token = generateToken(user.id);
});

describe('POST /api/lists', () => {
  it('should create a list', async () => {
    const res = await authRequest('post', '/api/lists', token)
      .send({ name: 'Work' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Work');
    expect(res.body.user_id).toBe(userId);
    expect(res.body.color).toBe('#3b82f6');
    expect(res.body.sort_order).toBe(0);
  });

  it('should auto-increment sort_order', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'First' });
    const res = await authRequest('post', '/api/lists', token).send({ name: 'Second' });

    expect(res.body.sort_order).toBe(1);
  });

  it('should reject duplicate name for same user', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'Dup' });
    const res = await authRequest('post', '/api/lists', token).send({ name: 'Dup' });

    expect(res.status).toBe(409);
  });

  it('should reject without auth', async () => {
    const res = await request(app).post('/api/lists').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/lists', () => {
  it('should return all lists for user ordered by sort_order', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'B' });
    await authRequest('post', '/api/lists', token).send({ name: 'A' });

    const res = await authRequest('get', '/api/lists', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('B');
    expect(res.body[1].name).toBe('A');
  });

  it('should not return other users lists', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    await authRequest('post', '/api/lists', otherToken).send({ name: 'Other List' });

    const res = await authRequest('get', '/api/lists', token);
    expect(res.body).toHaveLength(0);
  });
});

describe('PATCH /api/lists/:id', () => {
  it('should update a list', async () => {
    const created = await authRequest('post', '/api/lists', token).send({ name: 'Old' });
    const res = await authRequest('patch', `/api/lists/${created.body.id}`, token)
      .send({ name: 'New', color: '#ff0000' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
    expect(res.body.color).toBe('#ff0000');
  });

  it('should reject updating other users list', async () => {
    const other = await createTestUser({ email: 'other2@example.com' });
    const otherToken = generateToken(other.id);
    const created = await authRequest('post', '/api/lists', otherToken).send({ name: 'Theirs' });

    const res = await authRequest('patch', `/api/lists/${created.body.id}`, token)
      .send({ name: 'Mine Now' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/lists/:id', () => {
  it('should delete a list', async () => {
    const created = await authRequest('post', '/api/lists', token).send({ name: 'Delete Me' });
    const res = await authRequest('delete', `/api/lists/${created.body.id}`, token);

    expect(res.status).toBe(204);

    const getRes = await authRequest('get', '/api/lists', token);
    expect(getRes.body).toHaveLength(0);
  });

  it('should return 404 for non-existent list', async () => {
    const res = await authRequest('delete', '/api/lists/non-existent-id', token);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/lists/reorder', () => {
  it('should reorder lists', async () => {
    const a = await authRequest('post', '/api/lists', token).send({ name: 'A' });
    const b = await authRequest('post', '/api/lists', token).send({ name: 'B' });

    await authRequest('patch', '/api/lists/reorder', token)
      .send({ orderedIds: [b.body.id, a.body.id] });

    const res = await authRequest('get', '/api/lists', token);
    expect(res.body[0].name).toBe('B');
    expect(res.body[1].name).toBe('A');
  });
});
