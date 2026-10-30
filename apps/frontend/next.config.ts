import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Admin mahsulot rasmlari uchun ixtiyoriy manbadan URL kiritishi mumkin
    // (o'z hosting, S3, boshqa CDN) — shuning uchun domen cheklanmagan.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
