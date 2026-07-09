/** Admin users data access + password helpers. */
const bcrypt = require('bcryptjs');
const db = require('../db/database');

function getByUsername(username) {
  return db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
}

function getById(id) {
  return db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id);
}

/** Verify a plaintext password against the stored bcrypt hash. */
function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compareSync(password, user.password_hash);
}

/** Create an admin user (used by the seed script). */
function create({ username, password, must_change_password = 0 }) {
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      'INSERT INTO admin_users (username, password_hash, must_change_password) VALUES (?, ?, ?)'
    )
    .run(username, hash, must_change_password ? 1 : 0);
  return getById(info.lastInsertRowid);
}

/** Set a new password and clear the must_change_password flag. */
function updatePassword(id, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    hash,
    id
  );
  return getById(id);
}

module.exports = { getByUsername, getById, verifyPassword, create, updatePassword };
