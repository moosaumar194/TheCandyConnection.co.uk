/** WhatsApp deep-link helpers (wa.me — no API needed). */

/**
 * Build a wa.me link.
 * @param {string} number  - phone number in any format; non-digits are stripped.
 * @param {string} message - message to pre-fill (URL-encoded).
 * @returns {string} https://wa.me/<digits>?text=<encoded message>
 */
function buildWaLink(number, message = '') {
  const digits = String(number || '').replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/** Default message for the global floating button. */
const GENERIC_MESSAGE =
  "Hi The Candy Connection, I'm interested in a bulk order. Can you help?";

/** Per-product inquiry message. */
function productMessage(productName) {
  return `Hi, I'm interested in ${productName}. Can you give me bulk pricing?`;
}

module.exports = { buildWaLink, GENERIC_MESSAGE, productMessage };
