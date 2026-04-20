// client/js/create-event.js

// Set the minimum date to today so users can't accidentally create past events
const dateInput = document.getElementById('date');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

document.getElementById('create-form').addEventListener('submit', async (e) => {
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

  if (!title) {
    return showError('Please enter an event title.');
  }
  if (!description) {
    return showError('Please add a description.');
  }
  if (!category) {
    return showError('Please select a category.');
  }
  if (!date) {
    return showError('Please select a date.');
  }
  if (!time) {
    return showError('Please select a time.');
  }
  if (!location) {
    return showError('Please enter a location.');
  }
  if (isNaN(capacityVal) || capacityVal < 1) {
    return showError('Capacity must be at least 1.');
  }
  if (capacityVal > 10000) {
    return showError('Capacity cannot exceed 10,000.');
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Creating…';

  const data = { title, description, category, date, time, location, capacity: capacityVal };

  try {
    const event = await api.createEvent(data);
    // Redirect to the new event's detail page
    window.location.href = `event-detail.html?id=${event.id}`;
  } catch (err) {
    showError(err.message || 'Failed to create event. Please try again.');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Create Event';
  }
});

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent   = msg;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
