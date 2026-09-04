export default function Loading() {
  return <div className="container py-16" role="status" aria-live="polite"><span className="sr-only">Preparing your experience…</span><div className="grid gap-12 md:grid-cols-2"><div className="grid content-center gap-4"><div className="skeleton h-3 w-28 rounded" /><div className="skeleton h-16 max-w-xl rounded-xl" /><div className="skeleton h-5 max-w-md rounded" /><div className="skeleton h-11 w-40 rounded-[var(--radius-sm)]" /></div><div className="skeleton aspect-[.92] rounded-[2rem]" /></div></div>;
}
