// client/js/event-detail.js
// Requires: auth.js and js/api.js loaded before this file

// ─── RSVP state constants ─────────────────────────────────────────────────────
const RSVP_STATES = {
  LOADING:    'LOADING',
  LOGIN:      'LOGIN',
  GOING:      'GOING',
  WAITLISTED: 'WAITLISTED',
  JOIN:       'JOIN',
  FULL:       'FULL',
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const loadingState    = document.getElementById('loading-state');
const errorState      = document.getElementById('error-state');
const errorMessage    = document.getElementById('error-message');
const eventContent    = document.getElementById('event-content');

const eventCategory   = document.getElementById('event-category');
const eventTitle      = document.getElementById('event-title');
const eventDate       = document.getElementById('event-date');
const eventLocation   = document.getElementById('event-location');
const eventHost       = document.getElementById('event-host');
const eventDesc       = document.getElementById('event-description');

const goingCountEl    = document.getElementById('going-count');
const capacityEl      = document.getElementById('capacity');
const capacityFill    = document.getElementById('capacity-fill');
const waitlistLabel   = document.getElementById('waitlist-count-label');
const waitlistCountEl = document.getElementById('waitlist-count');

const rsvpBtn         = document.getElementById('rsvp-btn');
const rsvpMessage     = document.getElementById('rsvp-message');

const cancelModal     = document.getElementById('cancel-modal');
const cancelModalBody = document.getElementById('cancel-modal-body');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const dismissCancelBtn = document.getElementById('dismiss-cancel-btn');

const deleteModal       = document.getElementById('delete-modal');
const confirmDeleteBtn  = document.getElementById('confirm-delete-btn');
const dismissDeleteBtn  = document.getElementById('dismiss-delete-btn');
const deleteEventBtn    = document.getElementById('delete-event-btn');
const editEventBtn      = document.getElementById('edit-event-btn');
const adminActions      = document.getElementById('event-admin-actions');

// ─── State ───────────────────────────────────────────────────────────────────
let eventId             = null;
let currentUser         = null;
let userRsvpDoc         = null;
let eventDoc            = null;
let eventUnsubscribe    = null;
let userRsvpUnsubscribe = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
eventId = params.get('id');

if (!eventId) {
  showError('No event ID provided.');
} else {
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    startListeners();
  });
}

// ─── Firestore listeners ──────────────────────────────────────────────────────
function startListeners() {
  const db = firebase.firestore();
  let commentsLoaded = false;

  eventUnsubscribe = db.collection('events').doc(eventId)
    .onSnapshot((snap) => {
      if (!snap.exists) {
        showError('This event no longer exists.');
        return;
      }
      eventDoc = { id: snap.id, ...snap.data() };
      renderEventContent(eventDoc);
      renderButton();
      renderAdminActions(eventDoc);

      // Load comments only once, guaranteed after eventDoc is set
      if (!commentsLoaded) {
        commentsLoaded = true;
        loadComments();
      }
    }, (err) => {
      showError('Failed to load event. Please refresh and try again.');
      console.error('Event listener error:', err);
    });

  if (currentUser) {
    userRsvpUnsubscribe = db
      .collection('events').doc(eventId)
      .collection('rsvps').doc(currentUser.uid)
      .onSnapshot((snap) => {
        userRsvpDoc = snap.exists ? snap.data() : null;
        renderButton();
      }, (err) => {
        console.error('RSVP listener error:', err);
      });
  }
}

window.addEventListener('beforeunload', () => {
  if (eventUnsubscribe)    eventUnsubscribe();
  if (userRsvpUnsubscribe) userRsvpUnsubscribe();
});

// ─── Render event content ─────────────────────────────────────────────────────
function renderEventContent(event) {
  loadingState.style.display = 'none';
  eventContent.style.display = 'block';

  eventTitle.textContent    = event.title       || 'Untitled Event';
  eventCategory.textContent = event.category    || '';
  eventLocation.textContent = event.location    || 'TBD';
  eventHost.textContent     = event.creatorName || 'Unknown';
  eventDesc.textContent     = event.description || '';

  // Banner image
  const bannerEl = document.getElementById('event-banner');
  if (bannerEl) {
    if (event.bannerUrl) {
      bannerEl.src = event.bannerUrl;
      bannerEl.style.display = 'block';
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // Format date + time
  if (event.date) {
    const d = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    let dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (event.time) dateStr += ` at ${formatTime(event.time)}`;
    eventDate.textContent = dateStr;
  } else {
    eventDate.textContent = 'Date TBD';
  }

  // Capacity bar
  const going    = event.goingCount    || 0;
  const capacity = event.capacity      || 0;
  const waitlist = event.waitlistCount || 0;

  goingCountEl.textContent = going;
  capacityEl.textContent   = capacity;

  const pct = capacity > 0 ? Math.min((going / capacity) * 100, 100) : 0;
  capacityFill.style.width = `${pct}%`;
  capacityFill.setAttribute('aria-valuenow', Math.round(pct));
  capacityFill.className = 'capacity-fill' +
    (pct >= 100 ? ' full' : pct >= 80 ? ' almost-full' : '');

  // Spots remaining
  const spotsEl = document.getElementById('spots-remaining');
  if (capacity > 0) {
    const spots = Math.max(capacity - going, 0);
    spotsEl.textContent = spots > 0
      ? `${spots} spot${spots !== 1 ? 's' : ''} remaining`
      : 'Event is full';
    spotsEl.className = 'spots-remaining' +
      (spots === 0 ? ' spots-full' : spots <= 5 ? ' spots-low' : '');
  } else {
    spotsEl.textContent = '';
  }

  // Waitlist
  if (waitlist > 0) {
    waitlistLabel.style.display  = 'block';
    waitlistCountEl.textContent  = waitlist;
  } else {
    waitlistLabel.style.display  = 'none';
  }

  renderCalendarLinks(event);
}

// ─── Admin actions (edit + delete) — shown only to event creator ─────────────
function renderAdminActions(event) {
  if (!currentUser || !adminActions) return;
  if (event.createdBy === currentUser.uid) {
    adminActions.style.display = 'flex';
    if (editEventBtn) {
      editEventBtn.href = `edit-event.html?id=${event.id}`;
    }
  }
}

// Delete event flow
if (deleteEventBtn) {
  deleteEventBtn.onclick = () => { deleteModal.style.display = 'flex'; };
}
if (dismissDeleteBtn) {
  dismissDeleteBtn.onclick = () => { deleteModal.style.display = 'none'; };
}
if (deleteModal) {
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.style.display = 'none';
  });
}
if (confirmDeleteBtn) {
  confirmDeleteBtn.onclick = async () => {
    confirmDeleteBtn.disabled    = true;
    confirmDeleteBtn.textContent = 'Deleting…';
    deleteModal.style.display    = 'none';
    try {
      await api.deleteEvent(eventId);
      window.location.href = 'events.html';
    } catch (err) {
      showError(err.message || 'Could not delete event. Please try again.');
      confirmDeleteBtn.disabled    = false;
      confirmDeleteBtn.textContent = 'Delete';
    }
  };
}

// ─── Calendar links ───────────────────────────────────────────────────────────
function renderCalendarLinks(event) {
  const section    = document.getElementById('calendar-section');
  const toggleBtn  = document.getElementById('add-to-calendar-btn');
  const dropdown   = document.getElementById('calendar-dropdown');
  const gcalLink   = document.getElementById('gcal-link');
  const icsBtn     = document.getElementById('ics-download-btn');

  if (!section || !event.date) return;
  section.style.display = 'block';

  gcalLink.href = buildGoogleCalendarUrl(event);

  icsBtn.onclick = () => {
    downloadIcs(event);
    dropdown.style.display = 'none';
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  toggleBtn.onclick = () => {
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
    toggleBtn.setAttribute('aria-expanded', String(!isOpen));
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!section.contains(e.target)) {
      dropdown.style.display = 'none';
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ─── RSVP state machine ───────────────────────────────────────────────────────
function getRsvpState() {
  if (!eventDoc)    return RSVP_STATES.LOADING;
  if (!currentUser) return RSVP_STATES.LOGIN;

  const status = userRsvpDoc?.status;
  if (status === 'going')      return RSVP_STATES.GOING;
  if (status === 'waitlisted') return RSVP_STATES.WAITLISTED;

  const going    = eventDoc.goingCount || 0;
  const capacity = eventDoc.capacity   || 0;
  return going < capacity ? RSVP_STATES.JOIN : RSVP_STATES.FULL;
}

function renderButton() {
  const state = getRsvpState();
  rsvpBtn.className       = 'btn-rsvp';
  rsvpBtn.disabled        = false;
  rsvpMessage.textContent = '';

  const badge = document.getElementById('waitlist-badge');
  if (badge) badge.style.display = 'none';

  switch (state) {
    case RSVP_STATES.LOADING:
      rsvpBtn.textContent = 'Loading…';
      rsvpBtn.disabled    = true;
      break;

    case RSVP_STATES.LOGIN:
      rsvpBtn.textContent = 'Log in to RSVP';
      rsvpBtn.classList.add('btn-rsvp--secondary');
      rsvpBtn.onclick = () => window.location.href = '../login.html';
      break;

    case RSVP_STATES.GOING:
      rsvpBtn.textContent = '✓ Going — Cancel RSVP';
      rsvpBtn.classList.add('btn-rsvp--going');
      rsvpBtn.onclick = () => openCancelModal('going');
      break;

    case RSVP_STATES.WAITLISTED: {
      const position = userRsvpDoc?.waitlistPosition || '?';
      rsvpBtn.textContent = `Waitlisted — #${position} in line`;
      rsvpBtn.classList.add('btn-rsvp--waitlisted');
      rsvpBtn.onclick = () => openCancelModal('waitlisted');
      rsvpMessage.textContent = "We'll notify you if a spot opens up.";

      if (badge) {
        badge.style.display = 'inline-flex';
        const posEl = document.getElementById('waitlist-position');
        if (posEl) posEl.textContent = position;
      }
      break;
    }

    case RSVP_STATES.JOIN:
      rsvpBtn.textContent = 'RSVP to this event';
      rsvpBtn.classList.add('btn-rsvp--join');
      rsvpBtn.onclick = handleRsvp;
      break;

    case RSVP_STATES.FULL:
      rsvpBtn.textContent = 'Join Waitlist';
      rsvpBtn.classList.add('btn-rsvp--full');
      rsvpBtn.onclick = handleRsvp;
      break;
  }
}

// ─── RSVP action ──────────────────────────────────────────────────────────────
async function handleRsvp() {
  rsvpBtn.disabled        = true;
  rsvpBtn.textContent     = 'Saving…';
  rsvpMessage.textContent = '';

  try {
    const result = await api.rsvpEvent(eventId);
    rsvpMessage.textContent = result?.message || 'Done!';
  } catch (err) {
    const message = err.message || 'Something went wrong. Try again.';
    rsvpBtn.disabled = false;
    renderButton();
    rsvpMessage.textContent = message;
  }
}

// ─── Cancel modal ─────────────────────────────────────────────────────────────
function openCancelModal(currentStatus) {
  cancelModalBody.textContent = currentStatus === 'waitlisted'
    ? 'Remove yourself from the waitlist?'
    : 'Cancel your RSVP? Your spot will be given to the next person on the waitlist.';
  cancelModal.style.display = 'flex';
}

dismissCancelBtn.onclick = () => { cancelModal.style.display = 'none'; };

cancelModal.addEventListener('click', (e) => {
  if (e.target === cancelModal) cancelModal.style.display = 'none';
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cancelModal.style.display = 'none';
    if (deleteModal) deleteModal.style.display = 'none';
  }
});

confirmCancelBtn.onclick = async () => {
  cancelModal.style.display   = 'none';
  rsvpBtn.disabled            = true;
  rsvpBtn.textContent         = 'Cancelling…';

  try {
    await api.cancelRsvp(eventId);
    // onSnapshot fires and re-renders automatically
  } catch (err) {
    const message = err.message || 'Cancel failed. Try again.';
    rsvpBtn.disabled = false;
    renderButton();
    rsvpMessage.textContent = message;
  }
};

// ─── Error display ────────────────────────────────────────────────────────────
function showError(msg) {
  loadingState.style.display  = 'none';
  eventContent.style.display  = 'none';
  errorState.style.display    = 'block';
  errorMessage.textContent    = msg;
}

// ─── Comments ─────────────────────────────────────────────────────────────────
async function loadComments() {
  const listEl = document.getElementById('comments-list');
  try {
    const comments = await api.getComments(eventId);
    renderComments(comments);
  } catch (err) {
    listEl.innerHTML = `
      <div class="error-banner" style="margin-top:0;">
        Could not load comments: ${escapeHtml(err.message)}
      </div>`;
  }
}

function renderComments(comments) {
  const listEl = document.getElementById('comments-list');

  if (!comments || comments.length === 0) {
    listEl.innerHTML = '<p class="no-comments">No comments yet — be the first!</p>';
    return;
  }

  listEl.innerHTML = comments.map(c => {
    const isOwn        = currentUser && c.authorId === currentUser.uid;
    const isEventOwner = currentUser && eventDoc && eventDoc.createdBy === currentUser.uid;
    const canDelete    = isOwn || isEventOwner;
    let ts = 'Just now';
    if (c.createdAt) {
      const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
      if (!isNaN(d)) ts = d.toLocaleString();
    }
    return `
      <div class="comment" data-id="${c.id}">
        <div class="comment-header">
          <span class="comment-author">${isOwn ? 'You' : escapeHtml(c.authorName || 'Attendee')}</span>
          <span class="comment-time">${ts}</span>
          ${canDelete
            ? `<button class="btn-delete-comment" onclick="handleDeleteComment('${c.id}')" aria-label="Delete comment">Delete</button>`
            : ''}
        </div>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>`;
  }).join('');
}

async function handleDeleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api.deleteComment(eventId, commentId);
    await loadComments();
  } catch (err) {
    alert(err.message || 'Could not delete comment.');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format "14:30" → "2:30 PM"
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Comment form — wire up after auth is known ───────────────────────────────
firebase.auth().onAuthStateChanged((user) => {
  const wrapper = document.getElementById('comment-form-wrapper');
  if (!user) {
    wrapper.innerHTML = '<p class="auth-link" style="margin-bottom:0;"><a href="../login.html">Log in</a> to leave a comment.</p>';
    return;
  }

  const form    = document.getElementById('comment-form');
  const input   = document.getElementById('comment-input');
  const errorEl = document.getElementById('comment-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const text = input.value.trim();
    if (!text) {
      errorEl.textContent = 'Comment cannot be empty.';
      return;
    }

    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Posting…';

    try {
      await api.addComment(eventId, text);
      input.value = '';
      await loadComments();
    } catch (err) {
      errorEl.textContent = err.message || 'Could not post comment. Please try again.';
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Post Comment';
    }
  });
});

// ─── Attendees panel ──────────────────────────────────────────────────────────
let attendeesData    = [];   // full list from API
let activeTab        = 'going';

const attendeesPanel   = document.getElementById('attendees-panel');
const attendeesList    = document.getElementById('attendees-list');
const attendeesLoading = document.getElementById('attendees-loading');
const attendeesError   = document.getElementById('attendees-error');
const goingTabCount    = document.getElementById('going-tab-count');
const waitlistTabCount = document.getElementById('waitlist-tab-count');
const viewAttendeesBtn = document.getElementById('view-attendees-btn');
const closeAttendeesBtn = document.getElementById('close-attendees-btn');

if (viewAttendeesBtn) {
  viewAttendeesBtn.onclick = async () => {
    attendeesPanel.style.display = 'block';
    attendeesPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    await loadAttendees();
  };
}

if (closeAttendeesBtn) {
  closeAttendeesBtn.onclick = () => {
    attendeesPanel.style.display = 'none';
  };
}

// Tab switching
document.getElementById('attendees-tabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.attendees-tab');
  if (!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll('.attendees-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderAttendeesList();
});

async function loadAttendees() {
  attendeesLoading.style.display = 'flex';
  attendeesList.style.display    = 'none';
  attendeesError.style.display   = 'none';

  try {
    attendeesData = await api.getAttendees(eventId);
    const going     = attendeesData.filter(a => a.status === 'going');
    const waitlisted = attendeesData.filter(a => a.status === 'waitlisted');
    goingTabCount.textContent    = going.length;
    waitlistTabCount.textContent = waitlisted.length;
    renderAttendeesList();
  } catch (err) {
    attendeesError.textContent   = err.message || 'Could not load attendees.';
    attendeesError.style.display = 'block';
  } finally {
    attendeesLoading.style.display = 'none';
  }
}

function renderAttendeesList() {
  const filtered = attendeesData.filter(a => a.status === activeTab);
  attendeesList.style.display = 'block';

  if (filtered.length === 0) {
    const label = activeTab === 'going' ? 'going' : 'on the waitlist';
    attendeesList.innerHTML = `<p class="attendees-empty">No one is ${label} yet.</p>`;
    return;
  }

  attendeesList.innerHTML = filtered.map((a, i) => `
    <div class="attendee-row">
      <span class="attendee-index">${activeTab === 'waitlisted' ? `#${i + 1}` : '✓'}</span>
      <span class="attendee-name">${escapeHtml(a.name || a.email)}</span>
      <span class="attendee-email">${escapeHtml(a.email)}</span>
    </div>
  `).join('');
}
