export default function AdminLoading() {
  return <div className="grid gap-5" role="status" aria-live="polite"><span className="sr-only">Loading administration workspace</span><div className="skeleton h-24 rounded-[var(--radius-lg)]" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-32 rounded-[var(--radius-lg)]" />)}</div><div className="skeleton h-72 rounded-[var(--radius-lg)]" /></div>;
}
