// Terms & Conditions text as supplied by the client. Do not edit wording without client approval.

export type PolicySection = { title: string; text?: string; items?: [label: string, text: string][] }

export const TERMS_INTRO =
  'This document constitutes a legally binding agreement ("Agreement") between you and Price-Select.com (a business entity of Jr-Procurement.com). By accessing, browsing, or purchasing from our marketplace, you agree to be bound by these Terms and Conditions.'

export const TERMS: PolicySection[] = [
  {
    title: 'Membership Tiers and Agreement',
    text: 'Price-Select.com operates on a membership-based model to provide exclusive pricing benefits to our users.',
    items: [
      ['Standard Membership ($10/year)', 'Grants the member a 10% discount on applicable items across our catalog, subject to supplier-specific exclusions.'],
      ['Member Plus ($25/year)', 'Grants the member a 25% discount on applicable items across our catalog, subject to supplier-specific exclusions.'],
      ['Auto-Renewal', 'Membership fees are charged annually. Memberships will automatically renew at the then-current rate unless cancelled by the user via their account settings prior to the renewal date.'],
      ['Non-Transferability', 'Memberships are for personal use by the account holder only and may not be transferred or shared. We reserve the right to terminate memberships found to be in violation of this policy.'],
    ],
  },
  {
    title: 'The Marketplace and Drop shipping Model',
    text: 'Price-Select.com acts as a marketplace platform and intermediary. We source products from a global network of factories, warehouses, and independent suppliers.',
    items: [
      ['Dropship Disclosure', 'Most items purchased on our platform are shipped directly from our third-party suppliers to you (blind drop shipping). Price-Select.com does not typically hold physical inventory or personally inspect every item before it is shipped.'],
      ['Product Representation', 'While we strive to ensure accuracy, product images, descriptions, and specifications are provided by our suppliers. We are not liable for inaccuracies in supplier-provided content.'],
      ['Safety and Authenticity', 'We enforce strict operational standards for our suppliers; however, as a marketplace, we rely on third-party certifications and representations regarding product safety, authenticity, and compliance. We disclaim liability for manufacturing defects or safety issues arising from products provided by third-party suppliers.'],
    ],
  },
  {
    title: 'Orders, Payments, and Taxes',
    items: [
      ['Pricing', 'Discounts associated with membership tiers apply only to the base price of products and do not reduce shipping costs, taxes, or duties.'],
      ['Payment Processing', 'All payments are processed securely. You agree to provide accurate payment information.'],
      ['Taxes and Duties', 'For international orders, the customer is the "importer of record" and is responsible for all applicable customs duties, import taxes, and fees levied by their local jurisdiction. These are separate from the purchase price paid to Price-Select.com.'],
    ],
  },
  {
    title: 'Shipping and Global Sourcing',
    items: [
      ['Lead Times', "Shipping times vary significantly based on the supplier's location, origin of goods, and international logistics. Estimated delivery dates are projections, not guarantees."],
      ['Logistics', 'By purchasing, you acknowledge that items may be shipped from various global locations, which may result in separate shipments for items within a single order.'],
    ],
  },
  {
    title: 'Returns, Refunds, and Cancellations',
    items: [
      ['Supplier-Dependent Policy', 'Because we utilize a dropship model, return policies are dictated by the specific supplier of the product.'],
      ['Refund Workflow', 'All returns must be initiated through our platform’s return/refund dashboard. Refunds will only be processed upon confirmation of the return by the supplier or verification of the claim.'],
      ['Damaged/Defective Items', 'In the event of receiving a damaged or defective item, you must provide photographic evidence within 48 hours of delivery to initiate a claim.'],
    ],
  },
  {
    title: 'Limitation of Liability and Disclaimers',
    items: [
      ['"As-Is" Platform', 'The Price-Select.com platform, including all content and services, is provided on an "as-is" and "as-available" basis.'],
      ['Exclusion of Liability', 'To the maximum extent permitted by law, Price-Select.com shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of our services, the inability to use our services, or the products purchased through our platform.'],
      ['Indemnification', 'You agree to indemnify, defend, and hold harmless Price-Select.com, Jr-Procurement.com, and its officers, directors, and agents from any claims, liabilities, or expenses (including reasonable legal fees) arising from your misuse of the platform or violation of these Terms.'],
    ],
  },
  {
    title: 'Intellectual Property',
    text: 'All content on this site, including the platform design, text, graphics, and logos, is the property of Price-Select.com or its suppliers and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without express written consent.',
  },
  {
    title: 'Governing Law and Dispute Resolution',
    text: 'This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Jr-Procurement.com is registered, without regard to conflict of law principles. Any disputes arising from this Agreement shall be resolved through binding arbitration in said jurisdiction.',
  },
]
