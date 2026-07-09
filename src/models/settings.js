/** Site settings — simple key/value store backed by the site_settings table. */
const db = require('../db/database');

const DEFAULTS = {
  whatsapp_number: '1234567890',
  email: 'hello@thecandyconnection.com',
  address: '123 Sweet Street, Candyville',
  operating_hours: 'Mon–Fri: 9am – 6pm\nSat: 10am – 4pm\nSun: Closed',
  facebook_url: 'https://facebook.com/',
  instagram_url: 'https://instagram.com/',
  tiktok_url: 'https://tiktok.com/',
  youtube_url: 'https://youtube.com/',
  discord_url: 'https://discord.gg/',
  whatsapp_channel_url: 'https://whatsapp.com/channel/',
  hero_headline: 'The Candy Connection',
  hero_subheadline: 'Sweet Deals. Bulk Delights.',
};

/** Return every setting as a plain object, falling back to defaults for missing keys. */
function getAll() {
  const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all();
  const map = { ...DEFAULTS };
  for (const row of rows) map[row.setting_key] = row.setting_value;
  return map;
}

/** Return a single setting value (or the default / empty string). */
function get(key) {
  const row = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get(key);
  if (row) return row.setting_value;
  return DEFAULTS[key] ?? '';
}

const upsert = db.prepare(`
  INSERT INTO site_settings (setting_key, setting_value)
  VALUES (@key, @value)
  ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
`);

/** Upsert many settings at once from a { key: value } object. */
const setMany = db.transaction((obj) => {
  for (const [key, value] of Object.entries(obj)) {
    upsert.run({ key, value: value == null ? '' : String(value) });
  }
});

module.exports = { DEFAULTS, getAll, get, setMany };
