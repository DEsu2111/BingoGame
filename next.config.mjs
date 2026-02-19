import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permit LAN access to dev server assets to silence cross-origin warnings in dev
  allowedDevOrigins: ['http://192.168.1.5:3000', 'http://192.168.1.5:3002'],
  // Ensure Turbopack uses this project as the root to resolve dependencies correctly
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
