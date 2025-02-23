/** @type {import('next').NextConfig} */
const nextConfig = {
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