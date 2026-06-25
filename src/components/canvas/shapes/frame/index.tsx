import { FrameShape } from "@/redux/slice/shapes";
import { LiquidGlassButton } from "@/components/buttons/liquid-glass";
import { Brush, Palette, X } from "lucide-react";
import { useFrame } from "@/hooks/use-canvas";

export const Frame = ({
  shape,
  toggleInspiration,
}: {
  shape: FrameShape;
  toggleInspiration: () => void;
}) => {
  const { isGenerating, handleGenerateDesign, cancelGeneration, selectFrameWithChildren } = useFrame(shape);

  return (
    <>
      <div
        className="absolute pointer-events-none backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          borderRadius: "12px", // Slightly more rounded for modern feel
        }}
      />
      {/* "Frame N" label — click karne par pura frame + uske andar ki saari
          shapes select ho jati hain (Figma jaisa). pointer-events-auto taake
          click pakda ja sake. */}
      <div
        className="absolute pointer-events-auto cursor-pointer whitespace-nowrap text-xs font-medium text-white/80 select-none hover:text-white"
        style={{
          left: shape.x,
          top: shape.y - 24, // Position above the frame
          fontSize: "11px",
          lineHeight: "1.2",
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectFrameWithChildren();
        }}>
        Frame {shape.frameNumber}
      </div>
      <div
        className="absolute pointer-events-auto flex gap-4"
        style={{
          left: shape.x + shape.w - 235, // Position at top right, accounting for button width
          top: shape.y - 36, // Position above the frame with some spacing
          zIndex: 1000, // Ensure button is on top
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}>
        <LiquidGlassButton
          size="sm"
          variant="subtle"
          onClick={toggleInspiration}
          style={{ pointerEvents: "auto" }}>
          <Palette size={12} />
          Inspiration
        </LiquidGlassButton>
        <LiquidGlassButton
          size="sm"
          variant="subtle"
          onClick={handleGenerateDesign}
          disabled={isGenerating}
          className={isGenerating ? "animate-pulse" : ""}
          style={{ pointerEvents: "auto" }}>
          <Brush size={12} className={isGenerating ? "animate-spin" : ""} />
          {isGenerating ? "Generating..." : "Generate Design"}
        </LiquidGlassButton>
        {/* Generation chalte waqt Cancel button — AI generation rok deta hai */}
        {isGenerating && (
          <LiquidGlassButton
            size="sm"
            variant="subtle"
            onClick={cancelGeneration}
            style={{ pointerEvents: "auto" }}>
            <X size={12} />
            Cancel
          </LiquidGlassButton>
        )}
      </div>
    </>
  );
};
