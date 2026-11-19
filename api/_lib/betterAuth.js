import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import { Pool } from 'pg';

let pool;
let authInstance;

function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not set');
    error.status = 503;
    throw error;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.DATABASE_URL.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
      max: 5,
    });
  }
  return pool;
}

function baseURL() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  );
}

async function sendMail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info('[auth email skipped]', { to, subject, text: text || html });
    return;
  }
  const from = process.env.AUTH_EMAIL_FROM || 'FaceTag <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${body}`);
  }
}

export function getAuth() {
  if (authInstance) return authInstance;

  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  const socialProviders =
    googleId && googleSecret
      ? {
          google: {
            clientId: googleId,
            clientSecret: googleSecret,
          },
        }
      : undefined;

  authInstance = betterAuth({
    appName: 'FaceTag',
    baseURL: baseURL(),
    secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
    database: getPool(),
    trustedOrigins: [
      'facetag://',
      'facetag://*',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:19006',
      ...(process.env.NODE_ENV !== 'production'
        ? ['exp://', 'exp://**', 'exp://192.168.*.*:*/**']
        : []),
      ...(process.env.EXPO_PUBLIC_API_URL ? [process.env.EXPO_PUBLIC_API_URL] : []),
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: 'Reset your FaceTag password',
          text: `Reset your FaceTag password: ${url}`,
          html: `<p>Reset your FaceTag password:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: 'Verify your FaceTag email',
          text: `Verify your FaceTag email: ${url}`,
          html: `<p>Verify your FaceTag email:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    socialProviders,
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [expo()],
  });

  return authInstance;
}
