'use client'

import { useState } from 'react'
import { ActionButton, StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import type { Order } from '@/lib/types'

/** Demo actions: update local state and toast. Wire to the order/payment API later. */
export function OrderActions({ order }: { order: Pick<Order, 'id' | 'status' | 'payment'> }) {
  const toast = useToast()
  const [status, setStatus] = useState(order.status)
  const [payment, setPayment] = useState(order.payment)
  const closed = status === 'canceled' || status === 'returned' || status === 'delivered'
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={status} label={`Order · ${status}`} />
      <StatusBadge status={payment} label={`Payment · ${payment.replace('_', ' ')}`} />
      <ActionButton
        tone="danger"
        disabled={closed || status === 'shipped'}
        onClick={() => {
          setStatus('canceled')
          toast({ title: `${order.id} canceled (demo)`, body: 'Suppliers would be told to stop fulfillment and the customer emailed once email is connected.' })
        }}
      >
        Cancel order
      </ActionButton>
      <ActionButton
        disabled={payment === 'refunded' || payment === 'pending' || payment === 'failed'}
        onClick={() => {
          setPayment('refunded')
          toast({ title: 'Refund initiated (demo)', body: 'No payment provider is connected — no funds were moved.' })
        }}
      >
        Initiate refund
      </ActionButton>
    </div>
  )
}

export function ContactSupplier({ supplier, fulfillmentId }: { supplier: string; fulfillmentId: string }) {
  const toast = useToast()
  return (
    <ActionButton tone="ghost" className="px-0" onClick={() => toast({ title: `Message to ${supplier} (demo)`, body: `Update request for ${fulfillmentId} logged. Supplier messaging is not yet connected.` })}>
      Contact supplier
    </ActionButton>
  )
}
