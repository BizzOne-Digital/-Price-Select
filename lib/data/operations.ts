import type { Customer, Fulfillment, Notification, Order, OrderLine, ReturnCase, SupportTicket } from '@/lib/types'
import { getProduct } from './products'

// DEMONSTRATION OPERATIONS DATA. Customers, orders, cases and figures are sample records for
// interface design only. No real customer, payment or carrier data is represented.

export const DEMO_CUSTOMER_ID = 'cus-1001'

const customerSeed: Customer[] = [
  { id: 'cus-1001', name: 'Demo Customer', email: 'customer@example.com', joined: '2026-04-02', orders: 3, status: 'active', lifetimeValue: 4386 },
  { id: 'cus-1002', name: 'Customer B', email: 'customer.b@example.com', joined: '2026-05-18', orders: 1, status: 'active', lifetimeValue: 8490 },
  { id: 'cus-1003', name: 'Customer C', email: 'customer.c@example.com', joined: '2026-06-30', orders: 2, status: 'active', lifetimeValue: 642 },
  { id: 'cus-1004', name: 'Guest checkout', email: 'guest@example.com', joined: '2026-09-12', orders: 1, status: 'guest', lifetimeValue: 129 },
  { id: 'cus-1005', name: 'Customer E', email: 'customer.e@example.com', joined: '2026-02-21', orders: 4, status: 'active', lifetimeValue: 3120 },
  { id: 'cus-1006', name: 'Customer F', email: 'customer.f@example.com', joined: '2026-03-07', orders: 0, status: 'suspended', lifetimeValue: 0 },
]

const line = (slug: string, qty = 1): OrderLine => {
  const p = getProduct(slug)!
  return { productSlug: slug, name: p.name, qty, unitPrice: p.price }
}

const ff = (f: Omit<Fulfillment, 'blindShip'> & { blindShip?: boolean }): Fulfillment => ({ blindShip: true, ...f })

function order(o: Omit<Order, 'subtotal' | 'total'>): Order {
  const subtotal = o.fulfillments.flatMap((f) => f.lines).reduce((s, l) => s + l.qty * l.unitPrice, 0)
  return { ...o, subtotal, total: subtotal + o.shipping + o.tax - o.discount }
}

export const orders: Order[] = [
  order({
    id: 'PS-240118', customerId: 'cus-1001', placedAt: '2026-09-28T14:20:00Z', status: 'shipped', payment: 'captured',
    shipTo: { name: 'Demo Customer', city: 'Demo City', region: 'Demo Region' }, shipping: 48, tax: 0, discount: 0,
    fulfillments: [
      ff({
        id: 'PS-240118-A', supplierId: 'sup-helios', status: 'shipped', carrier: 'Carrier (demo)', tracking: 'DEMO1Z84720193', shippingCost: 32,
        estimatedDelivery: '2026-10-08', lines: [line('solara-power-station'), line('aurum-mono-panel-410', 2)],
        history: [
          { status: 'pending', at: '2026-09-28T14:20:00Z', note: 'Order placed and payment authorized.' },
          { status: 'confirmed', at: '2026-09-28T17:02:00Z', note: 'Supplier acknowledged the order.' },
          { status: 'processing', at: '2026-09-29T09:15:00Z', note: 'Packed in neutral Price-Select packaging.' },
          { status: 'shipped', at: '2026-09-30T11:40:00Z', note: 'Tracking number uploaded.' },
        ],
      }),
      ff({
        id: 'PS-240118-B', supplierId: 'sup-current', status: 'delivered', carrier: 'Carrier (demo)', tracking: 'DEMO9400110298', shippingCost: 16,
        estimatedDelivery: '2026-10-02', lines: [line('halo-gravel-e-bike')],
        history: [
          { status: 'pending', at: '2026-09-28T14:20:00Z', note: 'Order placed.' },
          { status: 'confirmed', at: '2026-09-28T15:10:00Z', note: 'Supplier acknowledged the order.' },
          { status: 'processing', at: '2026-09-28T18:00:00Z', note: 'Preparing shipment.' },
          { status: 'shipped', at: '2026-09-29T10:30:00Z', note: 'Tracking number uploaded.' },
          { status: 'delivered', at: '2026-10-02T13:05:00Z', note: 'Delivered.' },
        ],
      }),
    ],
  }),
  order({
    id: 'PS-240092', customerId: 'cus-1001', placedAt: '2026-09-12T10:05:00Z', status: 'delivered', payment: 'captured',
    shipTo: { name: 'Demo Customer', city: 'Demo City', region: 'Demo Region' }, shipping: 0, tax: 0, discount: 0,
    fulfillments: [
      ff({
        id: 'PS-240092-A', supplierId: 'sup-northline', status: 'delivered', carrier: 'Carrier (demo)', tracking: 'DEMO7731002918', shippingCost: 0,
        estimatedDelivery: '2026-09-17', lines: [line('meridian-studio-headphones'), line('essential-cotton-tee', 2)],
        history: [
          { status: 'pending', at: '2026-09-12T10:05:00Z', note: 'Order placed.' },
          { status: 'confirmed', at: '2026-09-12T12:00:00Z', note: 'Supplier acknowledged the order.' },
          { status: 'shipped', at: '2026-09-13T16:20:00Z', note: 'Tracking number uploaded.' },
          { status: 'delivered', at: '2026-09-16T11:45:00Z', note: 'Delivered.' },
        ],
      }),
    ],
  }),
  order({
    id: 'PS-240131', customerId: 'cus-1001', placedAt: '2026-10-04T19:44:00Z', status: 'processing', payment: 'authorized',
    shipTo: { name: 'Demo Customer', city: 'Demo City', region: 'Demo Region' }, shipping: 120, tax: 0, discount: 0,
    fulfillments: [
      ff({
        id: 'PS-240131-A', supplierId: 'sup-hearth', status: 'processing', shippingCost: 120, estimatedDelivery: '2026-10-16',
        lines: [line('field-dining-set')],
        history: [
          { status: 'pending', at: '2026-10-04T19:44:00Z', note: 'Order placed.' },
          { status: 'confirmed', at: '2026-10-05T08:30:00Z', note: 'Supplier acknowledged the order.' },
          { status: 'processing', at: '2026-10-05T14:00:00Z', note: 'Scheduling freight delivery.' },
        ],
      }),
    ],
  }),
  order({
    id: 'PS-240127', customerId: 'cus-1002', placedAt: '2026-10-02T09:12:00Z', status: 'confirmed', payment: 'authorized',
    shipTo: { name: 'Customer B', city: 'Demo City', region: 'Demo Region' }, shipping: 450, tax: 0, discount: 0,
    fulfillments: [
      ff({
        id: 'PS-240127-A', supplierId: 'sup-terra', status: 'confirmed', shippingCost: 450, estimatedDelivery: '2026-11-04', blindShip: false,
        lines: [line('atlas-utility-cart')],
        history: [
          { status: 'pending', at: '2026-10-02T09:12:00Z', note: 'Order placed.' },
          { status: 'confirmed', at: '2026-10-03T15:40:00Z', note: 'Supplier acknowledged. Freight delivery; blind shipping not available for this item.' },
        ],
      }),
    ],
  }),
  order({
    id: 'PS-240135', customerId: 'cus-1003', placedAt: '2026-10-05T16:30:00Z', status: 'pending', payment: 'pending',
    shipTo: { name: 'Customer C', city: 'Demo City', region: 'Demo Region' }, shipping: 24, tax: 0, discount: 0,
    fulfillments: [
      ff({ id: 'PS-240135-A', supplierId: 'sup-cradle', status: 'pending', shippingCost: 12, estimatedDelivery: '2026-10-12', lines: [line('nest-organic-swaddle-set'), line('timber-heritage-train')], history: [{ status: 'pending', at: '2026-10-05T16:30:00Z', note: 'Awaiting supplier acknowledgment.' }] }),
      ff({ id: 'PS-240135-B', supplierId: 'sup-keystone', status: 'pending', shippingCost: 12, estimatedDelivery: '2026-10-13', lines: [line('forge-20v-drill-driver')], history: [{ status: 'pending', at: '2026-10-05T16:30:00Z', note: 'Awaiting supplier acknowledgment.' }] }),
      ff({ id: 'PS-240135-C', supplierId: 'sup-helios', status: 'confirmed', shippingCost: 0, estimatedDelivery: '2026-10-11', lines: [line('aurum-mono-panel-410')], history: [{ status: 'pending', at: '2026-10-05T16:30:00Z', note: 'Order placed.' }, { status: 'confirmed', at: '2026-10-05T18:00:00Z', note: 'Supplier acknowledged.' }] }),
    ],
  }),
  order({
    id: 'PS-240104', customerId: 'cus-1005', placedAt: '2026-09-20T12:00:00Z', status: 'returned', payment: 'refunded',
    shipTo: { name: 'Customer E', city: 'Demo City', region: 'Demo Region' }, shipping: 18, tax: 0, discount: 0,
    fulfillments: [
      ff({ id: 'PS-240104-A', supplierId: 'sup-northline', status: 'returned', carrier: 'Carrier (demo)', tracking: 'DEMO5521098811', shippingCost: 18, estimatedDelivery: '2026-09-25', lines: [line('tonal-bookshelf-speaker')], history: [{ status: 'pending', at: '2026-09-20T12:00:00Z', note: 'Order placed.' }, { status: 'shipped', at: '2026-09-21T10:00:00Z', note: 'Shipped.' }, { status: 'delivered', at: '2026-09-24T15:00:00Z', note: 'Delivered.' }, { status: 'returned', at: '2026-10-01T09:00:00Z', note: 'Return received by supplier. Refund issued.' }] }),
    ],
  }),
  order({
    id: 'PS-240099', customerId: 'cus-1004', placedAt: '2026-09-15T08:00:00Z', status: 'canceled', payment: 'refunded',
    shipTo: { name: 'Guest', city: 'Demo City', region: 'Demo Region' }, shipping: 0, tax: 0, discount: 0,
    fulfillments: [
      ff({ id: 'PS-240099-A', supplierId: 'sup-current', status: 'canceled', shippingCost: 0, estimatedDelivery: '2026-09-20', lines: [line('halo-gravel-e-bike')], history: [{ status: 'pending', at: '2026-09-15T08:00:00Z', note: 'Order placed.' }, { status: 'canceled', at: '2026-09-15T09:30:00Z', note: 'Canceled at customer request before dispatch.' }] }),
    ],
  }),
]

/** Order counts and lifetime value derived from the orders above, so figures always agree. */
export const customers: Customer[] = customerSeed.map((c) => {
  const own = orders.filter((o) => o.customerId === c.id)
  return { ...c, orders: own.length, lifetimeValue: own.filter((o) => o.status !== 'canceled' && o.payment !== 'refunded').reduce((s, o) => s + o.total, 0) }
})

export const getOrder = (id: string) => orders.find((o) => o.id === id)
export const ordersFor = (customerId: string) => orders.filter((o) => o.customerId === customerId)
/** Supplier isolation: a supplier only ever receives its own fulfillments. */
export const fulfillmentsFor = (supplierId: string) =>
  orders.flatMap((o) => o.fulfillments.filter((f) => f.supplierId === supplierId).map((f) => ({ orderId: o.id, placedAt: o.placedAt, shipTo: o.shipTo, fulfillment: f })))

export const returnCases: ReturnCase[] = [
  {
    id: 'RC-3011', orderId: 'PS-240104', customerId: 'cus-1005', supplierId: 'sup-northline', productSlug: 'tonal-bookshelf-speaker', type: 'return',
    reason: 'Not as expected', status: 'resolved', openedAt: '2026-09-26T10:00:00Z', supplierRespondedAt: '2026-09-26T15:20:00Z',
    resolution: 'Return received in original condition. Refund issued to original payment method.', outcome: 'refund',
    notes: [
      { by: 'Customer', role: 'customer', at: '2026-09-26T10:00:00Z', text: 'Sound profile is not what I expected. Unopened accessories.' },
      { by: 'Northline Supply Co.', role: 'supplier', at: '2026-09-26T15:20:00Z', text: 'Return approved. Label issued.' },
      { by: 'Support team', role: 'support', at: '2026-10-01T09:30:00Z', text: 'Item received. Refund initiated.' },
    ],
  },
  {
    id: 'RC-3018', orderId: 'PS-240118', customerId: 'cus-1001', supplierId: 'sup-current', productSlug: 'halo-gravel-e-bike', type: 'damage',
    reason: 'Arrived damaged', status: 'awaiting_supplier', openedAt: '2026-10-03T08:10:00Z',
    notes: [{ by: 'Customer', role: 'customer', at: '2026-10-03T08:10:00Z', text: 'Rear mudguard cracked on arrival. Photos attached.' }],
  },
  {
    id: 'RC-3020', orderId: 'PS-240092', customerId: 'cus-1001', supplierId: 'sup-northline', productSlug: 'essential-cotton-tee', type: 'replacement',
    reason: 'Wrong size', status: 'approved', openedAt: '2026-10-01T12:00:00Z', supplierRespondedAt: '2026-10-01T16:45:00Z', outcome: 'replacement',
    notes: [{ by: 'Customer', role: 'customer', at: '2026-10-01T12:00:00Z', text: 'Requesting size L instead of M.' }, { by: 'Northline Supply Co.', role: 'supplier', at: '2026-10-01T16:45:00Z', text: 'Replacement approved.' }],
  },
  {
    id: 'RC-3022', orderId: 'PS-240135', customerId: 'cus-1003', supplierId: 'sup-keystone', productSlug: 'forge-20v-drill-driver', type: 'cancellation',
    reason: 'Ordered by mistake', status: 'escalated', openedAt: '2026-10-05T18:00:00Z',
    notes: [{ by: 'Customer', role: 'customer', at: '2026-10-05T18:00:00Z', text: 'Please cancel the drill only.' }, { by: 'Support team', role: 'support', at: '2026-10-06T00:10:00Z', text: 'Escalated: supplier has not acknowledged within target.' }],
  },
  {
    id: 'RC-3024', orderId: 'PS-240118', customerId: 'cus-1001', supplierId: 'sup-helios', productSlug: 'aurum-mono-panel-410', type: 'damage',
    reason: 'Frame corner dented in transit', status: 'awaiting_supplier', openedAt: '2026-10-05T13:20:00Z',
    notes: [
      { by: 'Customer', role: 'customer', at: '2026-10-05T13:20:00Z', text: 'One of the two panels has a dented frame corner. Photos attached to the case.' },
      { by: 'Support team', role: 'support', at: '2026-10-05T15:05:00Z', text: 'Routed to supplier for a replacement or return decision.' },
    ],
  },
  {
    id: 'RC-3019', orderId: 'PS-240135', customerId: 'cus-1003', supplierId: 'sup-helios', productSlug: 'aurum-mono-panel-410', type: 'cancellation',
    reason: 'Customer changed array size', status: 'open', openedAt: '2026-10-06T06:40:00Z',
    notes: [{ by: 'Customer', role: 'customer', at: '2026-10-06T06:40:00Z', text: 'Please cancel the panel if it has not been dispatched yet.' }],
  },
  {
    id: 'RC-3007', orderId: 'PS-240118', customerId: 'cus-1001', supplierId: 'sup-helios', productSlug: 'solara-power-station', type: 'support',
    reason: 'Question about solar input cable', status: 'resolved', openedAt: '2026-09-30T16:00:00Z', supplierRespondedAt: '2026-09-30T21:30:00Z',
    resolution: 'Supplier confirmed the cable is included in the accessory pouch.', outcome: 'none',
    notes: [
      { by: 'Customer', role: 'customer', at: '2026-09-30T16:00:00Z', text: 'Is the solar input cable included?' },
      { by: 'Helios Energy Distribution', role: 'supplier', at: '2026-09-30T21:30:00Z', text: 'Yes, it is in the accessory pouch under the handle.' },
    ],
  },
]

export const tickets: SupportTicket[] = [
  { id: 'SC-7104', subject: 'Delivery window for freight order', customerId: 'cus-1002', orderId: 'PS-240127', priority: 'normal', status: 'open', assignee: 'Support agent', openedAt: '2026-10-04T11:00:00Z', slaDue: '2026-10-05T11:00:00Z' },
  { id: 'SC-7108', subject: 'Damaged mudguard on delivery', customerId: 'cus-1001', orderId: 'PS-240118', priority: 'high', status: 'awaiting_supplier', assignee: 'Support agent', openedAt: '2026-10-03T08:15:00Z', slaDue: '2026-10-04T08:15:00Z' },
  { id: 'SC-7110', subject: 'Cancel one item from split order', customerId: 'cus-1003', orderId: 'PS-240135', priority: 'urgent', status: 'escalated', openedAt: '2026-10-05T18:05:00Z', slaDue: '2026-10-06T18:05:00Z' },
  { id: 'SC-7111', subject: 'Question about seasonal pricing', customerId: 'cus-1005', priority: 'low', status: 'resolved', assignee: 'Support agent', openedAt: '2026-10-02T09:00:00Z', slaDue: '2026-10-03T09:00:00Z' },
]

export const notifications: Notification[] = [
  { id: 'n1', event: 'order_shipped', title: 'Order PS-240118 shipped', body: 'Solara Power Station and 1 more item are on the way.', at: '2026-09-30T11:40:00Z', read: false },
  { id: 'n2', event: 'order_delivered', title: 'Part of PS-240118 delivered', body: 'Halo Gravel E-Bike was delivered.', at: '2026-10-02T13:05:00Z', read: false },
  { id: 'n3', event: 'return_approved', title: 'Replacement approved', body: 'RC-3020 — a replacement is being prepared.', at: '2026-10-01T16:45:00Z', read: true },
  { id: 'n4', event: 'support_escalation', title: 'Case escalated', body: 'RC-3022 exceeded the supplier acknowledgment target.', at: '2026-10-06T00:10:00Z', read: false },
  { id: 'n5', event: 'order_delayed', title: 'Inventory feed delayed', body: 'Keystone Build Supply last synced 30 hours ago.', at: '2026-10-05T23:00:00Z', read: false },
]

/** Demonstration series for chart layouts only. Not real performance data. */
export const analytics = {
  revenueByWeek: [
    { label: 'W32', value: 18200 }, { label: 'W33', value: 21400 }, { label: 'W34', value: 19800 }, { label: 'W35', value: 24600 },
    { label: 'W36', value: 23100 }, { label: 'W37', value: 27900 }, { label: 'W38', value: 26300 }, { label: 'W39', value: 31200 },
    { label: 'W40', value: 29800 }, { label: 'W41', value: 34500 },
  ],
  ordersByWeek: [
    { label: 'W32', value: 41 }, { label: 'W33', value: 48 }, { label: 'W34', value: 44 }, { label: 'W35', value: 57 },
    { label: 'W36', value: 52 }, { label: 'W37', value: 63 }, { label: 'W38', value: 60 }, { label: 'W39', value: 71 },
    { label: 'W40', value: 66 }, { label: 'W41', value: 78 },
  ],
  byCategory: [
    { label: 'Solar & Energy', value: 31 }, { label: 'Utility Vehicles', value: 22 }, { label: 'Electronics', value: 17 },
    { label: 'Home & Garden', value: 12 }, { label: 'E-Bikes', value: 9 }, { label: 'Construction', value: 5 },
    { label: 'Baby & Kids', value: 3 }, { label: 'General', value: 1 },
  ],
  fulfillment: [
    { label: 'Acknowledged on target', value: 92 }, { label: 'Tracking on target', value: 94 }, { label: 'Delivered on estimate', value: 89 },
  ],
}
