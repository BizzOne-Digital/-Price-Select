export const SITE = {
  name: 'Price-Select',
  domain: 'price-select.com',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://price-select.com',
  parent: 'Jr-Procurement.com',
  parentUrl: 'https://jr-procurement.com',
  email: 'julio.rivera.ht@gmail.com',
  tagline: 'Price-Select. Just for you.',
  description:
    'A curated marketplace by Jr-Procurement.com connecting customers with approved suppliers across technology, construction, mobility, energy, home, family and everyday essentials.',
}

export const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/categories', label: 'Categories' },
  { href: '/about', label: 'About Us' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/team', label: 'Our Team' },
  { href: '/contact', label: 'Contact' },
]

/** Initial placeholder service targets. Must be agreed with suppliers before launch. */
export const SERVICE_TARGETS = [
  { label: 'Supplier order acknowledgment', value: '1', unit: 'business day', detail: 'Supplier confirms each routed order.' },
  { label: 'Tracking upload after shipment', value: '24', unit: 'hours', detail: 'Carrier and tracking number submitted after dispatch.' },
  { label: 'Escalated support response', value: '1', unit: 'business day', detail: 'Response to escalated customer requests.' },
  { label: 'Inventory updates', value: 'Daily', unit: 'minimum', detail: 'More frequent where API or EDI feeds are connected.' },
]

/** Open items the client must confirm before launch. Surfaced in admin settings. */
export const TO_CONFIRM = [
  'Launch countries and currencies',
  'Payment provider',
  'Shipping carriers',
  'Supplier fees or commissions',
  'Tax handling',
  'Return windows',
  'Order-processing service targets',
]
