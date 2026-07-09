/** Reviews data access. */
const { all, get, run } = require('../db/database');

function listApproved() {
  return all("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC, id DESC");
}

function listByStatus(status) {
  return all('SELECT * FROM reviews WHERE status = $1 ORDER BY created_at DESC, id DESC', [status]);
}

function getById(id) {
  return get('SELECT * FROM reviews WHERE id = $1', [id]);
}

/**
 * Aggregate stats over APPROVED reviews only:
 * { count, average, distribution: {1..5} }.
 */
async function stats() {
  const approved = await listApproved();
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of approved) {
    const rating = Math.min(5, Math.max(1, r.rating));
    distribution[rating] += 1;
    sum += rating;
  }
  const count = approved.length;
  const average = count ? sum / count : 0;
  return { count, average, distribution };
}

function create({ customer_name, email, rating, review_text }) {
  return get(
    `INSERT INTO reviews (customer_name, email, rating, review_text, status, is_verified)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING *`,
    [customer_name, email ?? null, rating, review_text]
  );
}

function setStatus(id, status) {
  return get('UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
}

function toggleVerified(id) {
  return get(
    'UPDATE reviews SET is_verified = CASE is_verified WHEN 1 THEN 0 ELSE 1 END WHERE id = $1 RETURNING *',
    [id]
  );
}

async function update(id, { customer_name, rating, review_text, is_verified, status }) {
  const current = await getById(id);
  if (!current) return null;
  return get(
    `UPDATE reviews SET customer_name = $1, rating = $2, review_text = $3, is_verified = $4, status = $5
     WHERE id = $6 RETURNING *`,
    [
      customer_name ?? current.customer_name,
      rating ?? current.rating,
      review_text ?? current.review_text,
      is_verified !== undefined ? (is_verified ? 1 : 0) : current.is_verified,
      status ?? current.status,
      id,
    ]
  );
}

function remove(id) {
  return run('DELETE FROM reviews WHERE id = $1', [id]);
}

async function countByStatus(status) {
  const row = await get('SELECT COUNT(*)::int AS c FROM reviews WHERE status = $1', [status]);
  return row.c;
}

module.exports = {
  listApproved,
  listByStatus,
  getById,
  stats,
  create,
  setStatus,
  toggleVerified,
  update,
  remove,
  countByStatus,
};
