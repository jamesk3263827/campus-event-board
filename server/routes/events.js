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
const { organizerRemovedAttendee } = require('../templates/organizerRemovedAttendee');


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


// DELETE /api/events/:eventId/rsvp/:userId  (auth required, creator only)
// Allows the event creator to forcibly remove any attendee or waitlisted user.
// Delegates to cancelRsvp() so Java handles waitlist promotion automatically.
router.delete('/:eventId/rsvp/:userId', verifyToken, async (req, res) => {
  const { eventId, userId: targetUserId } = req.params;
  const requesterId = req.user.uid;

  try {
    const admin = require('firebase-admin');

    // Gate: only the event creator may use this route
    const eventSnap = await admin.firestore().collection('events').doc(eventId).get();
    if (!eventSnap.exists) return res.status(404).json({ error: 'Event not found' });
    if (eventSnap.data().createdBy !== requesterId) {
      return res.status(403).json({ error: 'Only the event creator can remove attendees' });
    }

    // Capture the user's current status BEFORE cancelling (for the email type)
    const rsvpSnap = await admin.firestore()
      .collection('events').doc(eventId)
      .collection('rsvps').doc(targetUserId).get();
    const statusBefore = rsvpSnap.exists ? rsvpSnap.data().status : null;

    // Delegate to Java — handles Firestore update + waitlist promotion
    const result = await cancelRsvp(targetUserId, eventId);
    res.json(result);

    // Email the removed person (fire-and-forget)
    const [targetUserDoc, eventDocFresh] = await Promise.all([
      admin.firestore().collection('users').doc(targetUserId).get(),
      admin.firestore().collection('events').doc(eventId).get(),
    ]);

    if (targetUserDoc.exists && eventDocFresh.exists) {
      const { email, name } = targetUserDoc.data();
      const event = { id: eventId, ...eventDocFresh.data() };
      const displayName = name || email;
      const type = statusBefore === 'waitlisted' ? 'Waitlist' : 'RSVP';
      const html = organizerRemovedAttendee(event, displayName, type);
      sendEmail(
        email,
        `You've been removed from: ${event.title}`,
        html
      );
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
// Sends a message to the event organizer without exposing their email to the sender.
router.post('/:id/contact-organizer', verifyToken, async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const admin = require('firebase-admin');
    const firestoreDb = admin.firestore();

    // 1. Load the event to get the organizer's UID
    const eventSnap = await firestoreDb.collection('events').doc(req.params.id).get();
    if (!eventSnap.exists) return res.status(404).json({ error: 'Event not found.' });
    const event = eventSnap.data();

    // 2. Block the organizer from messaging themselves
    if (event.createdBy === req.user.uid) {
      return res.status(403).json({ error: 'You cannot contact yourself as the organizer.' });
    }

    // 3. Look up organizer's email server-side — never sent to the browser
    const organizerSnap = await firestoreDb.collection('users').doc(event.createdBy).get();
    if (!organizerSnap.exists) return res.status(404).json({ error: 'Organizer not found.' });
    const organizerEmail = organizerSnap.data().email;

    // 4. Sender info from their verified auth token
    const senderName  = req.user.name  || req.user.email;
    const senderEmail = req.user.email;

    // 5. Build email HTML
    const html = `
      <p>Hi ${escapeHtml(event.creatorName || 'Organizer')},</p>
      <p><strong>${escapeHtml(senderName)}</strong> sent you a message about your event
         <strong>${escapeHtml(event.title)}</strong>:</p>
      <blockquote style="border-left:4px solid #ccc;padding-left:12px;color:#444;margin:16px 0;">
        ${escapeHtml(message.trim()).replace(/\n/g, '<br>')}
      </blockquote>
      <p>You can reply directly to this email to respond to them.</p>
    `;

    // 6. Send — replyTo set so the organizer's reply goes straight back to the sender
    await sendEmail(
      organizerEmail,
      `Someone has a question about your event: ${event.title}`,
      html,
      { replyTo: senderEmail }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('contact-organizer error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
