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
const { makeUploader, deleteImage } = require('../middleware/upload');
const ah = require('../utils/asyncHandler');

const productUpload = makeUploader('products');
const categoryUpload = makeUploader('categories');

/** Wrap an uploader so upload/processing errors become a flash + redirect instead of a crash. */
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

router.post(
  '/login',
  redirectIfAuthed,
  ah(async (req, res) => {
    const { username, password } = req.body;
    const user = await Users.getByUsername((username || '').trim());
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
  })
);

router.post('/logout', (req, res) => {
  req.session = null; // cookie-session: clear the cookie
  res.redirect('/admin/login');
});

router.get('/change-password', requireAuth, (req, res) => {
  res.render('admin/change-password', {
    title: 'Change Password',
    forced: !!req.session.mustChangePassword,
    layout: false,
  });
});

router.post(
  '/change-password',
  requireAuth,
  ah(async (req, res) => {
    const forced = !!req.session.mustChangePassword;
    const user = await Users.getById(req.session.userId);
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

    await Users.updatePassword(user.id, new_password);
    req.session.mustChangePassword = false;
    flash(req, 'success', 'Password updated successfully.');
    res.redirect('/admin/dashboard');
  })
);

// Everything below requires auth.
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

router.get(
  '/dashboard',
  ah(async (req, res) => {
    const [products, categories, pendingReviews, approvedReviews, unreadInquiries] =
      await Promise.all([
        Products.count(),
        Categories.listOrdered(),
        Reviews.countByStatus('pending'),
        Reviews.countByStatus('approved'),
        Inquiries.countUnread(),
      ]);
    res.render('admin/dashboard', {
      title: 'Dashboard',
      active: 'dashboard',
      stats: {
        products,
        categories: categories.length,
        pendingReviews,
        approvedReviews,
        unreadInquiries,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// Catalog manager
// ---------------------------------------------------------------------------

router.get(
  '/catalog',
  ah(async (req, res) => {
    res.render('admin/catalog', {
      title: 'Catalog Manager',
      active: 'catalog',
      products: await Products.list(),
    });
  })
);

router.get(
  '/catalog/new',
  ah(async (req, res) => {
    res.render('admin/product-form', {
      title: 'Add Product',
      active: 'catalog',
      product: null,
      categories: await Categories.listOrdered(),
    });
  })
);

router.post(
  '/catalog/new',
  handleUpload(productUpload),
  ah(async (req, res) => {
    const { name, category, description, price, packaging } = req.body;
    if (!name || !name.trim()) {
      flash(req, 'error', 'Product name is required.');
      return res.redirect('/admin/catalog/new');
    }
    await Products.create({
      name: name.trim(),
      category: category || null,
      description: description || null,
      price: price != null ? price.trim() : null,
      packaging: packaging || null,
      image_path: req.file ? req.file.url : null,
      is_visible: checkboxOn(req.body.is_visible),
    });
    flash(req, 'success', 'Product added.');
    res.redirect('/admin/catalog');
  })
);

router.get(
  '/catalog/:id/edit',
  ah(async (req, res) => {
    const product = await Products.getById(req.params.id);
    if (!product) return res.redirect('/admin/catalog');
    res.render('admin/product-form', {
      title: 'Edit Product',
      active: 'catalog',
      product,
      categories: await Categories.listOrdered(),
    });
  })
);

router.post(
  '/catalog/:id/edit',
  handleUpload(productUpload),
  ah(async (req, res) => {
    const product = await Products.getById(req.params.id);
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
      await deleteImage(product.image_path);
      fields.image_path = req.file.url;
    } else if (checkboxOn(req.body.remove_image)) {
      await deleteImage(product.image_path);
      fields.image_path = null;
    }

    await Products.update(product.id, fields);
    flash(req, 'success', 'Product updated.');
    res.redirect('/admin/catalog');
  })
);

router.post(
  '/catalog/:id/visibility',
  ah(async (req, res) => {
    const product = await Products.getById(req.params.id);
    if (product) await Products.setVisible(product.id, !product.is_visible);
    if (req.xhr || req.get('Accept')?.includes('application/json')) {
      return res.json({ ok: true, is_visible: product ? (product.is_visible ? 0 : 1) : null });
    }
    res.redirect('/admin/catalog');
  })
);

router.post(
  '/catalog/:id/delete',
  ah(async (req, res) => {
    const product = await Products.getById(req.params.id);
    if (product) {
      await deleteImage(product.image_path);
      await Products.remove(product.id);
      flash(req, 'success', 'Product deleted.');
    }
    res.redirect('/admin/catalog');
  })
);

// ---------------------------------------------------------------------------
// Category manager
// ---------------------------------------------------------------------------

router.get(
  '/categories',
  ah(async (req, res) => {
    const cats = await Categories.listOrdered();
    const categories = await Promise.all(
      cats.map(async (c) => ({ ...c, productCount: await Categories.productCount(c.name) }))
    );
    res.render('admin/categories', { title: 'Categories', active: 'categories', categories });
  })
);

router.post(
  '/categories/new',
  handleUpload(categoryUpload),
  ah(async (req, res) => {
    const name = (req.body.name || '').trim();
    if (!name) {
      flash(req, 'error', 'Category name is required.');
      return res.redirect('/admin/categories');
    }
    await Categories.create({ name, image_path: req.file ? req.file.url : null });
    flash(req, 'success', 'Category added.');
    res.redirect('/admin/categories');
  })
);

router.post(
  '/categories/:id/edit',
  handleUpload(categoryUpload),
  ah(async (req, res) => {
    const category = await Categories.getById(req.params.id);
    if (!category) return res.redirect('/admin/categories');
    const name = (req.body.name || category.name).trim();
    const fields = { name };
    if (req.file) {
      await deleteImage(category.image_path);
      fields.image_path = req.file.url;
    }
    await Categories.update(category.id, fields);
    flash(req, 'success', 'Category updated.');
    res.redirect('/admin/categories');
  })
);

router.post(
  '/categories/:id/reorder',
  ah(async (req, res) => {
    const dir = req.body.direction === 'up' ? 'up' : 'down';
    await Categories.reorder(req.params.id, dir);
    res.redirect('/admin/categories');
  })
);

router.post(
  '/categories/:id/delete',
  ah(async (req, res) => {
    const category = await Categories.getById(req.params.id);
    if (category) {
      await deleteImage(category.image_path);
      await Categories.remove(category.id);
      flash(req, 'success', 'Category deleted.');
    }
    res.redirect('/admin/categories');
  })
);

// ---------------------------------------------------------------------------
// Reviews manager
// ---------------------------------------------------------------------------

router.get(
  '/reviews',
  ah(async (req, res) => {
    const tab = req.query.tab === 'approved' ? 'approved' : 'pending';
    const [pending, approved] = await Promise.all([
      Reviews.listByStatus('pending'),
      Reviews.listByStatus('approved'),
    ]);
    res.render('admin/reviews', { title: 'Reviews', active: 'reviews', tab, pending, approved });
  })
);

router.post(
  '/reviews/:id/approve',
  ah(async (req, res) => {
    await Reviews.setStatus(req.params.id, 'approved');
    flash(req, 'success', 'Review approved.');
    res.redirect('/admin/reviews?tab=pending');
  })
);

router.post(
  '/reviews/:id/reject',
  ah(async (req, res) => {
    await Reviews.remove(req.params.id);
    flash(req, 'success', 'Review rejected and removed.');
    res.redirect('/admin/reviews?tab=pending');
  })
);

router.post(
  '/reviews/:id/verified',
  ah(async (req, res) => {
    await Reviews.toggleVerified(req.params.id);
    res.redirect('/admin/reviews?tab=approved');
  })
);

router.post(
  '/reviews/:id/edit',
  ah(async (req, res) => {
    const rating = parseInt(req.body.rating, 10);
    await Reviews.update(req.params.id, {
      customer_name: (req.body.customer_name || '').trim() || undefined,
      rating: rating >= 1 && rating <= 5 ? rating : undefined,
      review_text: (req.body.review_text || '').trim() || undefined,
      is_verified: checkboxOn(req.body.is_verified),
      status: req.body.status,
    });
    flash(req, 'success', 'Review updated.');
    res.redirect(`/admin/reviews?tab=${req.body.status === 'approved' ? 'approved' : 'pending'}`);
  })
);

router.post(
  '/reviews/:id/delete',
  ah(async (req, res) => {
    await Reviews.remove(req.params.id);
    flash(req, 'success', 'Review deleted.');
    res.redirect('/admin/reviews?tab=approved');
  })
);

// ---------------------------------------------------------------------------
// Inquiries (contact-form inbox)
// ---------------------------------------------------------------------------

router.get(
  '/inquiries',
  ah(async (req, res) => {
    res.render('admin/inquiries', {
      title: 'Inbox',
      active: 'inquiries',
      inquiries: await Inquiries.list(),
    });
  })
);

router.post(
  '/inquiries/:id/read',
  ah(async (req, res) => {
    const inq = await Inquiries.getById(req.params.id);
    if (inq) await Inquiries.markRead(inq.id, !inq.is_read);
    res.redirect('/admin/inquiries');
  })
);

router.post(
  '/inquiries/:id/delete',
  ah(async (req, res) => {
    await Inquiries.remove(req.params.id);
    flash(req, 'success', 'Message deleted.');
    res.redirect('/admin/inquiries');
  })
);

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

router.get(
  '/settings',
  ah(async (req, res) => {
    res.render('admin/settings', {
      title: 'Site Settings',
      active: 'settings',
      settings: await Settings.getAll(),
    });
  })
);

router.post(
  '/settings',
  ah(async (req, res) => {
    const updates = {};
    for (const key of SETTING_KEYS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await Settings.setMany(updates);
    flash(req, 'success', 'Settings updated successfully');
    res.redirect('/admin/settings');
  })
);

module.exports = router;
