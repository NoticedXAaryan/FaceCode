# FaceTag Backend

## Local setup
1. Copy `.env.example` to `.env`.
2. Fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
3. Run `npm install`.
4. Download `face-api.js` model files and place them in `backend/models`.
5. Run `npm run dev`.
6. Check `http://localhost:4000/health`.

## Supabase setup (free tier)
1. Create a project in Supabase.
2. Open SQL Editor and run `backend/supabase.sql`.
3. Run `backend/supabase_rls.sql` immediately after it.
4. Create a public storage bucket named `avatars` (or let SQL policy file create it).
5. In Project Settings -> API, copy:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (from `service_role`, secret)
6. Add these values to backend and mobile env files.

## Render deployment (free tier)
1. Push repository to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select your repository (Render reads `backend/render.yaml`).
4. Set environment variables in Render:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
5. Deploy and use `/health` to verify.

## Security and privacy
- `/api/scan/match` is rate-limited to 20 requests per minute per IP.
- Backend stores only face embeddings (float vectors), not raw images.
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` via `supabaseAdmin` for server-only operations; this bypasses RLS and must never be exposed to the client.
- Always use HTTPS in production.
