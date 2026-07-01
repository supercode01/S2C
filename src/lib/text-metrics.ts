// Canvas-based text width measurement. Pehle text ka width
// `text.length * fontSize * 0.6` se ESTIMATE hota tha — proportional fonts ke
// liye yeh galat hota hai, is liye selection box, hit-test, aur edit input
// teeno alag-alag size dikhate the. Yahan real rendered width nikal kar sab ko
// ek hi (sahi) value par la dete hain.

export interface TextMetricsInput {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle?: string;
  letterSpacing?: number;
  textTransform?: string;
}

let sharedCanvas: HTMLCanvasElement | null = null;

const applyTransform = (text: string, transform?: string): string => {
  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
};

export const measureTextWidth = (s: TextMetricsInput): number => {
  const estimate = Math.max(s.text.length * s.fontSize * 0.6, 0);
  // SSR / non-DOM environment me canvas nahi hota — estimate par fallback
  if (typeof document === "undefined") return estimate;

  if (!sharedCanvas) sharedCanvas = document.createElement("canvas");
  const ctx = sharedCanvas.getContext("2d");
  if (!ctx) return estimate;

  ctx.font = `${s.fontStyle ?? "normal"} ${s.fontWeight} ${s.fontSize}px ${s.fontFamily}`;
  const str = applyTransform(s.text, s.textTransform);
  let width = ctx.measureText(str).width;

  // Canvas measureText letterSpacing ko ignore karta hai — manually add karo
  if (s.letterSpacing && str.length > 1) {
    width += s.letterSpacing * (str.length - 1);
  }
  return width;
};
