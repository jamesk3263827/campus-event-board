document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  document.getElementById('error-msg').textContent = '';

  const capacityVal = parseInt(document.getElementById('capacity').value, 10);
  if (isNaN(capacityVal) || capacityVal < 1) {
    document.getElementById('error-msg').textContent = 'Capacity must be at least 1.';
    submitBtn.disabled = false;
    return;
  }

  const data = {
    title:       document.getElementById('title').value,
    description: document.getElementById('description').value,
    category:    document.getElementById('category').value,
    date:        document.getElementById('date').value,
    time:        document.getElementById('time').value,
    location:    document.getElementById('location').value,
    capacity:    capacityVal,
  };

  try {
    const event = await api.createEvent(data);
    window.location.href = `event-detail.html?id=${event.id}`;
  } catch (err) {
    document.getElementById('error-msg').textContent = err.message;
    submitBtn.disabled = false;
  }
});