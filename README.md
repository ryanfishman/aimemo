# AI-Invoice

Full‑stack app to upload voice memos, auto‑transcribe with OpenAI Whisper, extract invoice lines with GPT‑5, and edit/send invoices.  
Backend: Node.js, Express.js, TypeScript, MySQL 8, Flyway.  
Frontend: React 18, TypeScript, Redux Toolkit, Vite. Storage via DigitalOcean Spaces (S3‑compatible).

### Prerequisites
- Node.js 20+ (recommended) and npm
- MySQL 8
- Flyway CLI
- DigitalOcean Spaces bucket + optional CDN endpoint
- OpenAI API key

### Repo structure
- `backend/` API server, workers, Flyway migrations
- `frontend/` React app (Vite)

## 1) MySQL + Flyway

Create the database (adjust names/creds as desired):

```sql
CREATE DATABASE ai_invoice CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

Run Flyway migrations against `backend/flyway/`:

Option A: one‑off command
```bash
flyway -url="jdbc:mysql://localhost:3306/ai_invoice" \
  -user="root" -password="<your_password>" \
  -locations="filesystem:backend/flyway" migrate
```

Option B: flyway.conf (optional)
```
flyway.url=jdbc:mysql://localhost:3306/ai_invoice
flyway.user=root
flyway.password=YOUR_PASSWORD
flyway.locations=filesystem:backend/flyway
```
Then:
```bash
flyway migrate
```

## 2) Backend setup
From `backend/`:
```bash
npm i
```

Create `backend/.env` with:
```
# Server
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=changeme
DB_NAME=ai_invoice

# JWT
JWT_SECRET=change_me_access_secret

# DigitalOcean Spaces (S3)
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_REGION=nyc3
SPACES_BUCKET=your-bucket
SPACES_ACCESS_KEY=your-access-key
SPACES_SECRET_KEY=your-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Cookies
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=

# Optional: public CDN base to render the audio in the browser
PUBLIC_CDN_BASE=https://your-bucket.nyc3.cdn.digitaloceanspaces.com
```

Notes:
- Keep the Spaces bucket private; uploads use presigned PUT. To stream audio in the app, set `PUBLIC_CDN_BASE` to a public CDN domain (Spaces CDN). If not set, `audio_url` may be null until you provide an accessible URL.
- Access token lives in memory only; refresh token is an httpOnly cookie named `aii_rt` (7‑day sliding when “Remember me”).

Start API and the worker (separate terminals):
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd backend
npm run worker
```

### Create user accounts
You’ll insert rows in `users` yourself. Passwords must be bcrypt hashes.

Generate a bcrypt hash (from `backend/` after `npm i`):
```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'your_password_here'
```

Insert the user:
```sql
INSERT INTO users (email, password_hash) VALUES ('you@example.com', '<PASTE_HASH>');
```

## 3) Frontend setup
From `frontend/`:
```bash
npm i
npm run dev
```
Vite runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:4000`.

## 4) End‑to‑end flow
1. Log in (remember me keeps you signed in up to 7 days with activity).  
2. Click “+” in the left nav, name the invoice, choose an audio file.  
3. File uploads directly to Spaces with key `aiinvoice-{GUID}.{ext}`.  
4. A job is enqueued; the worker downloads the object, calls Whisper for STT, asks GPT‑5 to extract invoice items, and saves them.  
5. Open the invoice: listen to audio, edit rows (Date, Description, Quantity, Amount). Footer shows Subtotal, TPS 5%, TVQ 9.975%, and Total.  
6. Save to persist changes.

## Troubleshooting
- Worker not processing? Verify `OPENAI_API_KEY`, Spaces creds, and that the object exists in the bucket.  
- Audio not playable? Ensure `PUBLIC_CDN_BASE` points to a public CDN domain or serve a signed GET via a backend endpoint (future enhancement).  
- CORS/cookies: run frontend via Vite dev server; backend enables credentials. In production, configure exact origins and cookie domain.  
- Node <20 may lack `File`/`Blob` globals used by the Whisper client; use Node 20+. 