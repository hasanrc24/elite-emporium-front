import { getTranslations } from 'next-intl/server';
import { ReviewList } from '@/components/account/review-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.reviews'), robots: { index: false } }; }
export default async function ReviewsPage({ params }) { const { locale } = await params; return <ReviewList locale={locale} />; }
