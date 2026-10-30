export function Logo({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <span
      className="text-brand"
      style={{
        fontFamily: "var(--font-logo-src), sans-serif",
        fontSize: size === "lg" ? "1.375rem" : "1rem",
        letterSpacing: size === "lg" ? "-0.5px" : "-0.3px",
      }}
    >
      DIL
      <span style={{ display: "inline-block", transform: "skewX(-16deg)" }}>MU</span>
      SS
    </span>
  );
}
