export function Alert({ tone = 'info', children }) {
  const styles = { error: 'border-[color-mix(in_srgb,var(--color-danger)_24%,white)] bg-[color-mix(in_srgb,var(--color-danger)_7%,white)] text-[var(--color-danger)]', success: 'border-[color-mix(in_srgb,var(--color-success)_24%,white)] bg-[color-mix(in_srgb,var(--color-success)_7%,white)] text-[var(--color-success)]', info: 'border-[var(--color-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-medium leading-6 ${styles[tone] || styles.info}`}>{children}</div>;
}
