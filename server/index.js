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

// ── Account deletion purge job ─────────────────────────────────────────────

const cron = require('node-cron');

// Runs every day at 2:00 AM — purges accounts pending deletion for 30+ days
async function runPurgeJob() {
  console.log('[PURGE] Running account deletion purge job...');
  const db = admin.firestore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  // Require email helpers at job scope — safe since index.js is already loaded
  const { sendEmail }              = require('./services/emailService');
  const { eventCancelledAttendee } = require('./templates/eventCancelledAttendee');
  const db2                        = require('./services/firestoreService');

  try {
    const snap = await db.collection('users')
      .where('status', '==', 'pending_deletion')
      .where('deletionRequestedAt', '<=', cutoff)
      .get();

    for (const userDoc of snap.docs) {
      const userId = userDoc.id;
      console.log(`[PURGE] Purging user: ${userId}`);

      const eventsSnap = await db.collection('events')
        .where('createdBy', '==', userId)
        .get();

      for (const eventDoc of eventsSnap.docs) {
        const event = { id: eventDoc.id, ...eventDoc.data() };

        // Fetch all attendees (going + waitlisted) BEFORE deleting anything
        const attendees = await db2.getEventAttendees(eventDoc.id);

        const rsvpsSnap = await eventDoc.ref.collection('rsvps').get();
        for (const r of rsvpsSnap.docs) await r.ref.delete();

        const commentsSnap = await eventDoc.ref.collection('comments').get();
        for (const c of commentsSnap.docs) await c.ref.delete();

        await eventDoc.ref.delete();

        // E-07: notify all attendees the event has been cancelled
        for (const attendee of attendees) {
          const html = eventCancelledAttendee(event, attendee.name);
          sendEmail(
            attendee.email,
            `Event cancelled: ${event.title}`,
            html
          );
        }
        console.log(`[PURGE] Sent cancellation emails for event: ${event.title} (${attendees.length} attendee(s))`);
      }

      // 2. Remove the user's RSVPs from other people's events
      //    For "going" RSVPs, call the Java cancel endpoint so waitlist promotion fires.
      //    For "waitlisted" RSVPs, delete directly (no promotion needed).
      const { cancelRsvp } = require('./services/javaService');
      const allEventsSnap = await db.collection('events').get();
      for (const eventDoc of allEventsSnap.docs) {
        const rsvpRef = eventDoc.ref.collection('rsvps').doc(userId);
        const rsvpSnap = await rsvpRef.get();
        if (!rsvpSnap.exists) continue;

        if (rsvpSnap.data().status === 'going') {
          // Let Java handle the cancellation and promote the next waitlisted user
          try {
            await cancelRsvp(userId, eventDoc.id);
          } catch (err) {
            console.warn(`[PURGE] Could not cancel going RSVP for event ${eventDoc.id}:`, err.message);
          }
        } else {
          // Waitlisted — delete doc and decrement waitlistCount
          await rsvpRef.delete();
          await eventDoc.ref.update({
            waitlistCount: admin.firestore.FieldValue.increment(-1)
          });
        }
      }

      // 3. Delete comments left by this user on other people's events
      const allEventsForComments = await db.collection('events').get();
      for (const eventDoc of allEventsForComments.docs) {
        const commentsSnap = await eventDoc.ref.collection('comments')
          .where('authorId', '==', userId)
          .get();
        for (const commentDoc of commentsSnap.docs) {
          await commentDoc.ref.delete();
        }
      }

      // 4. Delete Firestore user document
      await db.collection('users').doc(userId).delete();

      // 5. Delete Firebase Auth account
      await admin.auth().deleteUser(userId);

      console.log(`[PURGE] Purged user ${userId} successfully.`);
    }
    console.log(`[PURGE] Job complete. Processed ${snap.size} account(s).`);
  } catch (err) {
    console.error('[PURGE] Purge job failed:', err);
  }
}

cron.schedule('0 2 * * *', runPurgeJob);

// ── Event reminder job ────────────────────────────────────────────────────────
const { sendEmail }          = require('./services/emailService');
const { eventReminder7Day }  = require('./templates/eventReminder7Day');
const { eventReminder1Day }  = require('./templates/eventReminder1Day');

// Returns a YYYY-MM-DD string for a date N days from today (local time)
function getDateString(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

async function runReminderJob() {
  console.log('[REMINDER] Running event reminder job...');
  const db = admin.firestore();
  const date7  = getDateString(7);
  const date1  = getDateString(1);

  // Fetch events happening in 7 days and 1 day in one round trip each
  const [snap7, snap1] = await Promise.all([
    db.collection('events').where('date', '==', date7).get(),
    db.collection('events').where('date', '==', date1).get(),
  ]);

  async function sendRemindersForSnapshot(snapshot, templateFn, label) {
    for (const eventDoc of snapshot.docs) {
      const event = { id: eventDoc.id, ...eventDoc.data() };

      // Get all 'going' RSVPs for this event
      const rsvpsSnap = await eventDoc.ref
        .collection('rsvps')
        .where('status', '==', 'going')
        .get();

      if (rsvpsSnap.empty) continue;

      // Fetch all attendee user docs in parallel
      const userDocs = await Promise.all(
        rsvpsSnap.docs.map(r => db.collection('users').doc(r.id).get())
      );

      for (const userDoc of userDocs) {
        if (!userDoc.exists) continue;
        const { email, name } = userDoc.data();
        if (!email) continue;
        const html = templateFn(event, name || email);
        sendEmail(
          email,
          label === '7day'
            ? `Reminder: ${event.title} is one week away!`
            : `Reminder: ${event.title} is tomorrow!`,
          html
        );
      }
      console.log(`[REMINDER] ${label} reminders sent for: ${event.title}`);
    }
  }

  await sendRemindersForSnapshot(snap7, eventReminder7Day, '7day');
  await sendRemindersForSnapshot(snap1, eventReminder1Day, '1day');
  console.log('[REMINDER] Job complete.');
}

// Runs every day at 9:00 AM
cron.schedule('0 9 * * *', runReminderJob);

// ── Temporary test route — REMOVE BEFORE GOING TO PRODUCTION ─────────────────
app.post('/dev/run-purge', async (_req, res) => {
  try {
    await runPurgeJob();
    res.json({ message: 'Purge job completed. Check server console for details.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dev reminder test — REMOVE BEFORE PRODUCTION ─────────────────────────────
app.post('/dev/run-reminders', async (_req, res) => {
  try {
    await runReminderJob();
    res.json({ message: 'Reminder job completed. Check server console for details.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Internal: Waitlist promotion notification (called by Java only) ──────────
// Protected by INTERNAL_SECRET header. Never expose this to the browser.
app.post('/internal/notify/promotion', async (req, res) => {
  // Verify the shared secret
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { userId, eventId } = req.body;
  if (!userId || !eventId) {
    return res.status(400).json({ error: 'userId and eventId are required' });
  }

  res.json({ message: 'Notification queued.' });

  // Look up user and event, then send promotion email (fire-and-forget)
  try {
    const { sendEmail } = require('./services/emailService');
    const { waitlistPromoted } = require('./templates/waitlistPromoted');

    const [userDoc, eventDoc] = await Promise.all([
      admin.firestore().collection('users').doc(userId).get(),
      admin.firestore().collection('events').doc(eventId).get(),
    ]);

    if (userDoc.exists && eventDoc.exists) {
      const { email, name } = userDoc.data();
      const event = { id: eventId, ...eventDoc.data() };
      const html = waitlistPromoted(event, name || email);
      sendEmail(
        email,
        `Great news — you're now confirmed for: ${event.title}!`,
        html
      );
    }
  } catch (err) {
    console.error('[PROMOTION NOTIFY] Failed:', err.message);
  }
});

// ── Internal: Waitlist position update (called by Java only) ─────────────────
app.post('/internal/notify/waitlist-position', async (req, res) => {
  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // positions: array of { userId, oldPosition, newPosition }
  const { eventId, positions } = req.body;
  if (!eventId || !Array.isArray(positions)) {
    return res.status(400).json({ error: 'eventId and positions array required' });
  }

  res.json({ message: 'Notifications queued.' });

  // Send an email per user whose position improved (fire-and-forget)
  try {
    const { sendEmail } = require('./services/emailService');
    const { waitlistPositionUpdate } = require('./templates/waitlistPositionUpdate');

    const eventDoc = await admin.firestore()
      .collection('events').doc(eventId).get();
    if (!eventDoc.exists) return;
    const event = { id: eventId, ...eventDoc.data() };

    for (const pos of positions) {
      // Only notify if position actually improved
      if (pos.newPosition >= pos.oldPosition) continue;

      const userDoc = await admin.firestore()
        .collection('users').doc(pos.userId).get();
      if (!userDoc.exists) continue;

      const { email, name } = userDoc.data();
      if (!email) continue;

      const html = waitlistPositionUpdate(
        event, name || email, pos.oldPosition, pos.newPosition
      );
      sendEmail(
        email,
        `Your waitlist position updated: ${event.title} — Now #${pos.newPosition}`,
        html
      );
    }
  } catch (err) {
    console.error('[WAITLIST POSITION NOTIFY] Failed:', err.message);
  }
});

// ── Dev email test — REMOVE BEFORE PRODUCTION ────────────────────────────
app.post('/dev/test-email', async (req, res) => {
  const { sendEmail } = require('./services/emailService');
  const { eventCreationConfirmation } = require('./templates/eventCreationConfirmation');

  const fakeEvent = {
    id:          'test-event-123',
    title:       'Test Event — Spring Mixer',
    date:        'April 15, 2026',
    time:        '6:00 PM – 9:00 PM',
    location:    'Student Union, Room 201',
    description: 'A test event to verify that email delivery is working.',
    capacity:    50,
    category:    'Social',
  };

  const recipientEmail = req.body.email || process.env.EMAIL_USER;
  const html = eventCreationConfirmation(fakeEvent, 'Test User');

  await sendEmail(recipientEmail, 'Test: Your event has been created: Spring Mixer', html);
  res.json({ message: `Test email sent to ${recipientEmail}. Check your inbox and server console.` });
});

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