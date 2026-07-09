/** Contact-form inquiries data access (admin Inbox). */
const db = require('../db/database');

function list() {
  return db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC').all();
}

function getById(id) {
  return db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);
}

function create({ name, email, phone, message }) {
  const info = db
    .prepare('INSERT INTO inquiries (name, email, phone, message) VALUES (?, ?, ?, ?)')
    .run(name, email ?? null, phone ?? null, message);
  return getById(info.lastInsertRowid);
}

function markRead(id, read = true) {
  db.prepare('UPDATE inquiries SET is_read = ? WHERE id = ?').run(read ? 1 : 0, id);
  return getById(id);
}

function remove(id) {
  return db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);
}

function countUnread() {
  return db.prepare('SELECT COUNT(*) AS c FROM inquiries WHERE is_read = 0').get().c;
}

module.exports = { list, getById, create, markRead, remove, countUnread };
