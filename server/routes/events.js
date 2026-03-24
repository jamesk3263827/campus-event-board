const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const db = require('../services/firestoreService');
const { rsvpToEvent, cancelRsvp } = require('../services/javaService'); // ADD THIS

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/:id  (auth required, must be creator)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updated = await db.updateEvent(req.params.id, req.body, req.user.uid);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Not your event' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id  (auth required, must be creator)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await db.deleteEvent(req.params.id, req.user.uid);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Not your event' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/rsvp  (auth required) -- ADD FROM HERE
router.post('/:eventId/rsvp', verifyToken, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.uid; // comes from verifyToken middleware
  try {
    const result = await rsvpToEvent(userId, eventId);
    res.json(result);
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
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    const comment = await db.addComment(req.params.eventId, req.user.uid, text.trim());
    res.status(201).json(comment);
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

module.exports = router;

