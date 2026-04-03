import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;
let listId: string;
let parentId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Test List' });
  listId = listRes.body.id;
  const parentRes = await authRequest('post', `/api/lists/${listId}/tasks`, token)
    .send({ title: 'Parent Task' });
  parentId = parentRes.body.id;
});

describe('POST /api/tasks/:parentId/subtasks', () => {
  it('should create a subtask', async () => {
    const res = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Subtask 1' });

    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(parentId);
    expect(res.body.list_id).toBe(listId);
  });

  it('should not allow subtask of subtask', async () => {
    const sub = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Subtask' });

    const res = await authRequest('post', `/api/tasks/${sub.body.id}/subtasks`, token)
      .send({ title: 'Sub-subtask' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OPERATION');
  });
});

describe('GET /api/tasks/:parentId/subtasks', () => {
  it('should return subtasks', async () => {
    await authRequest('post', `/api/tasks/${parentId}/subtasks`, token).send({ title: 'Sub A' });
    await authRequest('post', `/api/tasks/${parentId}/subtasks`, token).send({ title: 'Sub B' });

    const res = await authRequest('get', `/api/tasks/${parentId}/subtasks`, token);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Sub A');
  });
});

describe('Cascade delete', () => {
  it('should delete subtasks when parent is deleted', async () => {
    const sub = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Will be gone' });

    await authRequest('delete', `/api/tasks/${parentId}`, token);

    const res = await authRequest('get', `/api/tasks/${sub.body.id}/subtasks`, token);
    expect(res.status).toBe(404);
  });
});
