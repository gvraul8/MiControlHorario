type AppLogoSize = 'header' | 'xl';

interface AppLogoProps {
  size?: AppLogoSize;
  className?: string;
}

const sizeClass: Record<AppLogoSize, string> = {
  header: 'app-logo-header',
  xl: 'app-logo-xl',
};

const sizePx: Record<AppLogoSize, number> = {
  header: 52,
  xl: 132,
};

export default function AppLogo({ size = 'header', className = '' }: AppLogoProps) {
  const px = sizePx[size];
  return (
    <img
      src="/icon-512.png"
      srcSet="/icon-192.png 192w, /icon-512.png 512w"
      sizes={`${px}px`}
      alt=""
      className={`app-logo ${sizeClass[size]} ${className}`.trim()}
      width={px}
      height={px}
      decoding="async"
    />
  );
}
