
interface LogoProps {
  className?: string;
  size?: number;
}

export default function KenzoLogo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 hover:scale-105`}
    >
      {/* 
        The Kenzo logo shape is an infinity loop where the right loop is split:
        The upper ribbon sweeps up-right, the lower ribbon sweeps down-right.
      */}
      <g filter="url(#glow)">
        <path
          d="M 125 150 C 125 100, 60 100, 60 150 C 60 200, 125 200, 160 150 L 290 50 C 330 20, 360 40, 360 40"
          stroke="url(#kenzo-grad)"
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 180 170 L 310 270 C 340 290, 365 270, 365 270"
          stroke="url(#kenzo-grad)"
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
      <defs>
        <linearGradient id="kenzo-grad" x1="60" y1="150" x2="365" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
