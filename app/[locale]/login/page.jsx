import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
export const metadata = { title: 'Sign in', robots: { index: false } };
export default async function LoginPage({ params }) { const { locale } = await params; return <div className="container py-16"><Suspense><AuthForm mode="login" locale={locale} /></Suspense></div>; }
