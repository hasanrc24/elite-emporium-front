import { ForgotPasswordForm } from '@/components/auth/recovery-forms';
export const metadata = { title: 'Forgot password', robots: { index: false } };
export default async function ForgotPasswordPage({ params }) { const { locale } = await params; return <div className="container py-16"><ForgotPasswordForm locale={locale} /></div>; }
