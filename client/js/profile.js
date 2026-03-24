firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) return; // requireAuth() handles redirect

  document.getElementById('profile-email').textContent = user.email;

  try {
    const { created, going, waitlisted } = await api.getProfile();

    renderList('created-list', created);
    renderList('going-list', going);
    renderList('waitlisted-list', waitlisted);

    document.getElementById('profile-loading').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
  } catch (err) {
    document.getElementById('profile-loading').style.display = 'none';
    const errEl = document.getElementById('profile-error');
    errEl.style.display = 'block';
    errEl.textContent = 'Could not load profile: ' + err.message;
  }
});

function renderList(containerId, events) {
  const el = document.getElementById(containerId);
  if (!events || events.length === 0) {
    el.innerHTML = '<p class="no-events">Nothing here yet.</p>';
    return;
  }
  el.innerHTML = events.map(e => {
    const dateStr = e.date
      ? (e.date.toDate ? e.date.toDate() : new Date(e.date)).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })
      : '';
    return `
      <a href="event-detail.html?id=${e.id}" class="profile-event-card">
        ${e.bannerUrl ? `<img src="${e.bannerUrl}" class="profile-event-banner" alt="">` : ''}
        <div class="profile-event-info">
          <strong>${e.title}</strong>
          <span>${dateStr}${e.location ? ' · ' + e.location : ''}</span>
        </div>
      </a>`;
  }).join('');
}