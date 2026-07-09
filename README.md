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

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Server     | Node.js + Express (serverless on Vercel via `api/index.js`)    |
| Views      | EJS (server-rendered) + vanilla JS                            |
| Database   | PostgreSQL via `pg` (Vercel Postgres / Neon)                  |
| Auth       | `cookie-session` (stateless) + `bcryptjs`                     |
| Uploads    | `multer` + `sharp` → **Vercel Blob** (disk fallback in dev)   |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm.
- A **PostgreSQL** database. For local dev this can be your cloud Postgres (Vercel
  Postgres / Neon) connection string, or a local one — e.g. via Docker:
  `docker run --name candy-pg -e POSTGRES_PASSWORD=candy -e POSTGRES_DB=candy -p 5432:5432 -d postgres:16`

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and set POSTGRES_URL (+ SESSION_SECRET)
cp .env.example .env
#   e.g. POSTGRES_URL=postgres://postgres:candy@localhost:5432/candy

# 3. Seed the database (creates tables + sample data + admin user)
npm run seed

# 4. Start the server
npm start
```

Then open **http://localhost:3000**.

> `npm run dev` starts the server with auto-reload (`node --watch`).
> Without a `BLOB_READ_WRITE_TOKEN`, admin image uploads are written to
> `public/uploads/` on disk (fine for local dev).

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
├─ server.js               # Express app (exported; listens only in local dev)
├─ api/index.js            # Vercel serverless entrypoint (imports server.js)
├─ vercel.json             # rewrites all routes to the function
├─ src/
│  ├─ db/                  # database.js (pg), schema.sql, seed.js, optimize-images.js,
│  │                       #   migrate-to-postgres.js
│  ├─ middleware/          # auth.js, upload.js (sharp → Vercel Blob / disk)
│  ├─ models/              # products, categories, reviews, settings, inquiries, users (async)
│  ├─ routes/              # public.js, api.js, admin.js
│  └─ utils/               # whatsapp.js, helpers.js, asyncHandler.js
├─ views/                  # EJS templates (+ partials, + admin/)
├─ public/                 # css/, js/, images/, uploads/, favicon.svg
└─ data/                   # candy.db (old SQLite — migration source only, gitignored)
```

---

## ▲ Deploy to Vercel

The app is serverless-ready (stateless sessions, Postgres, Blob storage).

1. **Create storage in the Vercel dashboard** (project → Storage):
   - a **Postgres** database → it injects `POSTGRES_URL` (+ related vars).
   - a **Blob** store → gives you `BLOB_READ_WRITE_TOKEN`.
2. **Set env vars** on the Vercel project (and in a local `.env`): `POSTGRES_URL`,
   `BLOB_READ_WRITE_TOKEN`, a strong `SESSION_SECRET`, and `NODE_ENV=production`.
3. **Migrate your existing data** once, locally (uploads its images to Blob):
   ```bash
   npm run migrate
   ```
   (Or start fresh on Postgres with `npm run seed`.)
4. **Import the GitHub repo** into Vercel. The Git integration enables
   **auto-deploy: every push to `main` triggers a new deployment**.

Static assets in `public/` are served by Vercel automatically; everything else is
routed to the Express function via `vercel.json`.

---

## 🛠️ Troubleshooting

- **`error: POSTGRES_URL is not set`:** create `.env` from `.env.example` and set a Postgres
  connection string (see Prerequisites for a Docker one-liner).
- **Connecting to Vercel Postgres / Neon locally:** use the **pooled** connection string; SSL is
  enabled automatically for non-localhost hosts.
- **Port already in use:** set a different `PORT` in `.env`.
- **Uploads:** with `BLOB_READ_WRITE_TOKEN` set they go to Vercel Blob; otherwise to
  `public/uploads/` on disk (auto-created).

---

## 📝 Notes

- This project intentionally contains **no e-commerce** (cart/checkout/payment). WhatsApp is
  the only ordering channel.
- Admin sessions are **stateless signed cookies** (`cookie-session`) — serverless-safe and
  persistent across restarts/instances. Set a strong `SESSION_SECRET`, and `NODE_ENV=production`
  behind HTTPS to enable secure cookies.

© 2026 The Candy Connection.
