// server/templates/newCommentNotification.js
// E-18 — sent to the event organizer when someone comments on their event.

function newCommentNotification(event, organizerName, commenterName, commentText) {
  const { title='', id='' } = event;
  const eventUrl = `http://localhost:5500/event-detail.html?id=${id}`;

  // Truncate long comments to 200 chars in the email preview
  const preview = commentText.length > 200
    ? commentText.substring(0, 200) + '...'
    : commentText;

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
            <td style='background:#37474F;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#cfd8dc;'>
                New comment on your event 💬</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>
              Hi ${organizerName},</p>
            <p style='margin:0 0 8px;font-size:15px;color:#444;'>
              <strong>${commenterName}</strong> posted a comment on your event
              <strong>${title}</strong>:</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='margin:20px 0 24px;'>
              <tr>
                <td style='width:4px;background:#37474F;border-radius:2px;'></td>
                <td style='padding:12px 16px;font-size:15px;color:#333;
                           font-style:italic;line-height:1.5;'>
                  ${preview}
                </td>
              </tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#37474F;border-radius:6px;'>
                <a href='${eventUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  View Comment →</a>
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

module.exports = { newCommentNotification };
