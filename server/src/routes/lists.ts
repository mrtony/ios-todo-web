import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as listService from '../services/list.service.js';
import { createListSchema, reorderListsSchema, updateListSchema } from '../validators/list.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const lists = listService.getAll(req.userId!);
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createListSchema), (req, res, next) => {
  try {
    const list = listService.create(req.userId!, req.body);
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

router.patch('/reorder', validate(reorderListsSchema), (req, res, next) => {
  try {
    listService.reorder(req.userId!, req.body.orderedIds);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateListSchema), (req, res, next) => {
  try {
    const list = listService.update(req.userId!, String(req.params.id), req.body);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    listService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
