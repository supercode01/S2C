import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SMTP/email API route ke liye: nodemailer ek server-only Node package hai
  // jo dynamic requires use karta hai. Turbopack isay bundle karte waqt
  // "Module not found: Can't resolve 'nodemailer'" deta hai. Yahan external
  // mark karne se Next isay bundle nahi karta, seedha Node module se resolve
  // karta hai.
  serverExternalPackages: ["nodemailer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "original-goldfinch-215.convex.cloud", // aapka exact Convex URL
      },
      {
        protocol: "https",
        hostname: "**.convex.cloud", // koi bhi Convex deployment (backup ke liye)
      },
    ],
  },
};

export default nextConfig;