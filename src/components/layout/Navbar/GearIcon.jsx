// Matches the reference gear artwork (8 spokes, uniform stroke, open center circle) - the center circle is deliberately roomy (r=5 on a 24-wide viewBox) so a small avatar image can sit inside it.
export default function GearIcon({ size = 24, className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 1.6v2.1M12 20.3v2.1M22.4 12h-2.1M3.7 12H1.6M19.1 4.9l-1.5 1.5M6.4 17.6l-1.5 1.5M19.1 19.1l-1.5-1.5M6.4 6.4 4.9 4.9M15.6 2.7l-.6 2M8.4 2.7l.6 2M15.6 21.3l-.6-2M8.4 21.3l.6-2M21.3 15.6l-2-.6M2.7 15.6l2-.6M21.3 8.4l-2 .6M2.7 8.4l2 .6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      {children}
    </svg>
  );
}
