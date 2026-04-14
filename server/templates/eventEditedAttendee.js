// server/templates/eventEditedAttendee.js
// E-08 — sent to all attendees when an event's key details are changed.
// changes: array of { field, from, to } objects

// Formats "YYYY-MM-DD" → "May 1, 2025"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Formats "HH:MM" (24-hr) → "6:00 PM"
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minute] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function eventEditedAttendee(event, userName, changes) {
  const { title='', date='', time='', location='', id='' } = event;
  const eventUrl = `http://localhost:5500/event-detail.html?id=${id}`;

  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);

  // Build the changes summary rows
  const changeRows = changes.map(c => {
    const from = c.field === 'date' ? formatDate(c.from)
               : c.field === 'time' ? formatTime(c.from)
               : c.from;
    const to   = c.field === 'date' ? formatDate(c.to)
               : c.field === 'time' ? formatTime(c.to)
               : c.to;
    return `
    <tr>
      <td style='font-size:13px;color:#888;font-weight:bold;
                 width:120px;padding:6px 4px;text-transform:uppercase;'>
        ${c.field}</td>
      <td style='font-size:13px;color:#C0392B;padding:6px 4px;
                 text-decoration:line-through;'>${from}</td>
      <td style='font-size:13px;color:#555;padding:6px 4px;'>→</td>
      <td style='font-size:13px;color:#2E7D32;padding:6px 4px;
                 font-weight:bold;'>${to}</td>
    </tr>`;
  }).join('');

  return `
  <!DOCTYPE html><html lang='en'>
  <head><meta charset='UTF-8'></head>
  <body style='margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;'>
    <table width='100%' cellpadding='0' cellspacing='0'
           style='background:#f4f6f8;padding:32px 0;'>
      <tr><td align='center'>
        <table width='600' cellpadding='0' cellspacing='0'
               style='background:#fff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);'>
          <tr>
            <td style='background:#E65100;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#ffe0b2;'>
                Event Updated — Please Review</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 24px;font-size:15px;color:#444;'>
              An event you are registered for has been updated.
              Please review the changes below:</p>

            <!-- Changes summary -->
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fff8e1;border-radius:6px;
                          border:1px solid #ffe082;margin-bottom:24px;'>
              <tr>
                <td style='padding:16px 24px 8px;font-size:13px;font-weight:bold;
                           color:#B8860B;text-transform:uppercase;
                           letter-spacing:1px;'>What Changed</td>
              </tr>
              <tr><td style='padding:0 24px 16px;'>
                <table cellpadding='0' cellspacing='0' width='100%'>
                  ${changeRows}
                </table>
              </td></tr>
            </table>

            <!-- Updated details -->
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#f0f5fb;border-radius:6px;
                          border:1px solid #d0dff0;margin-bottom:24px;'>
              <tr><td style='padding:24px;'>
                <p style='margin:0 0 12px;font-size:18px;font-weight:bold;
                          color:#2E5F8A;'>${title}</p>
                <table cellpadding='6' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;
                               width:110px;'>DATE</td>
                    <td style='font-size:14px;color:#1a1a1a;'>${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>TIME</td>
                    <td style='font-size:14px;color:#1a1a1a;'>${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>LOCATION</td>
                    <td style='font-size:14px;color:#1a1a1a;'>${location}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <table cellpadding='0' cellspacing='0' style='margin-bottom:20px;'>
              <tr><td style='background:#2E5F8A;border-radius:6px;'>
                <a href='${eventUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  View Updated Event →</a>
              </td></tr>
            </table>
            <p style='margin:0;font-size:13px;color:#888;'>
              If these changes don't work for you, you can cancel your RSVP
              from the event page.</p>
          </td></tr>
          <tr>
            <td style='background:#f4f6f8;padding:20px 32px;
                       border-top:1px solid #e0e0e0;'>
              <p style='margin:0;font-size:12px;color:#aaa;text-align:center;'>
                Campus Event Board &nbsp;|&nbsp; Automated message.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

module.exports = { eventEditedAttendee };
