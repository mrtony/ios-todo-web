import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;
let listId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Test List' });
  listId = listRes.body.id;
});

describe('POST /api/lists/:listId/tasks', () => {
  it('should create a task', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Buy groceries' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.list_id).toBe(listId);
    expect(res.body.completed_at).toBeNull();
    expect(res.body.priority).toBe(0);
  });

  it('should create task with all fields', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Important task',
        notes: 'Some notes',
        due_date: '2026-04-10T09:00:00.000Z',
        priority: 3,
        flagged: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.priority).toBe(3);
    expect(res.body.flagged).toBe(1);
    expect(res.body.due_date).toBe('2026-04-10T09:00:00.000Z');
  });

  it('should reject empty title', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/lists/:listId/tasks', () => {
  it('should return tasks ordered by sort_order', async () => {
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'First' });
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Second' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
    expect(res.body[1].title).toBe('Second');
  });

  it('should not include subtasks in top-level list', async () => {
    const parent = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Parent' });
    await authRequest('post', `/api/tasks/${parent.body.id}/subtasks`, token)
      .send({ title: 'Child' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Parent');
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('should update a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Old' });
    const res = await authRequest('patch', `/api/tasks/${created.body.id}`, token)
      .send({ title: 'New', priority: 2 });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe(2);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('should delete a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Delete me' });
    const res = await authRequest('delete', `/api/tasks/${created.body.id}`, token);

    expect(res.status).toBe(204);
  });
});

describe('PATCH /api/tasks/:id/complete & uncomplete', () => {
  it('should mark task as completed', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Do it' });
    const res = await authRequest('patch', `/api/tasks/${created.body.id}/complete`, token);

    expect(res.status).toBe(200);
    expect(res.body.completed_at).not.toBeNull();
  });

  it('should uncomplete a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Undo' });
    await authRequest('patch', `/api/tasks/${created.body.id}/complete`, token);
    const res = await authRequest('patch', `/api/tasks/${created.body.id}/uncomplete`, token);

    expect(res.status).toBe(200);
    expect(res.body.completed_at).toBeNull();
  });
});

describe('PATCH /api/lists/:listId/tasks/reorder', () => {
  it('should reorder tasks', async () => {
    const a = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'A' });
    const b = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'B' });

    await authRequest('patch', `/api/lists/${listId}/tasks/reorder`, token)
      .send({ orderedIds: [b.body.id, a.body.id] });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    expect(res.body[0].title).toBe('B');
    expect(res.body[1].title).toBe('A');
  });
});
