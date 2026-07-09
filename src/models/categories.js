/** Categories data access. */
const db = require('../db/database');

/** All categories ordered by sort_order then name. */
function listOrdered() {
  return db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
    .all();
}

function getById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function getByName(name) {
  return db.prepare('SELECT * FROM categories WHERE name = ?').get(name);
}

/** Create a category; new ones sort after existing ones by default. */
function create({ name, image_path = null }) {
  const maxRow = db.prepare('SELECT MAX(sort_order) AS max FROM categories').get();
  const nextOrder = (maxRow.max ?? 0) + 1;
  const info = db
    .prepare('INSERT INTO categories (name, image_path, sort_order) VALUES (?, ?, ?)')
    .run(name, image_path, nextOrder);
  return getById(info.lastInsertRowid);
}

function update(id, { name, image_path }) {
  const current = getById(id);
  if (!current) return null;
  db.prepare('UPDATE categories SET name = ?, image_path = ? WHERE id = ?').run(
    name ?? current.name,
    image_path !== undefined ? image_path : current.image_path,
    id
  );
  return getById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
}

/** Number of products currently assigned to a category name. */
function productCount(name) {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM products WHERE category = ?')
    .get(name);
  return row.c;
}

/**
 * Move a category up or down by swapping sort_order with its neighbour.
 * direction: 'up' | 'down'.
 */
const reorder = db.transaction((id, direction) => {
  const list = listOrdered();
  const index = list.findIndex((c) => c.id === Number(id));
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const a = list[index];
  const b = list[swapIndex];
  const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  stmt.run(b.sort_order, a.id);
  stmt.run(a.sort_order, b.id);
});

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
