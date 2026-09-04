import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

export const metadata = { title: 'Administrator sign in', robots: { index: false, follow: false } };
export default function AdminLoginPage() { return <main className="container grid min-h-screen place-items-center py-12"><div className="w-full"><p className="mb-5 text-center text-sm font-bold uppercase tracking-widest text-[var(--color-primary)]">Secure administration</p><Suspense><AuthForm mode="login" locale="en" returnToDefault="/admin" /></Suspense></div></main>; }
