import { ReviewList } from '@/components/account/review-manager';
export const metadata = { title: 'My reviews', robots: { index: false } };
export default async function ReviewsPage({ params }) { const { locale } = await params; return <ReviewList locale={locale} />; }
