import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['arweave.net', 'ipfs.io'],
  },
};

export default nextConfig;
