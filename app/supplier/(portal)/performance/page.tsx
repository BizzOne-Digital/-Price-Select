import type { Metadata } from 'next'
import { SupplierPerformance } from '@/components/supplier/performance'

export const metadata: Metadata = {
  title: 'Performance',
  description: 'Acknowledgment time, tracking compliance, fulfillment rate, response time and return rate against placeholder service targets.',
  alternates: { canonical: '/supplier/performance' },
}

export default function SupplierPerformancePage() {
  return <SupplierPerformance />
}
