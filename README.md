# FaceCode

FaceCode is a face-based identity card app built with Expo + TypeScript and a Node.js backend.  
Users enroll their face and connect public links. Scanner mode matches a face and shows the person’s public profile card.

## Features
- Splash animation, onboarding, auth, face enrollment, profile setup
- Scanner with animated face frame and match result sheet
- Public/private profile controls
- Deep link route: `facetag://profile/[username]`
- Supabase Auth + PostgreSQL + Storage
- Express REST API with rate limiting and cosine similarity matching

## Frontend setup (Expo)
1. Create `.env` in project root from `.env.example`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_BASE_URL`
3. Install deps: `npm install`
4. Run: `npx expo start`
5. Open in Expo Go.

## Backend setup (Node + Express)
1. `cd backend`
2. Copy `.env.example` -> `.env`
3. Set:
   - `PORT`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
4. Install deps: `npm install`
5. Place face-api model files in `backend/models`.
6. Run: `npm run dev`
7. Health check: `http://localhost:4000/health`

## Supabase setup (free tier)
1. Create a Supabase project.
2. Run `backend/supabase.sql` in SQL Editor.
3. Create public bucket named `avatars`.
4. Copy API keys and URL into app/backend env files.

## Render deployment (free tier)
1. Push repository to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select repository and deploy using `backend/render.yaml`.
4. Set environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
5. Copy Render API URL and set `EXPO_PUBLIC_API_BASE_URL`.

## Production mobile build (EAS free tier)
1. `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure`
4. `eas build -p android --profile production`

## Privacy
- Raw face images are not stored on the backend.
- Only 128-d embeddings are persisted for matching.
- Profiles can be private, and users can remove enrollment.
