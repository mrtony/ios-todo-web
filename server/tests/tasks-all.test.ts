import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
});

describe('GET /api/tasks/all', () => {
  it('should return all tasks across all lists', async () => {
    const list1 = await authRequest('post', '/api/lists', token).send({ name: 'List 1' });
    const list2 = await authRequest('post', '/api/lists', token).send({ name: 'List 2' });

    await authRequest('post', `/api/lists/${list1.body.id}/tasks`, token).send({ title: 'Task A' });
    await authRequest('post', `/api/lists/${list2.body.id}/tasks`, token).send({ title: 'Task B' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('should not include subtasks', async () => {
    const list = await authRequest('post', '/api/lists', token).send({ name: 'List' });
    const parent = await authRequest('post', `/api/lists/${list.body.id}/tasks`, token).send({ title: 'Parent' });
    await authRequest('post', `/api/tasks/${parent.body.id}/subtasks`, token).send({ title: 'Child' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Parent');
  });

  it('should not return other user tasks', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherList = await authRequest('post', '/api/lists', otherToken).send({ name: 'Other' });
    await authRequest('post', `/api/lists/${otherList.body.id}/tasks`, otherToken).send({ title: 'Not mine' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.body).toHaveLength(0);
  });
});
