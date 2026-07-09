/** Public-facing pages: home, catalog, contact, reviews. */
const express = require('express');
const router = express.Router();

const Products = require('../models/products');
const Categories = require('../models/categories');
const Reviews = require('../models/reviews');
const ah = require('../utils/asyncHandler');

// Home
router.get(
  '/',
  ah(async (req, res) => {
    const categories = await Categories.listOrdered();
    res.render('home', {
      title: 'The Candy Connection — Sweet Deals. Bulk Delights.',
      metaDescription:
        'The Candy Connection — your bulk candy wholesale supplier. Browse our catalog and order in bulk via WhatsApp.',
      activeNav: 'home',
      featuredCategories: categories.slice(0, 6),
    });
  })
);

// Catalog (view-only)
router.get(
  '/catalog',
  ah(async (req, res) => {
    const [categories, products] = await Promise.all([
      Categories.listOrdered(),
      Products.list({ visibleOnly: true }),
    ]);
    const selectedCategory = req.query.category || 'All';
    res.render('catalog', {
      title: 'Our Candy Collection — The Candy Connection',
      metaDescription:
        'Browse The Candy Connection catalog of bulk sweets, chocolates, gummies and lollipops. Inquire on WhatsApp for wholesale pricing.',
      activeNav: 'catalog',
      categories,
      products,
      selectedCategory,
    });
  })
);

// Contact (no DB reads)
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us — The Candy Connection',
    metaDescription:
      'Get in touch with The Candy Connection for bulk candy orders. Chat on WhatsApp, email us, or send a message.',
    activeNav: 'contact',
    sent: req.query.sent === '1',
  });
});

// Reviews
router.get(
  '/reviews',
  ah(async (req, res) => {
    const [reviews, stats] = await Promise.all([Reviews.listApproved(), Reviews.stats()]);
    res.render('reviews', {
      title: 'Customer Reviews — The Candy Connection',
      metaDescription: 'See what our wholesale candy customers say about The Candy Connection.',
      activeNav: 'reviews',
      reviews,
      stats,
      submitted: req.query.submitted === '1',
    });
  })
);

module.exports = router;
