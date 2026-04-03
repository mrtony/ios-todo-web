import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as tagService from '../services/tag.service.js';
import { addTaskTagSchema, createTagSchema, updateTagSchema } from '../validators/tag.js';

const router = Router();

router.use(requireAuth);

router.get('/tags', (req, res, next) => {
  try {
    const tags = tagService.getAll(req.userId!);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.post('/tags', validate(createTagSchema), (req, res, next) => {
  try {
    const tag = tagService.create(req.userId!, req.body);
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

router.patch('/tags/:id', validate(updateTagSchema), (req, res, next) => {
  try {
    const tag = tagService.update(req.userId!, String(req.params.id), req.body);
    res.json(tag);
  } catch (err) {
    next(err);
  }
});

router.delete('/tags/:id', (req, res, next) => {
  try {
    tagService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/tasks/:id/tags', validate(addTaskTagSchema), (req, res, next) => {
  try {
    tagService.addTagToTask(req.userId!, String(req.params.id), req.body.tagId);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/tasks/:id/tags', (req, res, next) => {
  try {
    const tags = tagService.getTagsForTask(req.userId!, String(req.params.id));
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.delete('/tasks/:id/tags/:tagId', (req, res, next) => {
  try {
    tagService.removeTagFromTask(req.userId!, String(req.params.id), String(req.params.tagId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
