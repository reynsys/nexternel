/** Minimal inline icons (no MUI dependency). */

export function IconPm({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.85 }}
    >
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="12" cy="10" r="2.8" />
      <circle cx="18" cy="13" r="2" />
    </svg>
  );
}

export function IconTemperature({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.85 }}
    >
      <path d="M12 3a2 2 0 0 0-2 2v8.5a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHumidity({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.85 }}
    >
      <path d="M12 2c-4 6-6 9.2-6 12a6 6 0 1 0 12 0c0-2.8-2-6-6-12z" />
    </svg>
  );
}

export function IconAqi({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      style={{ flexShrink: 0, opacity: 0.85 }}
    >
      <path d="M4 14h16M6 10h12M8 6h8" strokeLinecap="round" />
    </svg>
  );
}
