/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    // serverActionsはデフォルトで有効になったため削除
  },
}

module.exports = nextConfig