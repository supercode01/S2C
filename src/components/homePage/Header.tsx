"use client";

import { useState } from "react";
import Image from "next/image";

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Showcase", href: "#templates" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center">
          {/* apni logo /public/images/ mein rakho */}
          <Image
            src="/images/Logo_final.png"
            alt="Sketch2Design"
            width={140}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--text)] hover:text-[var(--muted)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a href="#" className="text-sm text-[var(--text)] hover:text-[var(--muted)]">
            Log In
          </a>
          <a
            href="#"
            className="text-sm font-semibold rounded-full px-4 py-2 bg-[var(--accent)] hover:opacity-90 transition"
          >
            Sign Up
          </a>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="w-6 h-0.5 bg-[var(--text)]" />
          <span className="w-6 h-0.5 bg-[var(--text)]" />
          <span className="w-6 h-0.5 bg-[var(--text)]" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-[var(--muted)] hover:text-[var(--text)]"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#"
            className="text-center text-sm font-semibold rounded-full px-4 py-2 bg-[var(--accent)]"
          >
            Sign Up
          </a>
        </div>
      )}
    </header>
  );
}
