import type { NextConfig } from 'next';

const nextConfig: NextConfig = {

  // IMPORTANTE PARA FIREBASE APP HOSTING
  // NÃO usar output: 'export'

  reactStrictMode: false,

  images: {
    unoptimized: true,
  },

  webpack: (config) => {

    config.resolve.fullySpecified = false;

    return config;
  },

  // TEMPORÁRIO DURANTE ESTABILIZAÇÃO
  // REMOVER EM PRODUÇÃO FINAL
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;