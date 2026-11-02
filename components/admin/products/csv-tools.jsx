'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { Alert, Button, Field, pushToast } from '@/components/ui';
import { DialogContent, DialogRoot } from '@/components/ui/overlay';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { uid } from './product-logic';

const MAX_CSV_BYTES = 5_000_000;

/** Error bodies of a blob request arrive as a Blob; read the JSON message out of it. */
async function blobErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text())?.error?.message || fallback; } catch { return fallback; }
  }
  return apiMessage(error, fallback);
}

/** Downloads the catalog CSV. The backend export honours the status, category and brand filters only. */
export function ExportCsvButton({ params }) {
  const exportCsv = useMutation({
    mutationFn: async () => {
      const response = await browserApi.get('/admin/products/export', { params, responseType: 'blob', timeout: 60000 });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'products.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: async (error) => pushToast({ tone: 'error', title: await blobErrorMessage(error, 'The export could not be downloaded.') }),
  });
  return <Button size="sm" variant="secondary" loading={exportCsv.isPending} onClick={() => exportCsv.mutate()}><Download size={15} /> Export CSV</Button>;
}

/** Bulk price/stock update by SKU: validate first (dry run), then apply all-or-nothing. */
export function ImportCsvDialog({ onClose, onDone }) {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [report, setReport] = useState(null);
  const key = useRef(uid());
  const post = (dryRun) => browserApi.post('/admin/products/import', { csv, dryRun }, dryRun ? undefined : { headers: { 'Idempotency-Key': key.current }, timeout: 60000 }).then((response) => response.data.data);
  const check = useMutation({ mutationFn: () => post(true), onSuccess: setReport });
  const apply = useMutation({
    mutationFn: () => post(false),
    onSuccess: (result) => { pushToast({ tone: 'success', title: `${result.updated} variant${result.updated === 1 ? '' : 's'} updated.` }); onDone(); },
    onError: () => setReport(null),
  });

  const choose = async (event) => {
    const file = event.target.files?.[0];
    setReport(null);
    setFileError('');
    check.reset();
    apply.reset();
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setFileError('This file is larger than 5 MB.'); setCsv(''); return; }
    setFileName(file.name);
    setCsv(await file.text());
    key.current = uid();
  };

  return (
    <DialogRoot open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        size="lg"
        title="Import prices and stock"
        description="Export the catalog, edit price, sale, stock and threshold columns, then upload it here. Variants are matched by SKU. Nothing changes until you apply a clean check."
        footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button variant="secondary" disabled={!csv} loading={check.isPending} onClick={() => check.mutate()}>Check file</Button><Button disabled={!report?.valid || !report.updates.length} loading={apply.isPending} onClick={() => apply.mutate()}>{report?.updates?.length ? `Apply ${report.updates.length} update${report.updates.length === 1 ? '' : 's'}` : 'Apply'}</Button></>}
      >
        <div className="grid gap-4">
          <Field label="CSV file" hint={fileName || 'UTF-8 CSV exported from this page, up to 5 MB.'} error={fileError || undefined}>
            <input type="file" accept=".csv,text/csv" onChange={choose} className="block w-full text-sm file:mr-3 file:min-h-9 file:rounded-[var(--radius-sm)] file:border file:border-[var(--color-border)] file:bg-[var(--color-surface-raised)] file:px-3 file:text-sm file:font-semibold" />
          </Field>
          {check.error ? <Alert tone="error">{apiMessage(check.error, 'The file could not be checked.')}</Alert> : null}
          {apply.error ? <Alert tone="error">{apiMessage(apply.error, 'The import was not applied. Nothing was changed.')}</Alert> : null}
          {report ? (
            report.valid ? (
              <Alert tone="success">{report.rows} row{report.rows === 1 ? '' : 's'} checked. {report.updates.length ? `${report.updates.length} variant${report.updates.length === 1 ? '' : 's'} will change.` : 'No changes found.'}</Alert>
            ) : (
              <div className="grid gap-2" aria-live="polite">
                <Alert tone="error">{report.errors.length} problem{report.errors.length === 1 ? '' : 's'} in {report.rows} rows. Fix the file and check again; nothing will be imported until it is clean.</Alert>
                <ul className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border)] p-2 text-xs">
                  {report.errors.map((item, index) => <li key={`${item.row}-${item.field}-${index}`} className="py-0.5">Row {item.row}{item.sku ? ` (${item.sku})` : ''}{item.field ? `, ${item.field}` : ''}: {item.message}</li>)}
                </ul>
              </div>
            )
          ) : null}
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
