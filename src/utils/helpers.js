/** Small view helpers shared across EJS templates. */

const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

/** Resolve an image path to something usable, falling back to a placeholder. */
function imageUrl(imagePath) {
  if (!imagePath || String(imagePath).trim() === '') return PLACEHOLDER_IMAGE;
  return imagePath;
}

/** Truncate text to a max length, appending an ellipsis. */
function truncate(text, max = 90) {
  if (!text) return '';
  const t = String(text);
  return t.length > max ? t.slice(0, max).trimEnd() + '…' : t;
}

/** True when a price string is a plain number (so we can prefix a currency symbol). */
function isNumericPrice(price) {
  if (price == null) return false;
  return /^\s*\d+(\.\d+)?\s*$/.test(String(price));
}

/** Display string for a price: "$12.50", the raw text, or "Price on Request". */
function displayPrice(price) {
  if (!price || String(price).trim() === '') return 'Price on Request';
  if (isNumericPrice(price)) return `$${Number(price).toFixed(2)}`;
  return String(price);
}

/** Format an ISO/SQLite datetime string as e.g. "4 Jul 2026". */
function formatDate(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Star string builder: returns {full, empty} counts for a 0..5 rating. */
function starCounts(rating) {
  const full = Math.round(Math.min(5, Math.max(0, Number(rating) || 0)));
  return { full, empty: 5 - full };
}

module.exports = {
  PLACEHOLDER_IMAGE,
  imageUrl,
  truncate,
  isNumericPrice,
  displayPrice,
  formatDate,
  starCounts,
};
