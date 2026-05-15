import { neon } from '@neondatabase/serverless';

// Create a SQL tagged template function using Neon's HTTP driver.
// This uses HTTP fetch under the hood — no TCP connections, no pools,
// no "waiting for connections" — perfect for serverless.
const sql = neon(process.env.DATABASE_URL);

export default sql;
