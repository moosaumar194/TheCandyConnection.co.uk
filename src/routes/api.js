/** Public JSON API: review + contact-form submissions. */
const express = require('express');
const router = express.Router();

const Reviews = require('../models/reviews');
const Inquiries = require('../models/inquiries');
const ah = require('../utils/asyncHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Submit a review -> stored as 'pending' for admin approval.
router.post('/reviews', ah(async (req, res) => {
  const name = (req.body.customer_name || req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const rating = parseInt(req.body.rating, 10);
  const text = (req.body.review_text || req.body.message || '').trim();

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (!(rating >= 1 && rating <= 5)) errors.push('Please choose a star rating from 1 to 5.');
  if (text.length < 10) errors.push('Review must be at least 10 characters.');

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  await Reviews.create({ customer_name: name, email, rating, review_text: text });
  return res.json({
    ok: true,
    message: 'Thank you! Your review is awaiting approval.',
  });
}));

// Submit a contact inquiry -> stored in the admin Inbox.
router.post('/contact', ah(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const phone = (req.body.phone || '').trim();
  const message = (req.body.message || '').trim();

  const errors = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');
  if (message.length < 5) errors.push('Please enter a message.');

  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  await Inquiries.create({ name, email, phone, message });
  return res.json({ ok: true, message: "Thanks! We'll contact you soon." });
}));

module.exports = router;
