# Aryan Sikarwar Portfolio — Backend

Production-grade REST API powering the portfolio site. Node + Express +
MongoDB. JWT auth in httpOnly cookies. Zod validation. Nodemailer for email,
Cloudinary for images. Rate limiting, security headers, structured logs,
graceful shutdown — the boring-but-important production basics.

## Stack

- **Runtime:** Node ≥ 20 (ESM)
- **Framework:** Express
- **DB:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh) in httpOnly cookies, bcrypt password hash
- **Validation:** Zod (single source of truth for request shapes)
- **Email:** Nodemailer over SMTP (Gmail App Password works)
- **Images:** Cloudinary (optional — gracefully disabled if not configured)
- **Security:** Helmet, CORS allow-list, mongo-sanitize, hpp, rate limiting,
  honeypots on public forms
- **Logging:** Winston (JSON in production, pretty in dev) + Morgan for HTTP
- **Ops:** Trust-proxy, graceful shutdown on SIGTERM, fail-fast env validation

## Quick start

```bash
# 1) Install
npm install

# 2) Configure
cp .env.example .env
# fill in MONGODB_URI, the two JWT_*_SECRET values (32+ chars each),
# SMTP_* if you want email to actually send, and Cloudinary keys if you
# want image uploads to work.

# 3) Seed (one-time)
npm run seed:admin       # creates the first admin user from SEED_ADMIN_* env
npm run seed:content     # imports the bundled snapshot of projects/blog/hobbies/certs

# Or both at once:
npm run seed:all

# 4) Run
npm run dev              # node --watch (hot restart on save)
# or
npm start                # plain `node src/server.js`
```

Server boots on `http://localhost:5000` by default. `GET /health` returns
status. `GET /` returns a small index.

### Generating JWT secrets

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run twice — once each for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
Both must be at least 32 characters; the server refuses to boot otherwise.

## API reference

All routes are mounted under `/api`. The response envelope is consistent:

```jsonc
// success
{ "success": true, "data": ..., "meta": { "page": 1, "limit": 20, "total": 0, "pages": 1 } }

// error
{ "success": false, "error": { "message": "...", "code": "...", "details": [...] } }
```

### Auth (`/api/auth`)

| Method | Path                | Auth      | Body / Notes                        |
| ------ | ------------------- | --------- | ----------------------------------- |
| POST   | `/login`            | -         | `{ email, password }` → sets cookies |
| POST   | `/refresh`          | cookie    | Rotates both tokens                  |
| POST   | `/logout`           | -         | Clears cookies                       |
| POST   | `/logout-all`       | required  | Invalidates every outstanding token  |
| GET    | `/me`               | required  | Current user                         |
| POST   | `/change-password`  | required  | `{ currentPassword, newPassword }`  |

### Content (public read, admin write)

Same shape for `/api/projects`, `/api/blog`, `/api/hobbies`, `/api/certificates`:

| Method | Path             | Auth | Notes                                                        |
| ------ | ---------------- | ---- | ------------------------------------------------------------ |
| GET    | `/`              | -    | List published. Query: `page, limit, sort, q, category, tag, featured` |
| GET    | `/:slug`         | -    | Single (blog increments view counter; certificates have no slug) |
| GET    | `/admin/all`     | ✓    | Admin list (includes unpublished)                            |
| GET    | `/admin/:id`     | ✓    | (blog only) full draft incl. content                         |
| POST   | `/`              | ✓    | Create                                                       |
| PATCH  | `/:id`           | ✓    | Update                                                       |
| DELETE | `/:id`           | admin | Delete                                                      |

Blog also has `POST /api/blog/:slug/like` (public, rate limited).

### Contact (`/api/contact`)

| Method | Path             | Auth | Notes                                                        |
| ------ | ---------------- | ---- | ------------------------------------------------------------ |
| POST   | `/`              | -    | `{ name, email, subject?, message }`. Saves + emails admin + auto-reply |
| GET    | `/admin/all`     | ✓    | List submissions. Filter by `?status=new|read|replied|...`   |
| PATCH  | `/admin/:id`     | ✓    | Update status / admin notes                                  |
| DELETE | `/admin/:id`     | admin | Delete                                                      |

### Comments (`/api/comments`)

| Method | Path                       | Auth | Notes                                  |
| ------ | -------------------------- | ---- | -------------------------------------- |
| GET    | `/posts/:slug`             | -    | Approved comments for a post           |
| POST   | `/posts/:slug`             | -    | Submit comment (goes into `pending`)   |
| GET    | `/admin/all`               | ✓    | Moderation queue. `?status=pending|approved|spam|deleted` |
| PATCH  | `/admin/:id`               | ✓    | `{ status }`                          |
| DELETE | `/admin/:id`               | admin | Delete                               |

### Newsletter (`/api/newsletter`)

| Method | Path             | Auth | Notes                              |
| ------ | ---------------- | ---- | ---------------------------------- |
| POST   | `/subscribe`     | -    | Sends confirmation email           |
| GET    | `/confirm`       | -    | `?token=...` — completes opt-in    |
| GET    | `/unsubscribe`   | -    | `?token=...`                       |
| GET    | `/admin/all`     | ✓    | List subscribers                   |
| DELETE | `/admin/:id`     | admin | Delete                            |

### Analytics (`/api/analytics`)

| Method | Path        | Auth | Notes                                       |
| ------ | ----------- | ---- | ------------------------------------------- |
| POST   | `/track`    | -    | `{ path, referrer? }` — fire from frontend  |
| GET    | `/stats`    | ✓    | Aggregates: last 30d, by day, top paths     |

Visitors are identified by a sha256 of `ip + ua + day` — different hash each
day so we can compute "unique today" without retaining cross-day identity.
Documents auto-expire after 180 days via a TTL index.

### Search (`/api/search`)

| Method | Path | Notes                                                  |
| ------ | ---- | ------------------------------------------------------ |
| GET    | `/`  | `?q=...&limit=10` — full-text across all content types |

### Uploads (`/api/uploads`)

All admin-only. Returns `503` if Cloudinary isn't configured.

| Method | Path     | Notes                              |
| ------ | -------- | ---------------------------------- |
| POST   | `/`      | multipart `file` — single image    |
| POST   | `/many`  | multipart `files[]` — up to 8      |
| DELETE | `/`      | `{ publicId }` — remove from Cloudinary |

### Admin (`/api/admin`)

| Method | Path           | Auth | Notes                          |
| ------ | -------------- | ---- | ------------------------------ |
| GET    | `/dashboard`   | ✓    | Counts + recent activity card  |

## Security model

- **Cookies, not localStorage.** Access + refresh tokens are issued as
  `httpOnly`, `Secure` (in prod), `SameSite=None` (prod) / `Lax` (dev)
  cookies. JavaScript on the page can't read them — XSS can't steal the
  session. The refresh cookie is scoped to `/api/auth` so it never gets
  sent on any other request.
- **Token rotation.** Every `/refresh` issues a new pair. A leaked old
  refresh token is useless after one use by the rightful owner.
- **Token revocation.** Each user has a `tokenVersion` counter. Logout-all
  and password change bump it; every existing JWT becomes invalid.
- **CORS allow-list.** Only `FRONTEND_URL` (and same-origin) can hit the
  API with credentials. Anything else is rejected at the middleware.
- **Rate limits.** Three buckets:
  - global: 600 req / 15 min / IP — last-resort runaway protection
  - auth: 10 req / 15 min — slows credential stuffing
  - writes: 20 req / hour — contact / comments / newsletter
- **Honeypots.** Contact + comments accept a hidden field (`website` /
  `company`); humans never fill it, bots do — silent reject with 202.
- **NoSQL injection / param pollution.** `express-mongo-sanitize` strips
  `$` and `.` from req payloads; `hpp` collapses duplicate params.
- **Email enumeration.** Login does a bcrypt compare even for unknown
  emails so timing matches the "wrong password" branch.

## Deployment

### Render (recommended for hobbyists)

1. Push the `backend/` folder to its own GitHub repo (or use a monorepo).
2. New Web Service on Render → connect repo → root dir = `backend`.
3. Build command: `npm install`, start command: `npm start`.
4. Add all env vars from `.env.example`. Set `NODE_ENV=production`.
5. Set `FRONTEND_URL` to the deployed frontend URL (e.g. `https://aryan.vercel.app`).
6. After first deploy, run `npm run seed:admin` via Render's shell.

### Railway / Fly / Heroku

Same idea — they all pick up `npm start`. Make sure `trust proxy` stays
on (it's set in `app.js`) so rate limiting sees the real client IP.

### Vercel

Not recommended for the API itself — Vercel's serverless functions cold-
start every request, which kills the JWT-cookie flow and Mongo connection
pooling. Use Render/Railway for the API, Vercel for the Next.js frontend.

## Project layout

```
backend/
├── src/
│   ├── config/         env validation, db connection, cloudinary
│   ├── controllers/    request → response, one file per domain
│   ├── middleware/     auth, validate, rate limit, upload, error handler
│   ├── models/         Mongoose schemas
│   ├── routes/         Express routers, one per domain
│   ├── services/       email (Nodemailer), token (JWT)
│   ├── utils/          ApiError, asyncHandler, logger, slugify
│   ├── validators/     all zod schemas in one place
│   ├── seeds/          seedAdmin, seedContent + bundled JSON snapshots
│   ├── app.js          Express app wiring
│   └── server.js       entrypoint: connect DB, start HTTP, shutdown hooks
├── .env.example
└── package.json
```

## Notes for future you

- The seed scripts are idempotent — re-running `seed:content` updates
  existing docs by slug. Pass `--reset` to wipe collections first.
- Switching from Gmail SMTP to SendGrid / Postmark / Resend is just env
  changes (`SMTP_*`) — no code edit needed.
- If traffic ever justifies it, swap `/api/search` for Atlas Search.
  The interface is already `?q=...` so the frontend won't notice.
- The `tokenVersion` field is intentionally low-tech. If you ever need
  per-session revocation, store an array of session ids on the user.
