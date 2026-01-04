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
  // Deshabilitar generación estática de páginas de error para evitar ENOENT en Vercel
  output: 'standalone',
};

module.exports = nextConfig;
