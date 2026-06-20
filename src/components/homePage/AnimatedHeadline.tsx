"use client";

/**
 * Headline ko words mein tod ke ek ke baad ek reveal karta hai.
 * "||" daal ke line break kar sakte ho.
 * highlight={["Landing", "Pages"]} -> wo words accent color mein.
 */
type Props = {
  text: string;
  highlight?: string[];
  className?: string;
};

export default function AnimatedHeadline({ text, highlight = [], className = "" }: Props) {
  const lines = text.split("||");
  let wordIndex = 0;

  return (
    <h1 className={`font-display ${className}`}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.trim().split(" ").map((word, wi) => {
            const delay = wordIndex * 0.08; // har word 80ms baad
            wordIndex++;
            const isHi = highlight.includes(word);
            const words = line.trim().split(" ");
            return (
              <span key={wi} className="inline-block overflow-hidden align-bottom">
                <span
                  className="hl-word inline-block"
                  style={{ animationDelay: `${delay}s` }}
                >
                  <span className={isHi ? "text-[var(--accent-2)]" : ""}>{word}</span>
                  {wi < words.length - 1 ? "\u00A0" : ""}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}