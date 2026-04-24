// server/routes/users.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const admin = require('firebase-admin');
const { sendEmail }       = require('../services/emailService');
const { welcomeEmail }    = require('../templates/welcomeEmail');
const { accountDeletion } = require('../templates/accountDeletion');


// POST /api/users/register — called by frontend after Firebase account creation.
// Stores the user in Firestore. Does NOT send the welcome email here.
// The welcome email fires after the user verifies their email (see /send-welcome).
router.post('/register', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.uid;
  try {
    await admin.firestore().collection('users').doc(userId).set({
      userId,
      name:              name || '',
      email:             email || req.user.email || '',
      role:              'user',
      createdAt:         admin.firestore.FieldValue.serverTimestamp(),
      welcomeEmailSent:  false,   // flag — set to true after email is verified
    }, { merge: true });

    res.json({ message: 'User registered.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/users/send-welcome  (auth required)
// Called by the client after the user's email is verified.
// Sends the welcome email exactly once (idempotent — checks the flag first).
// The client should call this fire-and-forget on every login when
// user.emailVerified === true; the flag prevents duplicate sends.
router.post('/send-welcome', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { email, name, welcomeEmailSent } = userDoc.data();

    // Already sent — do nothing
    if (welcomeEmailSent === true) {
      return res.json({ sent: false, reason: 'already_sent' });
    }

    // Mark sent BEFORE sending to prevent duplicate sends if the request is retried
    await userRef.update({ welcomeEmailSent: true });

    // E-02: welcome email
    const displayName = name || (email ? email.split('@')[0] : 'there');
    const html = welcomeEmail(displayName, email);
    sendEmail(email, 'Welcome to Campus Event Board!', html);

    console.log(`[WELCOME] Sent welcome email to ${email} (uid: ${userId})`);
    res.json({ sent: true });
  } catch (err) {
    console.error('[WELCOME] Error:', err.message);
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
// If the account is pending deletion, cancels it right away.
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
