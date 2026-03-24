import { Cat } from '../models/Cat.js';

/**
 * GET /api/cats — returns all cats ordered by id.
 */
export async function getCats(req, res, next) {
  try {
    const cats = await Cat.findAll({
      order: [['id', 'ASC']],
    });
    res.json(cats);
  } catch (err) {
    next(err);
  }
}
