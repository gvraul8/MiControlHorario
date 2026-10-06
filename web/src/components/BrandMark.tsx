import AppLogo from './AppLogo';

interface BrandMarkProps {
  variant?: 'hero' | 'header';
  subtitle?: string;
}

function BrandTitle({
  className = '',
  as: Tag = 'p',
}: {
  className?: string;
  as?: 'p' | 'h1';
}) {
  return (
    <Tag className={`brand-mark-title ${className}`.trim()}>
      <span className="brand-mark-green">Mi</span>{' '}
      <span className="brand-mark-navy">Control</span>{' '}
      <span className="brand-mark-green">Horario</span>
    </Tag>
  );
}

export default function BrandMark({ variant = 'hero', subtitle }: BrandMarkProps) {
  if (variant === 'header') {
    return (
      <div className="brand-mark brand-mark-header">
        <div className="brand-mark-header-top">
          <AppLogo size="header" className="brand-mark-compact-logo" />
          <BrandTitle className="brand-mark-title-compact" />
        </div>
        {subtitle ? <p className="app-subtitle app-subtitle-header">{subtitle}</p> : null}
      </div>
    );
  }

  return (
    <div className="brand-mark brand-mark-hero">
      <div className="brand-mark-visual">
        <AppLogo size="xl" className="brand-mark-hero-logo" />
        <BrandTitle as="h1" className="brand-mark-title-hero" />
      </div>
    </div>
  );
}
