import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle. The production image copies
  // .next/standalone and .next/static rather than an installed node_modules
  // tree. Nothing else is configured at this milestone.
  output: 'standalone',
};

export default nextConfig;
