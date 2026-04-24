// server/templates/organizerRemovedAttendee.js
// Sent to a user when the event organizer removes their RSVP or waitlist entry.
// type: 'RSVP' | 'Waitlist'

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hourStr, minute] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function organizerRemovedAttendee(event, userName, type) {
  const { title = '', date = '', time = '', location = '', creatorName = '' } = event;
  const label = type === 'Waitlist' ? 'waitlist spot' : 'RSVP';
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(time);
  const eventsUrl = 'http://localhost:5500/events.html';

  return `
  <!DOCTYPE html><html lang='en'>
  <head><meta charset='UTF-8'></head>
  <body style='margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f6f8;padding:32px 0;'>
      <tr><td align='center'>
        <table width='600' cellpadding='0' cellspacing='0'
               style='background:#fff;border-radius:8px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);'>
          <tr>
            <td style='background:#7a3e3e;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#f5d0d0;'>
                You've Been Removed from an Event</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 24px;font-size:15px;color:#444;'>
              The organizer has removed your ${label} for the following event:</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fdf5f5;border-radius:6px;
                          border:1px solid #e8c8c8;margin-bottom:24px;'>
              <tr><td style='padding:24px;'>
                <p style='margin:0 0 10px;font-size:18px;font-weight:bold;color:#7a3e3e;'>
                  ${title}</p>
                <table cellpadding='6' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;width:110px;'>DATE</td>
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
                  ${creatorName ? `
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>ORGANIZER</td>
                    <td style='font-size:14px;color:#555;'>${creatorName}</td>
                  </tr>` : ''}
                </table>
              </td></tr>
            </table>
            <p style='margin:0 0 24px;font-size:14px;color:#555;'>
              If you believe this was a mistake, please reach out to the organizer directly.
              In the meantime, feel free to browse other upcoming events.</p>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#2E5F8A;border-radius:6px;'>
                <a href='${eventsUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  Browse Other Events &rarr;</a>
              </td></tr>
            </table>
          </td></tr>
          <tr>
            <td style='background:#f4f6f8;padding:20px 32px;border-top:1px solid #e0e0e0;'>
              <p style='margin:0;font-size:12px;color:#aaa;text-align:center;'>
                Campus Event Board &nbsp;|&nbsp; Automated message.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

module.exports = { organizerRemovedAttendee };
