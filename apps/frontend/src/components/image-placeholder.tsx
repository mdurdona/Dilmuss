export function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-brand-light to-cream ${className}`}
    >
      <svg width="34%" height="34%" viewBox="0 0 64 64" fill="none" className="text-brand/40">
        <path
          d="M24 8 L24 14 C24 17 27 20 32 20 C37 20 40 17 40 14 L40 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 9 L14 16 L18 24 L22 21 L22 56 L42 56 L42 21 L46 24 L50 16 L40 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
