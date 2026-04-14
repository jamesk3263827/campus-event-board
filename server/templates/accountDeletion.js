// server/templates/accountDeletion.js
// E-03 — sent when a user schedules their account for deletion.

function accountDeletion(userName, userEmail, deletionDate) {
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
            <td style='background:#C0392B;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#f5c6c2;'>
                Account Deletion Scheduled</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 16px;font-size:15px;color:#444;'>
              Your account has been scheduled for deletion.</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fff5f5;border-radius:6px;
                          border:1px solid #f5c6c2;margin-bottom:24px;'>
              <tr><td style='padding:24px;'>
                <table cellpadding='8' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;width:160px;'>ACCOUNT</td>
                    <td style='font-size:14px;color:#1a1a1a;'>${userEmail}</td>
                  </tr>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>DELETION DATE</td>
                    <td style='font-size:14px;color:#C0392B;font-weight:bold;'>${deletionDate}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style='margin:0 0 12px;font-size:14px;color:#444;'>
              The following will be permanently removed on that date:</p>
            <ul style='margin:0 0 20px;padding-left:24px;color:#555;font-size:14px;'>
              <li style='margin-bottom:6px;'>Your account and login credentials</li>
              <li style='margin-bottom:6px;'>All events you have created</li>
              <li style='margin-bottom:6px;'>All your RSVPs and waitlist entries</li>
              <li>All comments you have posted</li>
            </ul>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fff8e1;border-radius:6px;
                          border:1px solid #ffe082;margin-bottom:24px;padding:16px;'>
              <tr><td style='padding:16px;'>
                <p style='margin:0;font-size:14px;color:#555;'>
                  <strong style='color:#B8860B;'>Changed your mind?</strong>
                  Log back in to your account before ${deletionDate} and
                  your deletion will be automatically cancelled.</p>
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

module.exports = { accountDeletion };