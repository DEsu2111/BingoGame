/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permit LAN access to dev server assets to silence cross-origin warnings in dev
  allowedDevOrigins: ['http://192.168.1.5:3000', 'http://192.168.1.5:3002'],
};

export default nextConfig;
