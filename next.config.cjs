/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 1. STATİK SAYFA ÜRETİM AYARLARI (Hata Çözümü)
  // Binlerce sayfa üretilirken zaman aşımını engeller ve kaynak kullanımını kısıtlar.
  staticPageGenerationTimeout: 1000, // Sayfa başına bekleme süresini artırır.
  
  experimental: {
    // App Router Next 14'te varsayılan olduğu için appDir: true'ya artık gerek yok.
    // Ancak build sırasında OOM (Out of Memory) hatasını engellemek için şunlar kritik:
    workerThreads: false, 
    cpus: 1 
  },

  // 2. YÖNLENDİRME MANTIĞI
  async redirects() {
    return [
      {
        source: '/race/:id',
        destination: '/race',
        permanent: true,
      },
    ];
  },

  // Opsiyonel: Eğer görsel optimizasyonunda (Image component) dış kaynak kullanıyorsan ekleyebilirsin.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
