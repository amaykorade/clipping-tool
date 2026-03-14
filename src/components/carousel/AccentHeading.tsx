/**
 * Renders heading text with specified words highlighted in accent gradient + glow.
 */
export default function AccentHeading({
  text,
  accentWords,
  className = "",
}: {
  text: string;
  accentWords?: string[];
  className?: string;
}) {
  if (!accentWords?.length) {
    return <h2 className={className}>{text}</h2>;
  }

  // Build a regex that matches any accent word (case-insensitive, whole-ish match)
  const pattern = new RegExp(
    `(${accentWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);

  return (
    <h2 className={className}>
      {parts.map((part, i) => {
        const isAccent = accentWords.some(
          (w) => w.toLowerCase() === part.toLowerCase(),
        );
        if (isAccent) {
          return (
            <span
              key={i}
              className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 40px rgba(168,85,247,0.5)",
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </h2>
  );
}
