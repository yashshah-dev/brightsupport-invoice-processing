/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Uncomment and set basePath when deploying to GitHub Pages with repo name
  basePath: isProd ? '/brightsupport-invoice-processing' : undefined,
  assetPrefix: isProd ? '/brightsupport-invoice-processing' : undefined,
}

module.exports = nextConfig
