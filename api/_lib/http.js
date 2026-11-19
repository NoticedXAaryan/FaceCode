export function allowMethod(req, res, method) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  if (req.method !== method) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

export function sendError(res, err) {
  const status = err.status || 500;
  const message = err.message || 'Request failed';
  if (status >= 500) console.error(message);
  res.status(status).json({ error: message });
}
