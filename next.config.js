/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        fs: false,
        net: false,
        tls: false,
        os: false,
        path: false
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "frame-ancestors 'self' http://localhost:* https://silksecure.net https://wallet.silk.sc;"
              : "frame-ancestors 'self' https://silksecure.net https://wallet.silk.sc;"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 