const BASE_URL = 'http://localhost:3000/api';

async function getAuthToken() {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  return user.getIdToken(); // Firebase refreshes automatically
}

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  if (res.status === 204) return null; // DELETE success
  return res.json();
}

// Named exports your pages will actually call
const api = {
  getEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/events${qs ? '?' + qs : ''}`);
  },
  getEvent:    (id)       => apiFetch(`/events/${id}`),
  createEvent: (data)     => apiFetch('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id)       => apiFetch(`/events/${id}`, { method: 'DELETE' }),

  // RSVP — Java decides "going" vs "waitlisted" based on capacity
  rsvpEvent: (eventId) =>
    apiFetch(`/events/${eventId}/rsvp`, { method: 'POST' }),

  // Cancel — Java promotes next waitlisted user automatically
  cancelRsvp: (eventId) =>
    apiFetch(`/events/${eventId}/rsvp`, { method: 'DELETE' })
};
