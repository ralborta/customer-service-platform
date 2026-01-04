const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@customer-service/shared'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
  // Evitar generación de páginas de error estáticas que causan ENOENT
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Deshabilitar exportación estática completa (Vercel usa serverless)
  output: undefined,
};

module.exports = nextConfig;
