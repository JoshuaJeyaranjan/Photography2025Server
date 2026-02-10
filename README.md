# Photography2025 Server (Developer README)

This repository contains the backend API for Joshua Jey Photography. It's an Express + Knex (MySQL) service with Stripe and Nodemailer integrations, designed to serve gallery data, handle orders/prints, contact forms, authentication, and admin operations.

## Table of contents

- Quick start
- Requirements
- Environment variables
- Install & run
- Database (migrations & seeds)
- API surface (routes & middleware)
- Images and public assets
- Docker / deploy notes
- Troubleshooting
- Next steps & recommended improvements

---

## Quick start

1. Copy environment variables into a `.env` file (example below).
2. Install dependencies: `npm install`.
3. Run database migrations and seeds (see "Database" section).
4. Start the server: `npm start`.

By default the server listens on `PORT` (defaults to 3001). The main entry is `index.js`.

## Requirements

- Node.js (see `package.json` engines — this project targets Node >=16)
- MySQL-compatible database (local MySQL, Dockerized MySQL, PlanetScale, etc.)
- Optional: Docker & docker-compose for containerized runs

## Environment variables

Create a `.env` at the project root with the values below (examples):

```
PORT=3001
NODE_ENV=development

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=photography_db

# Stripe
STRIPE_SECRET_KEY=sk_test_...

# Email (nodemailer)
EMAIL_USER=you@example.com
EMAIL_PASS=your-email-password
EMAIL_SERVICE=Gmail

# JWT secret used by authentication middleware
JWT_SECRET=your_jwt_secret
```

Notes:
- If you don't set `EMAIL_USER`/`EMAIL_PASS`, the app will print a warning and email sending will be disabled (see `index.js`).
- `STRIPE_SECRET_KEY` is required for any Stripe-related endpoints.

## Install & run

Install dependencies:

```
npm install
```

Start the server (production / normal):

```
npm start
```

Index file: `index.js`. It attaches the following objects to incoming requests for convenience:

- `req.db` — the Knex instance (configured in `db.js`).
- `req.transporter` — Nodemailer transporter (may be undefined if email not configured).
- `req.stripe` — Stripe client instance.
- `req.imagesDirectory` — absolute path to `public/images` used for storing/serving images.

If you prefer development auto-reload, adding a `dev` script with `nodemon` is recommended (not included by default).

## Database (knex + MySQL)

This project uses Knex with the `mysql2` client. The Knex configuration is in `knexfile.js` and runtime DB code is in `db.js`.

Run migrations:

```
npx knex migrate:latest --knexfile knexfile.js --env development
```

Run seeds:

```
npx knex seed:run --knexfile knexfile.js --env development
```

Notes about deployment providers (e.g., PlanetScale):
- The code enables SSL with `rejectUnauthorized: true` in both `knexfile.js` and `db.js`. Some providers require different TLS options or connect via a secure tunnel — consult your provider docs and adjust `knexfile.js`/`db.js` if needed.

Migrations and seed files live in:

- `migrations/` — schema creation and updates
- `seeds/` — seed data (e.g., `seed_images.js`)

## API surface (routes & middleware)

Primary route modules are in `routes/`:

- `galleryRoutes.js` — gallery listing / image metadata
- `contactRoutes.js` — contact form endpoint (uses nodemailer)
- `stripeRoutes.js` — Stripe payment endpoints
- `adminRoutes.js` — admin-only endpoints (protected)
- `printRoutes.js` — print products and pricing
- `authRoutes.js` — authentication (login/register/token endpoints)
- `cartRoutes.js` — cart operations
- `orderRoutes.js` — order creation and retrieval

Middleware in `middleware/`:

- `authenticateJWT.js` — protects routes with a JWT (expects `JWT_SECRET` in env)
- `checkAdmin.js` — checks an authenticated user has admin privileges

Global middleware and security features in `index.js`:

- `cors` — CORS is restricted to `allowedOrigins` configured in `index.js` (update when adding new frontends).
- `helmet` — basic HTTP header hardening.
- JSON body parsing with `express.json()`.

Routes are mounted under `/api/*`:

- `/api/gallery`, `/api/contact`, `/api/stripe`, `/api/admin`, `/api/print`, `/api/auth`, `/api/cart`, `/api/orders`

Check each route file for specific endpoints and expected request/response shapes.

## Images & public assets

Images are stored in `public/images`. `index.js` creates this directory if missing and exposes the path via `req.imagesDirectory` for use by upload handlers.

If you want to serve images as static files from the server, you can enable the static middleware in `index.js` (a commented line exists that shows how to do this).

Uploads use `multer` (see route handlers that accept file uploads).

## Docker & deploy notes

- A `docker-compose.yml` and `dockerfile` are present — you can run the app in containers with:

```
docker-compose up --build
```

- For Heroku or similar platforms, make sure all required environment variables are set and the database is reachable from the platform. The repository contains a `Procfile`.

## Troubleshooting & common issues

- "Nodemailer not configured" warning: means `EMAIL_USER`/`EMAIL_PASS` are not set; contact form/email features will be disabled.
- CORS errors: ensure the client origin is present in `allowedOrigins` in `index.js` or send requests from allowed origins.
- Database SSL / connection errors: check `DB_HOST`, `DB_PORT`, credentials, and provider-specific SSL/tunnel requirements.
- Stripe errors: ensure `STRIPE_SECRET_KEY` is set and the correct Stripe API version is being used.

When the global error handler runs it will print a stack trace to the server console. In development set `NODE_ENV=development` for more detailed error output.

## Next steps & recommended improvements

- Add a `dev` script using `nodemon` for faster local development (e.g. `nodemon --watch './**/*' index.js`).
- Add automated tests (unit and API integration) and a CI workflow.
- Add a simple health-check endpoint and readiness/liveness probes for container orchestration.
- Consider centralizing configuration (e.g., `config/` or `env-schema`) and stricter validation of env vars.

## Contact / Maintainer

Maintainer: Joshua Jeyaranjan

If you need help setting up the project locally or want to contribute, open an issue or create a PR with your changes.

---