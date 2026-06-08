/* ================================================================
   DURGA DESIGNS — EMAIL TEMPLATES (server-side only) — Stage 8
   ================================================================
   Plain, dependency-free template builders for the three Stage 8
   email types. Every template returns { subject, html, text } so
   email-service.js can hand the result straight to email-client.js.

   Hard rules enforced here:
     - ALL user/customer-supplied content (names, addresses, notes,
       product titles, courier/tracking strings, etc.) is passed
       through escapeHtml() before being placed into HTML output —
       this is the project's only template layer, so it is the right
       (and only) place to guard against stored-content injection.
     - NOTHING here ever references card numbers, CVC, bank account
       details, or any other payment-instrument data — the order
       shapes these templates receive never contain such data in the
       first place (Stripe Checkout handles and stores it, not us),
       and these templates don't introduce any new fields that could.
     - Every email explicitly frames payment as having gone through
       Stripe's secure checkout — never Durga Designs' own systems,
       and never anything resembling a bank transfer/account number.
   ================================================================ */

'use strict';

const SUPPORT_WHATSAPP = 'WhatsApp +44 7000 000000'; // placeholder contact — update with the real support line
const SUPPORT_EMAIL = 'hello@durgadesigns.example';   // placeholder — update with the real support address
const BRAND_NAME = 'Durga Designs';

/* ── shared helpers ──────────────────────────────────────────── */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount, currency) {
  const value = (typeof amount === 'number' && !Number.isNaN(amount)) ? amount : 0;
  const symbol = (String(currency || 'gbp').toLowerCase() === 'gbp') ? '£' : `${String(currency || '').toUpperCase()} `;
  return `${symbol}${value.toFixed(2)}`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return String(isoString);
  }
}

function formatAddressLines(address) {
  const a = (address && typeof address === 'object') ? address : {};
  return [a.line1, a.line2, a.city, a.postcode, a.country]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
}

function itemsToPlainLines(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const qty = Math.max(1, parseInt(item && item.qty, 10) || 1);
    const title = (item && typeof item.title === 'string') ? item.title : 'Item';
    const unit = formatMoney(item && item.unitAmount, item && item.currency);
    return `${qty} × ${title} (${unit} each)`;
  });
}

function htmlList(lines) {
  if (!lines.length) return '<p style="margin:0;color:#6b6b6b;">—</p>';
  return `<ul style="margin:0;padding-left:20px;">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
}

// Shared HTML shell — simple, table-based, inline-styled (maximum email
// client compatibility), navy/gold/white to match the site's branding.
function wrapHtml({ heading, bodyHtml, footerNote }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;color:#1f2533;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">
            <tr>
              <td style="background:#1f2533;padding:20px 28px;">
                <span style="color:#f0c75e;font-size:20px;letter-spacing:0.04em;">${escapeHtml(BRAND_NAME)}</span>
                <div style="color:#cfd3dc;font-size:12px;margin-top:2px;">Test mode — no real order has been charged unless this references a genuine Stripe test/live payment.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#1f2533;">${escapeHtml(heading)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f7f3ec;color:#6b6b6b;font-size:12px;">
                ${footerNote ? `<p style="margin:0 0 8px 0;">${footerNote}</p>` : ''}
                <p style="margin:0;">Need help with your order? Contact us via ${escapeHtml(SUPPORT_WHATSAPP)} or ${escapeHtml(SUPPORT_EMAIL)}.</p>
                <p style="margin:8px 0 0 0;">Payments are processed securely by Stripe — ${escapeHtml(BRAND_NAME)} never sees or stores your card details.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* ================================================================
   1. Customer order confirmation email
   ================================================================ */

function customerConfirmationEmail(order) {
  const o = order || {};
  const customerName = o.customerName || (o.customer && o.customer.fullName) || 'there';
  const items = Array.isArray(o.items) ? o.items : (Array.isArray(o.basketItems) ? o.basketItems : []);
  const addressLines = formatAddressLines(o.address || {
    line1: o.customer && o.customer.address1,
    line2: o.customer && o.customer.address2,
    city: o.customer && o.customer.city,
    postcode: o.customer && o.customer.postcode,
    country: o.customer && o.customer.country
  });
  const total = formatMoney(o.totalAmount, o.currency);
  const itemLines = itemsToPlainLines(items);

  const subject = `Your ${BRAND_NAME} order ${o.orderNumber || ''} is confirmed`.trim();

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Hello ${escapeHtml(customerName)},</p>
    <p style="margin:0 0 14px 0;">Thank you for your order — your payment was completed securely via Stripe and your order is now confirmed.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b6b6b;width:140px;">Order number</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(o.orderNumber || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Total paid</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(total)}</td></tr>
    </table>
    <h2 style="margin:0 0 8px 0;font-size:15px;color:#1f2533;">Items</h2>
    ${htmlList(itemLines.map(escapeHtml))}
    <h2 style="margin:18px 0 8px 0;font-size:15px;color:#1f2533;">Delivery address</h2>
    ${htmlList(addressLines.map(escapeHtml))}
    <p style="margin:18px 0 0 0;">${escapeHtml(BRAND_NAME)} will now begin preparing your order by hand. We'll email you again with courier and tracking details once it's on its way — there's nothing further you need to do right now.</p>
  `;

  const text = [
    `Hello ${customerName},`,
    '',
    'Thank you for your order — your payment was completed securely via Stripe and your order is now confirmed.',
    '',
    `Order number: ${o.orderNumber || '—'}`,
    `Total paid: ${total}`,
    '',
    'Items:',
    ...itemLines.map((l) => `  - ${l}`),
    '',
    'Delivery address:',
    ...addressLines.map((l) => `  ${l}`),
    '',
    `${BRAND_NAME} will now begin preparing your order by hand. We'll email you again with courier and tracking details once it's on its way.`,
    '',
    `Need help? Contact us via ${SUPPORT_WHATSAPP} or ${SUPPORT_EMAIL}.`,
    `Payments are processed securely by Stripe — ${BRAND_NAME} never sees or stores your card details.`
  ].join('\n');

  return {
    subject,
    html: wrapHtml({ heading: 'Order confirmed — thank you!', bodyHtml }),
    text
  };
}

/* ================================================================
   2. Admin new-order notification email
   ================================================================ */

function adminNewOrderEmail(order, opts) {
  const o = order || {};
  const o2 = opts || {};
  const customerName = o.customerName || (o.customer && o.customer.fullName) || '—';
  const customerEmail = o.customerEmail || (o.customer && o.customer.email) || '—';
  const customerPhone = o.customerPhone || (o.customer && o.customer.phone) || '—';
  const items = Array.isArray(o.items) ? o.items : (Array.isArray(o.basketItems) ? o.basketItems : []);
  const addressLines = formatAddressLines(o.address || {
    line1: o.customer && o.customer.address1,
    line2: o.customer && o.customer.address2,
    city: o.customer && o.customer.city,
    postcode: o.customer && o.customer.postcode,
    country: o.customer && o.customer.country
  });
  const total = formatMoney(o.totalAmount, o.currency);
  const itemLines = itemsToPlainLines(items);
  const adminUrl = o2.adminOrderUrl || null;

  const subject = `New paid order ${o.orderNumber || ''} — ${customerName}`.trim();

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">A new order has been paid via Stripe Checkout (test mode unless your live keys are connected).</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b6b6b;width:140px;">Order number</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(o.orderNumber || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Customer</td><td style="padding:4px 0;">${escapeHtml(customerName)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Email</td><td style="padding:4px 0;">${escapeHtml(customerEmail)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Phone / WhatsApp</td><td style="padding:4px 0;">${escapeHtml(customerPhone)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Total paid</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(total)}</td></tr>
    </table>
    <h2 style="margin:0 0 8px 0;font-size:15px;color:#1f2533;">Items</h2>
    ${htmlList(itemLines.map(escapeHtml))}
    <h2 style="margin:18px 0 8px 0;font-size:15px;color:#1f2533;">Delivery address</h2>
    ${htmlList(addressLines.map(escapeHtml))}
    <p style="margin:18px 0 0 0;">Open the admin order dashboard ${adminUrl ? `(<a href="${escapeHtml(adminUrl)}" style="color:#1f2533;">${escapeHtml(adminUrl)}</a>)` : 'locally, or once it is deployed,'} to view full details and update status, courier and tracking information.</p>
  `;

  const text = [
    'A new order has been paid via Stripe Checkout (test mode unless your live keys are connected).',
    '',
    `Order number: ${o.orderNumber || '—'}`,
    `Customer: ${customerName}`,
    `Email: ${customerEmail}`,
    `Phone / WhatsApp: ${customerPhone}`,
    `Total paid: ${total}`,
    '',
    'Items:',
    ...itemLines.map((l) => `  - ${l}`),
    '',
    'Delivery address:',
    ...addressLines.map((l) => `  ${l}`),
    '',
    adminUrl
      ? `Open the admin order dashboard to manage this order: ${adminUrl}`
      : 'Open the admin order dashboard locally (admin/orders/index.html), or once it is deployed, to manage this order.'
  ].join('\n');

  return {
    subject,
    html: wrapHtml({ heading: 'New paid order received', bodyHtml }),
    text
  };
}

/* ================================================================
   3. Customer dispatch / tracking email
   ================================================================ */

function customerDispatchEmail(order) {
  const o = order || {};
  const customerName = o.customerName || (o.customer && o.customer.fullName) || 'there';
  const courier = (typeof o.courier === 'string' && o.courier.trim()) ? o.courier.trim() : '';
  const trackingNumber = (typeof o.trackingNumber === 'string' && o.trackingNumber.trim()) ? o.trackingNumber.trim() : '';

  const subject = `Your ${BRAND_NAME} order ${o.orderNumber || ''} is on its way`.trim();

  const trackingRow = trackingNumber
    ? `<tr><td style="padding:4px 0;color:#6b6b6b;width:140px;">Tracking number</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(trackingNumber)}</td></tr>`
    : '';
  const trackingTextLine = trackingNumber ? `Tracking number: ${trackingNumber}` : 'Tracking number: not yet available — we will follow up if one becomes available.';

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Hello ${escapeHtml(customerName)},</p>
    <p style="margin:0 0 14px 0;">Good news — your order has been dispatched and is on its way to you.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;font-size:14px;">
      <tr><td style="padding:4px 0;color:#6b6b6b;width:140px;">Order number</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(o.orderNumber || '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#6b6b6b;">Courier</td><td style="padding:4px 0;">${escapeHtml(courier || 'To be confirmed')}</td></tr>
      ${trackingRow}
    </table>
    <p style="margin:0;">If you have any questions about delivery, just reply via ${escapeHtml(SUPPORT_WHATSAPP)} or ${escapeHtml(SUPPORT_EMAIL)} and we'll be glad to help.</p>
  `;

  const text = [
    `Hello ${customerName},`,
    '',
    'Good news — your order has been dispatched and is on its way to you.',
    '',
    `Order number: ${o.orderNumber || '—'}`,
    `Courier: ${courier || 'To be confirmed'}`,
    trackingTextLine,
    '',
    `If you have any questions about delivery, contact us via ${SUPPORT_WHATSAPP} or ${SUPPORT_EMAIL}.`
  ].join('\n');

  return {
    subject,
    html: wrapHtml({ heading: 'Your order is on its way', bodyHtml }),
    text
  };
}

module.exports = {
  escapeHtml,
  formatMoney,
  formatDate,
  customerConfirmationEmail,
  adminNewOrderEmail,
  customerDispatchEmail
};
