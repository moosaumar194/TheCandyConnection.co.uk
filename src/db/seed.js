/**
 * Database seed script.
 *
 *   npm run seed          -> create tables + insert sample data if empty
 *   npm run seed -- --reset (or: npm run reset) -> wipe all data first
 *
 * Also (re)generates candy-themed sample SVG images under
 * public/images/samples/ so the catalog looks populated with no binary assets.
 */
const fs = require('fs');
const path = require('path');

const db = require('./database');
const users = require('../models/users');
const settings = require('../models/settings');

const RESET = process.argv.includes('--reset');
const SAMPLE_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'samples');

// ---------------------------------------------------------------------------
// Sample candy image generation (procedural SVG)
// ---------------------------------------------------------------------------

/** A soft, rounded, candy-themed SVG tile with a shape + label. */
function candySvg({ bg1, bg2, candy, accent, label, shape }) {
  const shapes = {
    // Wrapped hard candy
    wrapped: `
      <g transform="translate(200 190)">
        <path d="M-150 0 L-70 -45 L-70 45 Z" fill="${candy}"/>
        <path d="M150 0 L70 -45 L70 45 Z" fill="${candy}"/>
        <circle r="80" fill="${candy}"/>
        <circle r="80" fill="none" stroke="${accent}" stroke-width="10" stroke-dasharray="20 16"/>
        <ellipse cx="-25" cy="-25" rx="24" ry="16" fill="#ffffff" opacity="0.55"/>
      </g>`,
    // Chocolate bar
    bar: `
      <g transform="translate(200 190)">
        <rect x="-110" y="-80" width="220" height="160" rx="18" fill="${candy}"/>
        <g stroke="${accent}" stroke-width="6" opacity="0.7">
          <line x1="-110" y1="-27" x2="110" y2="-27"/>
          <line x1="-110" y1="27" x2="110" y2="27"/>
          <line x1="-37" y1="-80" x2="-37" y2="80"/>
          <line x1="37" y1="-80" x2="37" y2="80"/>
        </g>
        <rect x="-110" y="-80" width="220" height="30" rx="14" fill="#ffffff" opacity="0.18"/>
      </g>`,
    // Lollipop
    lollipop: `
      <g transform="translate(200 175)">
        <rect x="-6" y="40" width="12" height="120" rx="6" fill="#ffffff"/>
        <circle r="78" fill="${candy}"/>
        <path d="M0 0 m0 -78 a78 78 0 0 1 0 156" fill="${accent}" opacity="0.55"/>
        <circle r="78" fill="none" stroke="${accent}" stroke-width="6"/>
        <ellipse cx="-22" cy="-24" rx="20" ry="13" fill="#ffffff" opacity="0.6"/>
      </g>`,
    // Gummy bear
    gummy: `
      <g transform="translate(200 190)" fill="${candy}">
        <circle cx="-52" cy="-58" r="22"/>
        <circle cx="52" cy="-58" r="22"/>
        <ellipse cx="0" cy="10" rx="70" ry="82"/>
        <circle cx="0" cy="-42" r="42"/>
        <circle cx="-58" cy="70" r="20"/>
        <circle cx="58" cy="70" r="20"/>
        <g fill="${accent}">
          <circle cx="-18" cy="-48" r="7"/>
          <circle cx="18" cy="-48" r="7"/>
          <circle cx="0" cy="-28" r="6"/>
        </g>
      </g>`,
    // Jelly beans cluster
    jelly: `
      <g transform="translate(200 190)">
        <ellipse cx="-46" cy="-10" rx="46" ry="30" fill="${candy}" transform="rotate(-18 -46 -10)"/>
        <ellipse cx="40" cy="18" rx="46" ry="30" fill="${accent}" transform="rotate(22 40 18)"/>
        <ellipse cx="6" cy="-46" rx="46" ry="30" fill="#ffffff" opacity="0.85" transform="rotate(8 6 -46)"/>
        <ellipse cx="-24" cy="52" rx="46" ry="30" fill="${accent}" transform="rotate(-8 -24 52)"/>
      </g>`,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="60" cy="70" r="10" fill="#ffffff" opacity="0.4"/>
  <circle cx="340" cy="110" r="7" fill="#ffffff" opacity="0.4"/>
  <circle cx="320" cy="330" r="12" fill="#ffffff" opacity="0.35"/>
  <circle cx="70" cy="320" r="8" fill="#ffffff" opacity="0.4"/>
  ${shapes[shape] || shapes.wrapped}
  <rect x="40" y="330" width="320" height="46" rx="23" fill="#2D2D2D" opacity="0.82"/>
  <text x="200" y="362" text-anchor="middle" font-family="Poppins, Nunito, Arial, sans-serif"
        font-size="24" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
}

function writeSvg(filename, svg) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SAMPLE_DIR, filename), svg, 'utf8');
  return `/images/samples/${filename}`;
}

// ---------------------------------------------------------------------------
// Sample data definitions
// ---------------------------------------------------------------------------

const categories = [
  { name: 'Chocolates', shape: 'bar', theme: { bg1: '#FFE9D6', bg2: '#F6C89A', candy: '#7B4B27', accent: '#C98A4B' } },
  { name: 'Gummies & Jellies', shape: 'gummy', theme: { bg1: '#FFD9E6', bg2: '#FFB6C1', candy: '#FF5C8A', accent: '#FFD700' } },
  { name: 'Hard Candy & Lollipops', shape: 'lollipop', theme: { bg1: '#E4FFF0', bg2: '#98FF98', candy: '#FF6F91', accent: '#66D2A0' } },
  { name: 'Sour & Novelty', shape: 'jelly', theme: { bg1: '#FFFBD6', bg2: '#FFFACD', candy: '#8ED14F', accent: '#FF8C42' } },
];

const products = [
  { name: 'Milk Chocolate Truffles', category: 'Chocolates', price: '18.50', packaging: 'Box of 24', shape: 'wrapped',
    theme: { bg1: '#FFE9D6', bg2: '#E9B98A', candy: '#8B5A2B', accent: '#D9A76A' },
    description: 'Creamy milk chocolate truffles with a smooth ganache centre. Perfect for gift boxes and reselling by the dozen.' },
  { name: 'Dark Chocolate Bars', category: 'Chocolates', price: '', packaging: '100g Bar · Case of 40', shape: 'bar',
    theme: { bg1: '#F3E1CF', bg2: '#C98A4B', candy: '#4A2C17', accent: '#8B5A2B' },
    description: 'Rich 70% dark chocolate bars, individually wrapped. Bulk cases available — contact us for wholesale pricing.' },
  { name: 'Caramel Fudge Cubes', category: 'Chocolates', price: '12.00', packaging: '500g Pack', shape: 'wrapped',
    theme: { bg1: '#FFF0DC', bg2: '#F0C27B', candy: '#B5762E', accent: '#FFD700' },
    description: 'Soft, buttery caramel fudge cubes dusted to prevent sticking. A best-selling counter treat.' },
  { name: 'Fruit Gummy Bears', category: 'Gummies & Jellies', price: '9.50', packaging: '1kg Bag', shape: 'gummy',
    theme: { bg1: '#FFD9E6', bg2: '#FFB6C1', candy: '#FF5C8A', accent: '#FFD700' },
    description: 'Classic assorted fruit gummy bears in five fruity flavours. Sold in resealable bulk bags.' },
  { name: 'Rainbow Jelly Worms', category: 'Gummies & Jellies', price: '', packaging: '2kg Tub', shape: 'jelly',
    theme: { bg1: '#E8D6FF', bg2: '#C6A6FF', candy: '#8A5CFF', accent: '#FF7AA8' },
    description: 'Long, chewy two-tone jelly worms that kids love. Price on request for wholesale tubs.' },
  { name: 'Fizzy Cola Bottles', category: 'Gummies & Jellies', price: '10.25', packaging: '1kg Bag', shape: 'gummy',
    theme: { bg1: '#FBE6C9', bg2: '#E0A96D', candy: '#6B3E1D', accent: '#FFD700' },
    description: 'Tangy fizzy cola bottle gummies coated in sour sugar. A pick-and-mix essential.' },
  { name: 'Classic Lollipops', category: 'Hard Candy & Lollipops', price: '0.35', packaging: 'Each · Tub of 200', shape: 'lollipop',
    theme: { bg1: '#FFE0EC', bg2: '#FF9EC0', candy: '#FF4D8D', accent: '#FFFFFF' },
    description: 'Swirled rainbow lollipops on a paper stick. Great for events, parties, and party bags.' },
  { name: 'Peppermint Swirls', category: 'Hard Candy & Lollipops', price: '7.00', packaging: '500g Pack', shape: 'wrapped',
    theme: { bg1: '#E4FFF0', bg2: '#B6F5D2', candy: '#E23B4E', accent: '#FFFFFF' },
    description: 'Individually wrapped red-and-white peppermint swirl hard candies. Refreshing after-dinner favourite.' },
  { name: 'Sour Rainbow Straws', category: 'Sour & Novelty', price: '11.50', packaging: 'Box of 120', shape: 'jelly',
    theme: { bg1: '#FFFBD6', bg2: '#FFF07A', candy: '#8ED14F', accent: '#FF8C42' },
    description: 'Chewy rainbow straws with an intense sour coating. A novelty counter favourite that flies off shelves.' },
  { name: 'Novelty Candy Mix', category: 'Sour & Novelty', price: '', packaging: 'Custom Bulk Order', shape: 'wrapped',
    theme: { bg1: '#FFE9F5', bg2: '#FFC1E3', candy: '#FF5FA2', accent: '#66D2A0' },
    description: 'A custom pick-and-mix assortment tailored to your shop. Tell us your mix on WhatsApp for a quote.' },
];

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

function wipe() {
  db.exec(`
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM reviews;
    DELETE FROM site_settings;
    DELETE FROM admin_users;
    DELETE FROM inquiries;
    DELETE FROM sqlite_sequence;
  `);
}

function alreadySeeded() {
  const c = db.prepare('SELECT COUNT(*) AS c FROM admin_users').get().c;
  return c > 0;
}

function seed() {
  if (RESET) {
    console.log('⚠  --reset: wiping all existing data…');
    wipe();
  } else if (alreadySeeded()) {
    console.log('ℹ  Database already has data — nothing to seed.');
    console.log('   Run "npm run reset" to wipe and re-seed from scratch.');
    return;
  }

  const insertCategory = db.prepare(
    'INSERT INTO categories (name, image_path, sort_order) VALUES (?, ?, ?)'
  );
  categories.forEach((cat, i) => {
    const img = writeSvg(
      `category-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
      candySvg({ ...cat.theme, label: cat.name, shape: cat.shape })
    );
    insertCategory.run(cat.name, img, i + 1);
  });
  console.log(`✓ Inserted ${categories.length} categories`);

  const insertProduct = db.prepare(
    `INSERT INTO products (name, category, description, price, packaging, image_path, is_visible)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  products.forEach((p) => {
    const img = writeSvg(
      `product-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
      candySvg({ ...p.theme, label: p.name.split(' ').slice(-1)[0], shape: p.shape })
    );
    insertProduct.run(p.name, p.category, p.description, p.price, p.packaging, img);
  });
  console.log(`✓ Inserted ${products.length} products`);

  // A few approved sample reviews so the Reviews page isn't empty.
  const sampleReviews = [
    { customer_name: 'Sana Corner Store', email: 'sana@example.com', rating: 5, is_verified: 1,
      review_text: 'Best wholesale prices in town and the gummy bears are always fresh. Ordering on WhatsApp is so easy!' },
    { customer_name: 'Bilal Events', email: 'bilal@example.com', rating: 5, is_verified: 1,
      review_text: 'Ordered 200 lollipops for a school event — delivered on time and the kids loved them. Highly recommend.' },
    { customer_name: 'Maya K.', email: 'maya@example.com', rating: 4, is_verified: 0,
      review_text: 'Great variety and friendly service. Would love to see more sugar-free options in the future.' },
    { customer_name: 'The Sweet Kiosk', email: 'kiosk@example.com', rating: 5, is_verified: 1,
      review_text: 'Reliable bulk supplier for our pick-and-mix counter. The sour rainbow straws are our top seller.' },
  ];
  const insertReview = db.prepare(
    `INSERT INTO reviews (customer_name, email, rating, review_text, status, is_verified)
     VALUES (?, ?, ?, ?, 'approved', ?)`
  );
  sampleReviews.forEach((r) =>
    insertReview.run(r.customer_name, r.email, r.rating, r.review_text, r.is_verified)
  );
  // One pending review to demonstrate the moderation flow.
  db.prepare(
    `INSERT INTO reviews (customer_name, email, rating, review_text, status, is_verified)
     VALUES (?, ?, ?, ?, 'pending', 0)`
  ).run('New Customer', 'new@example.com', 5, 'Just placed my first bulk order — excited to see it arrive!');
  console.log(`✓ Inserted ${sampleReviews.length} approved + 1 pending review`);

  // Site settings (placeholders — editable in Admin → Site Settings).
  settings.setMany(settings.DEFAULTS);
  console.log('✓ Inserted default site settings');

  // Default admin account (forced password change on first login).
  users.create({ username: 'admin', password: 'letmein123', must_change_password: 1 });
  console.log('✓ Created admin user  (username: admin  password: letmein123)');

  console.log('\n🍬 Seed complete!  Start the app with:  npm start');
}

seed();
