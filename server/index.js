// server/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const admin   = require('firebase-admin');

// ── Firebase Admin init ───────────────────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = require('../firebase-admin-key.json');
} catch (e) {
  console.error('ERROR: Could not load firebase-admin-key.json');
  console.error('Make sure firebase-admin-key.json exists in the project root.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const eventsRouter = require('./routes/events');
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow common local dev origins. Extend this list as needed.
const allowedOrigins = [
  'http://127.0.0.1:5500',   // Live Server default
  'http://localhost:5500',
  'http://127.0.0.1:5501',   // Live Server (second instance)
  'http://localhost:5501',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:8080',   // Java service (if it ever serves a page)
  'http://localhost:8080',
  'null',                    // file:// origins open as "null"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
// Checks both Node and Java service status. Run: curl http://localhost:3000/health
app.get('/health', async (_req, res) => {
  const { checkJavaHealth } = require('./services/javaService');
  const java = await checkJavaHealth();
  res.json({
    status:    'ok',
    service:   'node',
    timestamp: new Date().toISOString(),
    dependencies: {
      java: java.reachable ? { status: java.status } : { status: 'UNREACHABLE' },
    },
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/events', eventsRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // CORS errors come here
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  Node server running on http://localhost:${PORT}`);
  console.log(`    Health check: http://localhost:${PORT}/health`);
});
