/** Admin users data access + password helpers. */
const bcrypt = require('bcryptjs');
const { get } = require('../db/database');

function getByUsername(username) {
  return get('SELECT * FROM admin_users WHERE username = $1', [username]);
}

function getById(id) {
  return get('SELECT * FROM admin_users WHERE id = $1', [id]);
}

/** Verify a plaintext password against the stored bcrypt hash (sync CPU work). */
function verifyPassword(user, password) {
  if (!user) return false;
  return bcrypt.compareSync(password, user.password_hash);
}

/** Create an admin user (used by the seed/migrate scripts). */
function create({ username, password, must_change_password = 0 }) {
  const hash = bcrypt.hashSync(password, 10);
  return get(
    'INSERT INTO admin_users (username, password_hash, must_change_password) VALUES ($1, $2, $3) RETURNING *',
    [username, hash, must_change_password ? 1 : 0]
  );
}

/** Set a new password and clear the must_change_password flag. */
function updatePassword(id, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  return get(
    'UPDATE admin_users SET password_hash = $1, must_change_password = 0 WHERE id = $2 RETURNING *',
    [hash, id]
  );
}

module.exports = { getByUsername, getById, verifyPassword, create, updatePassword };
