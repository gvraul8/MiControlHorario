type TabIconName = 'calendar' | 'jobs' | 'stats';

interface TabIconProps {
  name: TabIconName;
  className?: string;
}

export default function TabIcon({ name, className }: TabIconProps) {
  const common = {
    className,
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }

  if (name === 'jobs') {
    return (
      <svg {...common}>
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M3 12h18" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 17V9" />
      <path d="M12 17V6" />
      <path d="M16 17v-4" />
    </svg>
  );
}
