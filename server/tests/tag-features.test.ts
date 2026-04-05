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

describe('GET /api/tags/with-counts', () => {
  it('should return tags with correct task counts', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'work' });
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Task 1' });
    await authRequest('post', `/api/tasks/${task.body.id}/tags`, token).send({ tagId: tag.body.id });

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('work');
    expect(res.body[0].task_count).toBe(1);
  });

  it('should return task_count 0 for tags with no tasks', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'empty' });

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].task_count).toBe(0);
  });

  it('should not count completed tasks', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'mixed' });
    const t1 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Incomplete' });
    const t2 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Done' });
    await authRequest('post', `/api/tasks/${t1.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('post', `/api/tasks/${t2.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('patch', `/api/tasks/${t2.body.id}/complete`, token);

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.body[0].task_count).toBe(1);
  });
});

describe('GET /api/tags/:id/tasks', () => {
  it('should return tasks for a tag', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'dev' });
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Code review' });
    await authRequest('post', `/api/tasks/${task.body.id}/tags`, token).send({ tagId: tag.body.id });

    const res = await authRequest('get', `/api/tags/${tag.body.id}/tasks`, token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Code review');
  });

  it('should return both completed and incomplete tasks', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'all' });
    const t1 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Open' });
    const t2 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Closed' });
    await authRequest('post', `/api/tasks/${t1.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('post', `/api/tasks/${t2.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('patch', `/api/tasks/${t2.body.id}/complete`, token);

    const res = await authRequest('get', `/api/tags/${tag.body.id}/tasks`, token);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].completed_at).toBeNull();
    expect(res.body[1].completed_at).not.toBeNull();
  });

  it('should not return tasks from other users tags', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherTag = await authRequest('post', '/api/tags', otherToken).send({ name: 'private' });

    const res = await authRequest('get', `/api/tags/${otherTag.body.id}/tasks`, token);

    expect(res.status).toBe(404);
  });

  it('should return 404 for non-existent tag', async () => {
    const res = await authRequest('get', '/api/tags/non-existent-id/tasks', token);

    expect(res.status).toBe(404);
  });
});
