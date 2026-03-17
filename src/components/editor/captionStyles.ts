/**
 * Shared caption style definitions.
 * Used in both DOM preview (Tailwind classes) and FFmpeg render (drawtext params).
 */

export type CaptionStyleId = "none" | "modern" | "bold" | "minimal" | "karaoke" | "outline";

export interface CaptionStyleDef {
  id: CaptionStyleId;
  label: string;
  description: string;
  /** Tailwind classes for the caption container in DOM preview */
  containerClass: string;
  /** Tailwind classes for the currently spoken word */
  activeWordClass: string;
  /** Tailwind classes for non-active words (karaoke dims them) */
  inactiveWordClass: string;
}

export const CAPTION_STYLES: CaptionStyleDef[] = [
  {
    id: "none",
    label: "None",
    description: "No captions",
    containerClass: "hidden",
    activeWordClass: "",
    inactiveWordClass: "",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Clean white text with dark background",
    containerClass:
      "bg-black/60 text-white rounded-lg px-3 py-1.5 text-base font-medium tracking-wide backdrop-blur-sm",
    activeWordClass: "text-purple-300",
    inactiveWordClass: "",
  },
  {
    id: "bold",
    label: "Bold",
    description: "Large yellow text, high contrast",
    containerClass:
      "text-white rounded-md px-4 py-2 text-lg font-bold uppercase tracking-wider",
    activeWordClass: "text-yellow-300",
    inactiveWordClass: "",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Subtle white text with drop shadow",
    containerClass:
      "text-white text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
    activeWordClass: "text-purple-300",
    inactiveWordClass: "",
  },
  {
    id: "karaoke",
    label: "Karaoke",
    description: "Word-by-word highlight as speech plays",
    containerClass:
      "bg-black/70 text-white/40 rounded-lg px-3 py-1.5 text-base font-semibold tracking-wide",
    activeWordClass: "text-white scale-110 inline-block",
    inactiveWordClass: "text-white/40",
  },
  {
    id: "outline",
    label: "Outline",
    description: "White text with purple outline, no background",
    containerClass:
      "text-white text-lg font-bold [text-shadow:_-2px_-2px_0_#7c3aed,_2px_-2px_0_#7c3aed,_-2px_2px_0_#7c3aed,_2px_2px_0_#7c3aed]",
    activeWordClass: "text-purple-300",
    inactiveWordClass: "",
  },
];

export function getCaptionStyleDef(id: string): CaptionStyleDef {
  return CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES[0];
}
