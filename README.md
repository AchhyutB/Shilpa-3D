# Shilpa3D — Auth backend (Passport + Sequelize + PostgreSQL)

Drop the contents of this folder into your existing `server/` folder (merge, don't overwrite
anything you already have there — mainly `app.js`, which you should merge with `app.example.js`).

## 1. Install dependencies
```bash
cd server
npm install express cors cookie-parser dotenv
npm install passport passport-local passport-google-oauth20
npm install sequelize pg pg-hstore
npm install bcrypt jsonwebtoken
npm install -D sequelize-cli
```

## 2. Environment
Copy `.env.example` to `.env` and fill in:
- Postgres creds for a database you've created (`createdb shilpa3d` or via pgAdmin)
- `JWT_SECRET` — any long random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from your `shilpa-3d` project in Google Cloud
  Console (APIs & Services → Credentials). See `frontend-changes/CHANGES.md` step 4 for the
  redirect URI you need to register there.

## 3. Run the migration
```bash
npx sequelize-cli db:migrate
```
This creates the `Users` table with: `id` (uuid), `username`, `email`, `password` (nullable —
null for Google users), `provider` (`local` | `google`), `providerId`, `createdAt`, `updatedAt`.

## 4. Wire up app.js
Merge `app.example.js` into your real `server/app.js` (or `server/index.js`) — it just needs
`cors({ credentials: true })`, `cookieParser()`, `passport.initialize()`, and the `/api/auth`
route mounted.

## 5. Frontend
See `frontend-changes/CHANGES.md` — it walks through the exact edits to your pasted
`LoginPage.jsx` and `SignUpPage.jsx`, plus the new `authService.js`.

## Endpoints you get
| Method | Path                     | Purpose                              |
|--------|--------------------------|---------------------------------------|
| POST   | /api/auth/signup         | local signup                          |
| POST   | /api/auth/login          | local login                           |
| GET    | /api/auth/google         | starts Google OAuth redirect          |
| GET    | /api/auth/google/callback| Google redirects back here            |
| POST   | /api/auth/logout         | clears the auth cookie                |
| GET    | /api/auth/me             | returns current user (needs cookie)   |

Auth state is a JWT in an **httpOnly cookie** — nothing to store in localStorage. Any frontend
request that should include it needs `credentials: 'include'` (already handled in
`authService.js`).
