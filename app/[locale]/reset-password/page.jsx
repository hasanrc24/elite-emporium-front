import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/recovery-forms';
export const metadata = { title: 'Reset password', robots: { index: false } };
export default async function ResetPasswordPage({ params }) { const { locale } = await params; return <div className="container py-16"><Suspense><ResetPasswordForm locale={locale} /></Suspense></div>; }
