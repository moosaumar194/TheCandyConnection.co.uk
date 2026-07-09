/** Categories data access. */
const { all, get, run } = require('../db/database');

/** All categories ordered by sort_order then name. */
function listOrdered() {
  return all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
}

function getById(id) {
  return get('SELECT * FROM categories WHERE id = $1', [id]);
}

function getByName(name) {
  return get('SELECT * FROM categories WHERE name = $1', [name]);
}

/** Create a category; new ones sort after existing ones by default. */
async function create({ name, image_path = null }) {
  const maxRow = await get('SELECT COALESCE(MAX(sort_order), 0) AS max FROM categories');
  const nextOrder = maxRow.max + 1;
  return get(
    'INSERT INTO categories (name, image_path, sort_order) VALUES ($1, $2, $3) RETURNING *',
    [name, image_path, nextOrder]
  );
}

async function update(id, { name, image_path }) {
  const current = await getById(id);
  if (!current) return null;
  return get('UPDATE categories SET name = $1, image_path = $2 WHERE id = $3 RETURNING *', [
    name ?? current.name,
    image_path !== undefined ? image_path : current.image_path,
    id,
  ]);
}

function remove(id) {
  return run('DELETE FROM categories WHERE id = $1', [id]);
}

/** Number of products currently assigned to a category name. */
async function productCount(name) {
  const row = await get('SELECT COUNT(*)::int AS c FROM products WHERE category = $1', [name]);
  return row.c;
}

/**
 * Move a category up or down by swapping sort_order with its neighbour.
 * direction: 'up' | 'down'.
 */
async function reorder(id, direction) {
  const list = await listOrdered();
  const index = list.findIndex((c) => c.id === Number(id));
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const a = list[index];
  const b = list[swapIndex];
  await run('UPDATE categories SET sort_order = $1 WHERE id = $2', [b.sort_order, a.id]);
  await run('UPDATE categories SET sort_order = $1 WHERE id = $2', [a.sort_order, b.id]);
}

module.exports = {
  listOrdered,
  getById,
  getByName,
  create,
  update,
  remove,
  productCount,
  reorder,
};
