// server/routes/users.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const admin = require('firebase-admin');
const { sendEmail }    = require('../services/emailService');
const { welcomeEmail } = require('../templates/welcomeEmail');
const { accountDeletion } = require('../templates/accountDeletion');


// POST /api/users/register — called by frontend after Firebase account creation
// Stores the user in Firestore and sends the welcome email.
router.post('/register', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.uid;
  try {
    await admin.firestore().collection('users').doc(userId).set({
      userId,
      name:      name || '',
      email:     email || req.user.email || '',
      role:      'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ message: 'User registered.' });

    // E-02: welcome email (fire-and-forget)
    const displayName = name || email.split('@')[0];
    const html = welcomeEmail(displayName, email);
    sendEmail(email, 'Welcome to Campus Event Board!', html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/request-deletion  (auth required)
router.post('/request-deletion', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const deletionRequestedAt = new Date();
    await admin.firestore().collection('users').doc(userId).update({
      status: 'pending_deletion',
      deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: 'Account deletion scheduled for 30 days from now.' });

    // E-03: send deletion confirmation email (fire-and-forget)
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists) {
      const { email, name } = userDoc.data();
      const deletionDate = new Date(deletionRequestedAt);
      deletionDate.setDate(deletionDate.getDate() + 30);
      const formatted = deletionDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const html = accountDeletion(name || email, email, formatted);
      sendEmail(email, 'Your Campus Event Board account is scheduled for deletion', html);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/reinstate  (auth required)
// Called by the frontend immediately after a successful login.
// If the account is pending deletion, cancels it right away — before the
// user navigates anywhere — so the 30-day purge job never catches them.
// Fire-and-forget from the client; a failure here must never block login.
router.post('/reinstate', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data().status === 'pending_deletion') {
      await userRef.update({
        status: 'active',
        deletionRequestedAt: admin.firestore.FieldValue.delete(),
      });
      console.log(`[REINSTATE] Deletion cancelled on login for user: ${userId}`);
      return res.json({ reinstated: true });
    }
    res.json({ reinstated: false });
  } catch (err) {
    // Log but never surface this error to the client — login must succeed
    console.error(`[REINSTATE] Failed for user ${userId}:`, err.message);
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