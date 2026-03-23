// js/event-detail.js
// Requires: auth.js and js/api.js loaded before this file

// ─── Constants ───────────────────────────────────────────────────────────────

const RSVP_STATES = {
  LOADING:     'LOADING',
  LOGIN:       'LOGIN',
  GOING:       'GOING',
  WAITLISTED:  'WAITLISTED',
  JOIN:        'JOIN',
  FULL:        'FULL'
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

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

// ─── State ───────────────────────────────────────────────────────────────────

let eventId      = null;
let currentUser  = null;
let userRsvpDoc  = null;   // live data from onSnapshot for this user's RSVP
let eventDoc     = null;   // live data from onSnapshot for the event

let eventUnsubscribe    = null;   // cleanup handle for event listener
let userRsvpUnsubscribe = null;   // cleanup handle for user RSVP listener

// ─── Initialise ──────────────────────────────────────────────────────────────

// Pull eventId from URL: pages/event-detail.html?id=abc123
const params = new URLSearchParams(window.location.search);
eventId = params.get('id');

if (!eventId) {
  showError('No event ID provided.');
} else {
  // Wait for Firebase Auth to resolve before doing anything
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    startListeners();
  });
}

// ─── Firestore onSnapshot listeners ─────────────────────────────────────────

function startListeners() {
  const db = firebase.firestore();

  // 1. Listen to the event document — updates goingCount, capacity, waitlistCount live
  eventUnsubscribe = db.collection('events').doc(eventId)
    .onSnapshot((snap) => {
      if (!snap.exists) {
        showError('This event no longer exists.');
        return;
      }
      eventDoc = { id: snap.id, ...snap.data() };
      renderEventContent(eventDoc);
      renderButton();
    }, (err) => {
      showError('Failed to load event: ' + err.message);
    });

  // 2. Listen to this user's RSVP document — updates button state live
  //    Only attach if the user is logged in
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

// Detach listeners when navigating away — prevents memory leaks
window.addEventListener('beforeunload', () => {
  if (eventUnsubscribe)   eventUnsubscribe();
  if (userRsvpUnsubscribe) userRsvpUnsubscribe();
});

// ─── Render event content ────────────────────────────────────────────────────

function renderEventContent(event) {
  // Show content, hide loading
  loadingState.style.display = 'none';
  eventContent.style.display = 'block';

  eventTitle.textContent    = event.title        || 'Untitled Event';
  eventCategory.textContent = event.category     || '';
  eventLocation.textContent = event.location     || 'TBD';
  eventHost.textContent     = event.createdBy    || 'Unknown';
  eventDesc.textContent     = event.description  || '';

  // Format date
  if (event.date) {
    const d = event.date.toDate ? event.date.toDate() : new Date(event.date);
    eventDate.textContent = d.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // Capacity bar
  const going    = event.goingCount    || 0;
  const capacity = event.capacity      || 0;
  const waitlist = event.waitlistCount || 0;

  goingCountEl.textContent = going;
  capacityEl.textContent   = capacity;

  const pct = capacity > 0 ? Math.min((going / capacity) * 100, 100) : 0;
  capacityFill.style.width = `${pct}%`;
  capacityFill.className   = 'capacity-fill' + (pct >= 100 ? ' full' : pct >= 80 ? ' almost-full' : '');

  if (waitlist > 0) {
    waitlistLabel.style.display  = 'block';
    waitlistCountEl.textContent  = waitlist;
  } else {
    waitlistLabel.style.display  = 'none';
  }
}

// ─── Derive button state ─────────────────────────────────────────────────────

function getRsvpState() {
  if (!eventDoc)    return RSVP_STATES.LOADING;
  if (!currentUser) return RSVP_STATES.LOGIN;

  const status = userRsvpDoc?.status;

  if (status === 'going')      return RSVP_STATES.GOING;
  if (status === 'waitlisted') return RSVP_STATES.WAITLISTED;

  const going    = eventDoc.goingCount || 0;
  const capacity = eventDoc.capacity   || 0;

  if (going < capacity) return RSVP_STATES.JOIN;
  return RSVP_STATES.FULL;
}

// ─── Render button based on state ────────────────────────────────────────────

function renderButton() {
  const state = getRsvpState();

  // Reset classes
  rsvpBtn.className = 'btn-rsvp';
  rsvpBtn.disabled  = false;
  rsvpMessage.textContent = '';

  switch (state) {

    case RSVP_STATES.LOADING:
      rsvpBtn.textContent = 'Loading...';
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

    case RSVP_STATES.WAITLISTED:
      const position = userRsvpDoc?.waitlistPosition || '?';
      rsvpBtn.textContent = `Waitlisted — #${position} in line`;
      rsvpBtn.classList.add('btn-rsvp--waitlisted');
      rsvpBtn.onclick = () => openCancelModal('waitlisted');
      rsvpMessage.textContent = "We'll notify you if a spot opens up.";
      break;

    case RSVP_STATES.JOIN:
      rsvpBtn.textContent = 'RSVP to this event';
      rsvpBtn.classList.add('btn-rsvp--join');
      rsvpBtn.onclick = handleRsvp;
      break;

    case RSVP_STATES.FULL:
      rsvpBtn.textContent = 'Join Waitlist';
      rsvpBtn.classList.add('btn-rsvp--full');
      rsvpBtn.onclick = handleRsvp;  // same call — Java decides going vs waitlisted
      break;
  }
}

// ─── RSVP action ─────────────────────────────────────────────────────────────

async function handleRsvp() {
  rsvpBtn.disabled    = true;
  rsvpBtn.textContent = 'Saving...';
  rsvpMessage.textContent = '';

  try {
    const result = await api.rsvpEvent(eventId);
    // onSnapshot will fire and re-render the button automatically —
    // no need to manually update state here
    rsvpMessage.textContent = result.message || 'Done!';
  } catch (err) {
    rsvpMessage.textContent = err.message || 'Something went wrong. Try again.';
    rsvpBtn.disabled = false;
    renderButton(); // restore button to previous state
  }
}

// ─── Cancel modal ────────────────────────────────────────────────────────────

function openCancelModal(currentStatus) {
  cancelModalBody.textContent = currentStatus === 'waitlisted'
    ? 'Remove yourself from the waitlist?'
    : 'Cancel your RSVP? Your spot will be given to the next person in line.';

  cancelModal.style.display = 'flex';
}

dismissCancelBtn.onclick = () => {
  cancelModal.style.display = 'none';
};

// Close modal if user clicks the overlay background
cancelModal.addEventListener('click', (e) => {
  if (e.target === cancelModal) cancelModal.style.display = 'none';
});

confirmCancelBtn.onclick = async () => {
  cancelModal.style.display = 'none';
  rsvpBtn.disabled    = true;
  rsvpBtn.textContent = 'Cancelling...';

  try {
    await api.cancelRsvp(eventId);
    // onSnapshot fires and re-renders automatically
  } catch (err) {
    rsvpMessage.textContent = err.message || 'Cancel failed. Try again.';
    rsvpBtn.disabled = false;
    renderButton();
  }
};

// ─── Error display ───────────────────────────────────────────────────────────

function showError(msg) {
  loadingState.style.display  = 'none';
  eventContent.style.display  = 'none';
  errorState.style.display    = 'block';
  errorMessage.textContent    = msg;
}
