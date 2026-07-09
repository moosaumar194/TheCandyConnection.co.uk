/** Products data access. */
const { all, get, run } = require('../db/database');

/**
 * List products.
 * @param {object} opts
 * @param {boolean} [opts.visibleOnly] - only is_visible = 1 (public catalog).
 * @param {string}  [opts.category]    - filter by category name.
 */
async function list({ visibleOnly = false, category = null } = {}) {
  const where = [];
  const params = [];
  if (visibleOnly) where.push('is_visible = 1');
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  const sql =
    'SELECT * FROM products' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY created_at DESC, id DESC';
  return all(sql, params);
}

function getById(id) {
  return get('SELECT * FROM products WHERE id = $1', [id]);
}

function create({ name, category, description, price, packaging, image_path, is_visible = 1 }) {
  return get(
    `INSERT INTO products (name, category, description, price, packaging, image_path, is_visible)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      name,
      category ?? null,
      description ?? null,
      price ?? null,
      packaging ?? null,
      image_path ?? null,
      is_visible ? 1 : 0,
    ]
  );
}

async function update(id, fields) {
  const current = await getById(id);
  if (!current) return null;
  return get(
    `UPDATE products SET name=$1, category=$2, description=$3, price=$4,
       packaging=$5, image_path=$6, is_visible=$7
     WHERE id=$8 RETURNING *`,
    [
      fields.name ?? current.name,
      fields.category !== undefined ? fields.category : current.category,
      fields.description !== undefined ? fields.description : current.description,
      fields.price !== undefined ? fields.price : current.price,
      fields.packaging !== undefined ? fields.packaging : current.packaging,
      fields.image_path !== undefined ? fields.image_path : current.image_path,
      fields.is_visible !== undefined ? (fields.is_visible ? 1 : 0) : current.is_visible,
      id,
    ]
  );
}

function setVisible(id, visible) {
  return get('UPDATE products SET is_visible = $1 WHERE id = $2 RETURNING *', [visible ? 1 : 0, id]);
}

function remove(id) {
  return run('DELETE FROM products WHERE id = $1', [id]);
}

async function count() {
  const row = await get('SELECT COUNT(*)::int AS c FROM products');
  return row.c;
}

module.exports = { list, getById, create, update, setVisible, remove, count };
