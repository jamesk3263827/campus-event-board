// server/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const admin   = require('firebase-admin');
const usersRouter = require('./routes/users');

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
app.use('/api/users', usersRouter);

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

// ── Account deletion purge job ─────────────────────────────────────────────

const cron = require('node-cron');

// Runs every day at 2:00 AM — purges accounts pending deletion for 30+ days
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Running account deletion purge job...');
  const db = admin.firestore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  try {
    const snap = await db.collection('users')
      .where('status', '==', 'pending_deletion')
      .where('deletionRequestedAt', '<=', cutoff)
      .get();

    for (const userDoc of snap.docs) {
      const userId = userDoc.id;
      console.log(`[CRON] Purging user: ${userId}`);

      // 1. Delete all events created by this user
      //    (subcollections like rsvps and comments must be deleted too)
      const eventsSnap = await db.collection('events')
        .where('createdBy', '==', userId)
        .get();

      for (const eventDoc of eventsSnap.docs) {
        // Delete rsvps subcollection
        const rsvpsSnap = await eventDoc.ref.collection('rsvps').get();
        for (const r of rsvpsSnap.docs) await r.ref.delete();

        // Delete comments subcollection
        const commentsSnap = await eventDoc.ref.collection('comments').get();
        for (const c of commentsSnap.docs) await c.ref.delete();

        // Delete the event itself
        await eventDoc.ref.delete();
      }

      // 2. Remove the user's RSVPs from other people's events
      const allEventsSnap = await db.collection('events').get();
      for (const eventDoc of allEventsSnap.docs) {
        const rsvpRef = eventDoc.ref.collection('rsvps').doc(userId);
        const rsvpSnap = await rsvpRef.get();
        if (rsvpSnap.exists) await rsvpRef.delete();
      }

      // 3. Delete Firestore user document
      await db.collection('users').doc(userId).delete();

      // 4. Delete Firebase Auth account
      await admin.auth().deleteUser(userId);

      console.log(`[CRON] Purged user ${userId} successfully.`);
    }
  } catch (err) {
    console.error('[CRON] Purge job failed:', err);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅  Node server running on http://localhost:${PORT}`);
  console.log(`    Health check: http://localhost:${PORT}/health`);
});