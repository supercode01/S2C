import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "combative-aardvark-2.convex.cloud", // Aapka exact Convex URL
      },
      // Agar in future koi aur link use karna ho toh usko bhi yahan add kar sakte hain
    ],
  },
};

export default nextConfig;