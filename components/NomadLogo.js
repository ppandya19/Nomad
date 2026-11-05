// Nomad product mark: map pin with a play triangle — reels turned into
// places — on the signature gradient badge. Decorative — the adjacent
// wordmark always carries the name.
import { useId } from 'react';

export default function NomadLogo({ size=24 }){
  const gid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#833ab4" />
          <stop offset="0.55" stopColor="#fd1d1d" />
          <stop offset="1" stopColor="#fcb045" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <circle cx="16" cy="12.5" r="6.2" fill="#fff" />
      <path d="M11.6 16.8 L16 25.5 L20.4 16.8 Z" fill="#fff" />
      <path d="M14.2 9.8 L14.2 15.2 L18.6 12.5 Z" fill="#1a1a1a"
        stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
