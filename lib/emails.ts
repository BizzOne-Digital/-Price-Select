// Transactional email templates. Email-safe HTML: tables, inline styles, web-safe fonts.
// `%BASE%` is replaced with the site origin (preview) or SITE.url (copied HTML) for image links.
import { getOrder, returnCases } from '@/lib/data/operations'
import { getProduct } from '@/lib/data/products'
import { date, money } from '@/lib/format'
import { SITE } from '@/lib/site'

const NAVY = '#14284a'
const GOLD = '#b8914f'
const INK = '#1d2430'
const MUTED = '#5f6b78'
const LINE = '#e6e1d6'
const BG = '#f4f0e8'
const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = 'Arial, Helvetica, sans-serif'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const h1 = (t: string) => `<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:30px;line-height:1.15;font-weight:normal;color:${NAVY};">${t}</h1>`
const p = (t: string, extra = '') => `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${INK};${extra}">${t}</p>`
const small = (t: string) => `<p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">${t}</p>`
const label = (t: string) => `<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${GOLD};font-weight:bold;">${t}</p>`
const rule = `<tr><td style="padding:8px 0;"><div style="height:1px;line-height:1px;background:${LINE};">&nbsp;</div></td></tr>`

function button(text: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>
<td style="background:${NAVY};border-radius:2px;"><a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:13px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${text}</a></td>
</tr></table>`
}

/** Two-column key/value table, e.g. order details or totals. */
function kv(rows: [string, string, boolean?][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows
    .map(
      ([k, v, strong]) =>
        `<tr><td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${strong ? INK : MUTED};${strong ? 'font-weight:bold;' : ''}">${k}</td><td align="right" style="padding:6px 0;font-family:${SANS};font-size:14px;color:${INK};${strong ? 'font-weight:bold;' : ''}">${v}</td></tr>`,
    )
    .join('')}</table>`
}

function items(lines: { name: string; qty: number; unitPrice: number }[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lines
    .map(
      (l) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};">${esc(l.name)}<br><span style="font-size:12px;color:${MUTED};">Qty ${l.qty} × ${money(l.unitPrice)}</span></td><td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};">${money(l.qty * l.unitPrice)}</td></tr>`,
    )
    .join('')}</table>`
}

/** Shared shell: preheader, logo, white card, footer. */
function layout(preheader: string, body: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Price-Select</title></head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td align="center" style="padding:0 0 24px;"><a href="${SITE.url}"><img src="%BASE%/pricelogo.png" width="150" alt="Price-Select" style="display:block;width:150px;height:auto;border:0;border-radius:4px;"></a></td></tr>
<tr><td style="background:#ffffff;padding:40px 36px;border-top:3px solid ${GOLD};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>${body}</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:24px 16px 0;">
${small(`Questions? Email us at <a href="mailto:${SITE.email}" style="color:${NAVY};">${SITE.email}</a>`)}
${small(`Price-Select.com · A business of ${SITE.parent}`)}
${small(`<a href="${SITE.url}/policies/terms" style="color:${MUTED};">Terms &amp; Conditions</a> · <a href="${SITE.url}/policies/privacy" style="color:${MUTED};">Privacy</a>`)}
</td></tr>
</table></td></tr></table>
</body></html>`
}

export type EmailTemplate = { id: string; name: string; trigger: string; subject: string; html: string }

export function buildEmails(): EmailTemplate[] {
  const o = getOrder('PS-240118')!
  const name = o.shipTo.name.split(' ')[0]
  const lines = o.fulfillments.flatMap((f) => f.lines)
  const shipped = o.fulfillments[0]
  const delivered = o.fulfillments[1]
  const rc = returnCases.find((r) => r.id === 'RC-3011')!
  const rcProduct = getProduct(rc.productSlug)!
  const sample = getProduct('meridian-studio-headphones') ?? lines.map((l) => getProduct(l.productSlug)!)[0]
  const orderUrl = `${SITE.url}/account/orders/${o.id}`

  return [
    {
      id: 'order-confirmation',
      name: 'Order confirmation',
      trigger: 'Sent immediately after checkout',
      subject: `Order ${o.id} confirmed — thank you`,
      html: layout(
        `We have received your order ${o.id}.`,
        `${label('Order confirmed')}${h1(`Thank you, ${esc(name)}.`)}
${p(`We have received your order <strong>${o.id}</strong> placed on ${date(o.placedAt)}. We will email you as each item ships.`)}
${p(`Your order includes items from ${o.fulfillments.length} suppliers, so it may arrive in separate shipments.`, `color:${MUTED};font-size:14px;`)}
${items(lines)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rule}</table>
${kv([['Subtotal', money(o.subtotal)], ['Member discount', o.discount ? `−${money(o.discount)}` : money(0)], ['Shipping', money(o.shipping)], ['Taxes', money(o.tax)], ['Total', money(o.total), true]])}
<div style="height:24px;"></div>
${button('View your order', orderUrl)}
${small(`Shipping to: ${esc(o.shipTo.name)}, ${esc(o.shipTo.city)}, ${esc(o.shipTo.region)}`)}`,
      ),
    },
    {
      id: 'shipping-update',
      name: 'Shipping update',
      trigger: 'Sent when a supplier uploads tracking',
      subject: `Part of your order ${o.id} has shipped`,
      html: layout(
        `Shipment ${shipped.id} is on its way.`,
        `${label('On its way')}${h1('Your shipment has left the warehouse.')}
${p(`Good news, ${esc(name)}. Shipment <strong>${shipped.id}</strong> from order ${o.id} is on its way.`)}
${kv([['Carrier', esc(shipped.carrier ?? '—')], ['Tracking number', esc(shipped.tracking ?? '—')], ['Estimated delivery', date(shipped.estimatedDelivery)]])}
<div style="height:16px;"></div>
${items(shipped.lines)}
<div style="height:24px;"></div>
${button('Track shipment', `${SITE.url}/account/track`)}
${small('Estimated delivery dates are projections, not guarantees. Other items in your order may arrive separately.')}`,
      ),
    },
    {
      id: 'delivered',
      name: 'Delivered',
      trigger: 'Sent when a shipment is marked delivered',
      subject: `Delivered: shipment ${delivered.id}`,
      html: layout(
        `Shipment ${delivered.id} has been delivered.`,
        `${label('Delivered')}${h1('Your delivery has arrived.')}
${p(`Shipment <strong>${delivered.id}</strong> from order ${o.id} was delivered. We hope it is exactly what you needed.`)}
${items(delivered.lines)}
<div style="height:24px;"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${BG};padding:18px 20px;border-left:3px solid ${GOLD};">
${p('<strong>Arrived damaged or defective?</strong> Please send photos within 48 hours of delivery so we can open a claim with the supplier.', 'margin:0;font-size:14px;')}
</td></tr></table>
<div style="height:24px;"></div>
${button('Report an issue', `${SITE.url}/account/returns`)}`,
      ),
    },
    {
      id: 'membership-welcome',
      name: 'Membership welcome',
      trigger: 'Sent when someone joins Member or Member Plus',
      subject: 'Welcome to Member Plus — your savings start now',
      html: layout(
        'Your Member Plus savings are active.',
        `${label('Member Plus')}${h1(`Welcome, ${esc(name)}. Your savings start now.`)}
${p('Thank you for joining Price-Select.com. Your membership is active and your discount applies to eligible purchases.')}
${kv([['Plan', 'Member Plus'], ['Discount', '25% off eligible purchases'], ['Membership fee', '$25 per year']])}
<div style="height:16px;"></div>
${p('<strong>Found it somewhere else?</strong> As a Member Plus member, you can send us any product you are trying to buy and we will find the same or similar at 25% less.')}
${button('Start shopping', `${SITE.url}/shop`)}
${small('Discounts apply only to the base price of products and do not reduce shipping costs, taxes, or duties. Memberships renew automatically each year unless cancelled in your account settings before the renewal date.')}`,
      ),
    },
    {
      id: 'price-find-request',
      name: 'Price-find request received',
      trigger: 'Sent when a Member Plus member submits a product to find',
      subject: 'We are on it — your price-find request',
      html: layout(
        'We received your price-find request.',
        `${label('Member Plus request')}${h1('We are looking for a better price.')}
${p(`Thanks, ${esc(name)}. We received the product you sent us and our team is searching our supplier network for the same or similar item at 25% less.`)}
${kv([['Request', 'PF-1042 (sample)'], ['Submitted', date('2026-10-06')]])}
<div style="height:16px;"></div>
${p('We will email you with what we find. There is nothing else you need to do for now.', `color:${MUTED};font-size:14px;`)}
${button('View my requests', `${SITE.url}/account`)}`,
      ),
    },
    {
      id: 'renewal-reminder',
      name: 'Membership renewal reminder',
      trigger: 'Sent 14 days before the membership renews',
      subject: 'Your Price-Select membership renews soon',
      html: layout(
        'Your membership renews automatically in 14 days.',
        `${label('Renewal reminder')}${h1('Your membership renews in 14 days.')}
${p(`Hi ${esc(name)}, this is a reminder that your Member Plus membership will renew automatically on <strong>${date('2026-10-22')}</strong> at the then-current rate.`)}
${kv([['Plan', 'Member Plus'], ['Renewal date', date('2026-10-22')], ['Current rate', '$25 per year']])}
<div style="height:16px;"></div>
${p('No action is needed to keep your savings. If you would like to cancel, you can do so in your account settings before the renewal date.', `color:${MUTED};font-size:14px;`)}
${button('Manage membership', `${SITE.url}/account/details`)}`,
      ),
    },
    {
      id: 'refund-processed',
      name: 'Return & refund update',
      trigger: 'Sent when a return case is resolved',
      subject: `Your refund for case ${rc.id} has been processed`,
      html: layout(
        `Refund processed for case ${rc.id}.`,
        `${label('Refund processed')}${h1('Your refund is on its way.')}
${p(`The supplier has confirmed your return for <strong>${esc(rcProduct.name)}</strong> (order ${rc.orderId}). We have issued a refund to your original payment method.`)}
${kv([['Case', rc.id], ['Item', esc(rcProduct.name)], ['Refund amount', money(rcProduct.price)]])}
<div style="height:16px;"></div>
${p('Depending on your bank, it can take a few business days for the refund to appear on your statement.', `color:${MUTED};font-size:14px;`)}
${button('View case', `${SITE.url}/account/returns`)}`,
      ),
    },
    {
      id: 'cart-reminder',
      name: 'Cart reminder',
      trigger: 'Sent 24 hours after a cart is left without checkout (marketing, opt-in only)',
      subject: 'Still thinking it over?',
      html: layout(
        'The item in your cart is still waiting.',
        `${label('Saved in your cart')}${h1('Still thinking it over?')}
${p(`You left <strong>${esc(sample.name)}</strong> in your cart. It is still there whenever you are ready.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="120" valign="top" style="padding:8px 16px 8px 0;"><img src="${sample.images[0].src}" width="120" alt="${esc(sample.images[0].alt)}" style="display:block;width:120px;height:auto;border:0;"></td>
<td valign="top" style="padding:8px 0;font-family:${SANS};font-size:14px;color:${INK};"><strong>${esc(sample.name)}</strong><br><span style="color:${MUTED};">${esc(sample.brand)}</span><br><br>${money(sample.price)}</td>
</tr></table>
<div style="height:16px;"></div>
${button('Return to cart', `${SITE.url}/cart`)}
${p('<strong>Members save up to 25%</strong> on eligible purchases.', `font-size:14px;color:${MUTED};`)}
${small(`You are receiving this because you opted in to reminder emails. <a href="${SITE.url}/account/details" style="color:${MUTED};">Unsubscribe</a>`)}`,
      ),
    },
  ]
}
