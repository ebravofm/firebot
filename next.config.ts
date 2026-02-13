import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // En producción elimina console.log/debug/info; mantiene error y warn para diagnóstico
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
