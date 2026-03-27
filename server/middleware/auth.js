const admin = require('firebase-admin');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // uid, email, etc. now available downstream
    const userRef = admin.firestore().collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data().status === 'pending_deletion') {
      await userRef.update({
        status: 'active',
        deletionRequestedAt: admin.firestore.FieldValue.delete(),
      });
      console.log(`[AUTH] Deletion cancelled for returning user: ${decoded.uid}`);
  }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = verifyToken;