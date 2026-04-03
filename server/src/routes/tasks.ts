import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as taskService from '../services/task.service.js';
import { createTaskSchema, reorderTasksSchema, updateTaskSchema } from '../validators/task.js';

const router = Router();

router.use(requireAuth);

router.get('/lists/:listId/tasks', (req, res, next) => {
  try {
    const tasks = taskService.getByList(req.userId!, String(req.params.listId));
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/lists/:listId/tasks', validate(createTaskSchema), (req, res, next) => {
  try {
    const task = taskService.create(req.userId!, String(req.params.listId), req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/lists/:listId/tasks/reorder', validate(reorderTasksSchema), (req, res, next) => {
  try {
    taskService.reorder(req.userId!, String(req.params.listId), req.body.orderedIds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id', validate(updateTaskSchema), (req, res, next) => {
  try {
    const task = taskService.update(req.userId!, String(req.params.id), req.body);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:id', (req, res, next) => {
  try {
    taskService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id/complete', (req, res, next) => {
  try {
    const task = taskService.complete(req.userId!, String(req.params.id));
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch('/tasks/:id/uncomplete', (req, res, next) => {
  try {
    const task = taskService.uncomplete(req.userId!, String(req.params.id));
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:parentId/subtasks', (req, res, next) => {
  try {
    const subtasks = taskService.getSubtasks(req.userId!, String(req.params.parentId));
    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:parentId/subtasks', validate(createTaskSchema), (req, res, next) => {
  try {
    const subtask = taskService.createSubtask(req.userId!, String(req.params.parentId), req.body);
    res.status(201).json(subtask);
  } catch (err) {
    next(err);
  }
});

export default router;
