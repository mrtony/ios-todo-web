import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as taskService from '../services/task.service.js';
import { createTaskSchema, reorderTasksSchema, updateTaskSchema } from '../validators/task.js';

const router = Router();

router.use(requireAuth);

router.get('/tasks/all', async (req, res, next) => {
  try {
    const tasks = await taskService.getAllForUser(req.userId!);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.get('/lists/:listId/tasks', async (req, res, next) => {
  try {
    const result = await taskService.getByListWithSubtasks(req.userId!, String(req.params.listId));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/lists/:listId/tasks', validate(createTaskSchema), async (req, res, next) => {
  try {
    const task = await taskService.create(req.userId!, String(req.params.listId), req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/lists/:listId/tasks/reorder', validate(reorderTasksSchema), async (req, res, next) => {
  try {
    await taskService.reorder(req.userId!, String(req.params.listId), req.body.orderedIds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id', validate(updateTaskSchema), async (req, res, next) => {
  try {
    const task = await taskService.update(req.userId!, String(req.params.id), req.body);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:id', async (req, res, next) => {
  try {
    await taskService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id/complete', async (req, res, next) => {
  try {
    const task = await taskService.complete(req.userId!, String(req.params.id));
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id/uncomplete', async (req, res, next) => {
  try {
    const task = await taskService.uncomplete(req.userId!, String(req.params.id));
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:parentId/subtasks', async (req, res, next) => {
  try {
    const subtasks = await taskService.getSubtasks(req.userId!, String(req.params.parentId));
    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:parentId/subtasks', validate(createTaskSchema), async (req, res, next) => {
  try {
    const subtask = await taskService.createSubtask(req.userId!, String(req.params.parentId), req.body);
    res.status(201).json(subtask);
  } catch (err) {
    next(err);
  }
});

export default router;
