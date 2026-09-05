import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function AdminPageHeader({ title, description, backHref, backLabel = 'Back', badge, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {backHref ? <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"><ChevronLeft size={15} />{backLabel}</Link> : null}
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em] md:text-[1.75rem]">{title}</h1>{badge}</div>
        {description ? <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
