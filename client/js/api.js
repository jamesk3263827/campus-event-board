// client/js/api.js
// Central API wrapper — handles auth tokens, errors, timeouts, and offline state.

const BASE_URL = 'http://localhost:3000/api';

// ── Request timeout (ms) ─────────────────────────────────────────────────────
const TIMEOUT_MS = 12000;

// ── Get a fresh Firebase ID token ────────────────────────────────────────────
async function getAuthToken() {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  try {
    // forceRefresh=false — Firebase caches and auto-refreshes internally
    return await user.getIdToken(false);
  } catch (err) {
    // Token refresh failed (e.g. user deleted, network down)
    if (err.code === 'auth/user-token-expired' || err.code === 'auth/user-not-found') {
      await firebase.auth().signOut();
      window.location.href = getLoginPath();
    }
    return null;
  }
}

// ── Derive the correct relative path to login.html ───────────────────────────
function getLoginPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  return depth > 1 ? '../login.html' : 'login.html';
}

// ── Friendly error messages for known HTTP status codes ──────────────────────
function friendlyError(status, serverMessage) {
  const map = {
    400: serverMessage || 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You don\'t have permission to do that.',
    404: 'That resource wasn\'t found.',
    409: serverMessage || 'A conflict occurred (e.g. already RSVPed).',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again in a moment.',
    502: 'A backend service is unavailable. Check that all services are running.',
    503: 'Service temporarily unavailable. Try again shortly.',
  };
  return map[status] || serverMessage || `Request failed (${status}).`;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  // Offline guard
  if (!navigator.onLine) {
    throw new Error('You appear to be offline. Please check your connection.');
  }

  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    // TypeError from fetch usually means network failure or CORS preflight blocked
    throw new Error(
      'Could not reach the server. Make sure the Node server is running on port 3000.'
    );
  }

  clearTimeout(timeoutId);

  // 204 No Content (DELETE success)
  if (res.status === 204) return null;

  // 401 — redirect to login (expired/missing token)
  if (res.status === 401) {
    // Give the caller a chance to show a message before redirect
    const err = new Error(friendlyError(401));
    err.status = 401;
    // Delay redirect so any UI can update first
    setTimeout(() => { window.location.href = getLoginPath(); }, 1500);
    throw err;
  }

  // Parse body
  let body;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    const message = friendlyError(res.status, body?.error || body?.message);
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return body;
}

// ── Public API surface ────────────────────────────────────────────────────────
const api = {
  // Events
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/events${qs ? '?' + qs : ''}`);
  },
  getEvent:    (id)       => apiFetch(`/events/${id}`),
  createEvent: (data)     => apiFetch('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id)       => apiFetch(`/events/${id}`, { method: 'DELETE' }),

  // RSVP — Java service decides "going" vs "waitlisted" based on capacity
  rsvpEvent:   (eventId) => apiFetch(`/events/${eventId}/rsvp`, { method: 'POST' }),

  // Cancel — Java service promotes next waitlisted user automatically
  cancelRsvp:  (eventId) => apiFetch(`/events/${eventId}/rsvp`, { method: 'DELETE' }),

  // Comments
  getComments:   (eventId)            => apiFetch(`/events/${eventId}/comments`),
  addComment:    (eventId, text)      => apiFetch(`/events/${eventId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
  deleteComment: (eventId, commentId) => apiFetch(`/events/${eventId}/comments/${commentId}`, {
    method: 'DELETE',
  }),

  // Profile
  getProfile: () => apiFetch('/events/user/profile'),

  // Attendees — creator only
  getAttendees: (eventId) => apiFetch(`/events/${eventId}/attendees`),

  // Contact Organizer — sends a message to the organizer without exposing their email
  contactOrganizer: (eventId, message) => apiFetch(`/events/${eventId}/contact-organizer`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // Account deletion — marks user as pending deletion; actual deletion happens after 30 days
  deleteAccount: () => apiFetch('/users/request-deletion', { method: 'POST' }),
  cancelDeletion: () => apiFetch('/users/cancel-deletion',  { method: 'POST' }),
};

// ── Global offline / online detection ────────────────────────────────────────
window.addEventListener('offline', () => {
  document.body.classList.add('is-offline');
});
window.addEventListener('online', () => {
  document.body.classList.remove('is-offline');
});
