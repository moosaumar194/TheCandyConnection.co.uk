# 🍬 The Candy Connection

**Sweet Deals. Bulk Delights.**

A responsive marketing & catalog website for a bulk/wholesale candy business. It is a
**showcase catalog — not an online store**: customers browse the catalog and place every
order via **WhatsApp** (`wa.me` deep links). There is deliberately **no cart, no checkout,
and no payment**. A hidden, password-protected **admin panel** at `/admin` manages the
catalog, categories, reviews, contact settings, and a contact-form inbox.

---

## ✨ Features

- **Home** — hero, about snippet, featured categories, "why choose us", floating candy animation.
- **Catalog** (`/catalog`) — view-only grid with live search, category filter tabs, product detail modal, and a per-product "Inquire on WhatsApp" button. No prices shown when none is set ("Price on Request").
- **Contact** (`/contact`) — WhatsApp / email / hours cards, a backup contact form (stored in the admin inbox), social links, and a map embed.
- **Reviews** (`/reviews`) — rating stats + distribution bars, approved reviews, and a "leave a review" form (submissions await admin approval).
- **Admin** (`/admin`) — dashboard, catalog manager (with image upload), category manager (reorder), review moderation, contact inbox, and editable site settings.
- **Global** — fixed glassmorphism navbar, sticky floating WhatsApp button, mobile hamburger nav, SEO meta tags, 🍬 favicon, scroll-reveal animations.

---

## 🧰 Tech Stack

| Layer      | Choice                                        |
|------------|-----------------------------------------------|
| Server     | Node.js + Express                             |
| Views      | EJS (server-rendered) + vanilla JS            |
| Database   | SQLite via `better-sqlite3`                   |
| Auth       | `express-session` + `bcryptjs`                |
| Uploads    | `multer` (JPG/PNG/WEBP, 5 MB max)             |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm.

### Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) create your env file
cp .env.example .env        # then edit PORT / SESSION_SECRET

# 3. Seed the database (creates data/candy.db + sample data + admin user)
npm run seed

# 4. Start the server
npm start
```

Then open **http://localhost:3000**.

> `npm run dev` starts the server with auto-reload (`node --watch`).

### Re-seeding

```bash
npm run reset   # wipes ALL data and re-seeds from scratch
```

---

## 🔐 Admin Access

Visit **http://localhost:3000/admin** (there are no public links to it).

| Username | Password     |
|----------|--------------|
| `admin`  | `letmein123` |

On first login you'll be **required to set a new password** before you can use the panel.

---

## 📦 Sample Data

Seeding creates **4 categories** and **10 sample products** (with generated candy-themed SVG
images), a handful of approved reviews plus one pending review, and placeholder site settings.
Update the WhatsApp number, email, address, hours, social links and hero text in
**Admin → Site Settings**.

---

## 📱 WhatsApp Ordering

All order actions build links of the form:

```
https://wa.me/<digits-only-number>?text=<url-encoded message>
```

- The number comes from **Site Settings → WhatsApp Number** (enter it in international format,
  digits only — e.g. `15551234567`, no `+`, spaces or dashes).
- Product buttons pre-fill: `Hi, I'm interested in <product>. Can you give me bulk pricing?`
- The floating button uses a generic bulk-order message.

---

## 🗂️ Project Structure

```
├─ server.js               # Express bootstrap
├─ src/
│  ├─ db/                  # database.js, schema.sql, seed.js
│  ├─ middleware/          # auth.js, upload.js
│  ├─ models/              # products, categories, reviews, settings, inquiries, users
│  ├─ routes/              # public.js, api.js, admin.js
│  └─ utils/               # whatsapp.js, helpers.js
├─ views/                  # EJS templates (+ partials, + admin/)
├─ public/                 # css/, js/, images/, uploads/, favicon.svg
└─ data/                   # candy.db (generated, gitignored)
```

---

## 🛠️ Troubleshooting

- **`better-sqlite3` fails to install / build on Windows:** it ships prebuilt binaries for
  Node LTS, so `npm install` normally just works. If it tries to compile and fails, install the
  build tools (`npm install --global windows-build-tools` on older setups, or install
  "Desktop development with C++" via Visual Studio Build Tools) and re-run `npm install`, or
  switch to a Node LTS version (18/20/22).
- **Port already in use:** set a different `PORT` in `.env`.
- **Uploaded images not showing:** ensure `public/uploads/products` and
  `public/uploads/categories` exist (they're created automatically on first upload/seed).

---

## 📝 Notes

- This project intentionally contains **no e-commerce** (cart/checkout/payment). WhatsApp is
  the only ordering channel.
- Sessions use the default in-memory store, so restarting the server logs admins out — fine for
  this MVP. For production, add a persistent session store and run behind HTTPS with
  `NODE_ENV=production` (enables secure cookies).

© 2026 The Candy Connection.
