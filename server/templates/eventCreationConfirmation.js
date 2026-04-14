// server/templates/eventCreationConfirmation.js
// E-04 — sent to the event organizer when they create a new event.
// event — the full event object returned by db.createEvent()
// userName — the organizer's display name

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

function eventCreationConfirmation(event, userName) {
  const {
    title       = 'Your Event',
    date        = '',
    time        = '',
    location    = '',
    description = '',
    capacity    = '',
    category    = '',
    id          = '',
  } = event;

  const displayDate = formatDate(date);
  const displayTime = formatTime(time);

  // Build a link back to the event detail page.
  // Adjust the base URL when you deploy.
  const eventUrl = `http://localhost:5500/event-detail.html?id=${id}`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">

    <!-- Outer wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 0;">
      <tr><td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header bar -->
          <tr>
            <td style="background:#2E5F8A;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;">Campus Event Board</p>
              <p style="margin:6px 0 0;font-size:14px;color:#c8ddf0;">Event Confirmation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">Hi ${userName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#444444;">
                Your event has been created successfully. Here are the details:
              </p>

              <!-- Event details box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f5fb;border-radius:6px;border:1px solid #d0dff0;margin-bottom:24px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 12px;font-size:20px;font-weight:bold;color:#2E5F8A;">${title}</p>
                  <table width="100%" cellpadding="4" cellspacing="0">
                    <tr>
                      <td style="width:120px;font-size:13px;color:#888888;font-weight:bold;">DATE</td>
                      <td style="font-size:14px;color:#1a1a1a;">${displayDate}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#888888;font-weight:bold;">TIME</td>
                      <td style="font-size:14px;color:#1a1a1a;">${displayTime}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#888888;font-weight:bold;">LOCATION</td>
                      <td style="font-size:14px;color:#1a1a1a;">${location}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#888888;font-weight:bold;">CATEGORY</td>
                      <td style="font-size:14px;color:#1a1a1a;">${category}</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;color:#888888;font-weight:bold;">CAPACITY</td>
                      <td style="font-size:14px;color:#1a1a1a;">${capacity} attendees</td>
                    </tr>
                    ${description ? `
                    <tr>
                      <td style="font-size:13px;color:#888888;font-weight:bold;vertical-align:top;">DESCRIPTION</td>
                      <td style="font-size:14px;color:#1a1a1a;">${description}</td>
                    </tr>` : ''}
                  </table>
                </td></tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#2E5F8A;border-radius:6px;">
                    <a href="${eventUrl}"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
                      View Event Page →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888888;">
                You can edit or cancel this event at any time from the event detail page.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f6f8;padding:20px 32px;border-top:1px solid #e0e0e0;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;text-align:center;">
                Campus Event Board &nbsp;|&nbsp; This is an automated message, please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>

  </body>
  </html>
  `;
}

module.exports = { eventCreationConfirmation };
