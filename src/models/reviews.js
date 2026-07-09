/** Reviews data access. */
const db = require('../db/database');

function listApproved() {
  return db
    .prepare("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC, id DESC")
    .all();
}

function listByStatus(status) {
  return db
    .prepare('SELECT * FROM reviews WHERE status = ? ORDER BY created_at DESC, id DESC')
    .all(status);
}

function getById(id) {
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

/**
 * Aggregate stats over APPROVED reviews only:
 * { count, average, distribution: {1..5} }.
 */
function stats() {
  const approved = listApproved();
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
  const info = db
    .prepare(
      `INSERT INTO reviews (customer_name, email, rating, review_text, status, is_verified)
       VALUES (?, ?, ?, ?, 'pending', 0)`
    )
    .run(customer_name, email ?? null, rating, review_text);
  return getById(info.lastInsertRowid);
}

function setStatus(id, status) {
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);
  return getById(id);
}

function toggleVerified(id) {
  db.prepare('UPDATE reviews SET is_verified = CASE is_verified WHEN 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  return getById(id);
}

function update(id, { customer_name, rating, review_text, is_verified, status }) {
  const current = getById(id);
  if (!current) return null;
  db.prepare(
    `UPDATE reviews SET customer_name = ?, rating = ?, review_text = ?, is_verified = ?, status = ?
     WHERE id = ?`
  ).run(
    customer_name ?? current.customer_name,
    rating ?? current.rating,
    review_text ?? current.review_text,
    is_verified !== undefined ? (is_verified ? 1 : 0) : current.is_verified,
    status ?? current.status,
    id
  );
  return getById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
}

function countByStatus(status) {
  return db.prepare('SELECT COUNT(*) AS c FROM reviews WHERE status = ?').get(status).c;
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
