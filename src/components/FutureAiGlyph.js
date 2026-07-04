'use client';

export function FutureAiGlyph({ className = 'h-6 w-6' }) {
  return (
    <span className={`relative inline-flex ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <defs>
          <linearGradient
            id="ai-core-gradient"
            x1="6"
            y1="42"
            x2="42"
            y2="6"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.45" stopColor="#818cf8" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient
            id="ai-orbit-gradient"
            x1="8"
            y1="8"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        <circle
          cx="24"
          cy="24"
          r="18.5"
          fill="none"
          stroke="url(#ai-orbit-gradient)"
          strokeWidth="1.7"
          opacity="0.65"
        />
        <path
          d="M10 25.2c5.9-3.6 10.6-6 14-7.2 4.1-1.4 8.1-1.2 14 .8"
          fill="none"
          stroke="url(#ai-orbit-gradient)"
          strokeLinecap="round"
          strokeWidth="1.4"
          opacity="0.7"
        />
        <path
          d="M15.2 36.2c2.8-5.1 5.6-8.8 8.8-11.6 3.1-2.8 6.8-4.9 12.7-6.8"
          fill="none"
          stroke="url(#ai-orbit-gradient)"
          strokeLinecap="round"
          strokeWidth="1.2"
          opacity="0.55"
        />

        <g
          stroke="url(#ai-core-gradient)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.1"
        >
          <path
            d="M24 12.6 35.8 19.3v13.4L24 39.4l-11.8-6.7V19.3L24 12.6z"
            fill="rgba(15, 23, 42, 0.18)"
          />
          <path
            d="M24 16.8 32.2 21.4v9.2L24 35.2l-8.2-4.6v-9.2L24 16.8z"
            fill="none"
            opacity="0.95"
          />
          <path d="M24 20.4v7.2m-3.6 0h7.2" />
        </g>

        <circle cx="9.2" cy="23.6" r="1.9" fill="#67e8f9" />
        <circle cx="37.8" cy="17.6" r="1.6" fill="#a78bfa" />
        <circle cx="33.2" cy="36.4" r="1.5" fill="#f472b6" />
      </svg>
    </span>
  );
}
