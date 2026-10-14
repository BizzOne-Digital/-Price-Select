// Transactional email templates. Email-safe HTML: tables, inline styles, web-safe fonts.
// `%BASE%` is replaced with the site origin (preview) or SITE.url (copied HTML / sent mail) for image links.
// Templates take explicit, already-scoped data. Previews use clearly fictional sample data only.
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

type Lines = { name: string; qty: number; unitPrice: number }[]

/** Data each transactional template needs. Amounts are dollars. */
export type EmailData = {
  'order-confirmation': {
    name: string
    orderId: string
    placedAt: string
    lines: Lines
    suppliers: number
    subtotal: number
    discount: number
    shipping: number
    tax: number
    total: number
    shipTo: { name: string; city: string; region: string }
    /** Guest orders: a private tracking link carrying the access token. */
    url?: string
  }
  'shipping-update': { name: string; orderId: string; shipmentId: string; carrier: string; tracking: string; estimatedDelivery?: string; lines: Lines }
  delivered: { orderId: string; shipmentId: string; lines: Lines }
  'membership-welcome': { name: string; plan: string; discountPct: number; fee: string }
  'renewal-reminder': { name: string; plan: string; renewsAt: string; fee: string }
  'refund-processed': { caseId: string; orderId: string; item: string; amount: number }
  'password-reset': { name: string; url: string }
  notice: { title: string; body: string; cta?: { label: string; url: string } }
}
export type EmailTemplateId = keyof EmailData

const first = (n: string) => esc(n.split(' ')[0] || n)

const RENDER: { [K in EmailTemplateId]: (d: EmailData[K]) => { subject: string; html: string } } = {
  'order-confirmation': (o) => ({
    subject: `Order ${o.orderId} confirmed — thank you`,
    html: layout(
      `We have received your order ${esc(o.orderId)}.`,
      `${label('Order confirmed')}${h1(`Thank you, ${first(o.name)}.`)}
${p(`We have received your order <strong>${esc(o.orderId)}</strong> placed on ${date(o.placedAt)}. We will email you as each item ships.`)}
${o.suppliers > 1 ? p(`Your order includes items from ${o.suppliers} suppliers, so it may arrive in separate shipments.`, `color:${MUTED};font-size:14px;`) : ''}
${items(o.lines)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rule}</table>
${kv([['Subtotal', money(o.subtotal)], ['Member discount', o.discount ? `−${money(o.discount)}` : money(0)], ['Shipping', money(o.shipping)], ['Taxes', money(o.tax)], ['Total', money(o.total), true]])}
<div style="height:24px;"></div>
${button('View your order', o.url ?? `${SITE.url}/account/orders/${encodeURIComponent(o.orderId)}`)}
${small(`Shipping to: ${esc(o.shipTo.name)}, ${esc(o.shipTo.city)}, ${esc(o.shipTo.region)}`)}`,
    ),
  }),
  'shipping-update': (s) => ({
    subject: `Part of your order ${s.orderId} has shipped`,
    html: layout(
      `Shipment ${esc(s.shipmentId)} is on its way.`,
      `${label('On its way')}${h1('Your shipment has left the warehouse.')}
${p(`Good news, ${first(s.name)}. Shipment <strong>${esc(s.shipmentId)}</strong> from order ${esc(s.orderId)} is on its way.`)}
${kv([['Carrier', esc(s.carrier)], ['Tracking number', esc(s.tracking)], ['Estimated delivery', s.estimatedDelivery ? date(s.estimatedDelivery) : '—']])}
<div style="height:16px;"></div>
${items(s.lines)}
<div style="height:24px;"></div>
${button('Track shipment', `${SITE.url}/account/track`)}
${small('Estimated delivery dates are projections, not guarantees. Other items in your order may arrive separately.')}`,
    ),
  }),
  delivered: (s) => ({
    subject: `Delivered: shipment ${s.shipmentId}`,
    html: layout(
      `Shipment ${esc(s.shipmentId)} has been delivered.`,
      `${label('Delivered')}${h1('Your delivery has arrived.')}
${p(`Shipment <strong>${esc(s.shipmentId)}</strong> from order ${esc(s.orderId)} was delivered. We hope it is exactly what you needed.`)}
${items(s.lines)}
<div style="height:24px;"></div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${BG};padding:18px 20px;border-left:3px solid ${GOLD};">
${p('<strong>Arrived damaged or defective?</strong> Please send photos within 48 hours of delivery so we can open a claim with the supplier.', 'margin:0;font-size:14px;')}
</td></tr></table>
<div style="height:24px;"></div>
${button('Report an issue', `${SITE.url}/account/returns`)}`,
    ),
  }),
  'membership-welcome': (m) => ({
    subject: `Welcome to ${m.plan} — your savings start now`,
    html: layout(
      `Your ${esc(m.plan)} savings are active.`,
      `${label(esc(m.plan))}${h1(`Welcome, ${first(m.name)}. Your savings start now.`)}
${p('Thank you for joining Price-Select.com. Your membership is active and your discount applies to eligible purchases.')}
${kv([['Plan', esc(m.plan)], ['Discount', `${m.discountPct}% off eligible purchases`], ['Membership fee', esc(m.fee)]])}
<div style="height:16px;"></div>
${button('Start shopping', `${SITE.url}/shop`)}
${small('Discounts apply only to the base price of products and do not reduce shipping costs, taxes, or duties. Memberships renew automatically each year unless cancelled in your account settings before the renewal date.')}`,
    ),
  }),
  'renewal-reminder': (r) => ({
    subject: 'Your Price-Select membership renews soon',
    html: layout(
      'Your membership renews automatically soon.',
      `${label('Renewal reminder')}${h1('Your membership renews soon.')}
${p(`Hi ${first(r.name)}, this is a reminder that your ${esc(r.plan)} membership will renew automatically on <strong>${date(r.renewsAt)}</strong> at the then-current rate.`)}
${kv([['Plan', esc(r.plan)], ['Renewal date', date(r.renewsAt)], ['Current rate', esc(r.fee)]])}
<div style="height:16px;"></div>
${p('No action is needed to keep your savings. If you would like to cancel, you can do so in your account settings before the renewal date.', `color:${MUTED};font-size:14px;`)}
${button('Manage membership', `${SITE.url}/account/details`)}`,
    ),
  }),
  'refund-processed': (r) => ({
    subject: `Your refund for case ${r.caseId} has been processed`,
    html: layout(
      `Refund processed for case ${esc(r.caseId)}.`,
      `${label('Refund processed')}${h1('Your refund is on its way.')}
${p(`Your refund for <strong>${esc(r.item)}</strong> (order ${esc(r.orderId)}) has been issued to your original payment method.`)}
${kv([['Case', esc(r.caseId)], ['Item', esc(r.item)], ['Refund amount', money(r.amount)]])}
<div style="height:16px;"></div>
${p('Depending on your bank, it can take a few business days for the refund to appear on your statement.', `color:${MUTED};font-size:14px;`)}
${button('View case', `${SITE.url}/account/returns`)}`,
    ),
  }),
  'password-reset': (r) => ({
    subject: 'Reset your Price-Select password',
    html: layout(
      'A link to reset your password.',
      `${label('Account security')}${h1('Reset your password.')}
${p(`Hi ${first(r.name)}, we received a request to reset your password. The link below expires in one hour.`)}
${button('Choose a new password', r.url)}
${small('If you did not request this, you can ignore this email. Your password will not change.')}`,
    ),
  }),
  notice: (n) => ({ subject: n.title, html: layout(esc(n.title), `${h1(esc(n.title))}${p(esc(n.body))}${n.cta ? button(esc(n.cta.label), n.cta.url) : ''}`) }),
}

export function renderEmail<K extends EmailTemplateId>(id: K, data: EmailData[K]) {
  return (RENDER[id] as (d: EmailData[K]) => { subject: string; html: string })(data)
}

/**
 * Template gallery for /templates/emails. Every value below is FICTIONAL sample content written for
 * the preview; no live order, customer or case record is ever read here.
 */
export function buildEmails(): EmailTemplate[] {
  const lines = [
    { name: 'Sample Power Station', qty: 1, unitPrice: 799 },
    { name: 'Sample Solar Panel', qty: 2, unitPrice: 259 },
  ]
  const shipTo = { name: 'Sample Customer', city: 'Sample City', region: 'Sample Region' }
  const t = <K extends EmailTemplateId>(id: K, name: string, trigger: string, data: EmailData[K]): EmailTemplate => ({ id, name, trigger, ...renderEmail(id, data) })
  return [
    t('order-confirmation', 'Order confirmation', 'Sent once payment is confirmed', { name: 'Sample Customer', orderId: 'PS-000000', placedAt: '2026-01-15T12:00:00Z', lines, suppliers: 2, subtotal: 1317, discount: 0, shipping: 30, tax: 0, total: 1347, shipTo }),
    t('shipping-update', 'Shipping update', 'Sent when a supplier uploads tracking', { name: 'Sample Customer', orderId: 'PS-000000', shipmentId: 'PS-000000-A', carrier: 'Sample carrier', tracking: 'SAMPLE000000', estimatedDelivery: '2026-01-22', lines }),
    t('delivered', 'Delivered', 'Sent when a shipment is marked delivered', { orderId: 'PS-000000', shipmentId: 'PS-000000-B', lines: lines.slice(0, 1) }),
    t('membership-welcome', 'Membership welcome', 'Sent when a paid membership activates', { name: 'Sample Customer', plan: 'Member Plus', discountPct: 25, fee: '$25 per year' }),
    t('renewal-reminder', 'Membership renewal reminder', 'Sent 14 days before the membership renews', { name: 'Sample Customer', plan: 'Member Plus', renewsAt: '2026-02-01', fee: '$25 per year' }),
    t('refund-processed', 'Return & refund update', 'Sent when the payment provider confirms a refund', { caseId: 'RC-0000', orderId: 'PS-000000', item: 'Sample Solar Panel', amount: 259 }),
    t('password-reset', 'Password reset', 'Sent when someone requests a password reset', { name: 'Sample Customer', url: `${SITE.url}/sign-in/reset?token=sample` }),
  ]
}

