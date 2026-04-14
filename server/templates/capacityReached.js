// server/templates/capacityReached.js
// E-19 — sent to the organizer the first time their event reaches capacity.

function capacityReached(event, userName) {
  const { title='', date='', time='', location='', capacity='', id='' } = event;
  const editUrl = `http://localhost:5500/edit-event.html?id=${id}`;

  const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '';
  const formattedTime = time ? new Date('1970-01-01T' + time).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  }) : '';

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
            <td style='background:#4A148C;padding:28px 32px;'>
              <p style='margin:0;font-size:22px;font-weight:bold;color:#fff;'>
                Campus Event Board</p>
              <p style='margin:6px 0 0;font-size:14px;color:#e1bee7;'>
                Your event is full! 🎊</p>
            </td>
          </tr>
          <tr><td style='padding:32px;'>
            <p style='margin:0 0 16px;font-size:16px;color:#1a1a1a;'>Hi ${userName},</p>
            <p style='margin:0 0 24px;font-size:15px;color:#444;'>
              Congratulations! Your event has reached full capacity.
              New attendees will now be automatically added to a waitlist.</p>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#f3e5f5;border-radius:6px;
                          border:1px solid #ce93d8;margin-bottom:24px;'>
              <tr><td style='padding:24px;'>
                <p style='margin:0 0 12px;font-size:18px;font-weight:bold;
                          color:#4A148C;'>${title}</p>
                <table cellpadding='6' cellspacing='0'>
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;
                               width:120px;'>DATE</td>
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
                  <tr>
                    <td style='font-size:13px;color:#888;font-weight:bold;'>CAPACITY</td>
                    <td style='font-size:14px;color:#4A148C;font-weight:bold;'>
                      ${capacity} / ${capacity} — FULL</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width='100%' cellpadding='0' cellspacing='0'
                   style='background:#fff8e1;border-radius:6px;
                          border:1px solid #ffe082;margin-bottom:24px;padding:16px;'>
              <tr><td style='padding:16px;'>
                <p style='margin:0;font-size:14px;color:#555;'>
                  <strong style='color:#B8860B;'>Have more room?</strong>
                  If your venue can accommodate more people, you can
                  increase the capacity on the event edit page.</p>
              </td></tr>
            </table>
            <table cellpadding='0' cellspacing='0' style='margin-bottom:24px;'>
              <tr><td style='background:#4A148C;border-radius:6px;'>
                <a href='${editUrl}'
                   style='display:inline-block;padding:12px 28px;font-size:14px;
                          font-weight:bold;color:#fff;text-decoration:none;'>
                  Edit Capacity →</a>
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

module.exports = { capacityReached };
