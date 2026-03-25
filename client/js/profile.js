// client/js/profile.js

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) return; // requireAuth() handles redirect

  // ── Fill avatar + header ────────────────────────────────────────────────────
  const email  = user.email || '';
  const initial = email.charAt(0).toUpperCase();

  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-email').textContent  = email;

  // Try to get display name from Firestore users collection
  try {
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists && userDoc.data().name) {
      document.getElementById('profile-name').textContent = userDoc.data().name;
    } else {
      document.getElementById('profile-name').textContent = email.split('@')[0];
    }
  } catch {
    document.getElementById('profile-name').textContent = email.split('@')[0];
  }

  // ── Load profile data from API ──────────────────────────────────────────────
  try {
    const { created, going, waitlisted } = await api.getProfile();

    renderList('created-list',   created,    'created',   'You haven\'t created any events yet.', '📋');
    renderList('going-list',     going,      'going',     'No upcoming events yet. Browse events to RSVP!', '🎟️');
    renderList('waitlisted-list', waitlisted, 'waitlisted', 'You\'re not on any waitlists.', '⏳');

    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';

  } catch (err) {
    document.getElementById('profile-loading').style.display = 'none';
    const errEl = document.getElementById('profile-error');
    errEl.style.display = 'flex';
    errEl.textContent   = err.message || 'Could not load profile. Please try refreshing.';
  }
});

// ── Render a profile event list (or empty state) ────────────────────────────
function renderList(containerId, events, type, emptyMsg, emptyIcon) {
  const el = document.getElementById(containerId);

  if (!events || events.length === 0) {
    el.innerHTML = `
      <div class="empty-state" style="padding: 28px 0;">
        <span class="empty-state__icon" style="font-size:1.8rem;">${emptyIcon}</span>
        <p class="empty-state__body" style="margin-bottom:${type === 'created' || type === 'going' ? '12px' : '0'};">
          ${emptyMsg}
        </p>
        ${type === 'created'
          ? '<a href="create-event.html" class="btn-primary btn-inline">Create an Event</a>'
          : type === 'going'
          ? '<a href="events.html" class="btn-secondary">Browse Events</a>'
          : ''}
      </div>`;
    return;
  }

  el.innerHTML = events.map(e => {
    let dateStr = '';
    if (e.date) {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      if (!isNaN(d)) {
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    const meta = [dateStr, e.location].filter(Boolean).join(' · ');

    return `
      <a href="event-detail.html?id=${e.id}" class="profile-event-card">
        ${e.bannerUrl
          ? `<img src="${e.bannerUrl}" class="profile-event-banner" alt="" loading="lazy">`
          : ''}
        <div class="profile-event-info">
          <strong>${escapeHtml(e.title || 'Untitled')}</strong>
          ${meta ? `<span>${escapeHtml(meta)}</span>` : ''}
        </div>
      </a>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
