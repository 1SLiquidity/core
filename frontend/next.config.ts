import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'encoding')
    return config
  },
  images: {
    remotePatterns: [
      {
        hostname: 'logo.moralis.io',
      },
      {
        hostname: 'coin-images.coingecko.com',
      },
      {
        hostname: 'assets.coingecko.com',
      },
    ],
  },
}

export default nextConfig
