"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const steps = [
  {
    n: "01",
    title: "Add Your Moodboard & Inspiration",
    desc: "Upload moodboard and inspiration images. Sketch2Design generates a matching color palette and typography system for your UI.",
    img: "/images/Moodboard.png",
  },
  {
    n: "02",
    title: "Sketch on the Canvas",
    desc: "Sketch your layout on the canvas and let AI generate real, structured UI inside your components in seconds.",
    img: "/images/Canvas-Design.png",
  },
  {
    n: "03",
    title: "Refine with Design Chat",
    desc: "Edit anything through the NLP design chat or by hand—then generate the full website workflow in one click.",
    img: "/images/Design-chat.png",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // har 4 second baad agla step (auto-play) — user ke click karne par ruk jata hai
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActive((p) => (p + 1) % steps.length);
    }, 4000);
    return () => clearInterval(t);
  }, [paused]);

    useEffect(() => {
    if (!paused) return;
    const r = setTimeout(() => setPaused(false), 8000);
    return () => clearTimeout(r);
  }, [paused, active]);

  return (
    <section id="how-it-works" className="py-24 px-5 bg-[var(--surface)]/40">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* LEFT — heading + steps */}
        <div>
          <span className="inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            How It Works
          </span>
          <h2 className="mt-5 font-display text-3xl md:text-4xl font-bold leading-tight">
            From Sketch to Polished UI in 3 Steps
          </h2>

          <div className="mt-10 relative">
            {/* vertical connecting line */}
            <span className="absolute left-[35px] top-5 bottom-5 w-px bg-[var(--border)]" />

            <div className="space-y-2">
              {steps.map((s, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={s.n}
                    onClick={() => {
                      setActive(i);
                      setPaused(true);
                    }}
                    className="relative flex gap-5 text-left w-full rounded-2xl p-4 transition-colors"
                  >
                    {/* number bubble */}
                    <span
                      className={`relative z-10 shrink-0 grid place-items-center w-10 h-10 rounded-full font-display font-bold text-sm border-2 transition-all duration-300 ${
                        isActive
                          ? "bg-[var(--accent)] border-[var(--accent)] text-white scale-110"
                          : "bg-[var(--surface)] border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {s.n}
                    </span>

                    <div className={`transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-50"}`}>
                      <h3 className="font-display font-bold text-lg">{s.title}</h3>
                      {/* description sirf active step ke liye smoothly khulti hai */}
                      <div
                        className={`grid transition-all duration-400 ${
                          isActive ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]"
                        }`}
                      >
                        <p className="overflow-hidden text-sm text-[var(--muted)] leading-relaxed">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — visual panel */}
        <div className="relative">
          {/* glow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-[var(--accent)]/20 to-[var(--accent-2)]/20 blur-3xl rounded-[2rem] pointer-events-none" />

          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xl">
            {/* fake browser bar */}
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-green-400/70" />
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
              {steps.map((s, i) => (
                <Image
                  key={s.n}
                  src={s.img}
                  alt={s.title}
                  fill
                  className={`object-contain transition-all duration-700 ${
                    i === active ? "opacity-100 scale-100" : "opacity-0 scale-105"
                  }`}
                />
              ))}

              {/* active step badge */}
              <span className="absolute bottom-4 left-4 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold shadow-lg">
                Step {steps[active].n}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}