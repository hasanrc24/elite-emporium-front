'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({ reset }) {
  return <div className="container grid min-h-[55vh] place-items-center py-16"><section className="card max-w-lg p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-[var(--color-danger)]"><AlertTriangle /></span><h1 className="mt-5 text-2xl font-black">Something did not load</h1><p className="mt-2 muted">Your information is safe. Please try this page again; if the problem continues, contact support.</p><Button className="mt-6" onClick={reset}><RefreshCw size={17} />Try again</Button></section></div>;
}
