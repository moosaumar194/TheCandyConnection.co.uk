/**
 * The Candy Connection — server entry point.
 *
 * Express app: EJS views, static assets, session-based admin auth, and the
 * public / api / admin routers. The SQLite DB is opened (and schema applied)
 * the first time a model is required.
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const Settings = require('./src/models/settings');
const { buildWaLink, GENERIC_MESSAGE, productMessage } = require('./src/utils/whatsapp');
const helpers = require('./src/utils/helpers');

const publicRoutes = require('./src/routes/public');
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets (css, js, images, uploads)
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (admin auth)
app.use(
  session({
    name: 'tcc.sid',
    secret: process.env.SESSION_SECRET || 'candy-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Shared view locals (settings are read fresh each request so admin edits show immediately).
app.use((req, res, next) => {
  const settings = Settings.getAll();
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

app.listen(PORT, () => {
  console.log(`🍬 The Candy Connection running at http://localhost:${PORT}`);
});
