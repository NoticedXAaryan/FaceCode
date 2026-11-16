import { neon } from '@neondatabase/serverless';

let client;

export default function sql(strings, ...values) {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not set');
    error.status = 503;
    throw error;
  }
  if (!client) client = neon(process.env.DATABASE_URL);
  return client(strings, ...values);
}
