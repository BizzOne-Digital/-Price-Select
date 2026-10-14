/**
 * Development seed. Explicit, idempotent and non-destructive:
 *  - refuses to run when NODE_ENV=production;
 *  - requires --confirm=<MONGODB_DB_NAME> so it cannot hit the wrong database by accident;
 *  - only upserts by natural key (category slug, supplier code, supplier+SKU); never deletes.
 *
 *   npm run seed -- --confirm=price-select-dev [--accounts] [--dev-commerce]
 *
 * --accounts      creates one supplier login per seeded supplier (password from SEED_SUPPLIER_PASSWORD)
 * --dev-commerce  sets a flat $15 shipping rule and "no tax collected" so checkout can be exercised
 *                 locally with PAYMENT_PROVIDER=test. These are placeholders, not confirmed rules.
 */
import { categories } from './fixtures/categories'
import { products } from './fixtures/products'
import { suppliers } from './fixtures/suppliers'
import { db, disconnect } from '@/lib/server/db'
import { Category, Product } from '@/lib/server/models/catalog'
import { Supplier } from '@/lib/server/models/network'
import { Settings } from '@/lib/server/models/system'
import { createAccount, users } from '@/lib/server/services/users'

const args = new Set(process.argv.slice(2))
const confirm = process.argv.find((a) => a.startsWith('--confirm='))?.split('=')[1]

const REQUIRED_DOCS: Record<string, string[]> = {
  'construction-building-supplies': ['Electrical safety certificate', 'User manual'],
  'utility-vehicles': ['Vehicle safety documentation', 'Warranty terms'],
  'e-bikes-mobility': ['Battery safety certificate', 'User manual'],
  'solar-power-energy': ['Electrical certification', 'Installation manual'],
  'baby-kids': ["Children's product certificate"],
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed with NODE_ENV=production.')
  const dbName = process.env.MONGODB_DB_NAME || 'price-select'
  if (confirm !== dbName) throw new Error(`Refusing to seed. Re-run with --confirm=${dbName} to confirm the target database.`)
  await db()
  const seededBy = { by: 'seed', byName: 'Development seed', at: new Date() }

  for (const [i, c] of categories.entries()) {
    await Category.updateOne(
      { slug: c.slug },
      { $setOnInsert: { slug: c.slug, name: c.name, short: c.short, description: c.description, includes: c.includes, image: c.image, imageAlt: c.imageAlt, reviewLevel: c.reviewLevel, reviewNote: c.reviewNote, requiredDocuments: REQUIRED_DOCS[c.slug] ?? [], sort: i, active: true } },
      { upsert: true },
    )
  }

  const supIds = new Map<string, string>()
  for (const s of suppliers) {
    const status = s.status === 'under_review' ? 'under_review' : s.status
    const doc = await Supplier.findOneAndUpdate(
      { code: s.id },
      {
        $setOnInsert: {
          code: s.id,
          name: s.name,
          legalName: s.name,
          region: s.region,
          categories: s.categories,
          status,
          integration: s.integration,
          contact: { name: s.contactName, email: s.contactEmail },
          documents: s.documents.map((d) => ({ label: d.label, kind: /registration/i.test(d.label) ? 'registration' : /insurance/i.test(d.label) ? 'insurance' : /tax/i.test(d.label) ? 'tax' : 'other', status: d.status, reviewedBy: 'Development seed', reviewedAt: new Date() })),
          feed: { status: s.feed.status, lastSync: new Date(s.feed.lastSync) },
          appliedAt: new Date(s.joined),
          approvedAt: status === 'approved' ? new Date(s.joined) : undefined,
          review: [{ action: 'seeded', ...seededBy }],
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
    supIds.set(s.id, String(doc._id))
  }

  let created = 0
  for (const p of products) {
    const supplier = supIds.get(p.supplierId)
    if (!supplier) continue
    const enhanced = categories.find((c) => c.slug === p.category)?.reviewLevel === 'enhanced'
    const r = await Product.updateOne(
      { supplier, sku: p.sku },
      {
        $setOnInsert: {
          slug: p.slug,
          sku: p.sku,
          supplier,
          category: p.category,
          name: p.name,
          brand: p.brand,
          priceCents: Math.round(p.price * 100),
          images: p.images,
          summary: p.summary,
          description: p.description,
          specs: p.specs,
          madeToOrder: p.stock === 'made_to_order',
          inventory: { onHand: p.stockQty, reserved: 0, updatedAt: new Date() },
          handlingDays: p.handlingDays,
          deliveryEstimate: p.deliveryEstimate,
          weightKg: p.weightKg,
          dimensions: p.dimensions,
          upc: p.upc,
          // Seed documents carry no files; enhanced categories therefore stay unpublishable until a
          // reviewer attaches and reviews real documents — unless the fixture was already live.
          compliance: p.compliance.map((c) => ({ label: c.label, required: true, status: c.status, ...(c.status === 'on_file' ? { reviewedBy: 'seed', reviewedByName: 'Development seed', reviewedAt: new Date() } : {}) })),
          tag: p.tag,
          featured: !!p.featured,
          membershipEligible: true,
          status: p.status,
          review: { history: [{ action: 'seeded', ...seededBy }], ...(enhanced && p.status === 'published' ? { enhancedSignoff: { ...seededBy, note: 'Seeded demonstration listing' } } : {}) },
          publishedAt: p.status === 'published' ? new Date() : undefined,
        },
      },
      { upsert: true },
    )
    created += r.upsertedCount
  }

  const seasonal = await Product.find({ slug: { $in: products.filter((p) => p.seasonalPrice).map((p) => p.slug) }, status: 'published' }, { slug: 1, priceCents: 1 }).limit(4).lean()
  const promoItems = seasonal.map((p) => ({ productId: String(p._id), priceCents: Math.round(products.find((x) => x.slug === p.slug)!.seasonalPrice! * 100) }))
  await Settings.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global', data: { promotion: { active: promoItems.length >= 3, headline: 'Buy summer in winter. Save.', description: 'Price-Select, just for you: three to four products chosen for the season ahead, at special off-season pricing for a limited window.', items: promoItems } } } }, { upsert: true })
  if (args.has('--dev-commerce')) {
    await Settings.updateOne({ key: 'global' }, { $set: { 'data.shipping': { carriers: 'Development placeholder', mode: 'flat_per_shipment', flatRate: 15, freeThreshold: null, freight: 'supplier', packaging: 'blind' }, 'data.tax': { mode: 'none_confirmed', ratePercent: null } } })
    console.log('Dev commerce placeholders set: $15 flat shipping per supplier shipment, no tax collected.')
  }

  if (args.has('--accounts')) {
    const pw = process.env.SEED_SUPPLIER_PASSWORD
    if (!pw || pw.length < 10) throw new Error('Set SEED_SUPPLIER_PASSWORD (10+ characters) to create supplier logins.')
    const col = await users()
    for (const [code, id] of supIds) {
      const email = `${code}@suppliers.example.test`
      if (await col.findOne({ email })) continue
      await createAccount({ name: `${code} contact`, email, password: pw, role: 'supplier', supplierId: id })
      console.log(`Supplier login: ${email}`)
    }
  }

  console.log(`Seed complete: ${categories.length} categories, ${supIds.size} suppliers, ${created} new products.`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => disconnect())
