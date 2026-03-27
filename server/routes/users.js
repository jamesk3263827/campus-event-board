// server/routes/users.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const admin = require('firebase-admin');

// POST /api/users/request-deletion  (auth required)
router.post('/request-deletion', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    await admin.firestore().collection('users').doc(userId).update({
      status: 'pending_deletion',
      deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: 'Account deletion scheduled for 30 days from now.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/cancel-deletion  (auth required)
router.post('/cancel-deletion', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    await admin.firestore().collection('users').doc(userId).update({
      status: 'active',
      deletionRequestedAt: admin.firestore.FieldValue.delete(),
    });
    res.json({ message: 'Account deletion cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;