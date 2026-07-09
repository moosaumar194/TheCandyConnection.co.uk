/**
 * Wrap an async Express handler so rejected promises reach the error handler.
 * Express 4 does not catch async errors automatically.
 *
 *   router.get('/', ah(async (req, res) => { ... }));
 */
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
