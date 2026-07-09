/** Hidden admin panel — auth + catalog/category/review/inquiry/settings management. */
const express = require('express');
const router = express.Router();

const Users = require('../models/users');
const Products = require('../models/products');
const Categories = require('../models/categories');
const Reviews = require('../models/reviews');
const Inquiries = require('../models/inquiries');
const Settings = require('../models/settings');
const { requireAuth, redirectIfAuthed } = require('../middleware/auth');
const { makeUploader, webPath, deleteByWebPath } = require('../middleware/upload');

const productUpload = makeUploader('products');
const categoryUpload = makeUploader('categories');

/** Wrap a multer uploader so upload errors become a flash + redirect instead of a crash. */
function handleUpload(uploader, field = 'image') {
  const mw = uploader.single(field);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        req.session.flash = { type: 'error', message: err.message || 'Image upload failed.' };
        return res.redirect(req.get('Referer') || '/admin/dashboard');
      }
      next();
    });
  };
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function checkboxOn(value) {
  return value === 'on' || value === '1' || value === 'true';
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  res.redirect(req.session.userId ? '/admin/dashboard' : '/admin/login');
});

router.get('/login', redirectIfAuthed, (req, res) => {
  res.render('admin/login', { title: 'Admin Login', error: null, layout: false });
});

router.post('/login', redirectIfAuthed, (req, res) => {
  const { username, password } = req.body;
  const user = Users.getByUsername((username || '').trim());
  if (!user || !Users.verifyPassword(user, password || '')) {
    return res.status(401).render('admin/login', {
      title: 'Admin Login',
      error: 'Invalid credentials',
      layout: false,
    });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.mustChangePassword = !!user.must_change_password;
  res.redirect(user.must_change_password ? '/admin/change-password' : '/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.get('/change-password', requireAuth, (req, res) => {
  res.render('admin/change-password', {
    title: 'Change Password',
    forced: !!req.session.mustChangePassword,
    layout: false,
  });
});

router.post('/change-password', requireAuth, (req, res) => {
  const forced = !!req.session.mustChangePassword;
  const user = Users.getById(req.session.userId);
  const { current_password, new_password, confirm_password } = req.body;

  if (!forced && !Users.verifyPassword(user, current_password || '')) {
    flash(req, 'error', 'Current password is incorrect.');
    return res.redirect('/admin/change-password');
  }
  if (!new_password || new_password.length < 8) {
    flash(req, 'error', 'New password must be at least 8 characters.');
    return res.redirect('/admin/change-password');
  }
  if (new_password !== confirm_password) {
    flash(req, 'error', 'Passwords do not match.');
    return res.redirect('/admin/change-password');
  }

  Users.updatePassword(user.id, new_password);
  req.session.mustChangePassword = false;
  flash(req, 'success', 'Password updated successfully.');
  res.redirect('/admin/dashboard');
});

// Everything below requires auth.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard',
    active: 'dashboard',
    stats: {
      products: Products.count(),
      categories: Categories.listOrdered().length,
      pendingReviews: Reviews.countByStatus('pending'),
      approvedReviews: Reviews.countByStatus('approved'),
      unreadInquiries: Inquiries.countUnread(),
    },
  });
});

// ---------------------------------------------------------------------------
// Catalog manager
// ---------------------------------------------------------------------------

router.get('/catalog', (req, res) => {
  res.render('admin/catalog', {
    title: 'Catalog Manager',
    active: 'catalog',
    products: Products.list(),
  });
});

router.get('/catalog/new', (req, res) => {
  res.render('admin/product-form', {
    title: 'Add Product',
    active: 'catalog',
    product: null,
    categories: Categories.listOrdered(),
  });
});

router.post('/catalog/new', handleUpload(productUpload), (req, res) => {
  const { name, category, description, price, packaging } = req.body;
  if (!name || !name.trim()) {
    flash(req, 'error', 'Product name is required.');
    return res.redirect('/admin/catalog/new');
  }
  const image_path = req.file ? webPath('products', req.file.filename) : null;
  Products.create({
    name: name.trim(),
    category: category || null,
    description: description || null,
    price: price != null ? price.trim() : null,
    packaging: packaging || null,
    image_path,
    is_visible: checkboxOn(req.body.is_visible),
  });
  flash(req, 'success', 'Product added.');
  res.redirect('/admin/catalog');
});

router.get('/catalog/:id/edit', (req, res) => {
  const product = Products.getById(req.params.id);
  if (!product) return res.redirect('/admin/catalog');
  res.render('admin/product-form', {
    title: 'Edit Product',
    active: 'catalog',
    product,
    categories: Categories.listOrdered(),
  });
});

router.post('/catalog/:id/edit', handleUpload(productUpload), (req, res) => {
  const product = Products.getById(req.params.id);
  if (!product) return res.redirect('/admin/catalog');

  const { name, category, description, price, packaging } = req.body;
  const fields = {
    name: (name || product.name).trim(),
    category: category || null,
    description: description || null,
    price: price != null ? price.trim() : null,
    packaging: packaging || null,
    is_visible: checkboxOn(req.body.is_visible),
  };

  if (req.file) {
    deleteByWebPath(product.image_path);
    fields.image_path = webPath('products', req.file.filename);
  } else if (checkboxOn(req.body.remove_image)) {
    deleteByWebPath(product.image_path);
    fields.image_path = null;
  }

  Products.update(product.id, fields);
  flash(req, 'success', 'Product updated.');
  res.redirect('/admin/catalog');
});

router.post('/catalog/:id/visibility', (req, res) => {
  const product = Products.getById(req.params.id);
  if (product) Products.setVisible(product.id, !product.is_visible);
  if (req.xhr || req.get('Accept')?.includes('application/json')) {
    return res.json({ ok: true, is_visible: product ? (product.is_visible ? 0 : 1) : null });
  }
  res.redirect('/admin/catalog');
});

router.post('/catalog/:id/delete', (req, res) => {
  const product = Products.getById(req.params.id);
  if (product) {
    deleteByWebPath(product.image_path);
    Products.remove(product.id);
    flash(req, 'success', 'Product deleted.');
  }
  res.redirect('/admin/catalog');
});

// ---------------------------------------------------------------------------
// Category manager
// ---------------------------------------------------------------------------

router.get('/categories', (req, res) => {
  const categories = Categories.listOrdered().map((c) => ({
    ...c,
    productCount: Categories.productCount(c.name),
  }));
  res.render('admin/categories', { title: 'Categories', active: 'categories', categories });
});

router.post('/categories/new', handleUpload(categoryUpload), (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    flash(req, 'error', 'Category name is required.');
    return res.redirect('/admin/categories');
  }
  const image_path = req.file ? webPath('categories', req.file.filename) : null;
  Categories.create({ name, image_path });
  flash(req, 'success', 'Category added.');
  res.redirect('/admin/categories');
});

router.post('/categories/:id/edit', handleUpload(categoryUpload), (req, res) => {
  const category = Categories.getById(req.params.id);
  if (!category) return res.redirect('/admin/categories');
  const name = (req.body.name || category.name).trim();
  const fields = { name };
  if (req.file) {
    deleteByWebPath(category.image_path);
    fields.image_path = webPath('categories', req.file.filename);
  }
  Categories.update(category.id, fields);
  flash(req, 'success', 'Category updated.');
  res.redirect('/admin/categories');
});

router.post('/categories/:id/reorder', (req, res) => {
  const dir = req.body.direction === 'up' ? 'up' : 'down';
  Categories.reorder(req.params.id, dir);
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', (req, res) => {
  const category = Categories.getById(req.params.id);
  if (category) {
    deleteByWebPath(category.image_path);
    Categories.remove(category.id);
    flash(req, 'success', 'Category deleted.');
  }
  res.redirect('/admin/categories');
});

// ---------------------------------------------------------------------------
// Reviews manager
// ---------------------------------------------------------------------------

router.get('/reviews', (req, res) => {
  const tab = req.query.tab === 'approved' ? 'approved' : 'pending';
  res.render('admin/reviews', {
    title: 'Reviews',
    active: 'reviews',
    tab,
    pending: Reviews.listByStatus('pending'),
    approved: Reviews.listByStatus('approved'),
  });
});

router.post('/reviews/:id/approve', (req, res) => {
  Reviews.setStatus(req.params.id, 'approved');
  flash(req, 'success', 'Review approved.');
  res.redirect('/admin/reviews?tab=pending');
});

router.post('/reviews/:id/reject', (req, res) => {
  Reviews.remove(req.params.id);
  flash(req, 'success', 'Review rejected and removed.');
  res.redirect('/admin/reviews?tab=pending');
});

router.post('/reviews/:id/verified', (req, res) => {
  Reviews.toggleVerified(req.params.id);
  res.redirect('/admin/reviews?tab=approved');
});

router.post('/reviews/:id/edit', (req, res) => {
  const rating = parseInt(req.body.rating, 10);
  Reviews.update(req.params.id, {
    customer_name: (req.body.customer_name || '').trim() || undefined,
    rating: rating >= 1 && rating <= 5 ? rating : undefined,
    review_text: (req.body.review_text || '').trim() || undefined,
    is_verified: checkboxOn(req.body.is_verified),
    status: req.body.status,
  });
  flash(req, 'success', 'Review updated.');
  res.redirect(`/admin/reviews?tab=${req.body.status === 'approved' ? 'approved' : 'pending'}`);
});

router.post('/reviews/:id/delete', (req, res) => {
  Reviews.remove(req.params.id);
  flash(req, 'success', 'Review deleted.');
  res.redirect('/admin/reviews?tab=approved');
});

// ---------------------------------------------------------------------------
// Inquiries (contact-form inbox)
// ---------------------------------------------------------------------------

router.get('/inquiries', (req, res) => {
  res.render('admin/inquiries', {
    title: 'Inbox',
    active: 'inquiries',
    inquiries: Inquiries.list(),
  });
});

router.post('/inquiries/:id/read', (req, res) => {
  const inq = Inquiries.getById(req.params.id);
  if (inq) Inquiries.markRead(inq.id, !inq.is_read);
  res.redirect('/admin/inquiries');
});

router.post('/inquiries/:id/delete', (req, res) => {
  Inquiries.remove(req.params.id);
  flash(req, 'success', 'Message deleted.');
  res.redirect('/admin/inquiries');
});

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

const SETTING_KEYS = [
  'whatsapp_number',
  'email',
  'address',
  'operating_hours',
  'facebook_url',
  'instagram_url',
  'tiktok_url',
  'youtube_url',
  'discord_url',
  'whatsapp_channel_url',
  'hero_headline',
  'hero_subheadline',
];

router.get('/settings', (req, res) => {
  res.render('admin/settings', {
    title: 'Site Settings',
    active: 'settings',
    settings: Settings.getAll(),
  });
});

router.post('/settings', (req, res) => {
  const updates = {};
  for (const key of SETTING_KEYS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  Settings.setMany(updates);
  flash(req, 'success', 'Settings updated successfully');
  res.redirect('/admin/settings');
});

module.exports = router;
