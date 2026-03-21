/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Avoid intermittent Windows file-lock/cache rename issues in Next dev cache.
    if (dev && config.cache && config.cache.type === "filesystem") {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
