import type { Supplier } from '@/lib/types'

// DEMONSTRATION SUPPLIERS. Fictional names for interface design. No real supplier relationship is implied.

export const suppliers: Supplier[] = [
  {
    id: 'sup-northline', name: 'Northline Supply Co.', region: 'Demo region A', categories: ['electronics', 'general-merchandise'],
    status: 'approved', integration: 'API', joined: '2026-03-02', products: 7, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 4.2, trackingCompliance: 98.4, fulfillmentRate: 99.1, responseHours: 5.5, returnRate: 1.8 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Tax information', status: 'on_file' }, { label: 'Supplier agreement', status: 'on_file' }],
    feed: { status: 'healthy', lastSync: '2026-10-06T00:40:00Z' },
  },
  {
    id: 'sup-keystone', name: 'Keystone Build Supply', region: 'Demo region B', categories: ['construction-building-supplies'],
    status: 'approved', integration: 'EDI', joined: '2026-04-11', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 9.8, trackingCompliance: 93.1, fulfillmentRate: 97.4, responseHours: 14, returnRate: 2.6 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Tax information', status: 'on_file' }, { label: 'Insurance certificate', status: 'expired' }],
    feed: { status: 'delayed', lastSync: '2026-10-04T18:10:00Z' },
  },
  {
    id: 'sup-terra', name: 'Terra Utility Vehicles', region: 'Demo region C', categories: ['utility-vehicles'],
    status: 'approved', integration: 'CSV', joined: '2026-05-20', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 18.5, trackingCompliance: 88.0, fulfillmentRate: 95.2, responseHours: 22, returnRate: 0.9 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Dealer documentation', status: 'pending' }],
    feed: { status: 'manual', lastSync: '2026-10-05T09:00:00Z' },
  },
  {
    id: 'sup-current', name: 'Current Mobility', region: 'Demo region A', categories: ['e-bikes-mobility'],
    status: 'approved', integration: 'API', joined: '2026-06-01', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 3.1, trackingCompliance: 99.2, fulfillmentRate: 98.8, responseHours: 4, returnRate: 3.4 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Battery transport documentation', status: 'on_file' }],
    feed: { status: 'failed', lastSync: '2026-10-05T22:15:00Z' },
  },
  {
    id: 'sup-helios', name: 'Helios Energy Distribution', region: 'Demo region D', categories: ['solar-power-energy'],
    status: 'approved', integration: 'EDI', joined: '2026-02-14', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 6.0, trackingCompliance: 96.5, fulfillmentRate: 98.0, responseHours: 8, returnRate: 1.2 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Electrical certification', status: 'on_file' }],
    feed: { status: 'healthy', lastSync: '2026-10-06T00:05:00Z' },
  },
  {
    id: 'sup-cradle', name: 'Cradle & Co.', region: 'Demo region B', categories: ['baby-kids'],
    status: 'approved', integration: 'Manual', joined: '2026-07-09', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 12.4, trackingCompliance: 91.0, fulfillmentRate: 96.9, responseHours: 16, returnRate: 2.1 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: "Children's product certificates", status: 'pending' }],
    feed: { status: 'manual', lastSync: '2026-10-03T12:00:00Z' },
  },
  {
    id: 'sup-hearth', name: 'Hearth Home & Garden', region: 'Demo region C', categories: ['home-garden'],
    status: 'approved', integration: 'CSV', joined: '2026-03-28', products: 3, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 7.7, trackingCompliance: 95.0, fulfillmentRate: 97.9, responseHours: 10, returnRate: 2.9 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Tax information', status: 'on_file' }],
    feed: { status: 'healthy', lastSync: '2026-10-05T23:30:00Z' },
  },
  {
    id: 'sup-applicant-1', name: 'Meridian Outdoor Goods', region: 'Demo region D', categories: ['home-garden', 'general-merchandise'],
    status: 'under_review', integration: 'Manual', joined: '2026-09-29', products: 0, contactName: 'Applicant contact', contactEmail: 'applicant@example.com',
    metrics: { acknowledgmentHours: 0, trackingCompliance: 0, fulfillmentRate: 0, responseHours: 0, returnRate: 0 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Tax information', status: 'pending' }],
    feed: { status: 'manual', lastSync: '2026-09-29T10:00:00Z' },
  },
  {
    id: 'sup-applicant-2', name: 'Brightline Tools', region: 'Demo region A', categories: ['construction-building-supplies'],
    status: 'applied', integration: 'API', joined: '2026-10-02', products: 0, contactName: 'Applicant contact', contactEmail: 'applicant@example.com',
    metrics: { acknowledgmentHours: 0, trackingCompliance: 0, fulfillmentRate: 0, responseHours: 0, returnRate: 0 },
    documents: [{ label: 'Business registration', status: 'pending' }],
    feed: { status: 'manual', lastSync: '2026-10-02T10:00:00Z' },
  },
  {
    id: 'sup-suspended', name: 'Harbor Wholesale', region: 'Demo region B', categories: ['general-merchandise'],
    status: 'suspended', integration: 'CSV', joined: '2026-01-15', products: 0, contactName: 'Supplier contact', contactEmail: 'supplier@example.com',
    metrics: { acknowledgmentHours: 41, trackingCompliance: 62, fulfillmentRate: 84, responseHours: 52, returnRate: 7.5 },
    documents: [{ label: 'Business registration', status: 'on_file' }, { label: 'Insurance certificate', status: 'expired' }],
    feed: { status: 'failed', lastSync: '2026-08-30T10:00:00Z' },
  },
]

export const getSupplier = (id: string) => suppliers.find((s) => s.id === id)
/** The supplier account used by the demo supplier portal. */
export const DEMO_SUPPLIER_ID = 'sup-helios'
