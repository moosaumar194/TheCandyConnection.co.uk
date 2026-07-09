/**
 * Vercel serverless entrypoint.
 *
 * Exports the Express app (a `(req, res)` handler), which Vercel's Node runtime
 * invokes per request. `vercel.json` rewrites all non-static routes here.
 */
module.exports = require('../server');
