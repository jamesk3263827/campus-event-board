// server/templates/waitlistPositionUpdate.js
// E-17 — sent when a user's waitlist position improves.

function waitlistPositionUpdate(event, userName, oldPosition, newPosition) {
  const { title='', date='', time='', location='', id='' } = event;
  const eventUrl = `http://localhost:5500/event-detail.html?id=${id}`;

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '';
  const formattedTime = time
    ? new Date('1970-01-01T' + time).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      })
    : '';

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
            <td style='background:#7C6A9E;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#ddd8f0;'>
                Your waitlist position improved ⬆️</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 24px;font-size:15px;color:#444;'>
              Someone ahead of you on the waitlist has cancelled.
              Your position has moved up:</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#f5f0fb;border-radius:6px;
                          border:1px solid #d8cff0;margin:0 0 24px;'>
              <tr><td style='padding:24px;'>
                <table width='100%' cellpadding='0' cellspacing='0'>
                  <tr>
                    <td style='text-align:center;width:50%;padding:8px;'>
                      <p style='margin:0;font-size:12px;color:#7C6A9E;
                                font-weight:bold;text-transform:uppercase;
                                letter-spacing:1px;'>Previous</p>
                      <p style='margin:4px 0 0;font-size:40px;font-weight:bold;
                                color:#aaa;text-decoration:line-through;'>
                        #${oldPosition}</p>
                    </td>
                    <td style='text-align:center;font-size:28px;color:#7C6A9E;
                               width:40px;'>→</td>
                    <td style='text-align:center;width:50%;padding:8px;'>
                      <p style='margin:0;font-size:12px;color:#7C6A9E;
                                font-weight:bold;text-transform:uppercase;
                                letter-spacing:1px;'>New Position</p>
                      <p style='margin:4px 0 0;font-size:48px;font-weight:bold;
                                color:#7C6A9E;'>#${newPosition}</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#f0f5fb;border-radius:6px;
                          border:1px solid #d0dff0;margin-bottom:24px;'>
              <tr><td style='padding:20px;'>
                <p style='margin:0 0 10px;font-size:16px;font-weight:bold;
                          color:#2E5F8A;'>${title}</p>
                <table cellpadding='4' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;
                               width:110px;'>DATE</td>
                    <td style='font-size:13px;color:#555;'>${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>TIME</td>
                    <td style='font-size:13px;color:#555;'>${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>LOCATION</td>
                    <td style='font-size:13px;color:#555;'>${location}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#7C6A9E;border-radius:6px;'>
                <a href='${eventUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  View Event →</a>
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

module.exports = { waitlistPositionUpdate };
