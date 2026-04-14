// client/js/calendar.js
// Shared calendar link helpers — used by event-detail.js and email templates.

/**
 * Converts event data into a Google Calendar deep link.
 * @param {object} event — needs title, date (YYYY-MM-DD), time (HH:MM), location, description
 */
function buildGoogleCalendarUrl(event) {
  const { title = '', date = '', time = '00:00', location = '', description = '' } = event;
  const dateStr   = date.replace(/-/g, '');
  const timeStr   = (time || '00:00').replace(':', '') + '00';
  const startDate = `${dateStr}T${timeStr}`;

  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startDate}/${startDate}` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent('Campus Event Board: ' + description)}`;
}

/**
 * Generates the text content of an .ics file for the event.
 */
function buildIcsContent(event) {
  const { title = '', date = '', time = '00:00', location = '', description = '', id = '' } = event;
  const dateStr = date.replace(/-/g, '');
  const timeStr = (time || '00:00').replace(':', '') + '00';
  const dtStamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campus Event Board//EN',
    'BEGIN:VEVENT',
    `UID:${id}@campuseventboard`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dateStr}T${timeStr}`,
    `DTEND:${dateStr}T${timeStr}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Triggers a browser download of an .ics file for the event.
 */
function downloadIcs(event) {
  const content = buildIcsContent(event);
  const blob    = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `${(event.title || 'event').replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}