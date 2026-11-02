'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Circle, Rocket, Undo2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, ConfirmAction, Field, Input, StatusBadge } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { errorToast, successToast } from '@/components/ui/toast';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { isVersionConflict, labelForPath, mapFieldErrors, publishReadiness, toIso } from './product-logic';
import { useMinProductImages } from './use-min-images';

/**
 * Status bar of the product view page: current status, the publication checklist (same rules as the backend)
 * and one-click Publish / Move to draft / Schedule through POST /admin/products/:id/publication.
 */
export function PublishBar({ product, canPublish, onFix, onChanged }) {
  const queryClient = useQueryClient();
  const minImages = useMinProductImages();
  const [serverErrors, setServerErrors] = useState({});
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const live = product.status === 'published' || product.status === 'scheduled';

  const checks = useMemo(() => {
    const local = publishReadiness(product, { minImages });
    const known = new Set(local.map((check) => check.path));
    // Anything the backend reported that the local rules did not predict is shown as an extra failing item.
    const extra = Object.entries(serverErrors).filter(([path]) => !known.has(path)).map(([path, message]) => ({ id: `server-${path}`, path, ok: false, message }));
    return [...local.map((check) => (serverErrors[check.path] && check.ok ? { ...check, ok: false, message: serverErrors[check.path] } : check)), ...extra];
  }, [product, minImages, serverErrors]);
  const failing = checks.filter((check) => !check.ok);

  const change = useMutation({
    mutationFn: ({ status, publishAt = null }) => browserApi.post(`/admin/products/${product.id}/publication`, { version: Number(product.version), status, publishAt }).then((response) => response.data.data),
    onSuccess: (saved, { status }) => {
      setServerErrors({});
      setScheduleOpen(false);
      queryClient.setQueryData(['admin-product', product.id], saved);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      successToast(status === 'published' ? 'Product published' : status === 'scheduled' ? 'Publication scheduled' : 'Moved to draft');
      onChanged?.(saved);
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        queryClient.invalidateQueries({ queryKey: ['admin-product', product.id] });
        errorToast('This product changed', 'The latest version has been loaded. Check it and try again.');
        return;
      }
      const mapped = mapFieldErrors(error?.response?.data?.error?.fieldErrors);
      delete mapped._form;
      setServerErrors(mapped);
      errorToast('Could not change publication', Object.keys(mapped).length ? 'Fix the items in the checklist, then try again.' : apiMessage(error));
    },
  });

  return (
    <Card>
      <CardBody className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={product.status} />
            <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
              {product.status === 'published' ? 'Visible on the storefront.' : product.status === 'scheduled' ? 'Goes live at the scheduled time.' : failing.length ? `${failing.length} thing${failing.length === 1 ? '' : 's'} to fix before this can be published.` : 'Ready to publish.'}
            </p>
          </div>
          {canPublish ? (
            <div className="flex flex-wrap items-center gap-2">
              {product.status === 'draft' ? (
                <>
                  <Button variant="secondary" size="sm" disabled={change.isPending} onClick={() => { setScheduleAt(''); setScheduleOpen(true); }}><CalendarClock size={15} /> Schedule</Button>
                  <Button size="sm" loading={change.isPending && change.variables?.status === 'published'} disabled={change.isPending} onClick={() => change.mutate({ status: 'published' })}><Rocket size={15} /> Publish</Button>
                </>
              ) : (
                <>
                  {product.status === 'scheduled' ? <Button size="sm" loading={change.isPending && change.variables?.status === 'published'} disabled={change.isPending} onClick={() => change.mutate({ status: 'published' })}><Rocket size={15} /> Publish now</Button> : null}
                  <Button variant="secondary" size="sm" disabled={change.isPending} onClick={() => setUnpublishOpen(true)}><Undo2 size={15} /> {product.status === 'scheduled' ? 'Cancel schedule' : 'Unpublish (move to draft)'}</Button>
                </>
              )}
            </div>
          ) : <Badge>You need the publish permission to change status</Badge>}
        </div>

        {!live || failing.length ? (
          <details open={failing.length > 0 && !live} className="rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] p-3 text-sm">
            <summary className="cursor-pointer text-xs font-semibold">Publication checklist ({checks.length - failing.length} of {checks.length} done)</summary>
            <ul className="mt-2 grid gap-1.5">
              {checks.map((check) => (
                <li key={check.id} className="flex flex-wrap items-center gap-2">
                  {check.ok ? <CheckCircle2 size={15} className="shrink-0 text-[var(--color-success)]" aria-hidden="true" /> : <Circle size={15} className="shrink-0 text-[var(--color-warning)]" aria-hidden="true" />}
                  <span className={check.ok ? 'text-[var(--color-muted)]' : 'font-medium'}>{check.ok ? `${labelForPath(check.path)}: done` : check.message}</span>
                  <span className="sr-only">{check.ok ? 'Done' : 'To do'}</span>
                  {!check.ok && onFix ? <Button variant="ghost" size="sm" onClick={() => onFix(check.path)}>Fix<span className="sr-only"> {labelForPath(check.path)}</span></Button> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {Object.keys(serverErrors).length ? <Alert tone="error">The server did not accept the change. The items above show what to fix.</Alert> : null}
      </CardBody>

      <ConfirmAction
        open={unpublishOpen}
        onOpenChange={setUnpublishOpen}
        title={product.status === 'scheduled' ? 'Cancel the schedule?' : 'Unpublish this product?'}
        description="It moves back to draft and disappears from the storefront. Customers with the link will see it as unavailable."
        confirmLabel="Move to draft"
        onConfirm={() => change.mutate({ status: 'draft' })}
      />
      {scheduleOpen ? (
        <DialogRoot open onOpenChange={(open) => { if (!open) setScheduleOpen(false); }}>
          <DialogContent
            size="sm"
            title="Schedule publication"
            description="The product goes live automatically at this time (your local time)."
            footer={<><Button variant="secondary" onClick={() => setScheduleOpen(false)}>Cancel</Button><Button loading={change.isPending} disabled={!scheduleAt || !toIso(scheduleAt) || new Date(scheduleAt) <= new Date()} onClick={() => change.mutate({ status: 'scheduled', publishAt: toIso(scheduleAt) })}>Schedule</Button></>}
          >
            <Field label="Go live at" required hint={scheduleAt && new Date(scheduleAt) <= new Date() ? 'Choose a time in the future.' : undefined}>
              <Input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
            </Field>
          </DialogContent>
        </DialogRoot>
      ) : null}
    </Card>
  );
}
