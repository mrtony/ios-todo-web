import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
});

describe('Tag CRUD', () => {
  it('should create a tag', async () => {
    const res = await authRequest('post', '/api/tags', token)
      .send({ name: 'urgent', color: '#ef4444' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('urgent');
    expect(res.body.color).toBe('#ef4444');
  });

  it('should list all tags', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'b-tag' });
    await authRequest('post', '/api/tags', token).send({ name: 'a-tag' });

    const res = await authRequest('get', '/api/tags', token);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('a-tag');
  });

  it('should update a tag', async () => {
    const created = await authRequest('post', '/api/tags', token).send({ name: 'old' });
    const res = await authRequest('patch', `/api/tags/${created.body.id}`, token)
      .send({ name: 'new' });

    expect(res.body.name).toBe('new');
  });

  it('should delete a tag', async () => {
    const created = await authRequest('post', '/api/tags', token).send({ name: 'bye' });
    const res = await authRequest('delete', `/api/tags/${created.body.id}`, token);
    expect(res.status).toBe(204);
  });

  it('should reject duplicate tag name', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'dup' });
    const res = await authRequest('post', '/api/tags', token).send({ name: 'dup' });
    expect(res.status).toBe(409);
  });
});

describe('Task Tags', () => {
  let listId: string;
  let taskId: string;
  let tagId: string;

  beforeEach(async () => {
    const listRes = await authRequest('post', '/api/lists', token).send({ name: 'List' });
    listId = listRes.body.id;
    const taskRes = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Task' });
    taskId = taskRes.body.id;
    const tagRes = await authRequest('post', '/api/tags', token).send({ name: 'work' });
    tagId = tagRes.body.id;
  });

  it('should add tag to task', async () => {
    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token)
      .send({ tagId });
    expect(res.status).toBe(201);
  });

  it('should reject duplicate tag assignment', async () => {
    await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    expect(res.status).toBe(409);
  });

  it('should remove tag from task', async () => {
    await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    const res = await authRequest('delete', `/api/tasks/${taskId}/tags/${tagId}`, token);
    expect(res.status).toBe(204);
  });

  it('should not allow adding another users tag', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherTag = await authRequest('post', '/api/tags', otherToken).send({ name: 'foreign' });

    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token)
      .send({ tagId: otherTag.body.id });
    expect(res.status).toBe(404);
  });
});
