/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "react-force-graph-2d", "force-graph"],
  },
};

export default nextConfig;
