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

module.exports = { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent };