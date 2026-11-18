// Sends the project's emails: confirmation codes, password reset codes, new bills
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
 * Returns true when the email was sent (or printed in the terminal), false if it failed.
 */
export async function sendEmail({ to, name, subject, html }) {
  if (!to) return false;

  if (!env.email.brevoApiKey || !env.email.from) {
    console.log(`\n[email] Not sent (no BREVO_API_KEY / EMAIL_FROM in .env). It would go to ${to}:`);
    console.log(`        Subject: ${subject}`);
    console.log(`        ${htmlToText(html)}\n`);
    return true;
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

/** 6-digit code for 'confirm_email' or 'reset_password' */
export function codeEmail(fullName, code, purpose) {
  const isReset = purpose === 'reset_password';
  return {
    subject: isReset ? `${code} is your password reset code` : `${code} is your confirmation code`,
    html: layout(
      isReset ? 'Reset your password' : 'Confirm your email',
      `<p>Hello ${escapeHtml(fullName)},</p>
       <p>${isReset ? 'Use this code to set a new password:' : 'Welcome! Use this code to confirm your email and finish signing up:'}</p>
       <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:20px 0;color:#0f172a">${code}</p>
       <p>The code works for 15 minutes. If you did not ask for it, you can ignore this email${isReset ? ' - your password stays the same' : ''}.</p>`
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
function formatTaka(value) {
  return `৳${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// '2026-12-07' -> "07 Dec 2026"
function formatDate(ymd) {
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
