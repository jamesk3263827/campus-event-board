// server/templates/eventCancelledAttendee.js
// E-07 — sent to all RSVPd and waitlisted users when an event is cancelled.

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

function eventCancelledAttendee(event, userName) {
  const { title='', date='', time='', location='', creatorName='' } = event;

  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);

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
            <td style='background:#8B0000;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#f5c6c6;'>
                Event Cancelled</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 24px;font-size:15px;color:#444;'>
              We're sorry to let you know that the following event has been
              cancelled by the organizer:</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fff5f5;border-radius:6px;
                          border:1px solid #f5c6c6;margin-bottom:24px;'>
              <tr><td style='padding:24px;'>
                <p style='margin:0 0 12px;font-size:20px;font-weight:bold;
                          color:#8B0000;text-decoration:line-through;'>
                  ${title}</p>
                <table cellpadding='6' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;width:120px;'>
                      DATE</td>
                    <td style='font-size:14px;color:#555;'>${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>TIME</td>
                    <td style='font-size:14px;color:#555;'>${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>LOCATION</td>
                    <td style='font-size:14px;color:#555;'>${location}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>ORGANIZER</td>
                    <td style='font-size:14px;color:#555;'>${creatorName}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style='margin:0 0 20px;font-size:14px;color:#444;'>
              Your spot has been released. Browse other upcoming events below.</p>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#2E5F8A;border-radius:6px;'>
                <a href='http://localhost:5500/events.html'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  Browse Events →</a>
              </td></tr>
            </table>
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

module.exports = { eventCancelledAttendee };