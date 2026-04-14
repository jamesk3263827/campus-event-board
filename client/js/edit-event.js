// client/js/edit-event.js
// Requires: auth.js and js/api.js loaded before this file

// ─── Get event ID from URL ─────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const eventId = params.get('id');

const loadingState    = document.getElementById('loading-state');
const errorState      = document.getElementById('error-state');
const errorMessageEl  = document.getElementById('error-message');
const formContainer   = document.getElementById('form-container');

// ─── Update back/cancel links to point to this event's detail page ────────────
if (eventId) {
  const backLink   = document.getElementById('nav-back');
  const cancelLink = document.getElementById('cancel-link');
  const detailHref = `event-detail.html?id=${eventId}`;
  if (backLink)   backLink.href   = detailHref;
  if (cancelLink) cancelLink.href = detailHref;
}

// ─── Init: wait for auth then load event ──────────────────────────────────────
if (!eventId) {
  showError('No event ID provided.');
} else {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      // requireAuth() will redirect, but guard here as well
      return;
    }
    await loadAndPopulate(user);
  });
}

// ─── Load event from API, verify ownership, populate form ─────────────────────
async function loadAndPopulate(user) {
  try {
    const event = await api.getEvent(eventId);

    if (!event) {
      return showError('Event not found.');
    }

    // Only the creator may edit
    if (event.createdBy !== user.uid) {
      return showError('You do not have permission to edit this event.');
    }

    populateForm(event);

    // Show form
    loadingState.style.display = 'none';
    formContainer.style.display = 'block';

  } catch (err) {
    showError(err.message || 'Failed to load event. Please try again.');
  }
}

// ─── Populate form fields with existing event data ───────────────────────────
function populateForm(event) {
  document.getElementById('title').value       = event.title       || '';
  document.getElementById('description').value = event.description || '';
  document.getElementById('category').value    = event.category    || '';
  document.getElementById('location').value    = event.location    || '';
  document.getElementById('capacity').value    = event.capacity    || '';
  document.getElementById('time').value        = event.time        || '';

  // Populate date input — stored as YYYY-MM-DD string, which is exactly what
  // <input type="date"> expects. Avoid new Date() to prevent UTC rollback.
  if (event.date) {
    if (typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      // Already a clean YYYY-MM-DD string — use directly
      document.getElementById('date').value = event.date;
    } else if (event.date?.toDate) {
      // Firestore Timestamp — extract local date parts to avoid UTC shift
      const d = event.date.toDate();
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
    } else if (event.date?._seconds) {
      // Plain REST object: { _seconds, _nanoseconds }
      const d = new Date(event.date._seconds * 1000);
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
    }
  }
}

// ─── Form submit ──────────────────────────────────────────────────────────────
document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  const errorEl   = document.getElementById('error-msg');

  // Reset error
  errorEl.style.display = 'none';
  errorEl.textContent   = '';

  // ── Client-side validation ────────────────────────────────────────────────
  const title       = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category    = document.getElementById('category').value;
  const date        = document.getElementById('date').value;
  const time        = document.getElementById('time').value;
  const location    = document.getElementById('location').value.trim();
  const capacityVal = parseInt(document.getElementById('capacity').value, 10);

  if (!title)                               return showFormError('Please enter an event title.');
  if (!description)                         return showFormError('Please add a description.');
  if (!category)                            return showFormError('Please select a category.');
  if (!date)                                return showFormError('Please select a date.');
  if (!time)                                return showFormError('Please select a time.');
  if (!location)                            return showFormError('Please enter a location.');
  if (isNaN(capacityVal) || capacityVal < 1) return showFormError('Capacity must be at least 1.');
  if (capacityVal > 10000)                  return showFormError('Capacity cannot exceed 10,000.');

  // ── Submit ────────────────────────────────────────────────────────────────
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  const data = { title, description, category, date, time, location, capacity: capacityVal };

  try {
    await api.updateEvent(eventId, data);
    window.location.href = `event-detail.html?id=${eventId}`;
  } catch (err) {
    showFormError(err.message || 'Failed to save changes. Please try again.');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Changes';
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showError(msg) {
  loadingState.style.display  = 'none';
  formContainer.style.display = 'none';
  errorState.style.display    = 'block';
  errorMessageEl.textContent  = msg;
}

function showFormError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent   = msg;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
