import 'server-only'
import type { Actor } from '../auth'
import { db } from '../db'
import { Product } from '../models/catalog'
import { Supplier } from '../models/network'
import { Case, Order } from '../models/orders'

const OPEN_CASE = ['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated']

/** Sidebar badge counts for the operations console. Admin-only queues are zero for support staff. */
export async function adminBadges(actor: Actor) {
  await db()
  const admin = actor.role === 'admin'
  const [orders, returns, support, products, suppliers, failed] = await Promise.all([
    Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
    Case.countDocuments({ kind: 'return', status: { $in: OPEN_CASE as never } }),
    Case.countDocuments({ kind: 'support', status: { $in: OPEN_CASE as never } }),
    admin ? Product.countDocuments({ status: { $in: ['pending_review', 'flagged'] } }) : 0,
    admin ? Supplier.countDocuments({ status: { $in: ['applied', 'under_review'] } }) : 0,
    admin ? Order.countDocuments({ paymentStatus: 'failed', placedAt: { $gte: new Date(Date.now() - 30 * 86_400_000) } }) : 0,
  ])
  return { orders, returns, support, products, suppliers, failed }
}
