// Demo-only account state that has no home in lib/data yet. Replace with the customer API.
export const SAVED_DEMO = ['loden-three-seat-sofa', 'volta-city-e-bike', 'meridian-field-watch', 'aurum-mono-panel-410']

export type DemoAddress = { id: string; label: string; name: string; line1: string; line2?: string; city: string; region: string; postal: string; country: string; isDefault?: boolean }

export const DEMO_ADDRESSES: DemoAddress[] = [
  { id: 'a1', label: 'Home', name: 'Demo Customer', line1: '100 Demo Street', city: 'Demo City', region: 'Demo Region', postal: '00000', country: 'Demo Country', isDefault: true },
  { id: 'a2', label: 'Workshop', name: 'Demo Customer', line1: '200 Sample Avenue', line2: 'Unit 4', city: 'Demo City', region: 'Demo Region', postal: '00000', country: 'Demo Country' },
]
