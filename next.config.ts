import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Bug evidence can include screen recordings, so raise the default 1 MB
      // limit Next.js puts on Server Action request bodies.
      bodySizeLimit: "30mb",
    },
    // Next's internal request proxy has its own body size cap (default 10MB)
    // that truncates large uploads before they reach the Server Action above,
    // surfacing as a confusing "Unexpected end of form" error. Keep this at
    // or above bodySizeLimit so it isn't the bottleneck.
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
