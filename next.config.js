/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.eaglewebservices.com",
        pathname: "/**", // 👈 catch-all: allows *all* paths on this host
      },
      {
        protocol: "https",
        hostname: "public-post-items.s3.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
