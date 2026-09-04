import { Suspense } from 'react';
import { MfaChallengeForm } from '@/components/auth/recovery-forms';
export const metadata = { title: 'Two-step verification', robots: { index: false } };
export default async function MfaPage({ params }) { const { locale } = await params; return <div className="container py-16"><Suspense><MfaChallengeForm locale={locale} /></Suspense></div>; }
