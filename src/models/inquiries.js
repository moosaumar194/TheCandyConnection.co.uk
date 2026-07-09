/** Contact-form inquiries data access (admin Inbox). */
const { all, get, run } = require('../db/database');

function list() {
  return all('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC');
}

function getById(id) {
  return get('SELECT * FROM inquiries WHERE id = $1', [id]);
}

function create({ name, email, phone, message }) {
  return get(
    'INSERT INTO inquiries (name, email, phone, message) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, email ?? null, phone ?? null, message]
  );
}

function markRead(id, read = true) {
  return get('UPDATE inquiries SET is_read = $1 WHERE id = $2 RETURNING *', [read ? 1 : 0, id]);
}

function remove(id) {
  return run('DELETE FROM inquiries WHERE id = $1', [id]);
}

async function countUnread() {
  const row = await get('SELECT COUNT(*)::int AS c FROM inquiries WHERE is_read = 0');
  return row.c;
}

module.exports = { list, getById, create, markRead, remove, countUnread };
