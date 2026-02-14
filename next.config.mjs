import path from 'node:path';

const projectRoot = path.resolve(process.cwd());

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
};

export default nextConfig;

