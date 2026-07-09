/** Products data access. */
const db = require('../db/database');

/**
 * List products.
 * @param {object} opts
 * @param {boolean} [opts.visibleOnly] - only is_visible = 1 (public catalog).
 * @param {string}  [opts.category]    - filter by category name.
 */
function list({ visibleOnly = false, category = null } = {}) {
  const where = [];
  const params = {};
  if (visibleOnly) where.push('is_visible = 1');
  if (category) {
    where.push('category = @category');
    params.category = category;
  }
  const sql =
    'SELECT * FROM products' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY created_at DESC, id DESC';
  return db.prepare(sql).all(params);
}

function getById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function create({ name, category, description, price, packaging, image_path, is_visible = 1 }) {
  const info = db
    .prepare(
      `INSERT INTO products (name, category, description, price, packaging, image_path, is_visible)
       VALUES (@name, @category, @description, @price, @packaging, @image_path, @is_visible)`
    )
    .run({
      name,
      category: category ?? null,
      description: description ?? null,
      price: price ?? null,
      packaging: packaging ?? null,
      image_path: image_path ?? null,
      is_visible: is_visible ? 1 : 0,
    });
  return getById(info.lastInsertRowid);
}

function update(id, fields) {
  const current = getById(id);
  if (!current) return null;
  const merged = {
    name: fields.name ?? current.name,
    category: fields.category !== undefined ? fields.category : current.category,
    description: fields.description !== undefined ? fields.description : current.description,
    price: fields.price !== undefined ? fields.price : current.price,
    packaging: fields.packaging !== undefined ? fields.packaging : current.packaging,
    image_path: fields.image_path !== undefined ? fields.image_path : current.image_path,
    is_visible: fields.is_visible !== undefined ? (fields.is_visible ? 1 : 0) : current.is_visible,
    id,
  };
  db.prepare(
    `UPDATE products SET name=@name, category=@category, description=@description,
       price=@price, packaging=@packaging, image_path=@image_path, is_visible=@is_visible
     WHERE id=@id`
  ).run(merged);
  return getById(id);
}

function setVisible(id, visible) {
  db.prepare('UPDATE products SET is_visible = ? WHERE id = ?').run(visible ? 1 : 0, id);
  return getById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
}

module.exports = { list, getById, create, update, setVisible, remove, count };
