// Domain types shared by server services (as response DTOs) and client components.
// Amounts in DTOs are dollars (number) converted from the integer cents stored in MongoDB.

export type Role = 'customer' | 'supplier' | 'admin' | 'support'

/** Category slugs are data-driven; the original eight remain the seeded defaults. */
export type CategorySlug = string

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
  requiredDocuments?: string[]
  /** Published, eligible products in this category (public reads). */
  count?: number
  active?: boolean
}

export type StockStatus = 'in_stock' | 'low_stock' | 'made_to_order' | 'out_of_stock'

export interface ProductImage {
  src: string
  alt: string
}

export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'flagged' | 'suspended' | 'withdrawn'

export interface ComplianceItem {
  label: string
  status: 'on_file' | 'pending' | 'required' | 'rejected'
  required?: boolean
  /** Staff/owner views only: private asset id for the attached document. */
  assetId?: string
  reviewedByName?: string
  reviewedAt?: string
}

export interface Product {
  id: string
  slug: string
  sku: string
  name: string
  brand: string
  category: CategorySlug
  /** Supplier public code (e.g. `sup-helios`). */
  supplierId: string
  supplierName?: string
  price: number
  /** Present only while an active seasonal campaign includes this product. */
  seasonalPrice?: number
  currency: 'USD'
  images: ProductImage[]
  summary: string
  description: string
  specs: { label: string; value: string }[]
  stock: StockStatus
  /** Available units (on hand minus reserved). */
  stockQty: number
  handlingDays: number
  deliveryEstimate: string
  weightKg: number
  dimensions: string
  upc?: string
  compliance: ComplianceItem[]
  tag?: 'Selected' | 'New arrival' | 'Seasonal' | 'Limited'
  featured?: boolean
  seasonal?: boolean
  membershipEligible?: boolean
  status: ProductStatus
}

/** Staff / owning-supplier view of a product. */
export interface ProductAdmin extends Product {
  madeToOrder: boolean
  inventory: { onHand: number; reserved: number; available: number }
  statusReason?: string
  enhancedSignoff?: { byName?: string; at?: string; note?: string }
  reviewHistory: { action: string; byName?: string; at: string; reason?: string }[]
  stagedImages: { assetId: string; alt?: string }[]
  supportingDocs: string[]
  submittedAt?: string
  publishedAt?: string
  updatedAt?: string
}

export type SupplierStatus = 'draft' | 'applied' | 'under_review' | 'approved' | 'suspended' | 'rejected'
export type Integration = 'API' | 'EDI' | 'CSV' | 'Manual'

export interface Supplier {
  id: string
  /** Internal database id (admin views). */
  dbId?: string
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
  documents: { id?: string; label: string; kind?: string; status: 'on_file' | 'pending' | 'expired' | 'rejected'; assetId?: string }[]
  feed: { status: 'healthy' | 'delayed' | 'failed' | 'manual'; lastSync: string }
  membershipExcluded?: boolean
}

export interface SupplierApplication extends Supplier {
  legalName?: string
  businessType?: string
  website?: string
  phone?: string
  taxCountry?: string
  taxIdLast4?: string
  shipping?: { shipFrom?: string; carriers?: string[]; handling?: string; blindShip?: boolean }
  declarations?: { authentic?: boolean; terms?: boolean; at?: string }
  review: { action: string; byName?: string; at: string; reason?: string }[]
  statusReason?: string
  appliedAt?: string
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'partially_shipped'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'returned'

export type FulfillmentStatus = Exclude<OrderStatus, 'partially_shipped'>

export interface OrderLine {
  lineId: string
  productSlug: string
  sku?: string
  name: string
  image?: string
  qty: number
  /** Unit price charged before membership discount. */
  unitPrice: number
  listPrice?: number
  discount?: number
  /** Units already covered by return cases (customer/staff views). */
  returnedQty?: number
}

export interface AddressSnapshot {
  name: string
  line1?: string
  line2?: string
  city: string
  region: string
  postal?: string
  country?: string
  phone?: string
}

/** One supplier's share of a customer order. Suppliers only ever see their own fulfillments. */
export interface Fulfillment {
  id: string
  supplierId: string
  supplierName?: string
  status: FulfillmentStatus
  lines: OrderLine[]
  carrier?: string
  tracking?: string
  shippingCost: number
  estimatedDelivery: string
  history: { status: FulfillmentStatus; at: string; note: string }[]
  /** Blind dropship: neutral packaging and Price-Select documentation where possible. */
  blindShip: boolean
  acknowledgedAt?: string
}

export type PaymentStatus = 'authorized' | 'captured' | 'refunded' | 'partially_refunded' | 'failed' | 'pending' | 'voided'

export interface Order {
  id: string
  customerId: string
  customerName?: string
  email?: string
  placedAt: string
  status: OrderStatus
  fulfillments: Fulfillment[]
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  payment: PaymentStatus
  refunded?: number
  refundable?: number
  shipTo: AddressSnapshot
  billTo?: AddressSnapshot
}

/** What a supplier receives: its own fulfillment and the shipping details needed to deliver it. */
export interface SupplierFulfillment {
  orderId: string
  placedAt: string
  shipTo: AddressSnapshot
  fulfillment: Fulfillment
}

export interface Customer {
  id: string
  name: string
  email: string
  joined: string
  orders: number
  status: 'active' | 'guest' | 'suspended'
  lifetimeValue: number
  membership?: MembershipState
}

export type MembershipTier = 'member' | 'member_plus'
export interface MembershipState {
  tier: MembershipTier | null
  status: 'none' | 'pending_payment' | 'active' | 'canceled' | 'expired'
  startedAt?: string
  renewsAt?: string
  cancelAtPeriodEnd?: boolean
}

export type ReturnType = 'return' | 'damage' | 'cancellation' | 'replacement' | 'support'
export type CaseStatus = 'open' | 'awaiting_supplier' | 'approved' | 'in_transit' | 'resolved' | 'declined' | 'escalated'

export interface CaseMessage {
  by: string
  role: Role | 'system'
  visibility: 'customer' | 'supplier' | 'staff'
  at: string
  text: string
  attachments: { id: string; name: string }[]
}

export interface ReturnCase {
  id: string
  kind: 'return' | 'support'
  orderId?: string
  customerId: string
  customerName?: string
  supplierId?: string
  supplierName?: string
  fulfillmentId?: string
  productSlug?: string
  lines: { lineId: string; name: string; qty: number }[]
  type: ReturnType
  subject: string
  reason: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: CaseStatus
  assignee?: string
  assigneeId?: string
  openedAt: string
  slaDue?: string
  supplierRespondedAt?: string
  resolution?: string
  outcome?: 'refund' | 'replacement' | 'store_credit' | 'none'
  refund?: { amount: number; status: 'not_applicable' | 'pending' | 'succeeded' | 'failed' | 'unavailable' }
  logistics?: { labelIssuedAt?: string; receivedAt?: string }
  notes: CaseMessage[]
}

/** Support tickets are cases of kind `support`. */
export type SupportTicket = ReturnCase

export interface Notification {
  id: string
  event: string
  title: string
  body: string
  at: string
  read: boolean
  href?: string
}

export interface Capabilities {
  payments: boolean
  email: boolean
  shippingConfigured: boolean
  taxConfigured: boolean
  labels: boolean
}

export interface CartLineView {
  productId: string
  slug: string
  name: string
  brand: string
  image?: ProductImage
  qty: number
  unitPrice: number
  listPrice: number
  seasonal: boolean
  stock: StockStatus
  available: number
  supplierId: string
  supplierName?: string
  /** Why the line cannot be bought as-is (unavailable product, insufficient stock). */
  problem?: string
}

export interface CheckoutQuote {
  lines: CartLineView[]
  subtotal: number
  discount: number
  shipping: number | null
  tax: number | null
  total: number | null
  shipments: number
  membershipTier: MembershipTier | null
  blockers: { code: string; message: string }[]
}
