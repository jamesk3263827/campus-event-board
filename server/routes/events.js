const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const db = require('../services/firestoreService');
const { rsvpToEvent, cancelRsvp } = require('../services/javaService'); // ADD THIS
const { sendEmail }                     = require('../services/emailService');
const { eventCreationConfirmation }     = require('../templates/eventCreationConfirmation');
const { rsvpConfirmation }     = require('../templates/rsvpConfirmation');
const { waitlistConfirmation } = require('../templates/waitlistConfirmation');
const { rsvpCancellation } = require('../templates/rsvpCancellation');
const { eventEditConfirmation } = require('../templates/eventEditConfirmation');
const { eventCancelledAttendee }  = require('../templates/eventCancelledAttendee');
const { eventCancelledOrganizer } = require('../templates/eventCancelledOrganizer');
const { eventEditedAttendee } = require('../templates/eventEditedAttendee');
const { capacityReached } = require('../templates/capacityReached');
const { newCommentNotification } = require('../templates/newCommentNotification');


// Compares old event fields to new submitted data.
// Returns an array of changed fields for the E-08 email diff.
// Only checks the four fields attendees care most about.
function diffEventFields(oldEvent, newData) {
  const watched = ['title', 'date', 'time', 'location'];
  const changes = [];
  for (const field of watched) {
    const oldVal = (oldEvent[field] || '').toString().trim();
    const newVal = (newData[field]  || '').toString().trim();
    if (oldVal !== newVal && newVal !== '') {
      changes.push({
        field,
        from: oldVal || '(not set)',
        to:   newVal,
      });
    }
  }
  return changes;
}

// Minimal HTML escaping for user-supplied strings in email bodies.
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// GET /api/events?category=sports&search=trivia
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const events = await db.getAllEvents({ category, search });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/user/profile  (auth required)
// Returns events created by, going to, and waitlisted for the current user
router.get('/user/profile', verifyToken, async (req, res) => {
  try {
    const profile = await db.getUserProfile(req.user.uid);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events  (auth required)
router.post('/', verifyToken, async (req, res) => {
  try {
    const event = await db.createEvent(req.body, req.user.uid);
    res.status(201).json(event);

    // E-04: send confirmation email to the creator (fire-and-forget)
    const admin = require('firebase-admin');
    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
    if (userDoc.exists) {
      const { email, name } = userDoc.data();
      const html = eventCreationConfirmation(event, name || email);
      sendEmail(email, `Your event has been created: ${event.title}`, html);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/events/:id  (auth required, must be creator)
router.put('/:id', verifyToken, async (req, res) => {
  const eventId = req.params.id;
  try {
    const admin = require('firebase-admin');

    // Fetch the event BEFORE updating so we can diff old vs new
    const oldEventDoc = await admin.firestore()
      .collection('events').doc(eventId).get();
    const oldEvent = oldEventDoc.exists ? oldEventDoc.data() : {};

    const updated = await db.updateEvent(eventId, req.body, req.user.uid);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);

    // E-05: confirm update to organizer
    const organizerDoc = await admin.firestore()
      .collection('users').doc(req.user.uid).get();
    if (organizerDoc.exists) {
      const { email, name } = organizerDoc.data();
      const event = { id: eventId, ...updated };
      const html = eventEditConfirmation(event, name || email);
      sendEmail(email, `Your event has been updated: ${updated.title}`, html);
    }

    // E-08: notify attendees only if material fields changed
    const changes = diffEventFields(oldEvent, req.body);
    if (changes.length > 0) {
      const attendees = await db.getEventAttendees(eventId);
      const event = { id: eventId, ...updated };
      for (const attendee of attendees) {
        // Skip the organizer — they already got E-05
        if (attendee.userId === req.user.uid) continue;
        const html = eventEditedAttendee(event, attendee.name, changes);
        sendEmail(
          attendee.email,
          `Event updated: ${updated.title} — please review changes`,
          html
        );
      }
    }
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Not your event' });
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/events/:id  (auth required, must be creator)
router.delete('/:id', verifyToken, async (req, res) => {
  const eventId = req.params.id;
  try {
    const admin = require('firebase-admin');

    // Fetch event data and all attendees BEFORE deleting.
    // Once deleteEvent() runs, this data is gone.
    const [eventDoc, attendees] = await Promise.all([
      admin.firestore().collection('events').doc(eventId).get(),
      db.getEventAttendees(eventId),
    ]);

    const deleted = await db.deleteEvent(eventId, req.user.uid);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();

    // E-07 + E-06: send emails after response (fire-and-forget)
    if (eventDoc.exists) {
      const event = { id: eventId, ...eventDoc.data() };

      // E-07: notify every attendee
      for (const attendee of attendees) {
        const html = eventCancelledAttendee(event, attendee.name);
        sendEmail(
          attendee.email,
          `Event cancelled: ${event.title}`,
          html
        );
      }

      // E-06: confirm cancellation to the organizer
      const organizerDoc = await admin.firestore()
        .collection('users').doc(req.user.uid).get();
      if (organizerDoc.exists) {
        const { email, name } = organizerDoc.data();
        const html = eventCancelledOrganizer(event, name || email, attendees.length);
        sendEmail(
          email,
          `Your event has been cancelled: ${event.title}`,
          html
        );
      }
    }
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Not your event' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/rsvp  (auth required) -- ADD FROM HERE
router.post('/:eventId/rsvp', verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid;
  try {
    const result = await rsvpToEvent(userId, eventId);
    res.json(result);

    const admin = require('firebase-admin');
    const [userDoc, eventDoc] = await Promise.all([
      admin.firestore().collection('users').doc(userId).get(),
      admin.firestore().collection('events').doc(eventId).get(),
    ]);

    if (userDoc.exists && eventDoc.exists) {
      const { email, name } = userDoc.data();
      const event = { id: eventId, ...eventDoc.data() };
      const displayName = name || email;

      // E-09 / E-10: confirmation to the user who just RSVPd
      if (result.status === 'going') {
        const html = rsvpConfirmation(event, displayName);
        sendEmail(email, `You're confirmed for: ${event.title}`, html);
      } else if (result.status === 'waitlisted') {
        const pos = result.waitlistPosition || '—';
        const html = waitlistConfirmation(event, displayName, pos);
        sendEmail(email,
          `You're on the waitlist for: ${event.title} — Position #${pos}`, html);
      }

      // E-19: notify organizer the first time the event hits capacity
      if (result.status === 'going') {
        const eventData = eventDoc.data();
        const goingCount = eventData.goingCount || 0;
        const capacity   = eventData.capacity   || 0;
        const alreadyNotified = eventData.capacityReachedNotified || false;

        if (goingCount >= capacity && !alreadyNotified) {
          // Set the flag first to prevent duplicate sends in a race
          await admin.firestore()
            .collection('events').doc(eventId)
            .update({ capacityReachedNotified: true });

          // Look up the organizer and send the email
          const organizerDoc = await admin.firestore()
            .collection('users').doc(eventData.createdBy).get();
          if (organizerDoc.exists) {
            const { email: orgEmail, name: orgName } = organizerDoc.data();
            const html = capacityReached(event, orgName || orgEmail);
            sendEmail(
              orgEmail,
              `Your event is full: ${event.title}`,
              html
            );
          }
        }
      }
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// DELETE /api/events/:eventId/rsvp  (auth required)
router.delete('/:eventId/rsvp', verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid;
  try {
    const result = await cancelRsvp(userId, eventId);
    res.json(result);

    // E-11 / E-12: cancellation email based on what was cancelled (fire-and-forget)
    const admin = require('firebase-admin');
    const [userDoc, eventDoc] = await Promise.all([
      admin.firestore().collection('users').doc(userId).get(),
      admin.firestore().collection('events').doc(eventId).get(),
    ]);
    if (userDoc.exists && eventDoc.exists) {
      const { email, name } = userDoc.data();
      const event = { id: eventId, ...eventDoc.data() };
      const displayName = name || email;
      // result.message from Java contains 'was: going' or 'was: waitlisted'
      const type = result.message?.includes('waitlisted') ? 'Waitlist' : 'RSVP';
      const html = rsvpCancellation(event, displayName, type);
      const subject = type === 'Waitlist'
        ? `Waitlist cancelled: ${event.title}`
        : `RSVP cancelled: ${event.title}`;
      sendEmail(email, subject, html);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// GET /api/events/:eventId/comments
router.get('/:eventId/comments', async (req, res) => {
  try {
    const comments = await db.getComments(req.params.eventId);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/comments  (auth required)
router.post('/:eventId/comments', verifyToken, async (req, res) => {
  const { eventId } = req.params;
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const comment = await db.addComment(eventId, req.user.uid, text.trim());
    res.status(201).json(comment);

    // E-18: notify the event organizer (fire-and-forget)
    const admin = require('firebase-admin');
    const [eventDoc, commenterDoc] = await Promise.all([
      admin.firestore().collection('events').doc(eventId).get(),
      admin.firestore().collection('users').doc(req.user.uid).get(),
    ]);

    if (eventDoc.exists && commenterDoc.exists) {
      const event = { id: eventId, ...eventDoc.data() };
      const organizerId = event.createdBy;

      // Skip if the commenter is the organizer
      if (organizerId && organizerId !== req.user.uid) {
        const organizerDoc = await admin.firestore()
          .collection('users').doc(organizerId).get();
        if (organizerDoc.exists) {
          const { email: orgEmail, name: orgName } = organizerDoc.data();
          const commenterName = commenterDoc.data().name
            || commenterDoc.data().email
            || 'Someone';
          const html = newCommentNotification(
            event,
            orgName || orgEmail,
            commenterName,
            text.trim()
          );
          sendEmail(
            orgEmail,
            `New comment on your event: ${event.title}`,
            html
          );
        }
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/events/:eventId/comments/:commentId  (auth required, must be author)
router.delete('/:eventId/comments/:commentId', verifyToken, async (req, res) => {
  try {
    const deleted = await db.deleteComment(
      req.params.eventId,
      req.params.commentId,
      req.user.uid
    );
    if (!deleted) return res.status(404).json({ error: 'Comment not found' });
    res.status(204).send();
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Not your comment' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id/attendees  (auth required, creator only)
router.get('/:id/attendees', verifyToken, async (req, res) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Only the event creator can view attendees' });
    }
    const attendees = await db.getEventAttendees(req.params.id);
    res.json(attendees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/contact-organizer  (auth required)
// Sends the logged-in user's message to the event organizer.
// The organizer's email address is looked up server-side and is never sent to the browser.
router.post('/:id/contact-organizer', verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const admin = require('firebase-admin');

    // 1. Load the event to get the organizer's UID
    const eventDoc = await admin.firestore().collection('events').doc(req.params.id).get();
    if (!eventDoc.exists) return res.status(404).json({ error: 'Event not found.' });
    const event = eventDoc.data();

    // Prevent organizers from messaging themselves
    if (event.createdBy === req.user.uid) {
      return res.status(403).json({ error: 'You cannot contact yourself as the organizer.' });
    }

    // 2. Look up the organizer's email from users collection (never sent to the client)
    const organizerDoc = await admin.firestore()
      .collection('users').doc(event.createdBy).get();
    if (!organizerDoc.exists) {
      return res.status(404).json({ error: 'Organizer not found.' });
    }
    const { email: organizerEmail, name: organizerName } = organizerDoc.data();

    // 3. Look up the sender's display name
    const senderDoc = await admin.firestore()
      .collection('users').doc(req.user.uid).get();
    const senderName  = senderDoc.exists
      ? (senderDoc.data().name || senderDoc.data().email)
      : (req.user.email || 'A user');
    const senderEmail = req.user.email;

    // 4. Build and send the email via the existing Nodemailer transporter
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#2E5F8A;padding:20px 28px;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;">
            Campus Event Board — Message from an Attendee
          </p>
        </div>
        <div style="padding:28px;">
          <p>Hi ${escapeHtml(organizerName || 'Organizer')},</p>
          <p>
            <strong>${escapeHtml(senderName)}</strong> sent you a message about your event
            <strong>${escapeHtml(event.title || 'your event')}</strong>:
          </p>
          <blockquote style="border-left:4px solid #2E5F8A;margin:16px 0;padding:12px 16px;background:#f0f5fb;border-radius:0 6px 6px 0;color:#333;">
            ${safeMessage}
          </blockquote>
          <p style="color:#555;font-size:14px;">
            You can reply directly to this email to respond to them.
          </p>
        </div>
        <div style="background:#f5f5f5;padding:14px 28px;font-size:12px;color:#888;">
          Sent via Campus Event Board · The sender's identity is known to the system but their
          email address is only shared via the Reply-To header of this message.
        </div>
      </div>
    `;

    await sendEmail(
      organizerEmail,
      `Message about your event: ${event.title || 'your event'}`,
      html,
      { replyTo: senderEmail }   // organizer hits Reply → goes to the attendee
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[contact-organizer] error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
