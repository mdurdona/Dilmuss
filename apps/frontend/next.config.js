/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sdmntprwestus3.oaiusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.uzum.uz',
      },
    ],
  },
};

module.exports = nextConfig;
