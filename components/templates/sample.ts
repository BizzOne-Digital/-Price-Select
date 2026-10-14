import type { Order } from '@/lib/types'

/**
 * Fictional order used only by the public document template previews (invoice, packing slip).
 * Every name, address, number and amount here is a sample; no live record is ever read.
 */
export const SAMPLE_ORDER: Order & { customerName: string; email: string } = {
  id: 'PS-000000',
  customerId: 'sample',
  customerName: 'Sample Customer',
  email: 'customer@example.com',
  placedAt: '2026-01-15T15:00:00.000Z',
  status: 'shipped',
  payment: 'captured',
  subtotal: 300,
  shipping: 20,
  tax: 0,
  discount: 0,
  total: 320,
  shipTo: { name: 'Sample Customer', line1: '1 Sample Street', city: 'Sample City', region: 'Sample Region', postal: '00000', country: 'Sample Country' },
  fulfillments: [
    {
      id: 'F-SAMPLE-A',
      supplierId: 'sample',
      status: 'shipped',
      carrier: 'Sample Carrier',
      tracking: 'SAMPLE0000000',
      shippingCost: 10,
      estimatedDelivery: '2026-01-22T00:00:00.000Z',
      history: [],
      blindShip: true,
      lines: [
        { lineId: 'A1', productSlug: 'sample-item-one', sku: 'SAMPLE-001', name: 'Sample item one', qty: 2, unitPrice: 50 },
        { lineId: 'A2', productSlug: 'sample-item-two', sku: 'SAMPLE-002', name: 'Sample item two', qty: 1, unitPrice: 100 },
      ],
    },
    {
      id: 'F-SAMPLE-B',
      supplierId: 'sample',
      status: 'processing',
      shippingCost: 10,
      estimatedDelivery: '2026-01-24T00:00:00.000Z',
      history: [],
      blindShip: true,
      lines: [{ lineId: 'B1', productSlug: 'sample-item-three', sku: 'SAMPLE-003', name: 'Sample item three', qty: 1, unitPrice: 100 }],
    },
  ],
}
