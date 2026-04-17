// config.js
// Production environment configuration for the Campus Event Board frontend.
//
// HOW TO USE:
//   1. Replace the URL below with your actual Render Node service URL
//      after completing Part 2 of the Week 8 deployment guide.
//   2. This file is loaded BEFORE api.js in every HTML page.
//      api.js reads window.APP_CONFIG.apiBaseUrl and uses it as BASE_URL.
//   3. In local development, if this file is absent or APP_CONFIG is not set,
//      api.js falls back automatically to http://localhost:3000/api — no changes needed.
//
// EXAMPLE (replace with your real URL):
//   apiBaseUrl: 'https://campus-event-board-node.onrender.com/api'

window.APP_CONFIG = {
  apiBaseUrl: 'https://YOUR-NODE-SERVICE.onrender.com/api'
};
