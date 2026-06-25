"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  /** kis taraf se aaye: up (default), left, right, scale */
  from?: "up" | "left" | "right" | "scale";
  /** kitni der baad shuru ho (ms) — stagger ke liye */
  delay?: number;
  className?: string;
};

export default function Reveal({
  children,
  from = "up",
  delay = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target); // ek baar dikha ke band
          }
        });
      },
      { threshold: 0.15 } // 15% section dikhte hi trigger
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${from} ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
