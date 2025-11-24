import type { ReactNode } from 'react';

export type HeroCardProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryCta?: ReactNode;
  secondaryCta?: ReactNode;
  rightSlot?: ReactNode;
  variant?: 'gradient' | 'surface';
};

export default function HeroCard({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  rightSlot,
  variant = 'gradient'
}: HeroCardProps) {
  const isGradient = variant === 'gradient';

  const containerClasses = [
    'relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl transition',
    isGradient
      ? 'border border-white/60 bg-gradient-to-br from-indigo-600 via-violet-500 to-rose-400 text-white'
      : 'border border-white/70 bg-white/95 ring-1 ring-indigo-100 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-50 dark:ring-indigo-900/30'
  ].join(' ');

  const eyebrowClasses = isGradient
    ? 'inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80 ring-1 ring-white/30'
    : 'inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-100 dark:ring-indigo-800/60';

  const titleClasses = isGradient
    ? 'text-4xl font-semibold leading-tight text-white sm:text-5xl'
    : 'text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl dark:text-white';

  const subtitleClasses = isGradient
    ? 'text-lg text-white/90'
    : 'text-lg text-slate-600 dark:text-slate-200';

  return (
    <div className={containerClasses}>
      {isGradient ? (
        <div className="absolute inset-0 opacity-30" aria-hidden>
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_70%)]" />
        </div>
      ) : null}
      <div className={rightSlot ? 'relative grid gap-10 lg:grid-cols-[1.1fr,0.9fr]' : 'relative space-y-6'}>
        <div className="space-y-6">
          {eyebrow ? <p className={eyebrowClasses}>{eyebrow}</p> : null}
          <h1 className={titleClasses}>{title}</h1>
          <p className={subtitleClasses}>{subtitle}</p>
          {primaryCta || secondaryCta ? (
            <div className="flex flex-wrap gap-3">
              {primaryCta}
              {secondaryCta}
            </div>
          ) : null}
        </div>
        {rightSlot ? <div className="relative">{rightSlot}</div> : null}
      </div>
    </div>
  );
}
