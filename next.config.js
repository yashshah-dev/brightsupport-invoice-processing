/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Uncomment and set basePath when deploying to GitHub Pages with repo name
  basePath: '/brightsupport-invoice-processing',
  assetPrefix: '/brightsupport-invoice-processing',
}

module.exports = nextConfig
