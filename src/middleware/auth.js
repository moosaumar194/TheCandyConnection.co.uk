/** Admin authentication middleware. */

/**
 * Guard admin routes. Redirects unauthenticated users to the login page.
 * If the logged-in user still must change their password, forces them to the
 * change-password page first (except when already on it or logging out).
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/admin/login');
  }
  if (
    req.session.mustChangePassword &&
    req.path !== '/change-password' &&
    req.path !== '/logout'
  ) {
    return res.redirect('/admin/change-password');
  }
  return next();
}

/** Redirect already-logged-in users away from the login page. */
function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/admin/dashboard');
  }
  return next();
}

module.exports = { requireAuth, redirectIfAuthed };
