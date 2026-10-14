/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
    // Local images: bundled /public assets and MongoDB-backed uploads (/api/uploads/<folder>/<file>).
    // No query strings, so nobody can request arbitrary optimizer variants.
    localPatterns: [{ pathname: '/**', search: '' }],
    qualities: [60, 75, 85],
  },
}

export default nextConfig
