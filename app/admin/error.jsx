'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({ reset }) {
  return <section className="card mx-auto max-w-xl p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-[var(--color-danger)]"><AlertTriangle /></span><h1 className="mt-5 text-2xl font-black">This section could not load</h1><p className="mt-2 text-sm muted">No changes were made. Retry the request or check the API connection before continuing.</p><Button className="mt-6" onClick={reset}><RefreshCw size={17} />Retry section</Button></section>;
}
