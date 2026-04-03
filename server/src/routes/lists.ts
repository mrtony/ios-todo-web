import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as listService from '../services/list.service.js';
import { createListSchema, reorderListsSchema, updateListSchema } from '../validators/list.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const lists = await listService.getAll(req.userId!);
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createListSchema), async (req, res, next) => {
  try {
    const list = await listService.create(req.userId!, req.body);
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

router.patch('/reorder', validate(reorderListsSchema), async (req, res, next) => {
  try {
    await listService.reorder(req.userId!, req.body.orderedIds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateListSchema), async (req, res, next) => {
  try {
    const list = await listService.update(req.userId!, String(req.params.id), req.body);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await listService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
