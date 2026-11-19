# FaceTag

FaceTag turns your face into a personal link card. You enroll once, choose what people can open, and anyone with the app can scan you the way they would scan a QR code.

It is an Expo Router app with Better Auth for sign-in and a Neon Postgres API deployed as Vercel functions.

## What you can do

- Create an account with email or Google, including email verification and password reset
- Enroll your face from the camera. The server stores a signature, not the photo
- Set a public name, username, bio, photo, and the links you want to share
- Scan someone else and open their card in a result sheet
- Keep the profile private, remove the face signature, export your data, or delete the account
- Open a shared profile with `facetag://profile/[username]`

## Matching

With no extra keys, the API builds a lighting-tolerant face signature on the server. It is enough to tell enrolled faces apart in normal selfies. It is not ArcFace, so glasses, profile views, and poor light can miss.

For a stronger model, set `FACE_EMBEDDING_URL` to an endpoint that accepts `{ "imageBase64": "..." }` and returns `{ "embedding": [ ... ] }`. If `HUGGINGFACE_API_KEY` is set, the API uses that model instead (the current deployment uses CLIP). Embeddings from different engines are not compared with each other. After changing engines, people should re-enroll from Settings.

## Setup

1. Copy `.env.example` to `.env`.
2. Create a [Neon](https://neon.tech) database and run `api/_lib/schema.sql` in the SQL editor (includes Better Auth tables). Put the connection string in `DATABASE_URL`.
3. Set `BETTER_AUTH_SECRET` (32+ random bytes). Optionally set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and `RESEND_API_KEY` for Google sign-in and password-reset email.
4. Deploy to Vercel (`npm run deploy`). The project serves the API functions and the exported web app from `dist/`. Set `EXPO_PUBLIC_API_URL` (and optionally `BETTER_AUTH_URL`) to that origin.
5. Install and start:

```bash
npm install
npm run dev
```

Open the project in Expo Go, an emulator, or the web build (`npm run web`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Expo |
| `npm test` | Face-signature and profile unit tests |
| `npm run test:robot` | Robot Framework acceptance suites (logic, build, live API, mock API, web) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run export:web` | Static web bundle in `dist/` |
| `npm run build:apk` | EAS preview build, internal Android APK |
| `npm run build:aab` | EAS production Android App Bundle |
| `npm run build:ios` | EAS production iOS build |
| `npm run submit:android` | Submit the production Android build |
| `npx expo-doctor` | Expo SDK dependency check |
| `npm run deploy` | Production Vercel deploy |

## Acceptance tests

[Robot Framework](https://github.com/robotframework/robotframework#usage) suites live in `robot/suites`. Install Python deps once (`pip install -r robot/requirements.txt`), export the web app if you want the Selenium suite (`npm run export:web`), then run `npm run test:robot`. Reports are written to `results/`.

## Store builds

The iOS bundle id and Android package are `com.facetag.app`. Confirm that id before the first store submission. `owner` and `extra.eas.projectId` are intentionally unset until you run `npx eas init` on this repo.

`npm run build:apk` uses the `preview` profile (internal APK). `npm run build:aab` and `npm run build:ios` use `production` (Android App Bundle, remote version auto-increment).

## Screens

Splash, onboarding, sign in, sign up, face enrollment, profile setup, scanner, your profile, settings, a public profile, and in-app privacy and terms.

Auth lives at `/api/auth/*` on the same Vercel deployment. The Expo client talks to it through Better Auth’s Expo plugin and stores the session cookie in SecureStore (or localStorage on web).

## Privacy

Raw frames are not stored. The database keeps the signature, the profile you typed, and scan/view/click events. Private profiles are not returned from a scan. Settings can delete the signature or the whole account.
