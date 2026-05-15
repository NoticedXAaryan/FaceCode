require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initModels } = require('./services/faceService');
const supabaseAdmin = require('./supabaseAdmin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081').split(',');
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', async (req, res) => {
  let supabaseStatus = 'error';
  try {
    const { data, error } = await supabaseAdmin.from('users').select('id').limit(1);
    if (!error) supabaseStatus = 'connected';
  } catch (e) {
    supabaseStatus = 'error: ' + e.message;
  }

  const { isReady } = require('./services/faceService');
  res.json({
    status: 'ok',
    supabase: supabaseStatus,
    faceService: isReady() ? 'ready' : 'not ready',
    model: 'openai/clip-vit-base-patch32',
    node: process.version,
    uptime: Math.round(process.uptime()) + 's',
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/scan', require('./routes/scan'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initModels();
    app.listen(PORT, () => {
      console.log(`FaceTag backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();