const admin = require('firebase-admin');
const COLLECTION = 'events';

function getDb() {
  return admin.firestore();  // ✅ only called when a route actually runs
}

// GET all events — with optional category + search filtering
async function getAllEvents({ category, search } = {}) {
  let query = getDb().collection(COLLECTION).orderBy('createdAt', 'desc');

  // Firestore can filter by one equality field efficiently
  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.get();
  let events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Client-side search filter (fine at campus scale)
  if (search) {
    const term = search.toLowerCase();
    events = events.filter(e =>
      e.title?.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term) ||
      e.location?.toLowerCase().includes(term)
    );
  }

  return events;
}

// GET single event
async function getEventById(id) {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// POST new event
async function createEvent(data, userId) {
  const payload = {
    ...data,
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const ref = await getDb().collection(COLLECTION).add(payload);
  return { id: ref.id, ...payload };
}

// PUT update event
async function updateEvent(id, data, userId) {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();

  if (!doc.exists) return null;
  if (doc.data().createdBy !== userId) throw new Error('FORBIDDEN');

  const payload = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await ref.update(payload);
  return { id, ...payload };
}

// DELETE event
async function deleteEvent(id, userId) {
  const ref = getDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();

  if (!doc.exists) return false;
  if (doc.data().createdBy !== userId) throw new Error('FORBIDDEN');

  await ref.delete();
  return true;
}

// GET comments for an event, ordered by timestamp ascending
async function getComments(eventId) {
  const snapshot = await getDb()
    .collection(COLLECTION).doc(eventId)
    .collection('comments')
    .orderBy('createdAt', 'asc')
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// POST a new comment
async function addComment(eventId, userId, text) {
  const payload = {
    text,
    authorId: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  const ref = await getDb()
    .collection(COLLECTION).doc(eventId)
    .collection('comments')
    .add(payload);
  return { id: ref.id, ...payload };
}

// DELETE a comment (only by its author)
async function deleteComment(eventId, commentId, userId) {
  const ref = getDb()
    .collection(COLLECTION).doc(eventId)
    .collection('comments').doc(commentId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  if (doc.data().authorId !== userId) throw new Error('FORBIDDEN');
  await ref.delete();
  return true;
}

async function getUserProfile(userId) {
  const db = getDb();

  // Events this user created
  const createdSnap = await db.collection(COLLECTION)
    .where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  const created = createdSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Since rsvp docs use uid as the document ID, we can fetch directly
  // from each event's rsvps subcollection — no collectionGroup needed
  const allEventsSnap = await db.collection(COLLECTION).get();
  const going = [];
  const waitlisted = [];

  const checks = allEventsSnap.docs.map(async (eventDoc) => {
    const rsvpRef = eventDoc.ref.collection('rsvps').doc(userId);
    const rsvpSnap = await rsvpRef.get();
    if (!rsvpSnap.exists) return;
    const status = rsvpSnap.data().status;
    const event = { id: eventDoc.id, ...eventDoc.data() };
    if (status === 'going') going.push(event);
    else if (status === 'waitlisted') waitlisted.push(event);
  });

  await Promise.all(checks);

  return { created, going, waitlisted };
}

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent, getComments, addComment, deleteComment, getUserProfile };