// Settings gear: 8 flat-top teeth, even stroke, open centre circle. Author: Satvik Hemant Gupta
const GEAR_PATH =
  'M9.50 4.40 L10.50 1.80 L13.50 1.80 L14.50 4.40 A8 8 0 0 1 15.61 4.86 L18.15 3.73 L20.27 5.85 L19.14 8.39 A8 8 0 0 1 19.60 9.50 L22.20 10.50 L22.20 13.50 L19.60 14.50 A8 8 0 0 1 19.14 15.61 L20.27 18.15 L18.15 20.27 L15.61 19.14 A8 8 0 0 1 14.50 19.60 L13.50 22.20 L10.50 22.20 L9.50 19.60 A8 8 0 0 1 8.39 19.14 L5.85 20.27 L3.73 18.15 L4.86 15.61 A8 8 0 0 1 4.40 14.50 L1.80 13.50 L1.80 10.50 L4.40 9.50 A8 8 0 0 1 4.86 8.39 L3.73 5.85 L5.85 3.73 L8.39 4.86 A8 8 0 0 1 9.50 4.40 Z';

export default function GearIcon({ size = 40, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} aria-hidden="true">
      <path d={GEAR_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="5.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
