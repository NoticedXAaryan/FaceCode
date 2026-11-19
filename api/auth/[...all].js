import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../_lib/betterAuth.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

let handler;

export default function authCatchAll(req, res) {
  if (!handler) handler = toNodeHandler(getAuth());
  return handler(req, res);
}
