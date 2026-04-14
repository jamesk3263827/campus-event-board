// Attach to your filter inputs + run on page load
async function loadEvents() {
  const category = document.getElementById('category-filter').value;
  const search   = document.getElementById('search-input').value.trim();

  try {
    const events = await api.getEvents({ category, search });
    renderEventCards(events);
  } catch (err) {
    showError(err.message);
  }
}

// Formats "YYYY-MM-DD" → "May 1, 2025" without timezone rollback
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderEventCards(events) {
  const container = document.getElementById('events-grid');
  if (!events.length) {
    container.innerHTML = '<p>No events found.</p>';
    return;
  }

  container.innerHTML = events.map(e => `
    <div class="event-card" data-id="${e.id}">
      <span class="badge">${e.category}</span>
      <h3>${e.title}</h3>
      <p>${formatDate(e.date)} · ${e.location}</p>
      <p>${e.description}</p>
      <a href="event-detail.html?id=${e.id}">View details →</a>
    </div>
  `).join('');
}

// Wire up filters
document.getElementById('search-input').addEventListener('input', loadEvents);
document.getElementById('category-filter').addEventListener('change', loadEvents);

loadEvents(); // initial load