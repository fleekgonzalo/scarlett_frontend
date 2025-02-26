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
              ? "default-src 'self'; media-src 'self' blob: https://premium.aiozpin.network; frame-ancestors 'self' http://localhost:* https://silksecure.net https://wallet.silk.sc; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://reown.com; style-src 'self' 'unsafe-inline' https://reown.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://premium.aiozpin.network https://*.ipfs.dweb.link https://* data: blob:; connect-src 'self' https://premium.aiozpin.network https://*.ipfs.dweb.link https://rpc.walletconnect.org https://api.web3modal.org https://tableland.network https://*.infura.io wss://*.walletconnect.org ws://localhost:* http://localhost:* https://*.xmtp.network https://*.xmtp.org https://dev.xmtp.network https://*.irys.xyz https://uploader.irys.xyz https://node1.irys.xyz https://node2.irys.xyz;"
              : "default-src 'self'; media-src 'self' blob: https://premium.aiozpin.network; frame-ancestors 'self' https://silksecure.net https://wallet.silk.sc; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://reown.com; style-src 'self' 'unsafe-inline' https://reown.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://premium.aiozpin.network https://*.ipfs.dweb.link https://* data: blob:; connect-src 'self' https://premium.aiozpin.network https://*.ipfs.dweb.link https://rpc.walletconnect.org https://api.web3modal.org https://tableland.network https://*.infura.io wss://*.walletconnect.org https://*.xmtp.network https://*.xmtp.org https://dev.xmtp.network https://*.irys.xyz https://uploader.irys.xyz https://node1.irys.xyz https://node2.irys.xyz;"
          },
          {
            // Modified for external image loading
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless'
          },
          {
            // Required for SharedArrayBuffer
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  }
}

module.exports = nextConfig 