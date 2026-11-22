// Sends the project's emails: login codes, confirmation codes, password reset codes, new bills
// and the answer to a profile change request.
//
// We use Brevo's free email API (300 emails a day) over HTTPS. Normal Gmail sending (SMTP)
// is blocked on Render's free plan, but HTTPS is not.
// No BREVO_API_KEY in .env? Then the email is printed in the backend terminal instead,
// so you can still test everything on your computer.
import env from '../config/env.js';

/**
 * sendEmail({ to, name, subject, html })
 * Never throws: an email problem must not break signing up or generating a bill.
 * Returns true when the email was sent (or printed in the terminal on your computer), false if it failed.
 */
export async function sendEmail({ to, name, subject, html, replyTo }) {
  if (!to) return false;

  if (!env.email.brevoApiKey || !env.email.from) {
    console.log(`\n[email] Not sent (no BREVO_API_KEY / EMAIL_FROM in .env). It would go to ${to}:`);
    console.log(`        Subject: ${subject}`);
    console.log(`        ${htmlToText(html)}\n`);
    // On your computer, printing counts as "sent" (you read the code in the terminal).
    // On the live website nobody reads the terminal, so tell the page the email did not go out.
    return !env.isProduction;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.email.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: env.email.fromName, email: env.email.from },
        to: [{ email: to, ...(name ? { name } : {}) }],
        subject,
        htmlContent: html,
        // Feedback: pressing "Reply" in the inbox answers the visitor directly
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      }),
      signal: AbortSignal.timeout(10000), // give up after 10 seconds
    });
    if (!response.ok) {
      console.error(`[email] Brevo refused the email to ${to}: ${response.status} ${await response.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Could not send the email to ${to}: ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------
// The emails themselves (simple HTML that looks fine in Gmail and on phones)
// ---------------------------------------------------------------------

// The three kinds of code email (written like GitHub's "Please verify your identity" email)
const CODE_EMAILS = {
  login: {
    subject: '[Power Utility] Sudo email verification code',
    heading: 'Please verify your identity',
    intro: 'Here is your Power Utility sudo authentication code:',
    why: 'You are receiving this email because someone typed your password to log in to Power Utility. If this was not you, change your password now.',
  },
  confirm_email: {
    subject: '[Power Utility] Email confirmation code',
    heading: 'Please confirm your email',
    intro: 'Here is your Power Utility email confirmation code:',
    why: 'You are receiving this email because this address was used to create a Power Utility account. If this was not you, you can ignore it.',
  },
  reset_password: {
    subject: '[Power Utility] Password reset code',
    heading: 'Reset your password',
    intro: 'Here is your Power Utility password reset code:',
    why: 'You are receiving this email because a password reset was asked for your Power Utility account. If this was not you, ignore it: your password stays the same.',
  },
};

/** 8-digit code email. purpose = 'login' | 'confirm_email' | 'reset_password' */
export function codeEmail(username, code, purpose) {
  const text = CODE_EMAILS[purpose];
  return {
    subject: text.subject,
    html: layout(
      `${text.heading}, ${escapeHtml(username)}`,
      `<p>${text.intro}</p>
       <p style="font-family:Consolas,'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:6px;margin:18px 0;color:#0f172a">${code}</p>
       <p>This code is valid for 15 minutes and can only be used once.</p>
       <p><b>Please don't share this code with anyone:</b> we'll never ask for it on the phone or via email.</p>
       <p>Thanks,<br />The Power Utility Team</p>
       <p style="margin-top:20px;color:#94a3b8;font-size:12px">${text.why}</p>`
    ),
  };
}

/** A new bill (bill = one row from BILL_SELECT in bills.controller.js) */
export function billEmail(bill) {
  const rows = [
    ['Bill number', bill.bill_number],
    ['Meter', bill.meter_number],
    ['Period', `${formatDate(bill.billing_period_start)} to ${formatDate(bill.billing_period_end)}`],
    ['Units used', `${bill.consumption ?? '-'} kWh`],
    ['Fixed charge', formatTaka(bill.fixed_charge)],
    ['Energy charge', formatTaka(bill.variable_charge)],
    ['VAT', formatTaka(bill.tax_amount)],
  ]
    .map(([label, value]) => `<tr><td style="padding:6px 0;color:#64748b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`)
    .join('');

  return {
    subject: `Your electricity bill ${bill.bill_number}: ${formatTaka(bill.total_amount)}, due ${formatDate(bill.due_date)}`,
    html: layout(
      'Your new electricity bill',
      `<p>Hello ${escapeHtml(bill.customer_name)},</p>
       <p>Your bill for ${escapeHtml(bill.notes || 'this month')} is ready.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
         <tr><td style="padding:10px 0;border-top:2px solid #0f172a;font-weight:800">Total to pay</td>
             <td style="padding:10px 0;border-top:2px solid #0f172a;text-align:right;font-weight:800;font-size:18px">${formatTaka(bill.total_amount)}</td></tr>
       </table>
       <p><b>Please pay by ${formatDate(bill.due_date)}.</b> You can see and print the bill when you log in.</p>`,
      { label: 'Open my bills', url: `${env.appUrl}/my/bills/${bill.id}` }
    ),
  };
}

/** Answer to a profile change request */
// Reminder for a bill that is due soon or overdue (POST /api/bills/send-reminders)
export function reminderEmail(bill) {
  const late = bill.status === 'Overdue';
  return {
    subject: late
      ? `Reminder: bill ${bill.bill_number} is overdue (${formatTaka(bill.balance)})`
      : `Reminder: bill ${bill.bill_number} is due on ${formatDate(bill.due_date)}`,
    html: layout(
      late ? 'Your bill is overdue' : 'Your bill is due soon',
      `<p>Hello ${escapeHtml(bill.customer_name)},</p>
       <p>Bill <b>${escapeHtml(bill.bill_number)}</b> for meter ${escapeHtml(bill.meter_number)} still has
          <b>${formatTaka(bill.balance)}</b> to pay. The due date ${late ? 'was' : 'is'} <b>${formatDate(bill.due_date)}</b>.</p>
       <p>You can pay online (Mobile Banking or Card) from My Bills. If you already paid, please ignore this email.</p>`,
      { label: 'Pay my bill', url: `${env.appUrl}/my/bills/${bill.id}` }
    ),
  };
}

export function changeDecisionEmail(fullName, fieldLabel, newValue, approved, note) {
  return {
    subject: approved ? `Your ${fieldLabel.toLowerCase()} was changed` : `Your ${fieldLabel.toLowerCase()} change request was not approved`,
    html: layout(
      approved ? 'Change approved' : 'Change not approved',
      `<p>Hello ${escapeHtml(fullName)},</p>
       <p>${
         approved
           ? `Your ${escapeHtml(fieldLabel.toLowerCase())} is now <b>${escapeHtml(newValue)}</b>.`
           : `Your request to change your ${escapeHtml(fieldLabel.toLowerCase())} to <b>${escapeHtml(newValue)}</b> was not approved.`
       }</p>
       ${note ? `<p>Note from the office: ${escapeHtml(note)}</p>` : ''}`,
      { label: 'Open my profile', url: `${env.appUrl}/my/profile` }
    ),
  };
}

/** A message from the website's feedback form, sent to the team */
export function feedbackEmail({ rating, topic, message, name, email }) {
  const stars = '&#9733;'.repeat(rating) + '&#9734;'.repeat(5 - rating);
  return {
    subject: `[Power Utility feedback] ${rating}/5 - ${topic}`,
    html: layout(
      'New website feedback',
      `<p style="font-size:22px;color:#f59e0b;margin:0 0 8px">${stars}</p>
       <p><b>Topic:</b> ${escapeHtml(topic)}</p>
       <p style="white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:12px">${escapeHtml(message)}</p>
       <p><b>From:</b> ${escapeHtml(name || 'Not given')} (${escapeHtml(email || 'no email')})</p>`
    ),
  };
}

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

function layout(title, body, button) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="height:6px;background:linear-gradient(90deg,#fbbf24,#f97316,#f43f5e)"></div>
    <div style="padding:28px;color:#1e293b;font-size:15px;line-height:1.6">
      <p style="margin:0 0 4px;font-weight:800;color:#f97316">&#9889; Power Utility</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a">${title}</h1>
      ${body}
      ${button ? `<p style="margin-top:24px"><a href="${button.url}" style="background:#f97316;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${button.label}</a></p>` : ''}
    </div>
    <p style="margin:0;padding:16px 28px;background:#f1f5f9;color:#64748b;font-size:12px">Power Utility Management System - this is an automatic email, please do not reply.</p>
  </div>
</div>`;
}

// 1537 -> "৳1,537.00" (Bangladeshi digit grouping, like the website)
// Also used for the inbox messages (utils/notify.js callers)
export function formatTaka(value) {
  return `৳${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// '2026-12-07' -> "07 Dec 2026"
export function formatDate(ymd) {
  const [year, month, day] = String(ymd).split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[Number(month) - 1] ? `${day} ${names[Number(month) - 1]} ${year}` : String(ymd);
}

// Stops a name like "<script>" from turning into real HTML in the email
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// For the terminal: the email without its HTML tags
function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#9889;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
