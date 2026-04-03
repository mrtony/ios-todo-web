import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;
let listId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Recurring' });
  listId = listRes.body.id;
});

describe('Recurring tasks', () => {
  it('should create next task when completing a daily recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Daily standup',
        due_date: '2026-04-03T09:00:00.000Z',
        recurrence: JSON.stringify({ type: 'daily', interval: 1 }),
      });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((entry: any) => !entry.completed_at);

    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].title).toBe('Daily standup');
    expect(incomplete[0].due_date).toBe('2026-04-04T09:00:00.000Z');
    expect(incomplete[0].recurrence).toBe(JSON.stringify({ type: 'daily', interval: 1 }));
  });

  it('should create next task for weekly recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Weekly review',
        due_date: '2026-04-03T09:00:00.000Z',
        recurrence: JSON.stringify({ type: 'weekly', interval: 1 }),
      });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((entry: any) => !entry.completed_at);

    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].due_date).toBe('2026-04-10T09:00:00.000Z');
  });

  it('should NOT create next task for non-recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'One-time task', due_date: '2026-04-03T09:00:00.000Z' });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((entry: any) => !entry.completed_at);

    expect(incomplete).toHaveLength(0);
  });
});
