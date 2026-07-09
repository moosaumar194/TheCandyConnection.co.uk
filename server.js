/**
 * The Candy Connection — Express app.
 *
 * Exports the app (for the Vercel serverless entry at api/index.js) and only
 * calls app.listen() when run directly (local dev). Data lives in Postgres;
 * admin sessions are stateless signed cookies; uploads go to Vercel Blob.
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');

const Settings = require('./src/models/settings');
const { buildWaLink, GENERIC_MESSAGE, productMessage } = require('./src/utils/whatsapp');
const helpers = require('./src/utils/helpers');

const publicRoutes = require('./src/routes/public');
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind Vercel's proxy — needed for correct req.protocol and secure cookies.
app.set('trust proxy', 1);

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets (css, js, images, uploads). On Vercel, /public is also served
// statically by the platform; this keeps local dev working.
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (admin auth) — stateless signed cookie (serverless-safe).
app.use(
  cookieSession({
    name: 'tcc',
    keys: [process.env.SESSION_SECRET || 'candy-dev-secret-change-me'],
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  })
);

// Shared view locals (settings read fresh each request so admin edits show immediately).
app.use(async (req, res, next) => {
  try {
    const settings = await Settings.getAll();
    res.locals.settings = settings;
    res.locals.h = helpers;
    res.locals.wa = { buildWaLink, GENERIC_MESSAGE, productMessage };
    res.locals.waFloat = buildWaLink(settings.whatsapp_number, GENERIC_MESSAGE);
    res.locals.currentYear = new Date().getFullYear();
    res.locals.activeNav = null;
    res.locals.metaDescription = 'The Candy Connection — bulk candy wholesale. Order on WhatsApp.';

    // One-shot flash message (set by admin routes before a redirect).
    res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
    if (req.session && req.session.flash) delete req.session.flash;

    res.locals.admin = req.session
      ? { userId: req.session.userId, username: req.session.username }
      : {};
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/', publicRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found — The Candy Connection',
    activeNav: null,
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).send('Something went wrong. Please try again.');
});

// Only listen when run directly (local dev); on Vercel the app is imported.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🍬 The Candy Connection running at http://localhost:${PORT}`);
  });
}

module.exports = app;
