import type { CategorySlug, Product } from '@/lib/types'
import { img } from '@/lib/img'

// DEMONSTRATION CATALOG. Product names, brands, prices and stock levels are sample data
// for interface design only. Replace with the live supplier catalog before launch.

type Seed = Pick<Product, 'slug' | 'name' | 'brand' | 'category' | 'supplierId' | 'price' | 'summary'> &
  Partial<Product> & { imgs: [string, string][] }

const doc = (label: string, status: Product['compliance'][number]['status'] = 'on_file') => ({ label, status })

const seeds: Seed[] = [
  // Electronics
  {
    slug: 'aero-workstation-16', name: 'Aero Workstation 16', brand: 'Aero', category: 'electronics', supplierId: 'sup-northline',
    price: 1249, summary: 'A 16-inch performance laptop built for studio and field work.',
    imgs: [['1517336714731-489689fd1ca8', 'Laptop keyboard lit in violet light'], ['1588872657578-7efd1f1555ed', 'Open laptop on a white surface']],
    specs: [{ label: 'Display', value: '16" 2560 × 1600' }, { label: 'Memory', value: '32 GB' }, { label: 'Storage', value: '1 TB SSD' }, { label: 'Weight', value: '1.9 kg' }],
    tag: 'Selected', featured: true, stock: 'in_stock', stockQty: 42, weightKg: 2.6, dimensions: '36 × 25 × 2 cm',
  },
  {
    slug: 'meridian-studio-headphones', name: 'Meridian Studio Headphones', brand: 'Meridian', category: 'electronics', supplierId: 'sup-northline',
    price: 349, summary: 'Closed-back wireless headphones with adaptive noise control.',
    imgs: [['1505740420928-5e560c06d30e', 'Black over-ear headphones on a yellow background'], ['1484704849700-f032a568e944', 'Silver headphones resting in soft light']],
    specs: [{ label: 'Battery', value: 'Up to 30 hours' }, { label: 'Connectivity', value: 'Bluetooth 5.3' }, { label: 'Driver', value: '40 mm' }],
    stock: 'in_stock', stockQty: 120, weightKg: 0.6, dimensions: '20 × 18 × 9 cm',
  },
  {
    slug: 'tonal-bookshelf-speaker', name: 'Tonal Bookshelf Speaker', brand: 'Tonal', category: 'electronics', supplierId: 'sup-northline',
    price: 589, summary: 'A pair of powered bookshelf speakers with a warm, precise signature.',
    imgs: [['1545454675-3531b543be5d', 'A bookshelf speaker in teal light'], ['1606220945770-b5b6c2c55bf1', 'Wireless earbuds and case on red']],
    specs: [{ label: 'Output', value: '2 × 50 W' }, { label: 'Inputs', value: 'Optical, USB-C, RCA' }],
    stock: 'low_stock', stockQty: 6, weightKg: 9.4, dimensions: '30 × 20 × 24 cm (each)',
  },
  // Construction
  {
    slug: 'forge-20v-drill-driver', name: 'Forge 20V Drill Driver', brand: 'Forge', category: 'construction-building-supplies', supplierId: 'sup-keystone',
    price: 189, summary: 'Brushless compact drill driver with two batteries and charger.',
    imgs: [['1572981779307-38b8cabb2407', 'A yellow cordless drill on white'], ['1504148455328-c376907d081c', 'A red cordless drill on stone']],
    specs: [{ label: 'Voltage', value: '20 V' }, { label: 'Chuck', value: '13 mm keyless' }, { label: 'Batteries', value: '2 × 4.0 Ah' }],
    stock: 'in_stock', stockQty: 85, weightKg: 3.1, dimensions: '38 × 30 × 11 cm',
    compliance: [doc('Electrical safety certificate'), doc('User manual'), doc('Manufacturer warranty')],
  },
  {
    slug: 'atelier-hand-tool-wall', name: 'Atelier Hand Tool Set, 42 pc', brand: 'Atelier', category: 'construction-building-supplies', supplierId: 'sup-keystone',
    price: 264, summary: 'Hardened steel hand tools with a wall-mounted organiser.',
    imgs: [['1426927308491-6380b6a9936f', 'Hand tools organised on a workshop wall'], ['1530124566582-a618bc2615dc', 'Rows of pliers and cutters']],
    specs: [{ label: 'Pieces', value: '42' }, { label: 'Material', value: 'Chrome vanadium steel' }],
    stock: 'in_stock', stockQty: 30, weightKg: 7.8, dimensions: '60 × 40 × 8 cm',
    compliance: [doc('Material declaration'), doc('Manufacturer warranty')],
  },
  {
    slug: 'linea-circular-saw', name: 'Linea 185 mm Circular Saw', brand: 'Linea', category: 'construction-building-supplies', supplierId: 'sup-keystone',
    price: 229, summary: 'A balanced circular saw with depth and bevel control.',
    imgs: [['1513467535987-fd81bc7d62f8', 'A circular saw cutting timber on a workbench'], ['1621905251189-08b45d6a269e', 'An electrician at work wearing a safety helmet']],
    specs: [{ label: 'Blade', value: '185 mm' }, { label: 'Bevel', value: '0–56°' }, { label: 'Power', value: '1,500 W' }],
    stock: 'made_to_order', stockQty: 0, weightKg: 5.2, dimensions: '40 × 30 × 25 cm',
    compliance: [doc('Electrical safety certificate'), doc('User manual', 'pending')], status: 'pending_review',
  },
  // Utility vehicles
  {
    slug: 'atlas-utility-cart', name: 'Atlas Utility Cart', brand: 'Atlas', category: 'utility-vehicles', supplierId: 'sup-terra',
    price: 8490, summary: 'A two-seat electric work cart with a tipping cargo bed.',
    imgs: [['1533473359331-0135ef1b58bf', 'A utility vehicle on a desert track beneath red rock'], ['1494412574643-ff11b0a5c1c3', 'An aerial view of a container logistics yard']],
    specs: [{ label: 'Drive', value: 'Electric, 48 V' }, { label: 'Range', value: 'Up to 50 km' }, { label: 'Payload', value: '450 kg' }],
    tag: 'New arrival', featured: true, stock: 'made_to_order', stockQty: 0, handlingDays: 10, deliveryEstimate: '3–5 weeks, freight delivery',
    weightKg: 520, dimensions: '290 × 135 × 190 cm', compliance: [doc('Vehicle safety documentation'), doc('Owner manual'), doc('Warranty terms')],
  },
  {
    slug: 'ridge-trail-utv', name: 'Ridge Trail UTV', brand: 'Ridge', category: 'utility-vehicles', supplierId: 'sup-terra',
    price: 14900, summary: 'A four-seat side-by-side for property and trail work.',
    imgs: [['1591637333184-19aa84b3e01f', 'A dark off-road machine on a forest road'], ['1533473359331-0135ef1b58bf', 'A vehicle on a desert track']],
    specs: [{ label: 'Seats', value: '4' }, { label: 'Engine', value: '800 cc' }, { label: 'Towing', value: '680 kg' }],
    stock: 'made_to_order', stockQty: 0, handlingDays: 14, deliveryEstimate: '4–6 weeks, freight delivery', weightKg: 690, dimensions: '320 × 160 × 195 cm',
    compliance: [doc('Vehicle safety documentation'), doc('Emissions documentation', 'pending'), doc('Warranty terms')],
  },
  {
    slug: 'haul-tilt-trailer', name: 'Haul Tilt Trailer 8 ft', brand: 'Haul', category: 'utility-vehicles', supplierId: 'sup-terra',
    price: 2150, summary: 'Galvanised tilt trailer with removable side rails.',
    imgs: [['1494412574643-ff11b0a5c1c3', 'An aerial view of a container logistics yard'], ['1558981806-ec527fa84c39', 'A rider on an open road at golden hour']],
    specs: [{ label: 'Deck', value: '2.4 × 1.5 m' }, { label: 'Capacity', value: '750 kg' }],
    stock: 'in_stock', stockQty: 4, weightKg: 210, dimensions: '360 × 170 × 80 cm',
    compliance: [doc('Load rating certificate'), doc('Assembly manual')],
  },
  // E-bikes
  {
    slug: 'volta-city-e-bike', name: 'Volta City E-Bike', brand: 'Volta', category: 'e-bikes-mobility', supplierId: 'sup-current',
    price: 2390, summary: 'A step-through commuter e-bike with integrated lights and rack.',
    imgs: [['1620802051782-725fa33db067', 'A rider on a city e-bike'], ['1571068316344-75bc76f77890', 'A white bicycle against a pale wall']],
    specs: [{ label: 'Motor', value: '250 W mid-drive' }, { label: 'Battery', value: '500 Wh' }, { label: 'Range', value: 'Up to 90 km' }],
    tag: 'Selected', featured: true, stock: 'in_stock', stockQty: 18, weightKg: 26, dimensions: '180 × 65 × 110 cm',
    compliance: [doc('Battery safety certificate'), doc('User manual'), doc('Warranty terms')],
  },
  {
    slug: 'noir-carbon-road', name: 'Noir Carbon Road', brand: 'Noir', category: 'e-bikes-mobility', supplierId: 'sup-current',
    price: 3180, summary: 'A carbon road e-bike with a discreet hub motor.',
    imgs: [['1532298229144-0ec0c57515c7', 'A black road bicycle in a dark studio'], ['1485965120184-e220f721d03e', 'A bicycle against a black wall']],
    specs: [{ label: 'Frame', value: 'Carbon' }, { label: 'Weight', value: '12.8 kg' }, { label: 'Battery', value: '250 Wh' }],
    stock: 'low_stock', stockQty: 3, weightKg: 18, dimensions: '175 × 60 × 100 cm',
    compliance: [doc('Battery safety certificate'), doc('User manual')],
  },
  {
    slug: 'halo-gravel-e-bike', name: 'Halo Gravel E-Bike', brand: 'Halo', category: 'e-bikes-mobility', supplierId: 'sup-current',
    price: 2690, summary: 'A lightweight gravel e-bike with a discreet rear-hub motor.',
    imgs: [['1576435728678-68d0fbf94e91', 'A dark gravel bicycle leaning against a timber wall'], ['1593764592116-bfb2a97c642a', 'A bicycle against a white wall']],
    specs: [{ label: 'Motor', value: '250 W rear hub' }, { label: 'Battery', value: '360 Wh' }, { label: 'Frame', value: 'Aluminium' }],
    stock: 'in_stock', stockQty: 7, weightKg: 21, dimensions: '178 × 62 × 102 cm',
    compliance: [doc('Battery safety certificate'), doc('User manual')],
  },
  // Solar
  {
    slug: 'solara-power-station', name: 'Solara Power Station 2000', brand: 'Solara', category: 'solar-power-energy', supplierId: 'sup-helios',
    price: 899, summary: 'Portable 2 kWh battery with pure sine-wave output.',
    imgs: [['1613665813446-82a78c468a1d', 'Rooftop solar panels at sunset'], ['1508514177221-188b1cf16e9d', 'A solar array beneath a blue sky']],
    specs: [{ label: 'Capacity', value: '2,048 Wh' }, { label: 'Output', value: '2,200 W' }, { label: 'Solar input', value: 'Up to 800 W' }],
    tag: 'Seasonal', featured: true, seasonal: true, seasonalPrice: 799, stock: 'in_stock', stockQty: 25, weightKg: 22, dimensions: '42 × 28 × 30 cm',
    compliance: [doc('Battery safety certificate'), doc('User manual'), doc('Warranty terms')],
  },
  {
    slug: 'aurum-mono-panel-410', name: 'Aurum Mono Panel 410 W', brand: 'Aurum', category: 'solar-power-energy', supplierId: 'sup-helios',
    price: 289, summary: 'High-efficiency monocrystalline module for residential arrays.',
    imgs: [['1509391366360-2e959784a276', 'A field of solar panels under clouds'], ['1497440001374-f26997328c1b', 'Solar panels on green grass']],
    specs: [{ label: 'Power', value: '410 W' }, { label: 'Efficiency', value: '21.3%' }, { label: 'Cells', value: '108 half-cut' }],
    seasonal: true, seasonalPrice: 259, stock: 'in_stock', stockQty: 340, weightKg: 21, dimensions: '172 × 113 × 3 cm',
    compliance: [doc('Electrical certification'), doc('Installation manual'), doc('Performance warranty')],
  },
  {
    slug: 'helio-hybrid-inverter', name: 'Helio Hybrid Inverter 6 kW', brand: 'Helio', category: 'solar-power-energy', supplierId: 'sup-helios',
    price: 1690, summary: 'Grid-tie hybrid inverter with battery management.',
    imgs: [['1508514177221-188b1cf16e9d', 'Solar array beneath a clear sky'], ['1509391366360-2e959784a276', 'Solar panels in a green field']],
    specs: [{ label: 'Rated output', value: '6 kW' }, { label: 'MPPT', value: '2 trackers' }],
    seasonal: true, stock: 'low_stock', stockQty: 8, weightKg: 27, dimensions: '52 × 45 × 20 cm',
    compliance: [doc('Electrical certification'), doc('Installation manual', 'pending')],
  },
  // Baby & kids
  {
    slug: 'nest-organic-swaddle-set', name: 'Nest Organic Swaddle Set', brand: 'Nest', category: 'baby-kids', supplierId: 'sup-cradle',
    price: 64, summary: 'Three breathable organic cotton swaddles.',
    imgs: [['1555252333-9f8e92e65df9', "A baby's feet beneath a white blanket"], ['1522771930-78848d9293e8', 'A toddler sitting on white bedding']],
    specs: [{ label: 'Material', value: 'Organic cotton muslin' }, { label: 'Size', value: '120 × 120 cm' }],
    stock: 'in_stock', stockQty: 140, weightKg: 0.6, dimensions: '25 × 20 × 6 cm',
    compliance: [doc("Children's product certificate"), doc('Material declaration')],
  },
  {
    slug: 'timber-heritage-train', name: 'Timber Heritage Train Set', brand: 'Timber & Co.', category: 'baby-kids', supplierId: 'sup-cradle',
    price: 89, summary: 'A solid beech train set with water-based finishes.',
    imgs: [['1596461404969-9ae70f2830c1', 'A wooden toy train on a track'], ['1515488042361-ee00e0ddd4e4', 'Toys arranged on a white floor']],
    specs: [{ label: 'Pieces', value: '36' }, { label: 'Age', value: '3 years +' }],
    stock: 'in_stock', stockQty: 55, weightKg: 1.8, dimensions: '40 × 30 × 9 cm',
    compliance: [doc("Children's product certificate"), doc('Small parts warning label')],
  },
  {
    slug: 'orbit-organic-crib-bedding', name: 'Orbit Organic Crib Bedding Set', brand: 'Orbit', category: 'baby-kids', supplierId: 'sup-cradle',
    price: 189, summary: 'Fitted sheet, quilt and cover in organic cotton sateen.',
    imgs: [['1522771930-78848d9293e8', 'A toddler sitting on soft white bedding'], ['1555252333-9f8e92e65df9', "A baby's feet beneath a white blanket"]],
    specs: [{ label: 'Fits', value: 'Standard crib mattress' }, { label: 'Material', value: 'Organic cotton sateen' }],
    stock: 'in_stock', stockQty: 12, weightKg: 1.6, dimensions: '40 × 30 × 10 cm',
    compliance: [doc("Children's product certificate", 'pending'), doc('Care instructions')], status: 'flagged',
  },
  // Home & garden
  {
    slug: 'field-dining-set', name: 'Field Dining Set', brand: 'Field', category: 'home-garden', supplierId: 'sup-hearth',
    price: 1180, summary: 'A six-seat outdoor dining set in powder-coated aluminium.',
    imgs: [['1600210492486-724fe5c67fb0', 'A bright living room with natural textures'], ['1618220179428-22790b461013', 'A styled interior with warm furniture']],
    specs: [{ label: 'Seats', value: '6' }, { label: 'Frame', value: 'Powder-coated aluminium' }],
    tag: 'Selected', seasonal: true, seasonalPrice: 1040, stock: 'in_stock', stockQty: 9, weightKg: 48, dimensions: '200 × 95 × 75 cm',
  },
  {
    slug: 'loden-three-seat-sofa', name: 'Loden Three-Seat Sofa', brand: 'Loden', category: 'home-garden', supplierId: 'sup-hearth',
    price: 1890, summary: 'A deep-seated sofa in forest-green velvet.',
    imgs: [['1555041469-a586c61ea9bc', 'A green velvet sofa against a pale wall'], ['1586023492125-27b2c045efd7', 'A yellow armchair in a minimal room']],
    specs: [{ label: 'Width', value: '214 cm' }, { label: 'Upholstery', value: 'Performance velvet' }],
    stock: 'made_to_order', stockQty: 0, handlingDays: 21, deliveryEstimate: '6–8 weeks, white-glove delivery', weightKg: 72, dimensions: '214 × 92 × 80 cm',
  },
  {
    slug: 'verde-garden-tool-trio', name: 'Verde Garden Tool Trio', brand: 'Verde', category: 'home-garden', supplierId: 'sup-hearth',
    price: 78, summary: 'Stainless trowel, fork and transplanter with ash handles.',
    imgs: [['1416879595882-3373a0480b5b', 'A garden trowel resting in soil'], ['1600585154340-be6161a56a0c', 'A modern home at dusk']],
    specs: [{ label: 'Material', value: 'Stainless steel, ash' }],
    seasonal: true, stock: 'in_stock', stockQty: 75, weightKg: 1.2, dimensions: '35 × 15 × 6 cm',
  },
  // General merchandise
  {
    slug: 'meridian-field-watch', name: 'Meridian Field Watch', brand: 'Meridian', category: 'general-merchandise', supplierId: 'sup-northline',
    price: 240, summary: 'A minimal 38 mm watch with a sapphire crystal.',
    imgs: [['1523275335684-37898b6baf30', 'A white minimal watch on a pale background'], ['1491553895911-0055eca6402d', 'A grey sneaker suspended in light']],
    specs: [{ label: 'Case', value: '38 mm' }, { label: 'Water resistance', value: '50 m' }],
    stock: 'in_stock', stockQty: 40, weightKg: 0.3, dimensions: '12 × 10 × 8 cm',
  },
  {
    slug: 'stride-everyday-trainer', name: 'Stride Everyday Trainer', brand: 'Stride', category: 'general-merchandise', supplierId: 'sup-northline',
    price: 135, summary: 'A lightweight knit trainer for daily wear.',
    imgs: [['1491553895911-0055eca6402d', 'A grey sneaker suspended in light'], ['1542291026-7eec264c27ff', 'A red running shoe on red']],
    specs: [{ label: 'Upper', value: 'Recycled knit' }, { label: 'Sizes', value: 'US 5–13' }],
    stock: 'in_stock', stockQty: 210, weightKg: 0.9, dimensions: '33 × 21 × 12 cm',
  },
  {
    slug: 'essential-cotton-tee', name: 'Essential Cotton Tee, 3-pack', brand: 'Essential', category: 'general-merchandise', supplierId: 'sup-northline',
    price: 58, summary: 'Heavyweight cotton tees in white.',
    imgs: [['1574180566232-aaad1b5b8450', 'A plain white t-shirt worn on a model'], ['1441986300917-64674bd600d8', 'Clothing displayed in a retail interior']],
    specs: [{ label: 'Weight', value: '220 gsm' }, { label: 'Sizes', value: 'XS–XXL' }],
    stock: 'in_stock', stockQty: 300, weightKg: 0.8, dimensions: '30 × 25 × 6 cm',
  },
]

export const products: Product[] = seeds.map(({ imgs, ...s }, i) => ({
  sku: `PS-${s.category.slice(0, 3).toUpperCase()}-${String(1001 + i)}`,
  currency: 'USD',
  description:
    s.description ??
    `${s.summary} Supplied by an approved Price-Select partner and fulfilled directly to you. Specifications are provided by the supplier and reviewed before publication.`,
  specs: [],
  stock: 'in_stock',
  stockQty: 0,
  handlingDays: 2,
  deliveryEstimate: '4–7 business days',
  weightKg: 1,
  dimensions: '—',
  upc: `0${String(812345670000 + i * 137).slice(0, 11)}`,
  status: 'published',
  ...s,
  compliance: [doc('Authenticity & new-condition confirmation'), ...(s.compliance ?? [])],
  images: imgs.map(([id, alt]) => ({ src: img(id, 1400), alt })),
}))

export const getProduct = (slug: string) => products.find((p) => p.slug === slug)
export const productsIn = (c: CategorySlug) => products.filter((p) => p.category === c && p.status === 'published')
export const publishedProducts = products.filter((p) => p.status === 'published')
export const featuredProducts = products.filter((p) => p.featured)
export const seasonalProducts = products.filter((p) => p.seasonal && p.seasonalPrice).slice(0, 4)
export const brands = [...new Set(products.map((p) => p.brand))].sort()

export const STOCK_LABEL: Record<Product['stock'], string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  made_to_order: 'Made to order',
  out_of_stock: 'Out of stock',
}
