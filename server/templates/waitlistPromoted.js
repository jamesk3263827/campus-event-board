// server/templates/waitlistPromoted.js
// E-13 — sent when a user is promoted from waitlist to going.

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

function waitlistPromoted(event, userName) {
  const { title='', date='', time='', location='', description='', id='' } = event;
  const eventUrl = `http://localhost:5500/event-detail.html?id=${id}`;
  const icsUrl   = `http://localhost:3000/api/events/${id}/calendar.ics`;

  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);

  // Google Calendar deep link
  const gcalStart = date.replace(/-/g, '') + 'T' +
    (time || '00:00').replace(':', '') + '00';
  const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${gcalStart}/${gcalStart}` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent('Campus Event Board: ' + description)}`;

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
            <td style='background:#1B5E20;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#a5d6a7;'>
                Great news — you're in! 🎉</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 8px;font-size:15px;color:#444;'>
              A spot opened up and you have been automatically promoted
              from the waitlist. You are now confirmed for:</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#f1f8f1;border-radius:6px;
                          border:1px solid #a5d6a7;margin:20px 0 24px;'>
              <tr><td style='padding:24px;'>
                <p style='margin:0 0 12px;font-size:20px;font-weight:bold;
                          color:#1B5E20;'>${title}</p>
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
                  ${description ? `<tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;
                               vertical-align:top;'>DESCRIPTION</td>
                    <td style='font-size:14px;color:#1a1a1a;'>${description}</td>
                  </tr>` : ''}
                </table>
              </td></tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:12px;'>
              <tr><td style='background:#1B5E20;border-radius:6px;'>
                <a href='${eventUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  View Event →</a>
              </td></tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:12px;'>
              <tr><td style='background:#f4f6f8;border:1px solid #ccc;border-radius:6px;'>
                <a href='${gcalUrl}'
                   style='display:inline-block;padding:10px 24px;font-size:13px;
                          color:#555;text-decoration:none;'>
                  📆 Add to Google Calendar</a>
              </td></tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#f4f6f8;border:1px solid #ccc;border-radius:6px;'>
                <a href='${icsUrl}'
                   style='display:inline-block;padding:10px 24px;font-size:13px;
                          color:#555;text-decoration:none;'>
                  📅 Download .ics (Apple / Outlook)</a>
              </td></tr>
            </table>
            <p style='margin:0;font-size:13px;color:#888;'>
              Need to cancel? You can do so from the event page at any time.</p>
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

module.exports = { waitlistPromoted };
