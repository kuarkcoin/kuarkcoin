/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Binlerce sayfa üretilirken zaman aşımını engeller.
  staticPageGenerationTimeout: 1000,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/race/:id',
        destination: '/race',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
