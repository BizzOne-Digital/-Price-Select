// Domain types. Shaped so the mock data in lib/data can be swapped for an API or database later.

export type Role = 'customer' | 'supplier' | 'admin' | 'support'

export type CategorySlug =
  | 'electronics'
  | 'construction-building-supplies'
  | 'utility-vehicles'
  | 'e-bikes-mobility'
  | 'solar-power-energy'
  | 'baby-kids'
  | 'home-garden'
  | 'general-merchandise'

export interface Category {
  slug: CategorySlug
  name: string
  short: string
  description: string
  includes: string[]
  image: string
  imageAlt: string
  /** Categories that need additional compliance review before listings publish. */
  reviewLevel: 'standard' | 'enhanced'
  reviewNote?: string
}

export type StockStatus = 'in_stock' | 'low_stock' | 'made_to_order' | 'out_of_stock'

export interface ProductImage {
  src: string
  alt: string
}

export interface Product {
  slug: string
  sku: string
  name: string
  brand: string
  category: CategorySlug
  supplierId: string
  price: number
  /** Optional seasonal price. Demo values only until promotions are configured in admin. */
  seasonalPrice?: number
  currency: 'USD'
  images: ProductImage[]
  summary: string
  description: string
  specs: { label: string; value: string }[]
  stock: StockStatus
  stockQty: number
  handlingDays: number
  deliveryEstimate: string
  weightKg: number
  dimensions: string
  upc?: string
  compliance: { label: string; status: 'on_file' | 'pending' | 'required' }[]
  tag?: 'Selected' | 'New arrival' | 'Seasonal' | 'Limited'
  featured?: boolean
  seasonal?: boolean
  status: 'published' | 'pending_review' | 'flagged' | 'suspended'
}

export type SupplierStatus = 'applied' | 'under_review' | 'approved' | 'suspended' | 'rejected'
export type Integration = 'API' | 'EDI' | 'CSV' | 'Manual'

export interface Supplier {
  id: string
  name: string
  region: string
  categories: CategorySlug[]
  status: SupplierStatus
  integration: Integration
  joined: string
  products: number
  contactName: string
  contactEmail: string
  metrics: {
    acknowledgmentHours: number
    trackingCompliance: number
    fulfillmentRate: number
    responseHours: number
    returnRate: number
  }
  documents: { label: string; status: 'on_file' | 'pending' | 'expired' }[]
  feed: { status: 'healthy' | 'delayed' | 'failed' | 'manual'; lastSync: string }
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'returned'

export interface OrderLine {
  productSlug: string
  name: string
  qty: number
  unitPrice: number
}

/** One supplier's share of a customer order. Suppliers only ever see their own fulfillments. */
export interface Fulfillment {
  id: string
  supplierId: string
  status: OrderStatus
  lines: OrderLine[]
  carrier?: string
  tracking?: string
  shippingCost: number
  estimatedDelivery: string
  history: { status: OrderStatus; at: string; note: string }[]
  /** Blind dropship: neutral packaging and Price-Select documentation where possible. */
  blindShip: boolean
}

export interface Order {
  id: string
  customerId: string
  placedAt: string
  status: OrderStatus
  fulfillments: Fulfillment[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  payment: 'authorized' | 'captured' | 'refunded' | 'partially_refunded' | 'failed' | 'pending'
  shipTo: { name: string; city: string; region: string }
}

export interface Customer {
  id: string
  name: string
  email: string
  joined: string
  orders: number
  status: 'active' | 'guest' | 'suspended'
  lifetimeValue: number
}

export type ReturnType = 'return' | 'damage' | 'cancellation' | 'replacement' | 'support'
export type CaseStatus = 'open' | 'awaiting_supplier' | 'approved' | 'in_transit' | 'resolved' | 'declined' | 'escalated'

export interface ReturnCase {
  id: string
  orderId: string
  customerId: string
  supplierId: string
  productSlug: string
  type: ReturnType
  reason: string
  status: CaseStatus
  openedAt: string
  supplierRespondedAt?: string
  resolution?: string
  outcome?: 'refund' | 'replacement' | 'store_credit' | 'none'
  notes: { by: string; role: Role; at: string; text: string }[]
}

export interface SupportTicket {
  id: string
  subject: string
  customerId: string
  orderId?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: CaseStatus
  assignee?: string
  openedAt: string
  slaDue: string
}

export interface Notification {
  id: string
  event:
    | 'order_confirmed'
    | 'order_shipped'
    | 'order_delayed'
    | 'order_delivered'
    | 'order_canceled'
    | 'return_approved'
    | 'refund_initiated'
    | 'supplier_ack'
    | 'support_escalation'
  title: string
  body: string
  at: string
  read: boolean
}
