import type { StockStatus } from '@/lib/types'

export const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  made_to_order: 'Made to order',
  out_of_stock: 'Out of stock',
}
