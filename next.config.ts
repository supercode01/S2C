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
        hostname: "combative-aardvark-2.convex.cloud", // Aapka exact Convex URL
      },
      // Agar in future koi aur link use karna ho toh usko bhi yahan add kar sakte hain
    ],
  },
};

export default nextConfig;