import path from 'node:path';
import type { NextConfig } from 'next';

// The `if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true')` branch in the API client is statically
// dead in a production build, but the dynamic import still emits a chunk. Replacing the module
// keeps the mock adapter and its seed data out of the shipped build entirely.
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
const emptyMock = path.resolve(process.cwd(), 'src/lib/mock/empty.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: useMocks
    ? undefined
    : { resolveAlias: { '@/lib/mock/adapter': './src/lib/mock/empty.ts' } },
  webpack: (config, { webpack }) => {
    if (!useMocks)
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/lib[\\/]mock[\\/]adapter/, emptyMock),
      );
    return config;
  },
};

export default nextConfig;
