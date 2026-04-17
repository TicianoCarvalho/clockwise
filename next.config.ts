import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Removido 'output: export' para permitir que o Next.js funcione de forma dinâmica.
     Isso é essencial para as rotas de API (/api/v1/...) funcionarem no Firebase App Hosting.
  */
  
  images: {
    unoptimized: true,
  },

  /* Removido o experimental.esmExternals conforme sugerido pelo log do Next.js 15,
     para evitar conflitos na resolução de módulos.
  */

  webpack: (config) => {
    config.resolve.fullySpecified = false;
    return config;
  },

  // Mantendo as supressões de erro para facilitar o build inicial do seu projeto SaaS
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;