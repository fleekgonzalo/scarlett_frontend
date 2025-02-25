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
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
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
              ? "frame-ancestors 'self' http://localhost:* https://silksecure.net https://wallet.silk.sc; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://reown.com; style-src 'self' 'unsafe-inline' https://reown.com;"
              : "frame-ancestors 'self' https://silksecure.net https://wallet.silk.sc; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://reown.com; style-src 'self' 'unsafe-inline' https://reown.com;"
          },
          {
            // Required for SharedArrayBuffer
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            // Required for SharedArrayBuffer
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 