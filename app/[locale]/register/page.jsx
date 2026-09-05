import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
export const metadata = { title: 'Register', robots: { index: false } };
export default async function RegisterPage({ params }) { const { locale } = await params; return <div className="container py-10 md:py-16"><Suspense><AuthForm mode="register" locale={locale} /></Suspense></div>; }
