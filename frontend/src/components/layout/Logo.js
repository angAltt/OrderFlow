/** OrderFlow mark: a parcel seen from above, with the tape line in amber. */
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="3" fill="#ffffff" />
      <rect x="13" y="3" width="6" height="26" fill="#f0a81c" />
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="3"
        fill="none"
        stroke="#17283a"
        strokeWidth="2"
      />
    </svg>
  );
}
