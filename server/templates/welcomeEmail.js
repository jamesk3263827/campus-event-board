// server/templates/welcomeEmail.js
// E-02 — sent to a new user immediately after account creation.

function welcomeEmail(userName, userEmail) {
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
            <td style='background:#2E5F8A;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#c8ddf0;'>
                Welcome!</p>
            </td>
          </tr>
          <tr>
            <td style='padding:32px;'>
              <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>
                Hi ${userName},</p>
              <p style='margin:0 0 16px;font-size:15px;color:#444;'>
                Your account has been created. Here are your details:</p>
              <table width='100%' cellpadding='0' cellspacing='0'
                     style='background:#f0f5fb;border-radius:6px;
                            border:1px solid #d0dff0;margin-bottom:24px;'>
                <tr><td style='padding:20px;'>
                  <table cellpadding='6' cellspacing='0'>
                    <tr>
                      <td style='font-size:13px;color:#888;font-weight:bold;width:100px;'>NAME</td>
                      <td style='font-size:14px;color:#1a1a1a;'>${userName}</td>
                    </tr>
                    <tr>
                      <td style='font-size:13px;color:#888;font-weight:bold;'>EMAIL</td>
                      <td style='font-size:14px;color:#1a1a1a;'>${userEmail}</td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <p style='margin:0 0 20px;font-size:14px;color:#444;'>
                You can now browse events, RSVP, and create your own events.</p>
              <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
                <tr>
                  <td style='background:#2E5F8A;border-radius:6px;'>
                    <a href='http://localhost:5500/events.html'
                       style='display:inline-block;padding:12px 28px;font-size:14px;
                              font-weight:bold;color:#fff;text-decoration:none;'>
                      Browse Events →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style='background:#f4f6f8;padding:20px 32px;border-top:1px solid #e0e0e0;'>
              <p style='margin:0;font-size:12px;color:#aaa;text-align:center;'>
                Campus Event Board &nbsp;|&nbsp; This is an automated message.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

module.exports = { welcomeEmail };
