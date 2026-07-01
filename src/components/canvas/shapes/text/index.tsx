import { TextShape } from "@/redux/slice/shapes";
import { useDispatch } from "react-redux";
import { updateShape, commitShapeUpdate, removeShape } from "@/redux/slice/shapes";
import { useAppSelector } from "@/redux/store";
import { measureTextWidth } from "@/lib/text-metrics";
import { useState, useRef, useEffect } from "react";

export const Text = ({ shape }: { shape: TextShape }) => {
  const dispatch = useDispatch();
  // Sirf 'select' tool ke saath hi text "editable" (I-beam cursor, tooltip,
  // double-click edit, pointer capture) behave kare. Eraser/rect/koi aur tool
  // active ho to text baqi shapes ki tarah inert rahe — us tool ka cursor dikhe,
  // I-beam line ya "Double-click" tooltip na aaye.
  const currentTool = useAppSelector((s) => s.shapes.present?.tool ?? "select");
  const isSelectTool = currentTool === "select";
  const [isEditing, setIsEditing] = useState(shape.text === "Type here...");
  const [tempText, setTempText] = useState(shape.text);
  const inputRef = useRef<HTMLInputElement>(null);
  // Edit shuru hone se pehle ka text — Escape par isi par revert karte hain
  // (kyunke typing live shape.text me likhti hai).
  const originalTextRef = useRef(shape.text);

  // Auto-focus when text is newly created (placeholder text)
  useEffect(() => {
    if (shape.text === "Type here..." && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select all placeholder text
      setIsEditing(true);
    }
  }, [shape.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (shape.text === "Type here...") {
        inputRef.current.select(); // Select placeholder text
      }
    }
  }, [isEditing, shape.text]);

  const startEditing = () => {
    originalTextRef.current = shape.text;
    setTempText(shape.text);
    setIsEditing(true);
  };

  const handleDoubleClick = () => {
    startEditing();
  };

  // Canvas double-click ko khud detect kar ke yeh event bhejta hai (native
  // dblclick canvas ke pointer-capture/preventDefault ki wajah se reliably nahi
  // aata). Apni id match ho to edit mode shuru karo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === shape.id) {
        startEditing();
      }
    };
    window.addEventListener("text-start-edit", handler);
    return () => window.removeEventListener("text-start-edit", handler);
  }, [shape.id, shape.text]);

  // Typing ke dauran shape.text ko LIVE update karte hain (updateShape history
  // me entry nahi banata) taake selection box typed text ke saath live grow kare.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempText(value);
    dispatch(updateShape({ id: shape.id, patch: { text: value } }));
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = tempText.trim();
    if (trimmed === "" || trimmed === "Type here...") {
      // Delete empty or unchanged placeholder text box
      dispatch(removeShape(shape.id));
    } else {
      // Text pehle hi live update ho chuka hai; yahan ek baar commit karte hain
      // taake poora edit ek single undo step bane.
      dispatch(commitShapeUpdate({ id: shape.id, patch: { text: trimmed } }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      if (originalTextRef.current === "Type here...") {
        // Delete brand-new placeholder text box on escape
        dispatch(removeShape(shape.id));
      } else {
        // Live changes ko revert kar ke original text wapas laao
        dispatch(
          updateShape({
            id: shape.id,
            patch: { text: originalTextRef.current },
          })
        );
        setTempText(originalTextRef.current);
        setIsEditing(false);
      }
    }
  };

  if (isEditing) {
    // Input ko content ke saath grow karao — warna lamba text input ke andar
    // scroll ho kar shuru se cut jata tha (re-edit par "text side me chala jata"
    // wala issue). px-2 = dono side 8px padding (kul 16px).
    const editingWidth = Math.max(
      measureTextWidth({
        text: tempText,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontWeight,
        fontStyle: shape.fontStyle,
        letterSpacing: shape.letterSpacing,
        textTransform: shape.textTransform,
      }) + 16,
      40
    );
    return (
      <input
        ref={inputRef}
        type="text"
        className="absolute pointer-events-auto bg-transparent outline-none text-white rounded px-2 py-1"
        style={{
          left: shape.x,
          top: shape.y,
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          fontWeight: shape.fontWeight,
          fontStyle: shape.fontStyle,
          textAlign: shape.textAlign,
          textDecoration: shape.textDecoration,
          lineHeight: shape.lineHeight,
          letterSpacing: shape.letterSpacing,
          textTransform: shape.textTransform,
          color: shape.fill || "#ffffff",
          width: editingWidth,
          whiteSpace: "nowrap",
        }}
        value={tempText}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder=""
        autoComplete="off"
      />
    );
  }

  return (
    <div
      className={`absolute pointer-events-none select-none rounded px-2 py-1 ${
        isSelectTool ? "cursor-text" : ""
      }`}
      style={{
        left: shape.x,
        top: shape.y,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontWeight,
        fontStyle: shape.fontStyle,
        textAlign: shape.textAlign,
        textDecoration: shape.textDecoration,
        lineHeight: shape.lineHeight,
        letterSpacing: shape.letterSpacing,
        textTransform: shape.textTransform,
        color: shape.fill || "#ffffff",
        userSelect: "none",
        whiteSpace: "nowrap", // Prevent line breaks
      }}
      onDoubleClick={isSelectTool ? handleDoubleClick : undefined}
      title={isSelectTool ? "Double-click to edit" : undefined}>
      <span
        style={{
          display: "block",
          minWidth: "20px",
          minHeight: "1em",
          // Sirf select tool me apni jagah pointer events lo (taake double-click
          // se edit ho aur single-click se select ho). Yahan Tailwind ki
          // `pointer-events-auto` CLASS mat use karo — warna canvas ka
          // onPointerDown is span ko "interactive element" samajh kar single-click
          // selection ko ignore kar deta hai. Baqi tools (eraser/rect/etc.) me
          // text ko inert rakho taake us tool ka cursor + behaviour theek chale.
          pointerEvents: isSelectTool ? "auto" : "none",
        }}>
        {shape.text}
      </span>
    </div>
  );
};
